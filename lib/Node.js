var ParameterBag = require('./ParameterBag');
var fs = require('fs');
var path = require('path');
var async = require('async');
var Request = require('request');
var Utils = require('./Utils');

var initialized = false;
var account = null;
var cache = null;

function Node(data) {
    ParameterBag.call(this, data);
}

Node.prototype = new ParameterBag();
Node.prototype.constructor = Node;

Node.prototype.delete = function (callback) {
    return cache.deleteNodeById(this.get('id'), callback);
};

Node.prototype.download = function (localPath, callback) {
    if (localPath === undefined || !localPath) {
        localPath = '.';
    }

    if (this.isFolder()) {
        return this.downloadFolder(localPath, callback);
    }

    return this.downloadFile(localPath, callback);
};

Node.prototype.downloadFile = function (localPath, callback) {
    var retval = {
        success: false,
        data: {}
    };

    localPath = path.resolve(localPath);

    if (fs.existsSync(localPath)) {
        if (fs.lstatSync(localPath).isDirectory()) {
            localPath += "/" + this.getName();
        } else {
            retval.data.message = "File already exists";

            return callback(null, retval);
        }
    }

    Request.get(account.contentUrl + "nodes/" + this.get('id') + "/content", {
        headers: {
            Authorization: "Bearer " + account.token.access_token
        }
    }).pipe(fs.createWriteStream(localPath))
        .on('finish', function () {
            retval.success = true;

            return callback(null, retval);
        });
};

Node.prototype.downloadFolder = function (localPath, callback) {
    var retval = {
        success: true,
        data: {}
    };

    localPath = path.resolve(localPath) + "/" + this.getName();

    if (!fs.existsSync(localPath)) {
        fs.mkdirSync(localPath);
    }

    this.getChildren(function (err, children) {
        async.forEach(children, function (child, callback) {
            return child.download(localPath, callback);
        }, function () {
            return callback(null, retval);
        });
    });
};

Node.prototype.getChildren = function (callback) {
    return cache.getNodeChildren(this, callback);
};

Node.prototype.getMetadata = function (generateLink, callback) {
    if (generateLink === undefined) {
        generateLink = false;
    }

    var retval = {
        success: false,
        data: {}
    };

    var query = {
        tempLink: generateLink
    };

    Request.get(account.metadataUrl + "nodes/" + this.get('id'), {
        headers: {
            Authorization: "Bearer " + account.token.access_token
        },
        qs: query
    }, function (err, response, body) {
        retval.data = JSON.parse(body);

        if (response.statusCode === 200) {
            retval.success = true;
        }

        return callback(null, retval);
    });
};

Node.prototype.getName = function () {
    return this.get('name');
};

Node.prototype.getPath = function (callback) {
    var remotePath = [];

    buildPath(this);

    function buildPath (node) {
        remotePath.push(node.getName());
        if (node.isRoot()) {
            return callback(null, remotePath.reverse().join('/'));
        }

        Node.loadById(node.get('parents')[0], function (err, parent) {
            if (err) {
                return callback(err);
            }

            if (!parent) {
                return callback(new Error("No parent node found with id '" + node.get('parents')[0]) + "'");
            }

            if (parent.isRoot()) {
                return callback(null, remotePath.reverse().join('/'));
            }

            buildPath(parent);
        });
    }
};

Node.prototype.inTrash = function () {
    return this.get('status') === 'TRASH';
};

Node.prototype.isAsset = function () {
    return this.get('kind') === 'ASSET'
};

Node.prototype.isFile = function () {
    return this.get('kind') === 'FILE';
};

Node.prototype.isFolder = function () {
    return this.get('kind') === 'FOLDER';
};

Node.prototype.isRoot = function () {
    return this.get('isRoot');
};

