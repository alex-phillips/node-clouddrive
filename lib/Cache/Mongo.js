'use strict';

var mongodb = require('mongodb');
var Cache = require('../Cache');
var Node = require('../Node');
var async = require('async');

class Mongo extends Cache {
  constructor(config, callback) {
    super(config);
    var defaultConfig = {
      host: 'localhost',
      port: 27017,
      database: 'clouddrive'
    };

    async.forEachOf(config, (value, key, callback) => {
      if (defaultConfig[key] !== undefined) {
        defaultConfig[key] = value;
      }

      callback();
    }, () => {
      var url = `mongodb://${defaultConfig.host}:${defaultConfig.port}/${defaultConfig.database}`;
      return mongodb.MongoClient.connect(url, (err, database) => {
        if (err) {
          console.log(`Unable to connect to database: ${err.message}`);
        } else {
          this.db = database;

          return callback(null, this);
        }
      });
    });
  }

  close() {
    mongodb.MongoClient.close();
  }

  deleteAllNodes(callback) {
    this.db.collection('nodes').removeMany({}, {}, (err) => {
      callback(null);
    });
  }

  deleteNodeById(id, callback) {
    this.db.collection('nodes').removeOne({
      id: id
    }, (err) => {
      callback(null);
    });
  }

  filter(filters, callback) {
    this.db.collection('nodes').find(filters)
      .toArray((err, data) => {
        if (err) {
          return callback(err);
        }

        return async.forEachOf(data, (row, index, callback) => {
          data[index] = new Node(row);
          callback();
        }, () => {
          return callback(null, data);
        });
      });
  }

  findNodeById(id, callback) {
    this.db.collection('nodes').findOne({
      id: id
    }, (err, data) => {
      return callback(null, new Node(data));
    });
  }

  findNodesByName(name, callback) {
    this.db.collection('nodes').find({name: name})
      .toArray((err, data) => {
        return async.forEachOf(data, (row, index, callback) => {
          data[index] = new Node(row);
          callback();
        }, () => {
          return callback(null, data);
        });
      });
  }

  getNodeChildren(node, callback) {
    this.db.collection('nodes').find({
        parents: node.getId()
      })
      .toArray((err, data) => {
        return async.forEachOf(data, (row, index, callback) => {
          data[index] = new Node(row);
          callback();
        }, () => {
          return callback(null, data);
        });
      });
  }

  loadConfigByEmail(email, callback) {
    var collection = this.db.collection('configs');
    collection.find({email: email}).toArray((err, data) => {
      if (err) {
        return callback(err);
      }

      callback(null, data);
    });
  }

  saveAccount(account, callback) {
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
    }, (err, numUpdated) => {
      if (err) {
        return callback(err);
      }

      return callback(null);
    });
  }

  saveNode(node, callback) {
    if (!node.getName() && node.isRoot() === true) {
      node.set('name', 'Cloud Drive');
    }

    this.db.collection('nodes').updateOne({
      id: node.getId()
    }, node.getData(), {
      upsert: true
    }, (err, data) => {
      return this.saveNodeParents(node, callback);
    });
  }

  saveNodeParents(node, callback) {
    var collection = this.db.collection('nodes_nodes');

    var parents = node.getParentIds();
    collection.find({
      id_node: node.getId()
    }).toArray((err, data) => {
      async.forEach(data, (row, callback) => {
        var index = parents.indexOf(row['id_parent']);
        if (index === -1) {
          return collection.removeMany({
            id_parent: row['id_parent'],
            id_node: node.getId()
          }, callback);
        }

        delete(parents[index]);

        callback();
      }, () => {
        async.forEach(parents, (parent, callback) => {
          if (!parent) {
            return callback();
          }

          collection.insertOne({
            id_node: node.getId(),
            id_parent: parent
          }, callback);
        }, () => {
          callback();
        });
      });
    });
  }

  searchBy(field, value, callback) {
    var params = {};
    params[field] = {
      '$regex': value,
      '$options': 'i'
    };

    this.db.collection('nodes').find(params)
      .toArray((err, data) => {
        return async.forEachOf(data, (row, index, callback) => {
          data[index] = new Node(row);
          callback();
        }, () => {
          return callback(null, data);
        });
      });
  }
}

module.exports = Mongo;
