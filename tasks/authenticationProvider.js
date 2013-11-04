function AuthenticationProvider(grunt, netrcConstructor) {
  var username      = grunt.config('jenkins.username')
    , password      = grunt.config('jenkins.password')
    , netrcLocation = grunt.config('jenkins.netrcLocation') || '~/.netrc'
    , netrcMachine  = grunt.config('jenkins.netrcMachine');

  this.get = function() {
    var netrc = netrcConstructor(netrcLocation)[netrcMachine];
    if(netrc && netrc.login && netrc.password) {
      return {username: netrc.login, password: netrc.password};
    }
    if(username && password) {
      return {username: username, password: password};
    }
    return {};
  };
}

module.exports = AuthenticationProvider;