Node.prototype.move = function (newParent, callback) {
    var retval = {
        success: false,
        data: {}
    };

    if (!newParent.isFolder()) {
        retval.data.message = "New parent must be a FOLDER node";
        return callback(null, retval);
    }

    if (!this.isFile() && !this.isFolder()) {
        retval.data.message = "You can only move FILE and FOLDER nodes";
        return callback(null, retval);
    }

    var self = this;
    Request.post(account.metadataUrl + "nodes/" + newParent.get('id') + "/children", {
        headers: {
            Authorization: "Bearer " + account.token.access_token
        },
        body: JSON.stringify({
            fromParent: self.get('parents')[0],
            childId: self.get('id')
        })
    }, function (err, response, body) {
        retval.data = JSON.parse(body);

        if (response.statusCode === 200) {
            retval.success = true;
            self.replace(retval.data);
            return self.save(function () {
                return callback(null, retval);
            });
        }

        return callback(null, retval);
    })
};

Node.prototype.overwrite = function (localPath, callback) {
    var retval = {
        success: false,
        data: {}
    };

    if (!this.isFile()) {
        retval.data.message = "Only file contents can be overwritten";

        return callback(null, retval);
    }

    var self = this;
    Request.put(account.contentUrl + "nodes/" + self.get('id') + "/content", {
        headers: {
            Authorization: "Bearer " + account.token.access_token
        },
        formData: {
            content: fs.createReadStream(localPath)
        }
    }, function (err, response, body) {
        retval.data = JSON.parse(body);

        if (response.statusCode === 200) {
            retval.success = true;
            self.replace(retval.data);

            return self.save(function () {
                callback(null, retval);
            });
        }

        return callback(null, retval);
    })
};

Node.prototype.rename = function (name, callback) {
    var retval = {
        success: false,
        data: {}
    };

    var self = this;
    Request.patch(account.metadataUrl + "nodes/" + self.get('id'), {
        headers: {
            Authorization: "Bearer " + account.token.access_token
        },
        body: JSON.stringify({
            name: name
        })
    }, function (err, response, body) {
        retval.data = JSON.parse(body);

        if (response.statusCode === 200) {
            retval.success = true;
            self.replace(retval.data);

            return self.save(function () {
                return callback(null, retval);
            });
        }

        return callback(null, retval);
    });
};

Node.prototype.restore = function (callback) {
    var retval = {
        success: false,
        data: {}
    };

    if (this.get('status') === 'AVAILABLE') {
        retval.data.message = "Node is not in the trash"

        return callback(null, retval);
    }

    var self = this;
    Request.post(account.metadataUrl + "trash/" + self.get('id') + "/restore", {
        headers: {
            Authorization: "Bearer " + account.token.access_token
        }
    }, function (err, response, body) {
        retval.data = JSON.parse(body);

        if (response.statusCode === 200) {
            retval.success = true;
            self.replace(retval.data);

            return self.save(function () {
                return callback(null, retval);
            });
        }

        return callback(null, retval);
    });
};

Node.prototype.save = function (callback) {
    return cache.saveNode(this, callback);
};

Node.prototype.trash = function (callback) {
    var retval = {
        success: false,
        data: {}
    };

    if (this.inTrash()) {
        retval.data.message = "Node is already in the trash"

        return callback(null, retval);
    }

    var self = this;
    Request.put(account.metadataUrl + "trash/" + self.get('id'), {
        headers: {
            Authorization: "Bearer " + account.token.access_token
        }
    }, function (err, response, body) {
        if (err) {
            return callback(err);
        }

        retval.data = JSON.parse(body);
        if (response.statusCode === 200) {
            retval.success = true;
            self.replace(retval.data);

            return self.save(function () {
                return callback(null, retval);
            });
        }

        return callback(null, retval);
    });
};

