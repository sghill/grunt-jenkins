var q = require('q'),
    fs = require('fs');

function FileSystem(pipelineDirectory) {

  this.pipelineDirectory = pipelineDirectory;

  this.readFile = function(fileAndJob) {
    var deferred = q.defer();
    fs.readFile(fileAndJob.fileName, function(e, contents) {
      if(e) { return deferred.reject(e); }
      deferred.resolve({fileContents: contents, jobName: fileAndJob.jobName });
    });
    return deferred.promise;
  };
}

module.exports = FileSystem;
