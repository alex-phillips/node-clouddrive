var Cache = require('../Cache');
var async = require('async');
var Node = require('../Node');

function SQL(data) {
    Cache.call(this, data);
}

SQL.prototype = new Cache();
SQL.prototype.constructor = SQL;

SQL.prototype.deleteAllNodes = function (callback) {
    var self = this;
    this.db('nodes').del()
        .then(function () {
            return self.db('nodes_nodes').del()
                .then(function () {
                    callback(null);
                });
        });
};

SQL.prototype.deleteNodeById = function (id, callback) {
    this.db('nodes').where({
        id: id
    })
        .del()
        .then(function () {
            return callback(null)
        });
};

SQL.prototype.findNodeById = function (id, callback) {
    this.db.select('raw_data').from('nodes').where({
        id: id
    })
        .then(function (data) {
            if (data.length === 0) {
                return callback(null, null);
            }

            return callback(null, new Node(JSON.parse(data[0].raw_data)));
        });
};

SQL.prototype.findNodesByName = function (name, callback) {
    this.db.select('raw_data').from('nodes').where({
        name: name
    })
        .then(function (data) {
            for (var i = 0; i < data.length; i++) {
                data[i] = new Node(JSON.parse(data[i].raw_data));
            }

            return callback(null, data);
        });
};

SQL.prototype.getNodeChildren = function (node, callback) {
    this.db.select('raw_data').from('nodes')
        .leftJoin('nodes_nodes', 'nodes.id', 'nodes_nodes.id_node')
        .where({
            "nodes_nodes.id_parent": node.get('id')
        })
        .then(function (data) {
            for (var i = 0; i < data.length; i++) {
                data[i] = new Node(JSON.parse(data[i].raw_data));
            }

            return callback(null, data);
        });
};

SQL.prototype.getTrashedNodes = function (callback) {
    this.db.select('raw_data').from('nodes')
        .where({
            status: 'TRASH'
        })
        .then(function (data) {
            for (var i = 0; i < data.length; i++) {
                data[i] = new Node(JSON.parse(data[i].raw_data));
            }

            return callback(null, data);
        });
}

SQL.prototype.loadConfigByEmail = function (email, callback) {
    this.db.select('*').from('configs').where({
        email: email
    }).then(function (data) {
        callback(null, data);
    });
};

SQL.prototype.saveAccount = function (account, callback) {
    var self = this;
    this.db.select('*').from('configs').where({
        email: account.email
    })
        .then(function (data) {
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
                    .then(function () {
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
                        checkpoint: account.checkpoint,
                    })
                    .then(function () {
                        callback(null);
                    });
            }
        })
};

SQL.prototype.saveNode = function (node, callback) {
    if (!node.get('name') && node.get('isRoot') === true) {
        node.set('name', 'Cloud Drive');
    }

    var self = this;
    this.db.select('*').from('nodes').where({
        id: node.get('id')
    })
        .then(function (data) {
            if (data.length === 0) {
                self.db('nodes')
                    .insert({
                        'id': node.get('id'),
                        'name': node.get('name'),
                        'kind': node.get('kind'),
                        'md5': node.get('contentProperties.md5'),
                        'status': node.get('status'),
                        'created': node.get('createdDate'),
                        'modified': node.get('modifiedDate'),
                        'raw_data': JSON.stringify(node.getData())
                    })
                    .then(function () {
                        return self.saveNodeParents(node, callback);
                    });
            } else {
                self.db('nodes')
                    .where('id', '=', node.get('id'))
                    .update({
                        'name': node.get('name'),
                        'kind': node.get('kind'),
                        'md5': node.get('contentProperties.md5'),
                        'status': node.get('status'),
                        'created': node.get('createdDate'),
                        'modified': node.get('modifiedDate'),
                        'raw_data': JSON.stringify(node.getData())
                    })
                    .then(function () {
                        return self.saveNodeParents(node, callback);
                    });
            }
        })
};

SQL.prototype.saveNodeParents = function (node, callback) {
    var self = this;

    var parents = node.get('parents');
    this.db.select('*').from('nodes_nodes')
        .where({
            'id_node': node.get('id')
        })
        .then(function (data) {
            async.forEach(data, function (row, callback) {
                var index = parents.indexOf(row['id_parent']);
                if (index === -1) {
                    return self.db('nodes_nodes')
                        .where({
                            id_parent: row['id_parent'],
                            id_node: node.get('id')
                        })
                        .del()
                        .then(callback);
                }

                delete(parents[index]);

                callback();
            }, function () {
                async.forEach(parents, function (parent, callback) {
                    if (!parent) {
                        return callback();
                    }

                    self.db('nodes_nodes').insert({
                        id_node: node.get('id'),
                        id_parent: parent
                    })
                        .then(function () {
                            callback();
                        })
                }, function () {
                    callback();
                });
            });
        });
};

module.exports = SQL;
