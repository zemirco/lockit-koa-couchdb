
var assert = require('assert');
var co = require('co');
var config = require('./config');
var Adapter = require('..');
var adapter = new Adapter(config);

describe('lockit couchdb adapter for koa', function(done) {

  var token = '';

  it('should create a new user', function(done) {
    co(function *(){
      var user = yield adapter.save('john', 'john@email.com', 'secret');
      assert.equal(user.name, 'john');
      assert.equal(user.email, 'john@email.com');
      token = user.signupToken;
      done();
    })();
  });

  it('should find a user by name', function(done) {
    co(function *() {
      var user = yield adapter.find('name', 'john');
      assert.equal(user.email, 'john@email.com');
      done();
    })();
  });

  it('should find a user by email', function(done) {
    co(function *() {
      var user = yield adapter.find('email', 'john@email.com');
      assert.equal(user.name, 'john');
      done();
    })();
  });

  it('should find a user by signup token', function(done) {
    co(function *() {
      var user = yield adapter.find('signupToken', token);
      assert.equal(user.name, 'john');
      done();
    })();
  });

  it('should update an existing user', function(done) {
    co(function *() {
      var user = yield adapter.find('name', 'john');
      user.updated = true;
      var updatedUser = yield adapter.update(user);
      assert.equal(updatedUser.updated, true);
      done();
    })();
  });

  it('should remove a user', function(done) {
    co(function *() {
      var res = yield adapter.remove('john');
      assert.equal(res.ok, true);
      done();
    })();
  });

});
