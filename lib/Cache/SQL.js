'use strict';

var Cache = require('../Cache');
var Node = require('../Node');
var async = require('async');

class SQL {
  constructor(config) {
    this.db = require('knex')(config);
  }

  deleteAllNodes(callback) {
    this.db('nodes').del()
      .then(() => {
        return this.db('nodes_nodes').del()
          .then(() => {
            callback(null);
          });
      });
  }

  deleteNodeById(id, callback) {
    this.db('nodes').where({
        id: id
      })
      .del()
      .then(() => {
        return callback(null);
      });
  }

  filter(filters, callback) {
    this.db.select('raw_data').from('nodes').where(filters)
      .then((data) => {
        return async.forEachOf(data, (row, index, callback) => {
          data[index] = new Node(JSON.parse(row.raw_data));
          callback();
        }, () => {
          return callback(null, data);
        });
      });
  }

  findNodeById(id, callback) {
    this.db.select('raw_data').from('nodes').where({
        id: id
      })
      .then((data) => {
        if (data.length === 0) {
          return callback(null, null);
        }

        return callback(null, new Node(JSON.parse(data[0].raw_data)));
      });
  }

  findNodesByMd5(md5, callback) {
    this.db.select('raw_data').from('nodes').where({
        md5: md5
      })
      .then((data) => {
        return async.forEachOf(data, (row, index, callback) => {
          data[index] = new Node(JSON.parse(row.raw_data));
          callback();
        }, () => {
          return callback(null, data);
        });
      });
  }

  findNodesByName(name, callback) {
    this.db.select('raw_data').from('nodes').where({
        name: name
      })
      .then((data) => {
        return async.forEachOf(data, (row, index, callback) => {
          data[index] = new Node(JSON.parse(row.raw_data));
          callback();
        }, () => {
          return callback(null, data);
        });
      });
  }

  getNodeChildren(node, callback) {
    this.db.select('raw_data').from('nodes')
      .innerJoin('nodes_nodes', 'nodes.id', 'nodes_nodes.id_node')
      .where({
        'nodes_nodes.id_parent': node.getId()
      })
      .then((data) => {
        return async.forEachOf(data, (row, index, callback) => {
          data[index] = new Node(JSON.parse(row.raw_data));
          callback();
        }, () => {
          return callback(null, data);
        });
      });
  }

  loadConfigByEmail(email, callback) {
    this.db.select('*').from('configs').where({
      email: email
    }).then((data) => {
      callback(null, data);
    });
  }

  saveAccount(account, callback) {
    this.db.select('*').from('configs').where({
        email: account.email
      })
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
            .then(() => {
              callback(null);
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
            .then(() => {
              callback(null);
            });
        }
      });
  }

  saveNode(node, callback) {
    if (!node.getName() && node.isRoot() === true) {
      node.set('name', 'Cloud Drive');
    }

    this.db.select('*').from('nodes').where({
        id: node.getId()
      })
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
            .then(() => {
              return this.saveNodeParents(node, callback);
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
            .then(() => {
              return this.saveNodeParents(node, callback);
            });
        }
      });
  }

  saveNodeParents(node, callback) {
    var parents = node.getParentIds();
    this.db.select('*').from('nodes_nodes')
      .where({
        id_node: node.getId()
      })
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
              .then(callback);
          }

          delete(parents[index]);

          callback();
        }, () => {
          async.forEach(parents, (parent, callback) => {
            if (!parent) {
              return callback();
            }

            this.db('nodes_nodes').insert({
                id_node: node.getId(),
                id_parent: parent
              })
              .then(() => {
                callback();
              });
          }, () => {
            callback();
          });
        });
      });
  }

  searchBy(field, value, callback) {
    this.db.select('raw_data').from('nodes').where(field, 'like', `%${value}%`)
      .then((data) => {
        return async.forEachOf(data, (row, index, callback) => {
          data[index] = new Node(JSON.parse(row.raw_data));
          callback();
        }, () => {
          return callback(null, data);
        });
      });
  }
}

module.exports = SQL;
