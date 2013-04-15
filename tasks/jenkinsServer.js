var q = require('q'),
    _ = require('underscore'),
    request = require('request');

function JenkinsServer(serverUrl, fileSystem, grunt) {
  this.fetchJobs = function() {
    var deferred = q.defer();
    var url = [serverUrl, 'api', 'json'].join('/');
    
    request(url, function(e, r, body) {
      if(e) { return deferred.reject(e); }
      var jobs = JSON.parse(body).jobs;
      grunt.log.writeln(['Found', jobs.length, 'jobs.'].join(' '));
      deferred.resolve(_.map(jobs, function(j) { return { name: j.name, url: j.url }; }));
    });
    
    return deferred.promise;
  };

  this.createOrUpdateJobs = function(directories) {
    var deferred = q.defer();

    function resolve (val) {
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
        options = {
          url: [serverUrl, 'pluginManager', 'installNecessaryPlugins'].join('/'),
          method: 'POST',
          body: plugins.xml
        };

    request(options, function(e, r, b) {
      if(e) { return deferred.reject(e); }
      _.each(plugins.plugins, function(p) {
        grunt.log.ok('install: ' + p.id + ' @ ' + p.version);
      });
      deferred.resolve(r.statusCode === 200);
    });

    return deferred.promise;
  };

  this.fetchEnabledPlugins = function() {
    var url = [serverUrl, 'pluginManager', 'api', 'json?depth=1'].join('/');
    var deferred = q.defer();

    request(url, function(e, r, body) {
      var result = _.filter(JSON.parse(body).plugins, function(p) { return p.enabled; });
      var plugins = _.map(result, function(p) { return { id: p.shortName, version: p.version }; });

      deferred.resolve(plugins);
    });

    return deferred.promise;
  };

  this.fetchJobConfigurations = function(jobs) {
    var deferred = q.defer();
    var promises = _.map(jobs, function(j) {
      var d = q.defer();
      request([j.url, 'config.xml'].join(''), function(e, r, body) {
        if(e) { return d.reject(e); }
        j.config = body;
        d.resolve(j);
      });
      return d.promise;
    });

    q.allResolved(promises).
      then(function(promises) {
        if(_.all(promises, function(p) { return p.isFulfilled(); })) {
          deferred.resolve(_.map(promises, function(p) { return p.valueOf(); }));
        } else {
          deferred.reject();
        }
      });
    return deferred.promise;
  };

  function createJob (config) {
    var deferred = q.defer();
    var options = {
      url: [serverUrl, 'createItem'].join('/'),
      method: 'POST',
      qs: {
        name: config.jobName
      },
      headers: {
        'Content-Type': 'text/xml'
      },
      body: config.fileContents
    };

    request(options, function(e, r, b) {
      if(e) { return deferred.reject(e); }
      deferred.resolve(r.statusCode === 200);
    });

    return deferred.promise;
  }

  function updateJob (config) {
    var deferred = q.defer(),
        options = {
      url: [serverUrl, 'job', config.jobName, 'config.xml'].join('/'),
      method: 'POST',
      body: config.fileContents
    };

    request(options, function(e, r, b) {
      if(e) { return deferred.reject(e); }
      deferred.resolve(r.statusCode === 200);
    });

    return deferred.promise;
  }

  function fetchJobConfigurationStrategy(job) {
    var deferred = q.defer();
    var url = [serverUrl, 'job', job, 'config.xml'].join('/');
    request(url, function(e, r, b) {
      var strategy = r.statusCode === 200 ? 'update' : 'create';
      grunt.log.ok(strategy + ': ' + job);
      deferred.resolve({strategy: strategy, jobName: job});
    });
    return deferred.promise;
  }

  function applyStrategy (strategyObj) {
    var deferred = q.defer(),
        filename = [fileSystem.pipelineDirectory, strategyObj.jobName, 'config.xml'].join('/'),
        fileStrategy = {fileName: filename, jobName: strategyObj.jobName};

    function resolve (val) {
      deferred.resolve(val);
    }

    if(strategyObj.strategy === 'create') {
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