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

Node.prototype = ParameterBag.prototype;
Node.prototype.constructor = Node;

Node.prototype.delete = function(callback) {
  return cache.deleteNodeById(this.getId(), callback);
};

Node.prototype.download = function(localPath, options, callback) {
  if (localPath === undefined || !localPath) {
    localPath = '.';
  }

  if (this.isFolder()) {
    return this.downloadFolder(localPath, options, callback);
  }

  return this.downloadFile(localPath, options, callback);
};

Node.prototype.downloadFile = function(localPath, options, callback) {
  var retval = {
    success: false,
    data: {}
  };

  localPath = path.resolve(localPath);

  if (fs.existsSync(localPath)) {
    if (fs.lstatSync(localPath).isDirectory()) {
      localPath += '/' + this.getName();
    } else {
      retval.data.message = 'File already exists';

      return callback(null, retval);
    }
  }

  if (typeof options.onFileProgress !== 'function') {
    options.onFileProgress = function() {
    };
  }

  if (typeof options.onFileDownload !== 'function') {
    options.onFileDownload = function(node, callback) {
      callback();
    };
  }

  if (typeof options.onFileComplete !== 'function') {
    options.onFileComplete = function(node, localPath, retval, callback) {
      callback();
    };
  }

  var self = this;
  options.onFileDownload(this, function() {
    Request.get(account.contentUrl + 'nodes/' + self.getId() + '/content', {
      headers: {
        Authorization: 'Bearer ' + account.token.access_token
      }
    })
      .on('data', options.onFileProgress)
      .pipe(fs.createWriteStream(localPath))
      .on('finish', function() {
        retval.success = true;

        return options.onFileComplete(self, localPath, retval, function() {
          callback(null, retval);
        });
      });
  });
};

Node.prototype.downloadFolder = function(localPath, options, callback) {
  var retval = {
    success: true,
    data: {}
  };

  localPath = path.resolve(localPath) + '/' + this.getName();

  if (!fs.existsSync(localPath)) {
    fs.mkdirSync(localPath);
  }

  this.getChildren(function(err, children) {
    if (err) {
      return callback(err);
    }

    async.forEachSeries(children, function(child, callback) {
      return child.download(localPath, options, callback);
    }, function() {
      return callback(null, retval);
    });
  });
};

Node.prototype.getChildren = function(callback) {
  return cache.getNodeChildren(this, callback);
};

Node.prototype.getCreatedDate = function() {
  return this.get('createdDate');
};

Node.prototype.getId = function() {
  return this.get('id');
};

Node.prototype.getKind = function() {
  return this.get('kind');
};

Node.prototype.getMd5 = function() {
  return this.get('contentProperties.md5');
};

Node.prototype.getMetadata = function(generateLink, callback) {
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

  Request.get(account.metadataUrl + 'nodes/' + this.getId(), {
    headers: {
      Authorization: 'Bearer ' + account.token.access_token
    },
    qs: query
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    retval.data = JSON.parse(body);

    if (response.statusCode === 200) {
      retval.success = true;
    }

    return callback(null, retval);
  });
};

Node.prototype.getModifiedDate = function() {
  return this.get('modifiedDate');
};

Node.prototype.getName = function() {
  return this.get('name');
};

Node.prototype.getParentIds = function() {
  return this.get('parents');
};

Node.prototype.getPath = function(callback) {
  var remotePath = [];

  buildPath(this);

  function buildPath(node) {
    remotePath.push(node.getName());
    if (node.isRoot()) {
      return callback(null, remotePath.reverse().join('/'));
    }

    Node.loadById(node.getParentIds()[0], function(err, parent) {
      if (err) {
        return callback(err);
      }

      if (!parent) {
        return callback(new Error('No parent node found with id \'' + node.getParentIds()[0]) + '\'');
      }

      if (parent.isRoot()) {
        return callback(null, remotePath.reverse().join('/'));
      }

      buildPath(parent);
    });
  }
};

