grunt-jenkins
=============

[![Build Status](https://travis-ci.org/sghill/grunt-jenkins.png?branch=master)](https://travis-ci.org/sghill/grunt-jenkins)
[![Dependencies Status](https://david-dm.org/sghill/grunt-jenkins.png)](https://david-dm.org/sghill/grunt-jenkins)
[![Code Climate](https://codeclimate.com/github/sghill/grunt-jenkins.png)](https://codeclimate.com/github/sghill/grunt-jenkins)

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
      serverAddress: 'http://localhost:8080'
    , pipelineDirectory: 'jenkins-pipeline'  // optional, default: 'pipeline'
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
      serverAddress: 'http://localhost:8080'
    , netrcMachine: 'ci'
    , netrcLocation: '/tmp/.netrc'           // optional, default: '~/.netrc'
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
      serverAddress: 'http://localhost:8080'
    , username: 'alf'                       // if only one of username and password
    , password: 's3cret'                    // are provided, no authentication attempted
    }
  });
  grunt.loadNpmTasks('grunt-jenkins');
  // ...
};
```

If a netrcMachine and username/password are provided, the netrc machine will be used.
If using username/password, please pass them in via a command line argument instead
of hardcoding in the build file.

[grunt]: http://gruntjs.com/
[getting_started]: https://github.com/gruntjs/grunt/blob/master/docs/getting_started.md
[netrc]: http://man.cx/netrc

Usage
-----
[`grunt-jenkins`][grunt_jenkins_home] is a tool that makes it easier to keep track of, and work on, your [Jenkins][jenkins_home] installation. Jenkins configurations are often works of art, crafted by many people over a long period of time. Making changes confidently in such an environment without the appropriate tools can be daunting.

### Back up the configuration
My preferred way of mitigating CI configuration risk is to check the configuration into source control. Having configuration in source control gives us the confidence to make changes and know that we can go back to a working state. Creating a backup of all of our jobs is fairly simple -- just run the `grunt jenkins-backup-jobs` command. A pipeline directory will be created, a folder for each job within the pipeline directory, and the configuration will be saved to a `config.xml` file within the job directory.

### Verify the backup, constantly
Having our jobs in source control is great, but it can't make us completely confident. Jenkins encourages users to change the configuration through the UI, and that can leave our backed up version in an inconsistent state relative to what is on the server. To ensure confidence with every checkin, grunt-jenkins makes it easy to verify the configuration in source control matches exactly the version running on the server. Simply create a job as part of your pipeline that runs `grunt jenkins-verify-jobs` to ensure we're all working off the same copy.

[grunt_jenkins_home]: https://github.com/sghill/grunt-jenkins
[jenkins_home]: http://jenkins-ci.org/

In The News
-----------
* [How Do I Backup Jenkins Jobs?][how_to] from 13-Nov-2012
* [grunt-jenkins One Year On][one_year] from 17-Nov-2013

[how_to]: http://dev.sghill.net/2012/11/how-do-i-backup-jenkins-jobs.html
[one_year]: http://dev.sghill.net/2013/11/grunt-jenkins-one-year-on.html

Contributing
------------
There are plenty of places to contribute! Hotspots of complexity are highlighted by [codeclimate][codeclimate]. Refactoring
for testability is especially welcome.

Before submitting a pull request, please make sure the build passes by running:
```shell
  $ npm test
```

[codeclimate]: https://codeclimate.com/github/sghill/grunt-jenkins

Release History
---------------

### 0.5.0 on 23-Jun-2013
* feature: support Jenkins running on NAT network in private cloud [#9][issue9]. Thanks [@StefanScherer][StefanScherer]!

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
* compatibility with password-protected jenkins instances via .netrc or username/password. Thanks [@panozzaj][panozzaj]!

[panozzaj]: https://github.com/panozzaj

### 0.2.0 on 14-Apr-2013
* compatibility with grunt 0.4.x

### 0.1.1 on 12-Nov-2012
* inject `grunt` instance into `JenkinsServer` and `FileSystem` classes, as globally-installed grunt instances couldn't be `require`d

### 0.1.0 on 11-Nov-2012, from the Alaskan skies!

#### jobs-related tasks
* list all jobs on a server with `jenkins-list-jobs`
* backup every job's config.xml to _pipeline-directory_/_job-name_/config.xml with `jenkins-backup-jobs`
* verify each configuration in _pipeline-directory_/ matches the job configurations on the server with `jenkins-verify-jobs`
* install jobs from _pipeline-directory_/ with `jenkins-install-jobs`

#### plugins-related tasks
* list all enabled plugins and their versions with `jenkins-list-plugins`
* backup plugins to _pipeline-directory_/plugins.json with `jenkins-backup-plugins`
* verify plugins in _pipeline-directory_/plugins.json match the plugins on the server with `jenkins-verify-plugins`
* install plugins from _pipeline-directory_/plugins.json with `jenkins-install-plugins`

#### convenience tasks

* for each of the tasks above, a shorter version exists that will run both: `jenkins-list` will run `jenkins-list-jobs` and `jenkins-list-plugins`

## License
Copyright (c) 2012 sghill
Licensed under the MIT license.

