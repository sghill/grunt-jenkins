var should = require('should'),
  path = require('path'),
  FileSystem = require('../tasks/fileSystem.js');

describe('FileSystem', function() {
  var dir = path.join(__dirname, 'support');
  var fileSystem;

  before(function() {
    fileSystem = new FileSystem(dir, {});
  });

  describe('#loadJobs()', function() {
    var jobs;

    before(function() {
      jobs = fileSystem.loadJobs();
    });

    it('should handle spaces', function() {
      return jobs.should.eventually.containDeep(['job 3']);
    });

    it('should handle hyphens', function() {
      return jobs.should.eventually.containDeep(['job-1']);
    });

    it('should handle commas', function() {
      return jobs.should.eventually.containDeep(['job,12']);
    });

    it('should handle dots', function() {
      return jobs.should.eventually.containDeep(['job.2']);
    });

    it('should handle quotes', function() {
      return jobs.should.eventually.containDeep(['job"8']);
    });

    it('should handle parens', function() {
      return jobs.should.eventually.containDeep(['job(5)']);
    });

    it('should handle curly braces', function() {
      return jobs.should.eventually.containDeep(['job{11}']);
    });

    it('should handle backticks', function() {
      return jobs.should.eventually.containDeep(['job`7']);
    });

    it('should handle pluses', function() {
      return jobs.should.eventually.containDeep(['job+10']);
    });

    it('should handle equals', function() {
      return jobs.should.eventually.containDeep(['job=9']);
    });

    it('should handle tildes', function() {
      return jobs.should.eventually.containDeep(['job~6']);
    });

    it('should handle unicode characters', function() {
      return jobs.should.eventually.containDeep(['job☃4', 'jobø13']);
    });

    it('should handle really long names', function() {
      return jobs.should.eventually.containDeep(['this-is-a-really-long-job-name-probably-longer-than-anyone-should-name-one-because-all-the-relevant-info-gets-lost-in-the-noise-of-it-all-but-jenkins-pretty-much-always-ends-up-with-some-hideous-naming-schemes-to-compensate-for-its-lack-of-pipelines']);
    });

  });
});
