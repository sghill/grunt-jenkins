var request = require('request'),
    fs = require('fs'),
    _ = require('underscore'),
    q = require('q'),
    JenkinsServer = require('./jenkins-server');
/*
 * grunt-jenkins
 * https://github.com/sghill/grunt-jenkins
 *
 * Copyright (c) 2012 sghill
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {

  grunt.config.requires('jenkins.serverAddress');

  var SERVER = grunt.config('jenkins.serverAddress');
  var PIPELINE_DIRECTORY = grunt.config('jenkins.pipelineDirectory') || 'pipeline';
  var server = new JenkinsServer(SERVER);

  function logError(e) {
    grunt.log.error(e);
  }

  function withDot(filename) {
    return (/\./).test(filename);
  }

  function loadJobsFromDisk() {
    var deferred = q.defer();
    fs.readdir(PIPELINE_DIRECTORY, function(e, contents) {
      if(e) { return deferred.reject(e); }
      // assumption: we don't have periods in our job names
      var directories = _.reject(contents, withDot);
      deferred.resolve(directories);
    });
    return deferred.promise;
  }

  function fetchFileContents(fileAndJob) {
    var deferred = q.defer();
    fs.readFile(fileAndJob.fileName, function(e, contents) {
      if(e) { return deferred.reject(e); }
      deferred.resolve({fileContents: contents, jobName: fileAndJob.jobName });
    });
    return deferred.promise;
  }

  function loadPluginsFromDisk() {
    var deferred = q.defer();
    var filename = [PIPELINE_DIRECTORY, 'plugins.json'].join('/');
    fs.readFile(filename, function(e, contents) {
      if(e || _.isUndefined(contents)) { return deferred.reject(e); }
      deferred.resolve(JSON.parse(contents));
    });
    return deferred.promise;
  }

  function transformToJenkinsXml(plugins) {
    var attributes = _.map(plugins, function(p) {
      return ['<install plugin="', p.id, '@', p.version, '" />'].join('');
    }).join('\n');
    return ['<jenkins>', attributes, '</jenkins>'].join('\n');
  }

  function fetchJobConfigurationStrategy(job) {
    var deferred = q.defer();
    var url = [SERVER, 'job', job, 'config.xml'].join('/');
    request(url, function(e, r, b) {
      var strategy = r.statusCode === 200 ? 'update' : 'create';
      grunt.log.writeln(strategy + ': ' + job);
      deferred.resolve({strategy: strategy, jobName: job});
    });
    return deferred.promise;
  }

  function fetchJobConfigurations(jobs) {
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
          deferred.resolve();
        }
      });
    return deferred.promise;
  }

  function createJob (config) {
    var deferred = q.defer();
    var options = {
      url: [SERVER, 'createItem'].join('/'),
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
      url: [SERVER, 'job', config.jobName, 'config.xml'].join('/'),
      method: 'POST',
      body: config.fileContents
    };

    request(options, function(e, r, b) {
      if(e) { return deferred.reject(e); }
      deferred.resolve(r.statusCode === 200);
    });

    return deferred.promise;
  }

  function applyStrategy (strategyObj) {
    var deferred = q.defer(),
        filename = [PIPELINE_DIRECTORY, strategyObj.jobName, 'config.xml'].join('/'),
        fileStrategy = {fileName: filename, jobName: strategyObj.jobName};

    function resolve (val) {
      deferred.resolve(val);
    }

    if(strategyObj.strategy === 'create') {
      fetchFileContents(fileStrategy).
        then(createJob).
        then(resolve);
    } else if (strategyObj.strategy === 'update') {
      fetchFileContents(fileStrategy).
        then(updateJob).
        then(resolve);
    }

    return deferred.promise;
  }

  function createOrUpdateJobs(directories) {
    var deferred = q.defer();

    function resolve (val) {
      deferred.resolve(val);
    }

    _.each(directories, function(folder) {
      fetchJobConfigurationStrategy(folder).
        then(applyStrategy).
        then(resolve);
    });

    return deferred.promise;
  }

  function installPlugins(xml) {
    var deferred = q.defer(),
        options = {
          url: [SERVER, 'pluginManager', 'installNecessaryPlugins'].join('/'),
          method: 'POST',
          body: xml
        };

    request(options, function(e, r, b) {
      if(e) { return deferred.reject(e); }
      deferred.resolve(r.statusCode === 200);
    });

    return deferred.promise;
  }

  function fetchEnabledPluginsFromServer() {
    var url = [SERVER, 'pluginManager', 'api', 'json?depth=1'].join('/');
    var deferred = q.defer();

    request(url, function(e, r, body) {
      var result = _.filter(JSON.parse(body).plugins, function(p) { return p.enabled; });
      var plugins = _.map(result, function(p) { return { id: p.shortName, version: p.version }; });

      deferred.resolve(plugins);
    });

    return deferred.promise;
  }

  function ensureDirectoriesExist(directories) {
    _.each(directories, function(d, index) {
      var path = _.take(directories, (index + 1)).join('/');
      if(!fs.existsSync(path)) {
        fs.mkdirSync(path);
      }
    });
  }

  function writeFileToPipelineDirectory(plugins) {
    var deferred = q.defer();
    ensureDirectoriesExist([PIPELINE_DIRECTORY]);
    var filename = [PIPELINE_DIRECTORY, 'plugins.json'].join('/');
    var body = JSON.stringify(plugins, null, 2);
    fs.writeFile(filename, body, 'utf8', function(e) {
      if(e) { return deferred.reject(e); }

      grunt.log.ok('created file: ' + filename);
      deferred.resolve();
    });

    return deferred.promise;
  }

  function writeToJobDirectories(jobs) {
    var deferred = q.defer();
    var fileWritingPromises = _.map(jobs, function(j, index) {
      var d = q.defer();
      ensureDirectoriesExist([PIPELINE_DIRECTORY, j.name]);
      var filename = [PIPELINE_DIRECTORY, j.name, 'config.xml'].join('/');

      fs.writeFile(filename, j.config, 'utf8', function(e) {
        if(e) { return d.reject(e); }

        grunt.log.ok('created file: ' + filename);
        d.resolve(filename);
      });
      return d.promise;
    });

    q.allResolved(fileWritingPromises).
    then(function(promises) {
      if(_.all(promises, function(p) { return p.isFulfilled(); })) {
        deferred.resolve(_.map(promises, function(p) { return p.valueOf(); }));
      } else {
        deferred.reject();
      }
    });

    return deferred.promise;
  }

  function compareToJobsOnDisk(serverJobsAndConfigurations) {
    var deferred = q.defer();
    loadJobsFromDisk().
      then(function(jobNames) {
        var serverJobNames = _.pluck(serverJobsAndConfigurations, 'name');
        if(!_.isEmpty(_.difference(serverJobNames, jobNames))) {
          grunt.log.error('Jobs mismatch.');
          return deferred.resolve(false);
        }
        var results = [];
        var errors = [];
        _.each(jobNames, function(name, index) {
          var filename = [PIPELINE_DIRECTORY, name, 'config.xml'].join('/');
          fs.readFile(filename, function(e, contents) {
            if(e) { errors.push(e); }
            var serverJob = _.find(serverJobsAndConfigurations, function(j) { return j.name === name; });
            if(serverJob) { //sometimes this comes back with nothing, figure out what the deal is
              results.push(serverJob.config === contents.toString());
              if((index + 1) === jobNames.length) {
                var result = _.all(results, function(r) { return r; }) &&
                            !_.any(errors, function(e) { return e; });
                if(result) {
                  grunt.log.ok('All ' + jobNames.length + ' jobs verified!');
                } else {
                  grunt.log.error('Jobs configuration mismatch.');
                }
                deferred.resolve(result);
              }
            }
          });
        });
      }, logError);
    return deferred.promise;
  }

  function compareToPluginsOnDisk(serverPlugins) {
    var deferred = q.defer();
    loadPluginsFromDisk().
    then(function(onDiskPlugins) {
      var result = _.isEqual(serverPlugins, onDiskPlugins);
      if(result) {
        grunt.log.ok('All ' + serverPlugins.length + ' plugins verified!');
      } else {
        grunt.log.error('Plugins mismatched.');
      }
      deferred.resolve(result);
    }, logError);
    return deferred.promise;
  }

  // ==========================================================================
  // TASKS
  // ==========================================================================

  grunt.registerTask('jenkins-install', 'jenkins-install-jobs jenkins-install-plugins');
  grunt.registerTask('jenkins-backup', 'jenkins-backup-jobs jenkins-backup-plugins');
  grunt.registerTask('jenkins-list', 'jenkins-list-jobs jenkins-list-plugins');
  grunt.registerTask('jenkins-verify', 'jenkins-verify-jobs jenkins-verify-plugins');

  grunt.registerTask('jenkins-install-jobs', 'install all Jenkins jobs', function() {
    var done = this.async();
    loadJobsFromDisk().
      then(createOrUpdateJobs).
      then(function() { done(true); }, logError);
  });

  grunt.registerTask('jenkins-install-plugins', 'install all Jenkins plugins', function() {
    var done = this.async();
    loadPluginsFromDisk().
      then(transformToJenkinsXml).
      then(installPlugins).
      then(function() { done(true); }, logError);
  });

  grunt.registerTask('jenkins-backup-jobs', 'backup all Jenkins jobs', function() {
    var done = this.async();
    server.fetchJobs().
      then(fetchJobConfigurations).
      then(writeToJobDirectories).
      then(function() { done(true); }, logError);
  });

  grunt.registerTask('jenkins-backup-plugins', 'backup all enabled Jenkins plugins', function() {
    var done = this.async();
    fetchEnabledPluginsFromServer().
      then(writeFileToPipelineDirectory).
      then(function() { done(true); }, logError);
  });

  grunt.registerTask('jenkins-list-jobs', 'list all found Jenkins jobs', function() {
    var done = this.async();
    server.fetchJobs().
      then(function(jobs) {
        _.each(jobs, function(j) {
          grunt.log.writeln('job: ' + j.name + ' @ ' + j.url);
        });
      }).
      then(function() { done(true); }, logError);
  });

  grunt.registerTask('jenkins-list-plugins', 'list all enabled Jenkins plugins', function() {
    var done = this.async();
    fetchEnabledPluginsFromServer().
      then(function(plugins) {
        _.each(plugins, function(p) {
          grunt.log.writeln('plugin id: ' + p.id + ', version: ' + p.version);
        });
      }).
      then(function() { done(true); }, logError);
  });

  grunt.registerTask('jenkins-verify-jobs', 'verify job configurations in Jenkins match the on-disk versions', function() {
    var done = this.async();
    server.fetchJobs().
      then(fetchJobConfigurations).
      then(compareToJobsOnDisk).
      then(function(result) { done(result); }, logError);
  });

  grunt.registerTask('jenkins-verify-plugins', 'verify plugins in Jenkins match the on-disk versions', function() {
    var done = this.async();
    fetchEnabledPluginsFromServer().
      then(compareToPluginsOnDisk).
      then(function(result) { done(result); }, logError);
  });
};
