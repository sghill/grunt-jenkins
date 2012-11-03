var q = require('q'),
    request = require('request'),
    _ = require('underscore'),
    grunt = require('grunt');

function JenkinsServer(serverUrl) {
  this.fetchJobs = function() {
    var deferred = q.defer();
    var url = [serverUrl, 'api', 'json'].join('/');
    
    request(url, function(e, r, body) {
      if(e) { return deferred.reject(e); }
      var jobs = JSON.parse(body).jobs;
      grunt.log.writeln('Found ' + jobs.length + ' jobs.');
      deferred.resolve(_.map(jobs, function(j) { return { name: j.name, url: j.url }; }));
    });
    
    return deferred.promise;
  }
}

module.exports = JenkinsServer;