Node.createDirectoryPath = function (path, callback) {
    var retval = {
        success: false,
        data: {}
    };

    Node.loadByPath(path, function (err, node) {
        if (node) {
            retval.success = true;
            retval.data = node;

            return callback(null, retval);
        }

        path = Utils.getPathArray(path);
        Node.getRoot(function (err, root) {
            var previousNode = root;
            var remotePath = '';
            async.forEachSeries(path, function (part, callback) {
                remotePath += '/' + part;
                Node.loadByPath(remotePath, function (err, node) {
                    if (!node) {
                        return Node.createFolder(part, previousNode.get('id'), function (err, data) {
                            previousNode = data.data;
                            callback();
                        });
                    }

                    previousNode = node;
                    callback();
                });
            }, function () {
                retval.success = true;
                retval.data = previousNode;
                callback(null, retval);
            });
        });
    });
};

Node.createFolder = function (name, parentId, callback) {
    var retval = {
        success: false,
        data: {}
    };

    if (!(parentId instanceof Array)) {
        parentId = [parentId];
    }

    Request.post(account.metadataUrl + "nodes", {
        headers: {
            Authorization: "Bearer " + account.token.access_token
        },
        body: JSON.stringify({
            name: name,
            parents: parentId,
            kind: 'FOLDER'
        })
    }, function (err, response, body) {
        retval.data = JSON.parse(body);

        if (response.statusCode === 201) {
            retval.success = true;
            retval.data = new Node(retval.data);

            return retval.data.save(function (err, data) {
                callback(null, retval);
            });
        }

        callback(null, retval);
    });
};

Node.exists = function (remotePath, localPath, callback) {
    var retval = {
        success: false,
        data: {
            message: "",
            md5Match: false,
            pathMatch: false,
        }
    };

    return Node.loadByPath(remotePath, function (err, pathNode) {
        if (!pathNode) {
            if (localPath) {
                return Node.loadByMd5(Utils.getFileMd5(localPath), function (err, md5Nodes) {
                    if (md5Nodes.length > 0) {
                        var nodeIds = [];
                        for (var i = 0; i < md5Nodes.length; i++) {
                            nodeIds.push(md5Nodes[i].get('id'));
                        }

                        retval.success = true;
                        retval.data.message = "Nodes existing with the same MD5 at other locations: " + nodeIds.join(', ');

                        retval.data.md5Match = true;
                        retval.data.nodes = md5Nodes;

                        return callback(null, retval);
                    }

                    retval.data.message = "Remote file " + remotePath + " does not exist";

                    return callback(null, retval);
                });
            }
        }

        retval.success = true;
        retval.data.pathMatch = true;
        retval.data.node = pathNode;
        retval.data.message = "Remote file " + remotePath + " exists";

        if (localPath) {
            var remoteMd5 = pathNode.get('contentProperties.md5');
            if (remoteMd5) {
                var localMd5 = Utils.getFileMd5(localPath);
                if (remoteMd5 === localMd5) {
                    retval.data.message = "File " + remotePath + " exists and is identical to local copy"
                    retval.data.md5Match = true;
                } else {
                    retval.data.message = "File " + remotePath + " exists but does not match local checksum"
                }
            } else {
                retval.data.message = "File " + remotePath + " exists but no checksum is available"
            }
        }

        return callback(null, retval);
    })
};

Node.filter = function (filters, callback) {
    return cache.filter(filters, callback);
};

Node.getRoot = function (callback) {
    Node.loadByName('Cloud Drive', function (err, nodes) {
        if (err) {
            return callback(err);
        }

        if (nodes.length === 0) {
            return callback(new Error("No node by name 'Cloud Drive' found in the local cache"));
        }

        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].isRoot() === true) {
                return callback(null, nodes[i]);
            }
        }

        return callback(new Error("Unable to find root node"));
    });
};

Node.init = function (userAccount, cacheStore) {
    if (initialized === false) {
        account = userAccount;
        cache = cacheStore;
    }

    initialized = true;
};

Node.loadById = function (id, callback) {
    return cache.findNodeById(id, callback);
};

Node.loadByName = function (name, callback) {
    return cache.findNodesByName(name, callback);
};

Node.loadByMd5 = function (md5, callback) {
    return cache.findNodesByMd5(md5, callback);
};

