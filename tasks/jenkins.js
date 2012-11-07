var fs = require('fs'),
    _ = require('underscore'),
    q = require('q'),
    JenkinsServer = require('./jenkinsServer'),
    FileSystem = require('./fileSystem');
/*
 * grunt-jenkins
 * https://github.com/sghill/grunt-jenkins
 *
 * Copyright (c) 2012 sghill
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {

  grunt.config.requires('jenkins.serverAddress');

  var fileSystem = new FileSystem(grunt.config('jenkins.pipelineDirectory') || 'pipeline');
  var server = new JenkinsServer(grunt.config('jenkins.serverAddress'), fileSystem);
  
  var PIPELINE_DIRECTORY = fileSystem.pipelineDirectory;

  function logError(e) {
    grunt.log.error(e);
  }

  function transformToJenkinsXml(plugins) {
    var attributes = _.map(plugins, function(p) {
      return ['<install plugin="', p.id, '@', p.version, '" />'].join('');
    }).join('\n');
    return ['<jenkins>', attributes, '</jenkins>'].join('\n');
  }

  function compareToJobsOnDisk(serverJobsAndConfigurations) {
    var deferred = q.defer();
    fileSystem.loadJobs().
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
    fileSystem.loadPlugins().
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
    fileSystem.loadJobs().
      then(server.createOrUpdateJobs).
      then(function() { done(true); }, logError);
  });

  grunt.registerTask('jenkins-install-plugins', 'install all Jenkins plugins', function() {
    var done = this.async();
    fileSystem.loadPlugins().
      then(transformToJenkinsXml).
      then(server.installPlugins).
      then(function() { done(true); }, logError);
  });

  grunt.registerTask('jenkins-backup-jobs', 'backup all Jenkins jobs', function() {
    var done = this.async();
    server.fetchJobs().
      then(server.fetchJobConfigurations).
      then(fileSystem.saveJobsToPipelineDirectory).
      then(function(result) { done(result); }, logError);
  });

  grunt.registerTask('jenkins-backup-plugins', 'backup all enabled Jenkins plugins', function() {
    var done = this.async();
    server.fetchEnabledPlugins().
      then(fileSystem.savePluginsToPipelineDirectory).
      then(function(result) { done(result); }, logError);
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
    server.fetchEnabledPlugins().
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
      then(server.fetchJobConfigurations).
      then(compareToJobsOnDisk).
      then(function(result) { done(result); }, logError);
  });

  grunt.registerTask('jenkins-verify-plugins', 'verify plugins in Jenkins match the on-disk versions', function() {
    var done = this.async();
    server.fetchEnabledPlugins().
      then(compareToPluginsOnDisk).
      then(function(result) { done(result); }, logError);
  });
};
