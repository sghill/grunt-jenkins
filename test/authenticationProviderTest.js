var should = require('should');
var AuthenticationProvider = require('../tasks/authenticationProvider.js');

describe('AuthenticationProvider', function() {

  var emptyNetRcMock = function() { return {}; };

  describe('no authentication', function() {

    it('should return an empty object', function() {
      var gruntMock = {config:function(){}};
      var authenticationProvider = new AuthenticationProvider(gruntMock, emptyNetRcMock);
      var authenticationOptions = authenticationProvider.get();
      authenticationOptions.should.eql({});
    });

  });

  describe('username and password', function() {

    it('should return username and password if specified', function() {
      var gruntMock = {
        config: function(x) {
          if(x === 'jenkins.username') {
            return 'un'; 
          }
          if(x === 'jenkins.password') {
            return 'pw';
          }
        }
      };
      var provider = new AuthenticationProvider(gruntMock, emptyNetRcMock);
      var options = provider.get();
      options.should.eql({auth:{username: 'un', password: 'pw'}});
    });
    
    it('should return empty if only username specified', function() {
      var gruntMock = {
        config: function(x) {
          if(x === 'jenkins.username') {
            return 'un'; 
          }
        }
      };
      var provider = new AuthenticationProvider(gruntMock, emptyNetRcMock);
      var options = provider.get();
      options.should.eql({});
    });
 
    it('should return empty if only password specified', function() {
      var gruntMock = {
        config: function(x) {
          if(x === 'jenkins.password') {
            return 'pw';
          }
        }
      };
      var provider = new AuthenticationProvider(gruntMock, emptyNetRcMock);
      var options = provider.get();
      options.should.eql({});
    });
    
  });

  describe('netrc present', function() {

    it('should prefer netrc to username/password when both specified', function() {
      var gruntMock = {
        config: function(x) {
          if(x === 'jenkins.username') {
            return 'un-from-username';
          }
          if(x === 'jenkins.password') {
            return 'pw-from-password';
          }
          if(x === 'jenkins.netrcLocation') {
            return 'netrc';
          }
          if(x === 'jenkins.netrcMachine') {
            return 'testjenkins';
          }
        }
      };
      var netRcMock = function(filepath) { 
        if (filepath === 'netrc') {
          return {testjenkins: {login: 'un-netrc', password: 'pw-netrc'}};
        }
      };

      var provider = new AuthenticationProvider(gruntMock, netRcMock);
      var options = provider.get();
      options.should.eql({auth:{username: 'un-netrc', password: 'pw-netrc'}});
    });

    it('should return empty if only username specified', function() {
      var gruntMock = { config: function(x) { if(x === 'jenkins.netrcMachine') { return 'testjenkins'; } } };
      var netRcMock = function() { return { testjenkins: { login: 'un', password: '' } } };
      var provider = new AuthenticationProvider(gruntMock, netRcMock);
      var options = provider.get();
      options.should.eql({});
    });

    it('should return empty if only password specified', function() {
      var gruntMock = { config: function(x) { if(x === 'jenkins.netrcMachine') { return 'testjenkins'; } } };
      var netRcMock = function() { return { testjenkins: { login: '', password: 'pw' } } };
      var provider = new AuthenticationProvider(gruntMock, netRcMock);
      var options = provider.get();
      options.should.eql({});
    });

  });

});

