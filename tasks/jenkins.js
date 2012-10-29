var request = require('request');
var fs = require('fs');
var _ = require('underscore');
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

  function logJobName(job) {
    grunt.log.writeln(job.name);
  }

  grunt.registerTask('jenkins-list-projects', 'list projects on jenkins server', function() {
    var done = this.async();
    grunt.helper('getProjectNames', logJobName, done);
 });

  grunt.registerTask('jenkins-backup-configs', 'backup listed projects on jenkins server', function() {
    var done = this.async();
    request('http://192.168.241.137/api/json', function(e, r, body) {
      var isSuccess = !e && r.statusCode === 200;
      if(isSuccess) {
        var jobs = JSON.parse(body).jobs;

        _.each(jobs, function(job) {
          var jobConfigurationUrl = [job.url, 'config.xml'].join('/');

          request(jobConfigurationUrl, function(e, r, body) {
            var pipelineDirectory = 'pipeline';
            var directoryName = [pipelineDirectory, job.name].join('/');
            var filename = [pipelineDirectory, job.name, 'config.xml'].join('/');

            if(!fs.existsSync(pipelineDirectory)) {
              fs.mkdirSync(pipelineDirectory); 
            }

            if(!fs.existsSync(directoryName)) { 
              fs.mkdirSync(directoryName); 
            }

            fs.writeFile(filename, body, 'utf8', function(err) {
              if(err) { throw err; }

              grunt.log.writeln('created file: ' + filename);
              if(_.isEqual(job, _.last(jobs))) {
                done(isSuccess);
              }
            });

          });
        });

      }
    });
  });


  // ==========================================================================
  // HELPERS
  // ==========================================================================

  grunt.registerHelper('getProjectNames', function(callback, done) {
    request('http://192.168.241.137/api/json', function(e, r, body) {
      var isSuccess = !e & r.statusCode === 200;
      if(isSuccess) {
        var jobs = JSON.parse(body).jobs;
        jobs.forEach(callback);
      }
      done(isSuccess);
    });
  });

};
