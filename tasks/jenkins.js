var fs = require('fs'),
  _ = require('underscore'),
  q = require('q'),
  JenkinsServer = require('./jenkinsServer'),
  FileSystem = require('./fileSystem'),
  netrcFactory = require('netrc'),
  AuthenticationProvider = require('./authenticationProvider');

/*
 * grunt-jenkins
 * https://github.com/sghill/grunt-jenkins
 *
 * Copyright (c) 2012 sghill
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {

  grunt.config.requires('jenkins.serverAddress');
  var pipelineDirectory = grunt.config('jenkins.pipelineDirectory') || 'pipeline';
  var serverAddress = grunt.config('jenkins.serverAddress');

  var defaultOptions = new AuthenticationProvider(grunt, netrcFactory).get();
  var fileSystem = new FileSystem(pipelineDirectory, grunt);
  var server = new JenkinsServer(serverAddress, defaultOptions, fileSystem, grunt);
  var PIPELINE_DIRECTORY = fileSystem.pipelineDirectory;

  function logError(e) {
    grunt.log.error(e);
  }

  function transformToJenkinsXml(plugins) {
    var attributes = _.map(plugins, function(p) {
      return ['<install plugin="', p.id, '@', p.version, '" />'].join('');
    }).join('\n');
    return {
      xml: ['<jenkins>', attributes, '</jenkins>'].join('\n'),
      plugins: plugins
    };
  }

  function compareToJobsOnDisk(serverJobsAndConfigurations) {
    var deferred = q.defer();
    fileSystem.loadJobs().
      then(function(jobNames) {
        var serverJobNames = _.pluck(serverJobsAndConfigurations, 'name');
        if (!_.isEmpty(_.difference(serverJobNames, jobNames))) {
          grunt.log.error('Jobs mismatch.');
          return deferred.resolve(false);
        }

        var filePromises = _.map(jobNames, function(name) {
          var filename = [fileSystem.pipelineDirectory, name, 'config.xml'].join('/');
          var d = q.defer();
          fs.readFile(filename, function(e, contents) {
            if (e) {
              return d.reject(e);
            }
            d.resolve({
              name: name,
              contents: contents
            });
          });
          return d.promise;
        });

        q.allResolved(filePromises)
          .then(function(promises) {
            if (_.all(promises, function(p) {
                return p.isFulfilled();
              })) {
              var allJobsAreEqual = _.reduce(promises, function(memo, p) {
                var diskContents = p.valueOf().contents;
                var serverContents = _.find(serverJobsAndConfigurations, function(j) {
                  return j.name === p.valueOf().name;
                });
                return memo && diskContents.toString().trim() === serverContents.config.trim();
              }, true);
              if (allJobsAreEqual) {
                grunt.log.ok('All ' + jobNames.length + ' jobs verified!');
                deferred.resolve(true);
              } else {
                grunt.log.error('Jobs configuration mismatch.');
                deferred.resolve(false);
              }
            } else {
              grunt.log.error('Problem getting jobs configuration from server.');
              deferred.reject();
            }
          });
      }, logError);
    return deferred.promise;
  }

  function compareToPluginsOnDisk(serverPlugins) {
    var deferred = q.defer();
    fileSystem.loadPlugins().
      then(function(onDiskPlugins) {
        var result = _.isEqual(serverPlugins, onDiskPlugins);
        if (result) {
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

  grunt.registerTask('jenkins-install', ['jenkins-install-jobs', 'jenkins-install-plugins']);
  grunt.registerTask('jenkins-backup', ['jenkins-backup-jobs', 'jenkins-backup-plugins']);
  grunt.registerTask('jenkins-list', ['jenkins-list-jobs', 'jenkins-list-plugins']);
  grunt.registerTask('jenkins-verify', ['jenkins-verify-jobs', 'jenkins-verify-plugins']);

  grunt.registerTask('jenkins-install-jobs', 'install all Jenkins jobs', function() {
    var done = this.async();
    fileSystem.loadJobs().
      then(server.createOrUpdateJobs).
      then(function() {
        done(true);
      }, logError);
  });

  grunt.registerTask('jenkins-install-plugins', 'install all Jenkins plugins', function() {
    var done = this.async();
    fileSystem.loadPlugins().
      then(transformToJenkinsXml).
      then(server.installPlugins).
      then(function() {
        done(true);
      }, logError);
  });

  grunt.registerTask('jenkins-backup-jobs', 'backup all Jenkins jobs', function() {
    var done = this.async();
    server.fetchJobs().
      then(server.fetchJobConfigurations).
      then(fileSystem.saveJobsToPipelineDirectory).
      then(function(result) {
        done(result);
      }, logError);
  });

  grunt.registerTask('jenkins-backup-plugins', 'backup all enabled Jenkins plugins', function() {
    var done = this.async();
    server.fetchEnabledPlugins().
      then(fileSystem.savePluginsToPipelineDirectory).
      then(function(result) {
        done(result);
      }, logError);
  });

  grunt.registerTask('jenkins-list-jobs', 'list all found Jenkins jobs', function() {
    var done = this.async();
    server.fetchJobs().
      then(function(jobs) {
        _.each(jobs, function(j) {
          grunt.log.writeln('job: ' + j.name + ' @ ' + j.url);
        });
      }).
      then(function() {
        done(true);
      }, logError);
  });

  grunt.registerTask('jenkins-list-plugins', 'list all enabled Jenkins plugins', function() {
    var done = this.async();
    server.fetchEnabledPlugins().
      then(function(plugins) {
        _.each(plugins, function(p) {
          grunt.log.writeln('plugin id: ' + p.id + ', version: ' + p.version);
        });
      }).
      then(function() {
        done(true);
      }, logError);
  });

  grunt.registerTask('jenkins-verify-jobs', 'verify job configurations in Jenkins match the on-disk versions', function() {
    var done = this.async();
    server.fetchJobs().
      then(server.fetchJobConfigurations).
      then(compareToJobsOnDisk).
      then(function(result) {
        done(result);
      }, logError);
  });

  grunt.registerTask('jenkins-verify-plugins', 'verify plugins in Jenkins match the on-disk versions', function() {
    var done = this.async();
    server.fetchEnabledPlugins().
      then(compareToPluginsOnDisk).
      then(function(result) {
        done(result);
      }, logError);
  });
};
