var q = require('q'),
  _ = require('underscore'),
  fs = require('fs'),
  path = require('path');

function FileSystem(pipelineDirectory, grunt) {

  this.pipelineDirectory = pipelineDirectory;

  this.readFile = function(fileAndJob) {
    var deferred = q.defer();
    fs.readFile(fileAndJob.fileName, {
      encoding: 'utf8'
    }, function(e, contents) {
      if (e) {
        return deferred.reject(e);
      }
      deferred.resolve({
        fileContents: contents,
        jobName: fileAndJob.jobName
      });
    });
    return deferred.promise;
  };

  this.loadJobs = function() {
    var deferred = q.defer();
    fs.readdir(pipelineDirectory, function(e, contents) {
      if (e) {
        return deferred.reject(e);
      }
      var paths = _.map(contents, function(x) {
        return path.join(pipelineDirectory, x);
      });
      var directories = _.filter(paths, function(x) {
        return fs.lstatSync(x).isDirectory();
      });
      deferred.resolve(directories);
    });
    return deferred.promise;
  };

  this.loadPlugins = function() {
    var deferred = q.defer();
    var filename = [pipelineDirectory, 'plugins.json'].join('/');
    fs.readFile(filename, {
      encoding: 'utf8'
    }, function(e, contents) {
      if (e || _.isUndefined(contents)) {
        return deferred.reject(e);
      }
      deferred.resolve(JSON.parse(contents));
    });
    return deferred.promise;
  };

  this.savePluginsToPipelineDirectory = function(plugins) {
    var deferred = q.defer();
    ensureDirectoriesExist([pipelineDirectory]);
    var filename = [pipelineDirectory, 'plugins.json'].join('/');
    var body = JSON.stringify(plugins, null, 2);
    fs.writeFile(filename, body, {
      encoding: 'utf8'
    }, function(e) {
      if (e) {
        return deferred.reject(e);
      }

      grunt.log.ok('created file: ' + filename);
      deferred.resolve(true);
    });

    return deferred.promise;
  };

  this.saveJobsToPipelineDirectory = function(jobs) {
    var deferred = q.defer();
    var fileWritingPromises = _.map(jobs, function(j, index) {
      var d = q.defer();
      ensureDirectoriesExist([pipelineDirectory, j.name]);
      var filename = [pipelineDirectory, j.name, 'config.xml'].join('/');

      fs.writeFile(filename, j.config, {
        encoding: 'utf8'
      }, function(e) {
        if (e) {
          return d.reject(e);
        }

        grunt.log.ok('created file: ' + filename);
        d.resolve(filename);
      });
      return d.promise;
    });

    q.allResolved(fileWritingPromises).
      then(function(promises) {
        if (_.all(promises, function(p) {
            return p.isFulfilled();
          })) {
          deferred.resolve(true);
        } else {
          deferred.reject();
        }
      });

    return deferred.promise;
  };

  function ensureDirectoriesExist(directories) {
    _.each(directories, function(d, index) {
      var path = _.take(directories, (index + 1)).join('/');
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
      }
    });
  }

}

module.exports = FileSystem;
