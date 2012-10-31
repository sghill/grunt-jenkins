var request = require('request');
var fs = require('fs');
var _ = require('underscore');
var q = require('q');
/*
 * grunt-jenkins
 * https://github.com/sghill/grunt-jenkins
 *
 * Copyright (c) 2012 sghill
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {

  // Please see the grunt documentation for more information regarding task and
  // helper creation: https://github.com/gruntjs/grunt/blob/master/docs/toc.md

  // ==========================================================================
  // TASKS
  // ==========================================================================

  var SERVER = 'http://192.168.241.137';
  var PIPELINE_DIRECTORY = 'pipeline';

  function logJobName(job) {
    grunt.log.writeln(job.name);
  }
  
  function logError(e) {
    grunt.log.error(e);
  }
  
  function isLast(item, collection) {
    return _.isEqual(item, _.last(collection));
  }

  grunt.registerTask('jenkins-list-projects', 'list projects on jenkins server', function() {
    var done = this.async();
    grunt.helper('getProjectNames', logJobName, done);
 });

  grunt.registerTask('jenkins-backup-configs', 'backup listed projects on jenkins server', function() {
    var done = this.async();
    request(SERVER + '/api/json', function(e, r, body) {
      var isSuccess = !e && r.statusCode === 200;
      if(isSuccess) {
        var jobs = JSON.parse(body).jobs;

        _.each(jobs, function(job) {
          var jobConfigurationUrl = [job.url, 'config.xml'].join('/');

          request(jobConfigurationUrl, function(e, r, body) {
            var directoryName = [PIPELINE_DIRECTORY, job.name].join('/');
            var filename = [PIPELINE_DIRECTORY, job.name, 'config.xml'].join('/');

            if(!fs.existsSync(PIPELINE_DIRECTORY)) {
              fs.mkdirSync(PIPELINE_DIRECTORY);
            }

            if(!fs.existsSync(directoryName)) {
              fs.mkdirSync(directoryName);
            }

            fs.writeFile(filename, body, 'utf8', function(err) {
              if(err) { throw err; }

              grunt.log.writeln('created file: ' + filename);
              if(isLast(job, jobs)) {
                done(isSuccess);
              }
            });

          });
        });

      }
    });
  });
  
  function withDot(filename) {
    return /\./.test(filename);
  }
   
  function fetchDirectoriesOf(directory) {
    var deferred = q.defer();
    fs.readdir(directory, function(e, contents) {
      if(e) { deferred.reject(e); }
      // assumption: we don't have periods in our job names
      var directories = _.reject(contents, withDot);
      deferred.resolve(directories);
    });
    return deferred.promise;
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
  
  function fetchFileContents (fileAndJob) {
    var deferred = q.defer();
    fs.readFile(fileAndJob.fileName, function(e, contents) {
      if(e) { deferred.reject(e); }
      deferred.resolve({fileContents: contents, jobName: fileAndJob.jobName });
    })
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
      if(e) { deferred.reject(e); }
      deferred.resolve(r.statusCode === 200);
    })

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
      if(e) { deferred.reject(e); }
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
  
  grunt.registerTask('jenkins-install-jobs', 'good mode', function() {
    var done = this.async();
    fetchDirectoriesOf(PIPELINE_DIRECTORY).
      then(createOrUpdateJobs).
      then(function() {
        done(true);
      }, logError).
      end();
  });

  function fetchPluginsFrom(directory) {
    var deferred = q.defer();
    fs.readFile([directory, 'plugins.json'].join('/'), function(e, contents) {
      if(e) { deferred.reject(e); }
      deferred.resolve(contents);
    });
    return deferred.promise;
  }

  grunt.registerTask('jenkins-install-plugins', 'good mode plugins', function() {
    var done = this.async();
    fetchPluginsFrom(PIPELINE_DIRECTORY).
      then(function() { done(true); });
  });

  function fetchEnabledPluginsOf(server) {
    var url = [SERVER, 'pluginManager', 'api', 'json?depth=1'].join('/');
    var deferred = q.defer();

    request(url, function(e, r, body) {
      var result = _.filter(JSON.parse(body).plugins, function(p) { return p.enabled; });
      var plugins = _.map(result, function(p) { return { id: p.shortName, version: p.version }; });

      deferred.resolve(plugins);
    });

    return deferred.promise;
  }

  function writeFileToPipelineDirectory(plugins) {
    var deferred = q.defer();
    var filename = [PIPELINE_DIRECTORY, 'plugins.json'].join('/');
    var body = JSON.stringify(plugins, null, 2);
    fs.writeFile(filename, body, 'utf8', function(e) {
      if(e) { deferred.reject(e); }

      grunt.log.writeln('created file: ' + filename);
      deferred.resolve();
    });

    return deferred.promise;
  }

  grunt.registerTask('jenkins-backup-plugins', 'backup the enabled plugins', function() {
    var done = this.async();
    fetchEnabledPluginsOf(SERVER).
      then(writeFileToPipelineDirectory).
      then(function(x) { done(true); });
  });
  // ==========================================================================
  // HELPERS
  // ==========================================================================

  grunt.registerHelper('getProjectNames', function(callback, done) {
    request(SERVER + '/api/json', function(e, r, body) {
      var isSuccess = !e & r.statusCode === 200;
      if(isSuccess) {
        var jobs = JSON.parse(body).jobs;
        jobs.forEach(callback);
      }
      done(isSuccess);
    });
  });

};
