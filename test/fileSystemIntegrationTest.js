var should = require('should'),
  path = require('path'),
  FileSystem = require('../tasks/fileSystem.js');

describe('FileSystem', function() {
  var fileSystem;

  before(function() {
    fileSystem = new FileSystem(path.join(__dirname, 'support'), {});
  });

  describe('#loadJobs()', function() {
    var jobsPromise;
    before(function() {
      jobsPromise = fileSystem.loadJobs();
    });

    it('should handle spaces', function(done) {
      jobsPromise.then(function(names) {
        names.should.containDeep(['job 3']);
        done();
      });
    });

    it('should handle hyphens', function(done) {
      jobsPromise.then(function(names) {
        names.should.containDeep(['job-1']);
        done();
      });
    });

    it('should handle commas', function(done) {
      jobsPromise.then(function(names) {
        names.should.containDeep(['job,12']);
        done();
      });
    });

    it('should handle dots', function(done) {
      jobsPromise.then(function(names) {
        names.should.containDeep(['job.2']);
        done();
      });
    });

    it('should handle quotes', function(done) {
      jobsPromise.then(function(names) {
        names.should.containDeep(['job"8']);
        done();
      });
    });

    it('should handle parens', function(done) {
      jobsPromise.then(function(names) {
        names.should.containDeep(['job(5)']);
        done();
      });
    });

    it('should handle curly braces', function(done) {
      jobsPromise.then(function(names) {
        names.should.containDeep(['job{11}']);
        done();
      });
    });

    it('should handle backticks', function(done) {
      jobsPromise.then(function(names) {
        names.should.containDeep(['job`7']);
        done();
      });
    });

    it('should handle pluses', function(done) {
      jobsPromise.then(function(names) {
        names.should.containDeep(['job+10']);
        done();
      });
    });

    it('should handle equals', function(done) {
      jobsPromise.then(function(names) {
        names.should.containDeep(['job=9']);
        done();
      });
    });

    it('should handle tildes', function(done) {
      jobsPromise.then(function(names) {
        names.should.containDeep(['job~6']);
        done();
      });
    });

    it('should handle unicode characters', function(done) {
      jobsPromise.then(function(names) {
        names.should.containDeep(['job☃4', 'jobø13']);
        done();
      });
    });

    it('should handle really long names', function(done) {
      jobsPromise.then(function(names) {
        names.should.containDeep(['this-is-a-really-long-job-name-probably-longer-than-anyone-should-name-one-because-all-the-relevant-info-gets-lost-in-the-noise-of-it-all-but-jenkins-pretty-much-always-ends-up-with-some-hideous-naming-schemes-to-compensate-for-its-lack-of-pipelines']);
        done();
      });
    });

  });
});
