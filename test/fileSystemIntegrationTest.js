var should = require('should'),
  path = require('path'),
  FileSystem = require('../tasks/fileSystem.js');

describe('FileSystem', function() {
  var dir = path.join(__dirname, 'support');
  var fileSystem;

  function jobNamed(x) {
    return path.join(dir, x);
  }

  before(function() {
    fileSystem = new FileSystem(dir, {});
  });

  describe('#loadJobs()', function() {
    var jobs;

    before(function() {
      jobs = fileSystem.loadJobs();
    });

    it('should handle spaces', function() {
      return jobs.should.eventually.containDeep([jobNamed('job 3')]);
    });

    it('should handle hyphens', function() {
      return jobs.should.eventually.containDeep([jobNamed('job-1')]);
    });

    it('should handle commas', function() {
      return jobs.should.eventually.containDeep([jobNamed('job,12')]);
    });

    it('should handle dots', function() {
      return jobs.should.eventually.containDeep([jobNamed('job.2')]);
    });

    it('should handle quotes', function() {
      return jobs.should.eventually.containDeep([jobNamed('job"8')]);
    });

    it('should handle parens', function() {
      return jobs.should.eventually.containDeep([jobNamed('job(5)')]);
    });

    it('should handle curly braces', function() {
      return jobs.should.eventually.containDeep([jobNamed('job{11}')]);
    });

    it('should handle backticks', function() {
      return jobs.should.eventually.containDeep([jobNamed('job`7')]);
    });

    it('should handle pluses', function() {
      return jobs.should.eventually.containDeep([jobNamed('job+10')]);
    });

    it('should handle equals', function() {
      return jobs.should.eventually.containDeep([jobNamed('job=9')]);
    });

    it('should handle tildes', function() {
      return jobs.should.eventually.containDeep([jobNamed('job~6')]);
    });

    it('should handle unicode characters', function() {
      return jobs.should.eventually.containDeep([jobNamed('job☃4'), jobNamed('jobø13')]);
    });

    it('should handle really long names', function() {
      return jobs.should.eventually.containDeep([jobNamed('this-is-a-really-long-job-name-probably-longer-than-anyone-should-name-one-because-all-the-relevant-info-gets-lost-in-the-noise-of-it-all-but-jenkins-pretty-much-always-ends-up-with-some-hideous-naming-schemes-to-compensate-for-its-lack-of-pipelines')]);
    });

  });
});