Node.prototype.getSize = function() {
  return this.get('contentProperties.size');
};

Node.prototype.getStatus = function() {
  return this.get('status');
};

Node.prototype.inTrash = function() {
  return this.get('status') === 'TRASH';
};

Node.prototype.isAsset = function() {
  return this.get('kind') === 'ASSET';
};

Node.prototype.isFile = function() {
  return this.get('kind') === 'FILE';
};

Node.prototype.isFolder = function() {
  return this.get('kind') === 'FOLDER';
};

Node.prototype.isPending = function() {
  return this.get('status') === 'PENDING';
};

Node.prototype.isRoot = function() {
  return this.get('isRoot');
};

Node.prototype.move = function(newParent, callback) {
  var retval = {
    success: false,
    data: {}
  };

  if (!newParent.isFolder()) {
    retval.data.message = 'New parent must be a FOLDER node';
    return callback(null, retval);
  }

  if (!this.isFile() && !this.isFolder()) {
    retval.data.message = 'You can only move FILE and FOLDER nodes';
    return callback(null, retval);
  }

  var self = this;
  Request.post(account.metadataUrl + 'nodes/' + newParent.getId() + '/children', {
    headers: {
      Authorization: 'Bearer ' + account.token.access_token
    },
    body: JSON.stringify({
      fromParent: self.getParentIds()[0],
      childId: self.getId()
    })
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    retval.data = JSON.parse(body);

    if (response.statusCode === 200) {
      retval.success = true;
      self.replace(retval.data);
      return self.save(function() {
        return callback(null, retval);
      });
    }

    return callback(null, retval);
  });
};

Node.prototype.overwrite = function(localPath, options, callback) {
  var retval = {
    success: false,
    data: {}
  };

  if (!this.isFile()) {
    retval.data.message = 'Only file contents can be overwritten';

    return callback(null, retval);
  }

  if (typeof options.onFileComplete !== 'function') {
    options.onFileComplete = function(localPath, remotePath, retval, callback) {
      callback();
    };
  }

  if (typeof options.onFileProgress !== 'function') {
    options.onFileProgress = function() {
    };
  }

  if (typeof options.onFileUpload !== 'function') {
    options.onFileUpload = function(localPath, callback) {
      callback();
    };
  }

  var self = this;
  options.onFileUpload(localPath, function() {
    var progressInterval = null;
    var request = Request.put(account.contentUrl + 'nodes/' + self.getId() + '/content', {
      headers: {
        Authorization: 'Bearer ' + account.token.access_token
      },
      formData: {
        content: fs.createReadStream(localPath)
      }
    }, function(err, response, body) {
      clearInterval(progressInterval);
      if (err) {
        return callback(err);
      }

      retval.data = JSON.parse(body);

      self.getPath(function(err, remotePath) {
        if (err) {
          return callback(err);
        }

        if (response.statusCode === 200) {
          retval.success = true;
          self.replace(retval.data);

          return self.save(function() {
            options.onFileComplete(localPath, remotePath, retval, function() {
              callback(null, retval);
            });
          });
        }

        options.onFileComplete(localPath, remotePath, retval, function() {
          callback(null, retval);
        });
      });
    });

    progressInterval = setInterval(function() {
      options.onFileProgress(request.req);
    }, 250);
  });
};

Node.prototype.rename = function(name, callback) {
  var retval = {
    success: false,
    data: {}
  };

  var self = this;
  Request.patch(account.metadataUrl + 'nodes/' + self.getId(), {
    headers: {
      Authorization: 'Bearer ' + account.token.access_token
    },
    body: JSON.stringify({
      name: name
    })
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    retval.data = JSON.parse(body);

    if (response.statusCode === 200) {
      retval.success = true;
      self.replace(retval.data);

      return self.save(function() {
        return callback(null, retval);
      });
    }

    return callback(null, retval);
  });
};

