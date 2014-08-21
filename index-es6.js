
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
  constructor(config) {
    var url = config.db.url || config.db;
    var usersDbName = config.db.usersDbName || '_users';
    this.prefix = config.db.prefix || 'lockit/';
    this.nano = nano({
      url: url,
      request_defaults: config.request_defaults
    });
    var _users = this.nano.use(usersDbName);
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
    yield create(this.prefix + name);

    // create security document
    var securityDoc = {
      members : {
        names : [name]
      }
    }
    var insert = thunkify(this.nano.use(this.prefix + name).insert);
    yield insert(securityDoc, '_security');

    // create user document in _users db
    var user = new User(name, email, password);
    var [res, headers] = yield this._insert(user, 'org.couchdb.user:' + name);
    var [doc, headers] = yield this._get(res.id);
    return doc;
  }



  /**
   * Find user in database.
   */
  *find(match, query) {
    if (match === 'name') {
      var [doc, headers] = yield this._get('org.couchdb.user:' + query);
      return doc;
    }
    var [res, headers] = yield this._view('lockit-user', match, {key: query});
    if (!res.rows.length) return null
    return res.rows[0].value;
  }



  /**
   * Update existing user in databse.
   */
  *update(user) {
    var [res, headers] = yield this._insert(user);
    var [doc, headers] = yield this._get(res.id);
    return doc;
  }



  /**
   * Delete existing user from databse.
   */
  *remove(name) {
    // remove user from _users database
    var [doc, headers] = yield this._get('org.couchdb.user:' + name);
    var destroy = thunkify(this.nano.use('_users').destroy);
    yield destroy(doc._id, doc._rev);

    // remove per user database
    var smash = thunkify(this.nano.db.destroy);
    var [res, headers] = yield smash(this.prefix + name);
    return res;
  }

}

module.exports = Adapter;
