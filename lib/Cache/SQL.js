'use strict';

var Cache = require('../Cache');
var Node = require('../Node');
var async = require('async');

class SQL extends Cache {
  constructor(config) {
    super(config);
    this.db = require('knex')(config);
    this.trx = null;
  }

  commit() {
    if (this.trx) {
      this.trx.commit();
    }

    this.trx = null;
  }

  deleteAllNodes(callback) {
    this.db('nodes').del()
      .transacting(this.trx)
      .then(() => {
        return this.db('nodes_nodes').del()
          .transacting(this.trx)
          .then(function() {
            callback();
          }, function(err) {
            return callback(err);
          });
      })
      .catch(function(err) {
        return callback(err);
      });
  }

  deleteNodeById(id, callback) {
    this.db('nodes').where({
        id: id
      })
      .del()
      .transacting(this.trx)
      .then(function() {
        callback();
      }, function(err) {
        return callback(err);
      });
  }

  filter(filters, callback) {
    this.db.select('raw_data')
      .from('nodes')
      .where(filters)
      .transacting(this.trx)
      .then((data) => {
        return async.forEachOf(data, (row, index, callback) => {
          data[index] = new Node(JSON.parse(row.raw_data));
          callback();
        }, (err) => {
          return callback(err, data);
        });
      });
  }

  findNodeById(id, callback) {
    this.db.select('raw_data')
      .from('nodes')
      .where({
        id: id
      })
      .transacting(this.trx)
      .then((data) => {
        if (data.length === 0) {
          return callback(null, null);
        }

        return callback(null, new Node(JSON.parse(data[0].raw_data)));
      });
  }

  findNodesByMd5(md5, callback) {
    this.db.select('raw_data')
      .from('nodes')
      .where({
        md5: md5
      })
      .transacting(this.trx)
      .then((data) => {
        return async.forEachOf(data, (row, index, callback) => {
          data[index] = new Node(JSON.parse(row.raw_data));
          callback();
        }, (err) => {
          return callback(err, data);
        });
      });
  }

  findNodesByName(name, callback) {
    this.db.select('raw_data')
      .from('nodes')
      .where({
        name: name
      })
      .transacting(this.trx)
      .then((data) => {
        return async.forEachOf(data, (row, index, callback) => {
          data[index] = new Node(JSON.parse(row.raw_data));
          callback();
        }, (err) => {
          return callback(err, data);
        });
      });
  }

  getNodeChildren(node, callback) {
    this.db.select('raw_data')
      .from('nodes')
      .innerJoin('nodes_nodes', 'nodes.id', 'nodes_nodes.id_node')
      .where({
        'nodes_nodes.id_parent': node.getId()
      })
      .transacting(this.trx)
      .then((data) => {
        return async.forEachOf(data, (row, index, callback) => {
          data[index] = new Node(JSON.parse(row.raw_data));
          callback();
        }, (err) => {
          return callback(err, data);
        });
      });
  }

  loadConfigByEmail(email, callback) {
    this.db.select('*')
      .from('configs')
      .where({
        email: email
      })
      .transacting(this.trx)
      .then((data) => {
        callback(null, data);
      });
  }

  rollback() {
    if (this.trx) {
      this.trx.rollback();
    }

    this.trx = null;
  }

  saveAccount(account, callback) {
    this.db.select('*')
      .from('configs')
      .where({
        email: account.email
      })
      .transacting(this.trx)
      .then((data) => {
        if (data.length === 0) {
          this.db('configs')
            .insert({
              email: account.email,
              token_type: account.token.token_type,
              expires_in: account.token.expires_in,
              refresh_token: account.token.refresh_token,
              access_token: account.token.access_token,
              last_authorized: account.token.last_authorized,
              content_url: account.contentUrl,
              metadata_url: account.metadataUrl,
              checkpoint: account.checkpoint
            })
            .transacting(this.trx)
            .then(function() {
              callback();
            }, function(err) {
              return callback(err);
            });
        } else {
          this.db('configs')
            .where('email', '=', account.email)
            .update({
              token_type: account.token.token_type,
              expires_in: account.token.expires_in,
              refresh_token: account.token.refresh_token,
              access_token: account.token.access_token,
              last_authorized: account.token.last_authorized,
              content_url: account.contentUrl,
              metadata_url: account.metadataUrl,
              checkpoint: account.checkpoint
            })
            .transacting(this.trx)
            .then(function() {
              callback();
            }, function(err) {
              return callback(err);
            });
        }
      });
  }

  saveNode(node, callback) {
    if (!node.getName()) {
      if (node.isRoot() === true) {
        node.set('name', 'Cloud Drive');
      } else {
        return callback(Error(`Node cannot be saved with no name (node ID: ${node.getId()})`));
      }
    }

    this.db.select('*')
      .from('nodes')
      .where({
        id: node.getId()
      })
      .transacting(this.trx)
      .then((data) => {
        if (data.length === 0) {
          this.db('nodes')
            .insert({
              id: node.getId(),
              name: node.getName(),
              kind: node.getKind(),
              md5: node.getMd5(),
              status: node.getStatus(),
              created: node.getCreatedDate(),
              modified: node.getModifiedDate(),
              raw_data: JSON.stringify(node.getData())
            })
            .transacting(this.trx)
            .then(() => {
              return this.saveNodeParents(node, callback);
            })
            .catch(function(err) {
              return callback(err);
            });
        } else {
          this.db('nodes')
            .where('id', '=', node.getId())
            .update({
              name: node.getName(),
              kind: node.getKind(),
              md5: node.getMd5(),
              status: node.getStatus(),
              created: node.getCreatedDate(),
              modified: node.getModifiedDate(),
              raw_data: JSON.stringify(node.getData())
            })
            .transacting(this.trx)
            .then(() => {
              return this.saveNodeParents(node, callback);
            })
            .catch(function(err) {
              return callback(err);
            });
        }
      })
      .catch(function(err) {
        return callback(err);
      });
  }

  saveNodeParents(node, callback) {
    var parents = node.getParentIds();
    this.db.select('*')
      .from('nodes_nodes')
      .where({
        id_node: node.getId()
      })
      .transacting(this.trx)
      .then((data) => {
        async.forEach(data, (row, callback) => {
          var index = parents.indexOf(row['id_parent']);
          if (index === -1) {
            return this.db('nodes_nodes')
              .where({
                id_parent: row['id_parent'],
                id_node: node.getId()
              })
              .del()
              .transacting(this.trx)
              .then(function() {
                callback();
              }, function(err) {
                return callback(err);
              });
          }

          delete(parents[index]);

          callback();
        }, (err) => {
          if (err) {
            return callback(err);
          }

          async.forEach(parents, (parent, callback) => {
            if (!parent) {
              return callback();
            }

            this.db('nodes_nodes')
              .insert({
                id_node: node.getId(),
                id_parent: parent
              })
              .transacting(this.trx)
              .then(function() {
                callback();
              }, function(err) {
                return callback(err);
              });
          }, (err) => {
            callback(err);
          });
        });
      })
      .catch(function(err) {
        return callback(err);
      });
  }

  searchBy(field, value, callback) {
    this.db.select('raw_data')
      .from('nodes')
      .where(field, 'like', `%${value}%`)
      .transacting(this.trx)
      .then((data) => {
        return async.forEachOf(data, (row, index, callback) => {
          data[index] = new Node(JSON.parse(row.raw_data));
          callback();
        }, (err) => {
          return callback(err, data);
        });
      });
  }

  transaction(callback) {
    this.db.transaction((trx) => {
      this.trx = trx;
      callback();
    });
  }
}

module.exports = SQL;