Node.prototype.restore = function(callback) {
  var retval = {
    success: false,
    data: {}
  };

  if (this.getStatus() === 'AVAILABLE') {
    retval.data.message = 'Node is not in the trash';

    return callback(null, retval);
  }

  var self = this;
  Request.post(account.metadataUrl + 'trash/' + self.getId() + '/restore', {
    headers: {
      Authorization: 'Bearer ' + account.token.access_token
    }
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    retval.data = JSON.parse(body);

    if (response.statusCode === 200) {
      retval.success = true;
      self.replace(retval.data);

      return self.save(function() {
        return callback(null, retval);
      });
    }

    return callback(null, retval);
  });
};

Node.prototype.save = function(callback) {
  return cache.saveNode(this, callback);
};

Node.prototype.trash = function(callback) {
  var retval = {
    success: false,
    data: {}
  };

  if (this.inTrash()) {
    retval.data.message = 'Node is already in the trash';

    return callback(null, retval);
  }

  var self = this;
  Request.put(account.metadataUrl + 'trash/' + self.getId(), {
    headers: {
      Authorization: 'Bearer ' + account.token.access_token
    }
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    retval.data = JSON.parse(body);
    if (response.statusCode === 200) {
      retval.success = true;
      self.replace(retval.data);

      return self.save(function() {
        return callback(null, retval);
      });
    }

    return callback(null, retval);
  });
};

Node.createDirectoryPath = function(path, callback) {
  var retval = {
    success: false,
    data: {}
  };

  Node.loadByPath(path, function(err, node) {
    if (err) {
      return callback(err);
    }

    if (node) {
      retval.success = true;
      retval.data = node;

      return callback(null, retval);
    }

    path = Utils.getPathArray(path);
    Node.getRoot(function(err, root) {
      if (err) {
        return callback(err);
      }

      var previousNode = root;
      var remotePath = '';
      async.forEachSeries(path, function(part, callback) {
        remotePath += '/' + part;
        Node.loadByPath(remotePath, function(err, node) {
          if (err) {
            return callback(err);
          }

          if (!node) {
            return Node.createFolder(part, previousNode.getId(), function(err, data) {
              if (err) {
                return callback(err);
              }

              previousNode = data.data;
              callback();
            });
          }

          previousNode = node;
          callback();
        });
      }, function() {
        retval.success = true;
        retval.data = previousNode;
        callback(null, retval);
      });
    });
  });
};

Node.createFolder = function(name, parentId, callback) {
  var retval = {
    success: false,
    data: {}
  };

  if (!(parentId instanceof Array)) {
    parentId = [parentId];
  }

  Request.post(account.metadataUrl + 'nodes', {
    headers: {
      Authorization: 'Bearer ' + account.token.access_token
    },
    body: JSON.stringify({
      name: name,
      parents: parentId,
      kind: 'FOLDER'
    })
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    retval.data = JSON.parse(body);

    if (response.statusCode === 201) {
      retval.success = true;
      retval.data = new Node(retval.data);

      return retval.data.save(function(err, data) {
        if (err) {
          return callback(err);
        }

        callback(null, retval);
      });
    }

    callback(null, retval);
  });
};

