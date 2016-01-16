function AuthenticationProvider(grunt, netrcFactory) {
  var username = grunt.config('jenkins.username'),
    password = grunt.config('jenkins.password'),
    netrcLocation = grunt.config('jenkins.netrcLocation'),
    netrcMachine = grunt.config('jenkins.netrcMachine');

  this.get = function() {
    var netrc = netrcFactory(netrcLocation)[netrcMachine];
    if (netrc && netrc.login && netrc.password) {
      grunt.log.ok('Using .netrc credentials from ' + (netrcLocation || '~/.netrc'));
      return {
        auth: {
          username: netrc.login,
          password: netrc.password
        }
      };
    }
    if (username && password) {
      grunt.log.ok('Using provided username and password');
      return {
        auth: {
          username: username,
          password: password
        }
      };
    }
    grunt.log.ok('Using no authentication');
    return {};
  };
}

module.exports = AuthenticationProvider;
