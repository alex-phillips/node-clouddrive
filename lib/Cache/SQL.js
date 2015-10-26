var Cache = require('../Cache');
var Node = require('../Node');
var async = require('async');

function SQL(config, callback) {
  this.db = require('knex')(config);

  return callback(null, this);
}

SQL.prototype = Cache.prototype;
SQL.prototype.constructor = SQL;

SQL.prototype.deleteAllNodes = function(callback) {
  var self = this;
  this.db('nodes').del()
    .then(function() {
      return self.db('nodes_nodes').del()
        .then(function() {
          callback(null);
        });
    });
};

SQL.prototype.deleteNodeById = function(id, callback) {
  this.db('nodes').where({
    id: id
  })
    .del()
    .then(function() {
      return callback(null);
    });
};

SQL.prototype.filter = function(filters, callback) {
  this.db.select('raw_data').from('nodes').where(filters)
    .then(function(data) {
      return async.forEachOf(data, function(row, index, callback) {
        data[index] = new Node(JSON.parse(row.raw_data));
        callback();
      }, function() {
        return callback(null, data);
      });
    });
};

SQL.prototype.findNodeById = function(id, callback) {
  this.db.select('raw_data').from('nodes').where({
    id: id
  })
    .then(function(data) {
      if (data.length === 0) {
        return callback(null, null);
      }

      return callback(null, new Node(JSON.parse(data[0].raw_data)));
    });
};

SQL.prototype.findNodesByMd5 = function(md5, callback) {
  this.db.select('raw_data').from('nodes').where({
    md5: md5
  })
    .then(function(data) {
      return async.forEachOf(data, function(row, index, callback) {
        data[index] = new Node(JSON.parse(row.raw_data));
        callback();
      }, function() {
        return callback(null, data);
      });
    });
};

SQL.prototype.findNodesByName = function(name, callback) {
  this.db.select('raw_data').from('nodes').where({
    name: name
  })
    .then(function(data) {
      return async.forEachOf(data, function(row, index, callback) {
        data[index] = new Node(JSON.parse(row.raw_data));
        callback();
      }, function() {
        return callback(null, data);
      });
    });
};

SQL.prototype.getNodeChildren = function(node, callback) {
  this.db.select('raw_data').from('nodes')
    .innerJoin('nodes_nodes', 'nodes.id', 'nodes_nodes.id_node')
    .where({
      'nodes_nodes.id_parent': node.getId()
    })
    .then(function(data) {
      return async.forEachOf(data, function(row, index, callback) {
        data[index] = new Node(JSON.parse(row.raw_data));
        callback();
      }, function() {
        return callback(null, data);
      });
    });
};

SQL.prototype.loadConfigByEmail = function(email, callback) {
  this.db.select('*').from('configs').where({
    email: email
  }).then(function(data) {
    callback(null, data);
  });
};

SQL.prototype.saveAccount = function(account, callback) {
  var self = this;
  this.db.select('*').from('configs').where({
    email: account.email
  })
    .then(function(data) {
      if (data.length === 0) {
        self.db('configs')
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
          .then(function() {
            callback(null);
          });
      } else {
        self.db('configs')
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
          .then(function() {
            callback(null);
          });
      }
    });
};

SQL.prototype.saveNode = function(node, callback) {
  if (!node.getName() && node.isRoot() === true) {
    node.set('name', 'Cloud Drive');
  }

  var self = this;
  this.db.select('*').from('nodes').where({
    id: node.getId()
  })
    .then(function(data) {
      if (data.length === 0) {
        self.db('nodes')
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
          .then(function() {
            return self.saveNodeParents(node, callback);
          });
      } else {
        self.db('nodes')
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
          .then(function() {
            return self.saveNodeParents(node, callback);
          });
      }
    });
};

SQL.prototype.saveNodeParents = function(node, callback) {
  var self = this;

  var parents = node.getParentIds();
  this.db.select('*').from('nodes_nodes')
    .where({
      id_node: node.getId()
    })
    .then(function(data) {
      async.forEach(data, function(row, callback) {
        var index = parents.indexOf(row['id_parent']);
        if (index === -1) {
          return self.db('nodes_nodes')
            .where({
              id_parent: row['id_parent'],
              id_node: node.getId()
            })
            .del()
            .then(callback);
        }

        delete(parents[index]);

        callback();
      }, function() {
        async.forEach(parents, function(parent, callback) {
          if (!parent) {
            return callback();
          }

          self.db('nodes_nodes').insert({
            id_node: node.getId(),
            id_parent: parent
          })
            .then(function() {
              callback();
            });
        }, function() {
          callback();
        });
      });
    });
};

SQL.prototype.searchBy = function(field, value, callback) {
  this.db.select('raw_data').from('nodes').where(field, 'like', '%' + value + '%')
    .then(function(data) {
      return async.forEachOf(data, function(row, index, callback) {
        data[index] = new Node(JSON.parse(row.raw_data));
        callback();
      }, function() {
        return callback(null, data);
      });
    });
};

module.exports = SQL;