Node.exists = function(remotePath, localPath, callback) {
  var retval = {
    success: false,
    data: {
      message: '',
      exists: false,
      md5Match: false,
      pathMatch: false
    }
  };

  return Node.loadByPath(remotePath, function(err, pathNode) {
    if (err) {
      return callback(err);
    }

    if (!pathNode) {
      if (localPath) {
        return Utils.getFileMd5(localPath, function(err, md5) {
          Node.loadByMd5(md5, function(err, md5Nodes) {
            if (err) {
              return callback(err);
            }

            if (md5Nodes.length > 0) {
              var nodeIds = [];
              for (var i = 0; i < md5Nodes.length; i++) {
                nodeIds.push(md5Nodes[i].getId());
              }

              retval.success = true;
              retval.data.exists = true;
              retval.data.message = 'Nodes existing with the same MD5 at other locations: ' + nodeIds.join(', ');

              retval.data.md5Match = true;
              retval.data.nodes = md5Nodes;

              return callback(null, retval);
            }

            retval.data.message = 'Remote file ' + remotePath + ' does not exist';

            return callback(null, retval);
          });
        });
      }
    }

    retval.success = true;
    retval.data.exists = true;
    retval.data.pathMatch = true;
    retval.data.node = pathNode;
    retval.data.message = 'Remote file ' + remotePath + ' exists';

    if (localPath) {
      var remoteMd5 = pathNode.getMd5();
      if (remoteMd5) {
        return Utils.getFileMd5(localPath, function(err, localMd5) {
          if (remoteMd5 === localMd5) {
            retval.data.message = 'File ' + remotePath + ' exists and is identical to local copy';
            retval.data.md5Match = true;
          } else {
            retval.data.message = 'File ' + remotePath + ' exists but does not match local checksum';
          }

          return callback(null, retval);
        });
      } else {
        retval.data.message = 'File ' + remotePath + ' exists but no checksum is available';
      }
    }

    return callback(null, retval);
  });
};

Node.filter = function(filters, callback) {
  return cache.filter(filters, callback);
};

Node.getRoot = function(callback) {
  Node.loadByName('Cloud Drive', function(err, nodes) {
    if (err) {
      return callback(err);
    }

    if (nodes.length === 0) {
      return callback(new Error('No node by name \'Cloud Drive\' found in the local cache'));
    }

    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].isRoot() === true) {
        return callback(null, nodes[i]);
      }
    }

    return callback(new Error('Unable to find root node'));
  });
};

Node.init = function(userAccount, cacheStore) {
  if (initialized === false) {
    account = userAccount;
    cache = cacheStore;
  }

  initialized = true;
};

Node.loadById = function(id, callback) {
  return cache.findNodeById(id, callback);
};

Node.loadByName = function(name, callback) {
  return cache.findNodesByName(name, callback);
};

Node.loadByMd5 = function(md5, callback) {
  return cache.findNodesByMd5(md5, callback);
};

Node.loadByPath = function(remotePath, callback) {
  if (remotePath === undefined) {
    remotePath = '';
  }

  remotePath = Utils.trimPath(remotePath);
  if (!remotePath) {
    return Node.getRoot(callback);
  }

  var basename = path.basename(remotePath);

  Node.loadByName(basename, function(err, nodes) {
    if (err) {
      return callback(err);
    }

    if (nodes.length === 0) {
      return callback(null, null);
    }

    var found = null;
    async.forEach(nodes, function(node, callback) {
      node.getPath(function(err, path) {
        if (err) {
          return callback(err);
        }

        if (path === remotePath) {
          found = node;
        }

        callback();
      });
    }, function() {
      return callback(null, found);
    });
  });
};

Node.searchBy = function(field, value, callback) {
  return cache.searchBy(field, value, callback);
};

Node.uploadDirectory = function(localPath, remoteFolder, options, callback) {
  localPath = path.resolve(localPath);

  if (remoteFolder === undefined) {
    remoteFolder = '/';
  }

  remoteFolder = Utils.getPathArray(remoteFolder);
  remoteFolder.push(Utils.getPathArray(localPath).pop());
  remoteFolder = remoteFolder.join('/');

  var iterateDirectory = function(directory, callback) {
    fs.readdir(directory, function(err, list) {
      if (err) {
        return callback(err);
      }

      async.forEachSeries(list, function(item, callback) {
        var itemPath = directory + '/' + item;
        var remotePath = path.dirname(itemPath).replace(localPath, remoteFolder);
        fs.stat(itemPath, function(err, stat) {
          if (err) {
            return callback(err);
          }

          if (stat.isDirectory()) {
            return iterateDirectory(itemPath, callback);
          }

          return Node.uploadFile(itemPath, remotePath, options, function(err, data) {
            if (err) {
              return callback(err);
            }

            callback();
          });
        });
      }, function() {
        callback(null);
      });
    });
  };

  iterateDirectory(localPath, callback);
};

