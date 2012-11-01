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

  var SERVER = 'http://192.168.241.137';
  var PIPELINE_DIRECTORY = 'pipeline';

  function logError(e) {
    grunt.log.error(e);
  }
  
  function isLast(item, collection) {
    return _.isEqual(item, _.last(collection));
  }
  
  function withDot(filename) {
    return /\./.test(filename);
  }
   
  function loadJobsFromDisk() {
    var deferred = q.defer();
    fs.readdir(PIPELINE_DIRECTORY, function(e, contents) {
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
  

  function loadPluginsFromDisk() {
    var deferred = q.defer();
    fs.readFile([PIPELINE_DIRECTORY, 'plugins.json'].join('/'), function(e, contents) {
      if(e) { deferred.reject(e); }
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
  
  function installPlugins(xml) {
    var deferred = q.defer(),
        options = {
          url: [SERVER, 'pluginManager', 'installNecessaryPlugins'].join('/'),
          method: 'POST',
          body: xml
        };

    request(options, function(e, r, b) {
      if(e) { deferred.reject(e); }
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
  
  function fetchJobsFromServer() {
    var deferred = q.defer();
    var url = [SERVER, 'api', 'json'].join('/');
    
    request(url, function(e, r, body) {
      if(e) { deferred.reject(e); }
      var jobs = JSON.parse(body).jobs;
      deferred.resolve(_.map(jobs, function(j) { return { name: j.name, url: j.url }}));
    });
    
    return deferred.promise;
  }
  
  function fetchJobConfigurations(jobs) {
    var deferred = q.defer();
    var jobConfigurations = [];
    var errors = [];
    var responseCodes = [];
    _.each(jobs, function(j) {
      request([j.url, 'config.xml'].join(''), function(e, r, body) {
        errors.push(e);
        responseCodes.push(r.statusCode);
        j.config = body;
        jobConfigurations.push(j)
        if(isLast(j, jobs)) {
          if(_.any(errors, function(e) { return e; }) || 
             _.any(responseCodes, function(c) { return c !== 200; })) {
            deferred.reject();
          }
          deferred.resolve(jobConfigurations);
        }
      });
    });
    return deferred.promise;
  }
  
  function writeToJobDirectories(jobs) {
    var deferred = q.defer();
    _.each(jobs, function(j) {
      var directoryName = [PIPELINE_DIRECTORY, j.name].join('/');
      var filename = [directoryName, 'config.xml'].join('/');

      if(!fs.existsSync(PIPELINE_DIRECTORY)) {
        fs.mkdirSync(PIPELINE_DIRECTORY);
      }

      if(!fs.existsSync(directoryName)) {
        fs.mkdirSync(directoryName);
      }

      fs.writeFile(filename, j.config, 'utf8', function(e) {
        if(e) { deferred.reject(e); }
        if(isLast(j, jobs)) {
          deferred.resolve(jobs);
        }
      });
    });
    return deferred.promise;
  }
  
  // ==========================================================================
  // TASKS
  // ==========================================================================

  grunt.registerTask('jenkins-install-jobs', 'install all jobs', function() {
    var done = this.async();
    loadJobsFromDisk().
      then(createOrUpdateJobs).
      then(function() { done(true); }, logError);
  });

  grunt.registerTask('jenkins-install-plugins', 'install all plugins', function() {
    var done = this.async();
    loadPluginsFromDisk().
      then(transformToJenkinsXml).
      then(installPlugins).
      then(function() { done(true); }, logError);
  });
  
  grunt.registerTask('jenkins-backup-projects', 'backup all projects', function() {
    var done = this.async();
    fetchJobsFromServer().
      then(fetchJobConfigurations).
      then(writeToJobDirectories).
      then(function() { done(true); }, logError);
  });
  
  grunt.registerTask('jenkins-backup-plugins', 'backup all enabled plugins', function() {
    var done = this.async();
    fetchEnabledPluginsFromServer().
      then(writeFileToPipelineDirectory).
      then(function() { done(true); }, logError);
  });

};
