var mongodb = require('mongodb');
var Cache = require('../Cache');
var Node = require('../Node');
var async = require('async');

function Mongo(config, callback) {
  var defaultConfig = {
    host: 'localhost',
    port: 27017,
    database: 'clouddrive'
  };

  var self = this;
  async.forEachOf(config, function(value, key, callback) {
    if (defaultConfig[key] !== undefined) {
      defaultConfig[key] = value;
    }

    callback();
  }, function() {
    var url = 'mongodb://' + defaultConfig.host + ':' + defaultConfig.port + '/' + defaultConfig.database;
    return mongodb.MongoClient.connect(url, function(err, database) {
      if (err) {
        console.log('Unable to connect to database: ', err);
      } else {
        self.db = database;
        return callback(null, self);
      }
    });
  });
}

Mongo.prototype = Cache.prototype;
Mongo.prototype.constructor = Mongo;

Mongo.prototype.close = function() {
  mongodb.MongoClient.close();
};

Mongo.prototype.deleteAllNodes = function(callback) {
  this.db.collection('nodes').removeMany({}, {}, function(err) {
    callback(null);
  });
};

Mongo.prototype.deleteNodeById = function(id, callback) {
  this.db.collection('nodes').removeOne({
    id: id
  }, function(err) {
    callback(null);
  });
};

Mongo.prototype.filter = function(filters, callback) {
  this.db.collection('nodes').find(filters)
    .toArray(function(err, data) {
      if (err) {
        return callback(err);
      }

      return async.forEachOf(data, function(row, index, callback) {
        data[index] = new Node(row);
        callback();
      }, function() {
        return callback(null, data);
      });
    });
};

Mongo.prototype.findNodeById = function(id, callback) {
  this.db.collection('nodes').findOne({
    id: id
  }, function(err, data) {
    return callback(null, new Node(data));
  });
};

Mongo.prototype.findNodesByName = function(name, callback) {
  this.db.collection('nodes').find({name: name})
    .toArray(function(err, data) {
      return async.forEachOf(data, function(row, index, callback) {
        data[index] = new Node(row);
        callback();
      }, function() {
        return callback(null, data);
      });
    });
};

Mongo.prototype.getNodeChildren = function(node, callback) {
  this.db.collection('nodes').find({
    parents: node.getId()
  })
    .toArray(function(err, data) {
      return async.forEachOf(data, function(row, index, callback) {
        data[index] = new Node(row);
        callback();
      }, function() {
        return callback(null, data);
      });
    });
};

Mongo.prototype.loadConfigByEmail = function(email, callback) {
  var collection = this.db.collection('configs');
  collection.find({email: email}).toArray(function(err, data) {
    if (err) {
      return callback(err);
    }

    callback(null, data);
  });
};

Mongo.prototype.saveAccount = function(account, callback) {
  var collection = this.db.collection('configs');
  collection.updateOne({email: account.email}, {
    email: account.email,
    token_type: account.token.token_type,
    expires_in: account.token.expires_in,
    refresh_token: account.token.refresh_token,
    access_token: account.token.access_token,
    last_authorized: account.token.last_authorized,
    content_url: account.contentUrl,
    metadata_url: account.metadataUrl,
    checkpoint: account.checkpoint
  }, {
    upsert: true
  }, function(err, numUpdated) {
    if (err) {
      return callback(err);
    }

    return callback(null);
  });
};

Mongo.prototype.saveNode = function(node, callback) {
  var self = this;

  if (!node.getName() && node.isRoot() === true) {
    node.set('name', 'Cloud Drive');
  }

  this.db.collection('nodes').updateOne({
    id: node.getId()
  }, node.getData(), {
    upsert: true
  }, function(err, data) {
    return self.saveNodeParents(node, callback);
  });
};

Mongo.prototype.saveNodeParents = function(node, callback) {
  var collection = this.db.collection('nodes_nodes');

  var parents = node.getParentIds();
  collection.find({
    id_node: node.getId()
  }).toArray(function(err, data) {
    async.forEach(data, function(row, callback) {
      var index = parents.indexOf(row['id_parent']);
      if (index === -1) {
        return collection.removeMany({
          id_parent: row['id_parent'],
          id_node: node.getId()
        }, callback);
      }

      delete(parents[index]);

      callback();
    }, function() {
      async.forEach(parents, function(parent, callback) {
        if (!parent) {
          return callback();
        }

        collection.insertOne({
          id_node: node.getId(),
          id_parent: parent
        }, callback);
      }, function() {
        callback();
      });
    });
  });
};

Mongo.prototype.searchBy = function(field, value, callback) {
  var params = {};
  params[field] = {
    '$regex': value,
    '$options': 'i'
  };

  this.db.collection('nodes').find(params)
    .toArray(function(err, data) {
      return async.forEachOf(data, function(row, index, callback) {
        data[index] = new Node(row);
        callback();
      }, function() {
        return callback(null, data);
      });
    });
};

module.exports = Mongo;
