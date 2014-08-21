
var co = require('co');
var thunkify = require('thunkify');
var uuid = require('node-uuid');
var ms = require('ms');
var moment = require('moment');
var nano = require('nano');



/**
 * User class.
 */
class User {

  constructor(name, email, password) {
    this.name = name;
    this.email = email;
    this.password = password;

    var now = moment().toDate();
    var timespan = ms('1 day');
    var future = moment().add(timespan, 'ms').toDate();

    this.roles = ['user'];
    this.type = 'user';
    this.signupToken = uuid.v4();
    this.signupTimestamp = now;
    this.signupTokenExpires = future;
    this.failedLoginAttempts = 0;
  }

}



/**
 * Adapter class
 */
class Adapter {



  /**
   * Constructor function.
   */
  constructor() {
    this.nano = nano('http://127.0.0.1:5984/');
    // _users database functions
    var _users = this.nano.use('_users');
    this._insert = thunkify(_users.insert);
    this._get = thunkify(_users.get);
    this._view = thunkify(_users.view);
  }



  /**
   * Save new user to database.
   */
  *save(name, email, password) {
    // create per user database
    var create = thunkify(this.nano.db.create);
    var db = yield create(name);

    // create security document
    var securityDoc = {
      members : {
        names : [name]
      }
    }
    var insert = thunkify(this.nano.use(name).insert);
    var security = yield insert(securityDoc, '_security');

    // create user document in _users db
    var user = new User(name, email, password);
    var res = yield this._insert(user, 'org.couchdb.user:' + name);
    var doc = yield this._get(res[0].id);
    return doc[0];
  }



  /**
   * Find user in database.
   */
  *find(match, query) {
    if (match === 'name') {
      var user = yield this._get('org.couchdb.user:' + query);
      return user[0];
    }
    var user = yield this._view('lockit-user', match, {key: query});
    if (!user[0].rows.length) return null
    return user[0].rows[0].value;
  }



  /**
   * Update existing user in databse.
   */
  *update(user) {
    var updated = yield this._insert(user);
    var _user = yield this._get(updated.id);
    return _user;
  }



  /**
   * Delete existing user from databse.
   */
  *remove(name) {
    // remove user from _users database
    var user = yield this._get('org.couchdb.user:' + name);
    var destroy = thunkify(this.nano.use('_users').destroy);
    var res = yield destroy(user[0]._id, user[0]._rev);

    // remove per user database
    var smash = thunkify(this.nano.db.destroy);
    var result = yield smash(name);
    return [res[0], result[0]];
  }

}

module.exports = Adapter;