Node.loadByPath = function (remotePath, callback) {
    if (remotePath === undefined) {
        remotePath = '';
    }

    remotePath = Utils.trimPath(remotePath);
    if (!remotePath) {
        return Node.getRoot(callback);
    }

    var basename = path.basename(remotePath);

    Node.loadByName(basename, function (err, nodes) {
        if (err) {
            return callback(err);
        }

        if (nodes.length === 0) {
            return callback(null, null);
        }

        var found = null;
        async.forEach(nodes, function (node, callback) {
            node.getPath(function (err, path) {
                if (path === remotePath) {
                    found = node;
                }

                callback();
            });
        }, function () {
            return callback(null, found);
        });
    });
};

Node.searchBy = function (field, value, callback) {
    return cache.searchBy(field, value, callback);
};

Node.uploadDirectory = function (localPath, remoteFolder, options, callback) {
    localPath = path.resolve(localPath);
    remoteFolder = Utils.getPathArray(remoteFolder);
    remoteFolder.push(Utils.getPathArray(localPath).pop());
    remoteFolder = remoteFolder.join('/');

    var iterateDirectory = function (directory, callback) {
        fs.readdir(directory, function (err, list) {
            async.forEachSeries(list, function (item, callback) {
                var itemPath = directory + "/" + item;
                var remotePath = path.dirname(itemPath).replace(localPath, remoteFolder);
                fs.stat(itemPath, function (err, stat) {
                    if (stat.isDirectory()) {
                        return iterateDirectory(itemPath, callback);
                    }

                    return Node.uploadFile(itemPath, remotePath, options, function (err, data) {
                        if (options.fileUploadCallback !== undefined) {
                            return options.fileUploadCallback(itemPath, remotePath, data, callback);
                        }

                        callback();
                    });
                });
            }, function () {
                callback(null);
            });
        });
    };

    iterateDirectory(localPath, callback);
};

Node.uploadFile = function (localPath, remotePath, options, callback) {
    var retval = {
        success: false,
        data: {}
    };

    var opts = {
        overwrite: false,
        suppressDedupe: false,
    };

    for (var key in options) {
        if (opts[key] !== undefined) {
            opts[key] = options[key];
        }
    }

    var basename = path.basename(localPath);

    remotePath = Utils.getPathArray(remotePath).join('/');

    Node.createDirectoryPath(remotePath, function (err, data) {
        if (data.success === false) {
            return callback(null, data);
        }

        var remoteFolder = data.data;

        Node.exists(remotePath + "/" + path.basename(localPath), localPath, function (err, data) {
            if (data.success === true) {
                // Node exists remotely
                if (data.data.pathMatch === true && data.data.md5Match === true) {
                    retval.data = data.data;

                    return callback(null, retval);
                } else if (data.data.pathMatch === true && data.data.md5Match === false) {
                    if (opts.overwrite === true) {
                        return data.data.node.overwrite(localPath, callback);
                    }

                    retval.data = data.data;

                    return callback(null, retval);
                } else if (data.data.pathMatch === false && data.data.md5Match === true) {
                    if (opts.suppressDedupe === false) {
                        retval.data = data.data;

                        return callback(null, retval);
                    }
                }
            }

            var params = {};
            if (opts.suppressDedupe) {
                params.suppress = "deduplication";
            }

            Request.post({
                url: account.contentUrl + "nodes",
                headers: {
                    Authorization: "Bearer " + account.token.access_token
                },
                qs: params,
                formData: {
                    metadata: JSON.stringify({
                        kind: 'FILE',
                        name: basename,
                        parents: [
                            remoteFolder.get('id')
                        ]
                    }),
                    content: fs.createReadStream(localPath)
                }
            }, function (err, response, body) {
                if (err) {
                    return callback(err);
                }

                retval.data = JSON.parse(body);

                if (response.statusCode === 201) {
                    retval.success = true;
                    retval.data = new Node(retval.data);

                    return retval.data.save(function (err, data) {
                        return callback(null, retval);
                    });
                }

                return callback(null, retval);
            });
        });
    });
};

module.exports = Node;
