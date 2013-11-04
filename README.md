# grunt-jenkins

Manage Jenkins with Grunt

[![Build Status](https://travis-ci.org/sghill/grunt-jenkins.png?branch=master)](https://travis-ci.org/sghill/grunt-jenkins)

## `grunt` info
The `0.1.x` releases (now on the grunt-0.3.x branch) are compatible with `grunt 0.3.x`. Starting with `0.2.x`, `grunt-jenkins` is compatible with `grunt 0.4.x`.

## Getting Started
Install this grunt plugin next to your project's [gruntfile][getting_started] with: `npm install grunt-jenkins --save-dev`

You'll need a bit of configuration (in your `grunt.initConfig`):

### Config example
```javascript
jenkins: {
  serverAddress: 'http://localhost:8080'
 ,pipelineDirectory: 'jenkins-pipeline'   // optional, default: 'pipeline'

  // for password-protected jenkins instances only
 ,netrcLocation: '/some/path/netrc'       // optional, preferred, default: '~/.netrc'
 ,netrcMachine: 'jenkins'                 // optional, required for .netrc
 ,username: 'alf'                         // optional, default: ''
 ,password: 's3cret'                      // optional, default: ''
}
```

Then add this line to your project's `Gruntfile.js` **after** `grunt.initConfig`:

```javascript
grunt.loadNpmTasks('grunt-jenkins');
```

[grunt]: http://gruntjs.com/
[getting_started]: https://github.com/gruntjs/grunt/blob/master/docs/getting_started.md

## Documentation
[`grunt-jenkins`][grunt_jenkins_home] is a tool that makes it easier to keep track of, and work on, your [Jenkins][jenkins_home] installation. Jenkins configurations are often works of art, crafted by many people over a long period of time. Making changes confidently in such an environment without the appropriate tools can be daunting. 

### Back up the configuration
My preferred way of mitigating CI configuration risk is to check the configuration into source control. Having configuration in source control gives us the confidence to make changes and know that we can go back to a working state. Creating a backup of all of our jobs is fairly simple -- just run the `grunt jenkins-backup-jobs` command. A pipeline directory will be created, a folder for each job within the pipeline directory, and the configuration will be saved to a `config.xml` file within the job directory.

### Verify the backup, constantly
Having our jobs in source control is great, but it can't make us completely confident. Jenkins encourages users to change the configuration through the UI, and that can leave our backed up version in an inconsistent state relative to what is on the server. To ensure confidence with every checkin, grunt-jenkins makes it easy to verify the configuration in source control matches exactly the version running on the server. Simply create a job as part of your pipeline that runs `grunt jenkins-verify-jobs` to ensure we're all working off the same copy.

[grunt_jenkins_home]: https://github.com/sghill/grunt-jenkins
[jenkins_home]: http://jenkins-ci.org/

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Lint your code using [grunt][grunt].

## Release History

### `0.3.0` on 15-Sep-2013
* compatibility with password-protected jenkins instances via [.netrc][netrc] or username/password. Thanks @panozzaj!

### `0.2.0` on 14-Apr-2013
* compatibility with grunt 0.4.x

### `0.1.1` on 12-Nov-2012
* inject `grunt` instance into `JenkinsServer` and `FileSystem` classes, as globally-installed grunt instances couldn't be `require`d

### `0.1.0` on 11-Nov-2012, from the Alaskan skies!

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

[netrc]: http://man.cx/netrc

