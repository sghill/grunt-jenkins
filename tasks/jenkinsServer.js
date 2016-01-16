var q = require('q'),
  _ = require('underscore'),
  request = require('request');

function JenkinsServer(serverUrl, defaultOptions, fileSystem, grunt) {

  function verboseLogRequest(options) {
    var method = options.method || 'GET';
    grunt.verbose.writeln([method, options.url].join(' '));
  }

  function verboseLogResponse(r) {
    grunt.verbose.writeln(['response code', r.statusCode].join(' '));
  }

  function authenticationFailed(r) {
    // NOTE: Jenkins returns a webpage that says 'status 401'
    // but it is actually returning a status code of 403
    var failed = r.statusCode === 403 || r.statusCode === 401;
    if (failed) {
      grunt.log.error('Failed to authenticate.');
    }
    return failed;
  }

  function hasError(e) {
    if (e) {
      grunt.log.error(e);
    }
    return e;
  }

  // NOTE: unauthenticated endpoint
  this.fetchJobs = function() {
    var deferred = q.defer(),
      options = _.extend(defaultOptions, {
        url: [serverUrl, 'api', 'json'].join('/')
      });

    request(options, function(e, r, body) {
      verboseLogRequest(options);
      verboseLogResponse(r);
      if (hasError(e)) {
        return deferred.reject(e);
      }
      var jobs = JSON.parse(body).jobs;
      grunt.log.writeln(['Found', jobs.length, 'jobs.'].join(' '));
      deferred.resolve(_.map(jobs, function(j) {
        var path = j.url.replace(/^https?\:\/{2}[^\/]+\/(.*)/, '$1');
        var url = [serverUrl, path].join('/');
        return {
          name: j.name,
          url: url
        };
      }));
    });

    return deferred.promise;
  };

  this.createOrUpdateJobs = function(directories) {
    var deferred = q.defer();

    function resolve(val) {
      deferred.resolve(val);
    }

    directories.forEach(function(folder) {
      fetchJobConfigurationStrategy(folder).
        then(applyStrategy).
        then(resolve);
    });

    return deferred.promise;
  };

  this.installPlugins = function(plugins) {
    var deferred = q.defer(),
      options = _.extend(defaultOptions, {
        url: [serverUrl, 'pluginManager', 'installNecessaryPlugins'].join('/'),
        method: 'POST',
        body: plugins.xml
      });

    request(options, function(e, r, b) {
      verboseLogRequest(options);
      verboseLogResponse(r);
      if (hasError(e) || authenticationFailed(r)) {
        return deferred.reject(e);
      }
      _.each(plugins.plugins, function(p) {
        grunt.log.ok('install: ' + p.id + ' @ ' + p.version);
      });
      deferred.resolve(r.statusCode === 200);
    });

    return deferred.promise;
  };

  // NOTE: unauthenticated endpoint
  this.fetchEnabledPlugins = function() {
    var deferred = q.defer(),
      options = _.extend(defaultOptions, {
        url: [serverUrl, 'pluginManager', 'api', 'json?depth=1'].join('/')
      });

    request(options, function(e, r, body) {
      verboseLogRequest(options);
      verboseLogResponse(r);
      if (hasError(e)) {
        return deferred.reject(e);
      }
      var result = _.filter(JSON.parse(body).plugins, function(p) {
        return p.enabled;
      });
      var plugins = _.map(result, function(p) {
        return {
          id: p.shortName,
          version: p.version
        };
      });

      deferred.resolve(plugins);
    });

    return deferred.promise;
  };

  this.fetchJobConfigurations = function(jobs) {
    var deferred = q.defer();
    var promises = _.map(jobs, function(j) {
      var d = q.defer(),
        options = _.extend(defaultOptions, {
          url: [j.url, 'config.xml'].join('')
        });

      request(options, function(e, r, body) {
        verboseLogRequest(options);
        verboseLogResponse(r);
        if (hasError(e) || authenticationFailed(r)) {
          return d.reject(e);
        }
        j.config = body;
        d.resolve(j);
      });
      return d.promise;
    });

    q.allResolved(promises).
      then(function(promises) {
        if (_.all(promises, function(p) {
            return p.isFulfilled();
          })) {
          deferred.resolve(_.map(promises, function(p) {
            return p.valueOf();
          }));
        } else {
          deferred.reject();
        }
      });
    return deferred.promise;
  };

  function createJob(config) {
    var deferred = q.defer(),
      options = _.extend(defaultOptions, {
        url: [serverUrl, 'createItem'].join('/'),
        method: 'POST',
        qs: {
          name: config.jobName
        },
        headers: {
          'Content-Type': 'text/xml'
        },
        body: config.fileContents
      });

    request(options, function(e, r, b) {
      verboseLogRequest(options);
      verboseLogResponse(r);
      if (hasError(e) || authenticationFailed(r)) {
        return deferred.reject(e);
      }
      deferred.resolve(r.statusCode === 200);
    });

    return deferred.promise;
  }

  function updateJob(config) {
    var deferred = q.defer(),
      options = _.extend(defaultOptions, {
        url: [serverUrl, 'job', config.jobName, 'config.xml'].join('/'),
        method: 'POST',
        body: config.fileContents
      });

    request(options, function(e, r, b) {
      verboseLogRequest(options);
      verboseLogResponse(r);
      if (hasError(e) || authenticationFailed(r)) {
        return deferred.reject(e);
      }
      deferred.resolve(r.statusCode === 200);
    });

    return deferred.promise;
  }

  // NOTE: unauthenticated endpoint
  function fetchJobConfigurationStrategy(job) {
    var deferred = q.defer(),
      options = _.extend(defaultOptions, {
        url: [serverUrl, 'job', job, 'config.xml'].join('/')
      });

    request(options, function(e, r, b) {
      verboseLogRequest(options);
      verboseLogResponse(r);
      if (hasError(e)) {
        return deferred.reject(e);
      }
      var strategy = r.statusCode === 200 ? 'update' : 'create';
      grunt.log.ok(strategy + ': ' + job);
      deferred.resolve({
        strategy: strategy,
        jobName: job
      });
    });
    return deferred.promise;
  }

  function applyStrategy(strategyObj) {
    var deferred = q.defer(),
      filename = [fileSystem.pipelineDirectory, strategyObj.jobName, 'config.xml'].join('/'),
      fileStrategy = {
        fileName: filename,
        jobName: strategyObj.jobName
      };

    function resolve(val) {
      deferred.resolve(val);
    }

    if (strategyObj.strategy === 'create') {
      fileSystem.readFile(fileStrategy).
        then(createJob).
        then(resolve);
    } else if (strategyObj.strategy === 'update') {
      fileSystem.readFile(fileStrategy).
        then(updateJob).
        then(resolve);
    }

    return deferred.promise;
  }
}

module.exports = JenkinsServer;