Node.uploadFile = function(localPath, remotePath, options, callback) {
  var retval = {
    success: false,
    data: {}
  };

  var defaultOptions = {
    overwrite: false,
    suppressDedupe: false
  };

  for (var key in defaultOptions) {
    if (options[key] === undefined) {
      options[key] = defaultOptions[key];
    }
  }

  if (typeof options.onFileComplete !== 'function') {
    options.onFileComplete = function(localPath, remotePath, retval, callback) {
      callback();
    };
  }

  if (typeof options.onFileProgress !== 'function') {
    options.onFileProgress = function() {
    };
  }

  if (typeof options.onFileUpload !== 'function') {
    options.onFileUpload = function(localPath, callback) {
      callback();
    };
  }

  var basename = path.basename(localPath);

  remotePath = Utils.getPathArray(remotePath).join('/');

  Node.createDirectoryPath(remotePath, function(err, data) {
    if (err) {
      return callback(err);
    }

    if (data.success === false) {
      return callback(null, data);
    }

    var remoteFolder = data.data;

    Node.exists(remotePath + '/' + path.basename(localPath), localPath, function(err, data) {
      if (err) {
        return callback(err);
      }

      if (data.success === true) {
        // Node exists remotely
        if (data.data.pathMatch === true && data.data.md5Match === true) {
          retval.data = data.data;

          return options.onFileComplete(localPath, remotePath, retval, function() {
            callback(null, retval);
          });
        } else if (data.data.pathMatch === true && data.data.md5Match === false) {
          if (options.overwrite === true) {
            return data.data.node.overwrite(localPath, options, callback);
          }

          retval.data = data.data;

          return options.onFileComplete(localPath, remotePath, retval, function() {
            callback(null, retval);
          });
        } else if (data.data.pathMatch === false && data.data.md5Match === true) {
          if (options.suppressDedupe === false) {
            retval.data = data.data;

            return options.onFileComplete(localPath, remotePath, retval, function() {
              callback(null, retval);
            });
          }
        }
      }

      var params = {};
      if (options.suppressDedupe) {
        params.suppress = 'deduplication';
      }

      options.onFileUpload(localPath, function() {
        var progressInterval = null;
        var request = Request.post({
          url: account.contentUrl + 'nodes',
          headers: {
            Authorization: 'Bearer ' + account.token.access_token
          },
          qs: params,
          formData: {
            metadata: JSON.stringify({
              kind: 'FILE',
              name: basename,
              parents: [
                remoteFolder.getId()
              ]
            }),
            content: fs.createReadStream(localPath)
          }
        }, function(err, response, body) {
          clearInterval(progressInterval);
          if (err) {
            return callback(err);
          }

          retval.data = JSON.parse(body);

          if (response.statusCode === 201) {
            retval.success = true;
            retval.data = new Node(retval.data);

            return retval.data.save(function(err, data) {
              if (err) {
                return callback(err);
              }

              return options.onFileComplete(localPath, remotePath, retval, function() {
                callback(null, retval);
              });
            });
          } else if (response.statusCode === 401) {
            return account.authorize(null, function(err, data) {
              if (err) {
                return callback(err);
              }

              if (data.success) {
                return callback(null, retval);
              }

              throw new Error('Failed to reauthenticate with Cloud Drive: ' + JSON.stringify(data.data));
            });
          }

          if (typeof options.onFileComplete === 'function') {
            return options.onFileComplete(localPath, remotePath, retval, function() {
              callback(null, retval);
            });
          }

          return callback(null, retval);
        });

        progressInterval = setInterval(function() {
          options.onFileProgress(request.req);
        }, 250);
      });
    });
  });
};

module.exports = Node;
