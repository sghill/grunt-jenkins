var request = require('request');
var fs = require('fs');
var _ = require('underscore');
var Q = require('q');
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
              if(_.isEqual(job, _.last(jobs))) {
                done(isSuccess);
              }
            });

          });
        });

      }
    });
  });

  grunt.registerTask('jenkins-install-configs', 'install backed up configurations to jenkins', function() {
    var done = this.async();
    fs.readdir(PIPELINE_DIRECTORY, function(err, files) {
      var statusCodes = [];
      _.each(files, function(folder) {
        var filename = [PIPELINE_DIRECTORY, folder, 'config.xml'].join('/');
        var url = [SERVER, 'job', folder, 'config.xml'].join('/');
        
        fs.stat([PIPELINE_DIRECTORY, folder].join('/'), function(e, stats) {
          if(e) { throw e; }
          if(stats.isDirectory()) {
            request(url, function(e, r, body) {
              if(r.statusCode === 200) {
                grunt.log.writeln('job ' + folder + ' exists. Will be updating at ' + url);
                fs.readFile(filename, function (err, data) {
                  if (err) throw err;
                  request({url: url, method: 'POST', body: data}, function(e, res, body) {
                    statusCodes.push(res.statusCode);
                    if(_.isEqual(folder, _.last(files))) {
                      done(_.all(statusCodes, function(code) { return code === 200; }));
                    }
                  });
                });
              } else if(r.statusCode === 404) {
                grunt.log.writeln('job ' + folder + ' does not exist. creating it.');
                fs.readFile(filename, function (err, data) {
                  if (err) throw err;
                  var srvr =(SERVER + '/createItem');
                  request({url: srvr, method: 'POST', qs: { name: folder }, headers: { "Content-Type": "text/xml" }, body: data}, function(e, res, body) {
                    statusCodes.push(res.statusCode);
                    if(_.isEqual(folder, _.last(files))) {
                      done(_.all(statusCodes, function(code) { return code === 200; }));
                    }
                  });
                });
              } else {
                grunt.log.error('server error? no response from ' + SERVER);
              }
            });
          } else {
            return;
          }
        });
      });
    });
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
