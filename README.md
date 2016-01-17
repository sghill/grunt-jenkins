grunt-jenkins
=============

[![npm version](https://badge.fury.io/js/grunt-jenkins.svg)](https://badge.fury.io/js/grunt-jenkins)
[![Build Status](https://travis-ci.org/sghill/grunt-jenkins.png?branch=master)](https://travis-ci.org/sghill/grunt-jenkins)
[![Code Climate](https://codeclimate.com/github/sghill/grunt-jenkins.png)](https://codeclimate.com/github/sghill/grunt-jenkins)
[![Dependencies Status](https://david-dm.org/sghill/grunt-jenkins.png)](https://david-dm.org/sghill/grunt-jenkins)

Manage Jenkins with Grunt


Getting Started
---------------
Install this grunt plugin next to your project's [Gruntfile.js][getting_started] with:

```shell
$ npm install grunt-jenkins --save-dev
```

### Gruntfile.js

#### Jenkins is not authenticated

```javascript
module.exports = function(grunt) {
  grunt.initConfig({
    // ...
    jenkins: {
      serverAddress: 'http://localhost:8080',
      pipelineDirectory: 'jenkins-pipeline'   // optional, default: 'pipeline'
    }
  });
  grunt.loadNpmTasks('grunt-jenkins');
  // ...
};
```

#### Jenkins is authenticated and credentials are in [.netrc][netrc] (preferred)

```javascript
module.exports = function(grunt) {
  grunt.initConfig({
    // ...
    jenkins: {
      serverAddress: 'http://localhost:8080',
      netrcMachine: 'ci',
      netrcLocation: '/tmp/.netrc'            // optional, default: '~/.netrc'
    }
  });
  grunt.loadNpmTasks('grunt-jenkins');
  // ...
};
```

#### Jenkins is authenticated and credentials are provided by username/password

```javascript
module.exports = function(grunt) {
  grunt.initConfig({
    // ...
    jenkins: {
      serverAddress: 'http://localhost:8080',
      username: 'alf',                        // if only one of username and password
      password: 's3cret'                      // are provided, no authentication attempted
    }
  });
  grunt.loadNpmTasks('grunt-jenkins');
  // ...
};
```

If a netrcMachine and username/password are provided, the netrc machine will be
used. If using username/password, please pass them in via a command line
argument instead of hardcoding in the build file.

If you are using Github OAuth for authentication, use API token instead of
password which you can find at <server-address>/user/<your-user-name>/configure.

[grunt]: http://gruntjs.com/
[getting_started]: https://github.com/gruntjs/grunt/blob/master/docs/getting_started.md
[netrc]: http://man.cx/netrc


Usage
-----
[`grunt-jenkins`][grunt_jenkins_home] makes it easier to evolve your
[Jenkins][jenkins_home] installation. Jenkins configurations are often created
by many people over a long time. Making changes to Jenkins confidently without
the appropriate tools can be difficult.

### Back up the configuration
Having configuration in source control gives us the confidence to make changes
and know that we can go back to a working state. To create a backup of all jobs
run `grunt jenkins-backup-jobs`. Behind the scenes, grunt-jenkins will:

1. Create _pipelineDirectory_ if necessary
2. For each job: Create _pipelineDirectory_/_jobName_/config.xml

### Verify the backup, constantly
Having our jobs in source control is great, but it can't make us completely
confident. Jenkins encourages users to change the configuration through the UI,
and that can leave our backed up version out of sync with the server.
grunt-jenkins makes it easy to verify the configuration in source control
matches exactly the version running on the server. Create a job as part of your
pipeline that runs `grunt jenkins-verify-jobs` to ensure the configuration is
the same as source control.

[grunt_jenkins_home]: https://github.com/sghill/grunt-jenkins
[jenkins_home]: http://jenkins-ci.org/


In The News
-----------
* [How Do I Backup Jenkins Jobs?][how_to] from 13-Nov-2012
* [grunt-jenkins One Year On][one_year] from 17-Nov-2013

[how_to]: https://www.sghill.net/how-do-i-backup-jenkins-jobs.html
[one_year]: https://www.sghill.net/grunt-jenkins-one-year-on.html


Release History
---------------

### 0.6.0 on 17-Jan-2016
* feature: handle periods in job names [#11][issue11]. Thanks
  [@dtJuiceMobile][dtJuiceMobile]!
* badges: npm version badge added
* badges: now built by travisci against node 0.10, 0.12, 4.0, and 4.1
* docs: readme update for using with github oauth [#10][issue10]. Thanks
  [@floydpraveen][floydpraveen]!

[issue10]: https://github.com/sghill/grunt-jenkins/pull/10
[issue11]: https://github.com/sghill/grunt-jenkins/pull/11
[dtJuiceMobile]: https://github.com/dtJuiceMobile
[floydpraveen]: https://github.com/floydpraveen

### 0.5.0 on 23-Jun-2014
* feature: support Jenkins running on NAT network in private cloud [#9][issue9].
  Thanks [@StefanScherer][StefanScherer]!

[issue9]: https://github.com/sghill/grunt-jenkins/pull/9
[StefanScherer]: https://github.com/StefanScherer

### 0.4.0 on 5-Nov-2013
* bugfix: authentication broken when no auth used [#6][issue6]
* badges: now built by travisci against node 0.8 and 0.10
* badges: dependencies are watched by david
* badges: codeclimate reports on complexity
* logging: log error when authentication fails [#7][issue7]
* logging: logs if and where authentication is coming from
* logging: much more information on requests and responses with --verbose

[issue6]: https://github.com/sghill/grunt-jenkins/issues/6
[issue7]: https://github.com/sghill/grunt-jenkins/issues/7

### 0.3.0 on 15-Sep-2013
* compatibility with password-protected jenkins instances via .netrc or
  username/password. Thanks [@panozzaj][panozzaj]!

[panozzaj]: https://github.com/panozzaj

### 0.2.0 on 14-Apr-2013
* compatibility with grunt 0.4.x

### 0.1.1 on 12-Nov-2012
* inject `grunt` instance into `JenkinsServer` and `FileSystem` classes, as
  globally-installed grunt instances couldn't be `require`d

### 0.1.0 on 11-Nov-2012, from the Alaskan skies!

#### jobs-related tasks
* list all jobs on a server with `jenkins-list-jobs`
* backup every job's config.xml to _pipelineDirectory_/_jobName_/config.xml
  with `jenkins-backup-jobs`
* verify each configuration in _pipelineDirectory_/ matches the job
  configurations on the server with `jenkins-verify-jobs`
* install jobs from _pipelineDirectory_/ with `jenkins-install-jobs`

#### plugins-related tasks
* list all enabled plugins and their versions with `jenkins-list-plugins`
* backup plugins to _pipelineDirectory_/plugins.json with
  `jenkins-backup-plugins`
* verify plugins in _pipelineDirectory_/plugins.json match the plugins on the
  server with `jenkins-verify-plugins`
* install plugins from _pipelineDirectory_/plugins.json with
  `jenkins-install-plugins`

#### convenience tasks

* for each of the tasks above, a shorter version exists that will run both:
  `jenkins-list` will run `jenkins-list-jobs` and `jenkins-list-plugins`

## License
Copyright (c) 2012-2016 sghill
Licensed under the MIT license.
