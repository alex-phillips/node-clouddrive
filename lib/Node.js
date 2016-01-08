'use strict';

var ParameterBag = require('./ParameterBag'),
  fs = require('fs'),
  path = require('path'),
  async = require('async'),
  Request = require('request'),
  Utils = require('./Utils'),
  initialized = false,
  account = null,
  cache = null;

class Node extends ParameterBag {
  delete(callback) {
    return cache.deleteNodeById(this.getId(), callback);
  }

  download(localPath, options, callback) {
    if (localPath === undefined || !localPath) {
      localPath = '.';
    }

    if (this.isFolder()) {
      return this.downloadFolder(localPath, options, callback);
    }

    return this.downloadFile(localPath, options, callback);
  }

  downloadFile(localPath, options, callback) {
    var retval = {
      success: false,
      data: {}
    };

    if (typeof options.onFileProgress !== 'function') {
      options.onFileProgress = () => {
      };
    }

    if (typeof options.onFileDownload !== 'function') {
      options.onFileDownload = (node, callback) => {
        callback();
      };
    }

    if (typeof options.onFileComplete !== 'function') {
      options.onFileComplete = (node, localPath, retval, callback) => {
        callback();
      };
    }

    var stream,
      saveToFile = false;
    if (!options.stream) {
      saveToFile = true;
      localPath = path.resolve(localPath);

      if (fs.existsSync(localPath) && fs.lstatSync(localPath).isDirectory()) {
        localPath += '/' + this.getName();
      }

      if (fs.existsSync(localPath)) {
        retval.success = false;
        retval.data.exists = true;
        retval.data.md5_match = false;

        return Utils.getFileMd5(localPath, (err, md5) => {
          if (md5 === this.getMd5()) {
            retval.data.md5_match = true;
            retval.data.message = 'File already exists and is identical to remote copy';
          } else {
            retval.data.message = 'File already exists but does not match remote copy';
          }

          return options.onFileComplete(this, localPath, retval, () => {
            callback(null, retval);
          });
        });
      }

      stream = fs.createWriteStream(`${localPath}.__incomplete`);
    } else {
      stream = options.stream;
    }

    options.onFileDownload(this, () => {
      Request.get(`${account.contentUrl}nodes/${this.getId()}/content`, {
        headers: {
          Authorization: `Bearer ${account.token.access_token}`
        },
        qs: options.queryParams
      }).on('response', (response) => {
        response
          .on('data', (data) => {
            stream.write(data);
            options.onFileProgress(data);
          })
          .on('end', () => {
            if (!stream.isTTY) {
              stream.end();
            }

            retval.success = true;

            if (saveToFile) {
              return fs.rename(`${localPath}.__incomplete`, localPath, (err) => {
                if (err) {
                  return callback(err);
                }

                return options.onFileComplete(this, localPath, retval, () => {
                  callback(null, retval);
                });
              });
            }

            return options.onFileComplete(this, localPath, retval, () => {
              callback(null, retval);
            });
          });
      });
    });
  }

  downloadFolder(localPath, options, callback) {
    var retval = {
      success: true,
      data: {}
    };

    localPath = `${path.resolve(localPath)}/${this.getName()}`;

    if (!fs.existsSync(localPath)) {
      fs.mkdirSync(localPath);
    }

    this.getChildren((err, children) => {
      if (err) {
        return callback(err);
      }

      async.forEachSeries(children, (child, callback) => {
        return child.download(localPath, options, callback);
      }, (err) => {
        return callback(err, retval);
      });
    });
  }

  getChildren(callback) {
    return cache.getNodeChildren(this, callback);
  }

  getCreatedDate() {
    return this.get('createdDate');
  }

  getId() {
    return this.get('id');
  }

  getKind() {
    return this.get('kind');
  }

  getMd5() {
    return this.get('contentProperties.md5');
  }

  getMetadata(generateLink, callback) {
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

    Request.get(`${account.metadataUrl}nodes/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      },
      qs: query
    }, (err, response, body) => {
      if (err) {
        return callback(err);
      }

      retval.data = JSON.parse(body);

      if (response.statusCode === 200) {
        retval.success = true;
      }

      return callback(null, retval);
    });
  }

  getModifiedDate() {
    return this.get('modifiedDate');
  }

  getName() {
    return this.get('name');
  }

  getParentIds() {
    return this.get('parents');
  }

  getPath(callback) {
    var remotePath = [];

    buildPath(this);

    function buildPath(node) {
      remotePath.push(node.getName());
      if (node.isRoot()) {
        return callback(null, remotePath.reverse().join('/'));
      }

      Node.loadById(node.getParentIds()[0], (err, parent) => {
        if (err) {
          return callback(err);
        }

        if (!parent) {
          return callback(Error(`No parent node found with id '${node.getParentIds()[0]}'`));
        }

        if (parent.isRoot()) {
          return callback(null, remotePath.reverse().join('/'));
        }

        buildPath(parent);
      });
    }
  }

  getSize() {
    return this.get('contentProperties.size');
  }

  getStatus() {
    return this.get('status');
  }

  inTrash() {
    return this.get('status') === 'TRASH';
  }

  isAsset() {
    return this.get('kind') === 'ASSET';
  }

  isFile() {
    return this.get('kind') === 'FILE';
  }

  isFolder() {
    return this.get('kind') === 'FOLDER';
  }

  isPending() {
    return this.get('status') === 'PENDING';
  }

  isRoot() {
    return this.get('isRoot');
  }

  move(newParent, callback) {
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

    Request.post(`${account.metadataUrl}nodes/${newParent.getId()}/children`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      },
      body: JSON.stringify({
        fromParent: this.getParentIds()[0],
        childId: this.getId()
      })
    }, (err, response, body) => {
      if (err) {
        return callback(err);
      }

      retval.data = JSON.parse(body);

      if (response.statusCode === 200) {
        retval.success = true;
        this.replace(retval.data);
        return this.save(() => {
          return callback(null, retval);
        });
      }

      return callback(null, retval);
    });
  }

  overwrite(localPath, options, callback) {
    var retval = {
      success: false,
      data: {}
    };

    if (!this.isFile()) {
      retval.data.message = 'Only file contents can be overwritten';

      return callback(null, retval);
    }

    if (typeof options.onFileComplete !== 'function') {
      options.onFileComplete = (localPath, remotePath, retval, callback) => {
        callback();
      };
    }

    if (typeof options.onFileProgress !== 'function') {
      options.onFileProgress = () => {
      };
    }

    if (typeof options.onFileUpload !== 'function') {
      options.onFileUpload = (localPath, callback) => {
        callback();
      };
    }

    options.onFileUpload(localPath, () => {
      var progressInterval = null;
      var request = Request.put(`${account.contentUrl}nodes/${this.getId()}/content`, {
        headers: {
          Authorization: `Bearer ${account.token.access_token}`
        },
        formData: {
          content: fs.createReadStream(localPath)
        }
      }, (err, response, body) => {
        clearInterval(progressInterval);
        if (err) {
          return callback(err);
        }

        retval.data = JSON.parse(body);

        this.getPath((err, remotePath) => {
          if (err) {
            return callback(err);
          }

          if (response.statusCode === 200) {
            retval.success = true;
            this.replace(retval.data);

            return this.save(() => {
              options.onFileComplete(localPath, remotePath, retval, () => {
                callback(null, retval);
              });
            });
          }

          options.onFileComplete(localPath, remotePath, retval, () => {
            callback(null, retval);
          });
        });
      });

      progressInterval = setInterval(() => {
        options.onFileProgress(localPath, request.req);
      }, 250);
    });
  }

  rename(name, callback) {
    var retval = {
      success: false,
      data: {}
    };

    Request.patch(`${account.metadataUrl}nodes/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      },
      body: JSON.stringify({
        name: name
      })
    }, (err, response, body) => {
      if (err) {
        return callback(err);
      }

      retval.data = JSON.parse(body);

      if (response.statusCode === 200) {
        retval.success = true;
        this.replace(retval.data);

        return this.save(() => {
          return callback(null, retval);
        });
      }

      return callback(null, retval);
    });
  }

  restore(callback) {
    var retval = {
      success: false,
      data: {}
    };

    if (this.getStatus() === 'AVAILABLE') {
      retval.data.message = 'Node is not in the trash';

      return callback(null, retval);
    }

    Request.post(`${account.metadataUrl}trash/${this.getId()}/restore`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      }
    }, (err, response, body) => {
      if (err) {
        return callback(err);
      }

      retval.data = JSON.parse(body);

      if (response.statusCode === 200) {
        retval.success = true;
        this.replace(retval.data);

        return this.save(() => {
          return callback(null, retval);
        });
      }

      return callback(null, retval);
    });
  }

  save(callback) {
    return cache.saveNode(this, callback);
  }

  trash(callback) {
    var retval = {
      success: false,
      data: {}
    };

    if (this.inTrash()) {
      retval.data.message = 'Node is already in the trash';

      return callback(null, retval);
    }

    Request.put(`${account.metadataUrl}trash/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      }
    }, (err, response, body) => {
      if (err) {
        return callback(err);
      }

      retval.data = JSON.parse(body);
      if (response.statusCode === 200) {
        retval.success = true;
        this.replace(retval.data);

        return this.save(() => {
          return callback(null, retval);
        });
      }

      return callback(null, retval);
    });
  }

  static createDirectoryPath(path, callback) {
    var retval = {
      success: false,
      data: {}
    };

    Node.loadByPath(path, (err, node) => {
      if (err) {
        return callback(err);
      }

      if (node) {
        retval.success = true;
        retval.data = node;

        return callback(null, retval);
      }

      path = Utils.getPathArray(path);
      Node.getRoot((err, root) => {
        if (err) {
          return callback(err);
        }

        var previousNode = root;
        var remotePath = '';
        async.forEachSeries(path, (part, callback) => {
          remotePath += '/' + part;
          Node.loadByPath(remotePath, (err, node) => {
            if (err) {
              return callback(err);
            }

            if (!node) {
              return Node.createFolder(part, previousNode.getId(), (err, data) => {
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
        }, (err) => {
          if (err) {
            return callback(err);
          }

          retval.success = true;
          retval.data = previousNode;
          callback(null, retval);
        });
      });
    });
  }

  static createFolder(name, parentId, callback) {
    var retval = {
      success: false,
      data: {}
    };

    if (!(parentId instanceof Array)) {
      parentId = [parentId];
    }

    Request.post(`${account.metadataUrl}nodes`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      },
      body: JSON.stringify({
        name: name,
        parents: parentId,
        kind: 'FOLDER'
      })
    }, (err, response, body) => {
      if (err) {
        return callback(err);
      }

      retval.data = JSON.parse(body);

      if (response.statusCode === 201) {
        retval.success = true;
        retval.data = new Node(retval.data);

        return retval.data.save((err, data) => {
          if (err) {
            return callback(err);
          }

          callback(null, retval);
        });
      }

      callback(null, retval);
    });
  }

  static exists(remotePath, localPath, callback) {
    var retval = {
      success: false,
      data: {
        message: '',
        exists: false,
        md5Match: false,
        pathMatch: false
      }
    };

    return Node.loadByPath(remotePath, (err, pathNode) => {
      if (err) {
        return callback(err);
      }

      if (!pathNode) {
        if (localPath) {
          return Utils.getFileMd5(localPath, (err, md5) => {
            Node.loadByMd5(md5, (err, md5Nodes) => {
              if (err) {
                return callback(err);
              }

              if (md5Nodes.length > 0) {
                var nodeIds = [];
                for (let i = 0; i < md5Nodes.length; i++) {
                  nodeIds.push(md5Nodes[i].getId());
                }

                retval.success = true;
                retval.data.exists = true;
                retval.data.message = 'Nodes existing with the same MD5 at other locations: ' + nodeIds.join(', ');

                retval.data.md5Match = true;
                retval.data.nodes = md5Nodes;

                return callback(null, retval);
              }

              retval.data.message = `Remote file '${remotePath}' does not exist`;

              return callback(null, retval);
            });
          });
        }
      }

      retval.success = true;
      retval.data.exists = true;
      retval.data.pathMatch = true;
      retval.data.node = pathNode;
      retval.data.message = `Remote file '${remotePath}' exists`;

      if (localPath) {
        var remoteMd5 = pathNode.getMd5();
        if (remoteMd5) {
          return Utils.getFileMd5(localPath, (err, localMd5) => {
            if (remoteMd5 === localMd5) {
              retval.data.message = `File '${remotePath}' exists and is identical to local copy`;
              retval.data.md5Match = true;
            } else {
              retval.data.message = `File '${remotePath}' exists but does not match local checksum`;
            }

            return callback(null, retval);
          });
        } else {
          retval.data.message = `File '${remotePath}' exists but no checksum is available`;
        }
      }

      return callback(null, retval);
    });
  }

  static filter(filters, callback) {
    return cache.filter(filters, callback);
  }

  static getRoot(callback) {
    Node.loadByName('Cloud Drive', (err, nodes) => {
      if (err) {
        return callback(err);
      }

      if (nodes.length === 0) {
        return callback(Error('No node by name `Cloud Drive` found in the local cache'));
      }

      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].isRoot() === true) {
          return callback(null, nodes[i]);
        }
      }

      return callback(Error('Unable to find root node'));
    });
  }

  static init(userAccount, cacheStore) {
    if (initialized === false) {
      account = userAccount;
      cache = cacheStore;
    }

    initialized = true;
  }

  static loadById(id, callback) {
    return cache.findNodeById(id, callback);
  }

  static loadByName(name, callback) {
    return cache.findNodesByName(name, callback);
  }

  static loadByMd5(md5, callback) {
    return cache.findNodesByMd5(md5, callback);
  }

  static loadByPath(remotePath, callback) {
    if (remotePath === undefined) {
      remotePath = '';
    }

    remotePath = Utils.trimPath(remotePath);
    if (!remotePath) {
      return Node.getRoot(callback);
    }

    var basename = path.basename(remotePath);

    Node.loadByName(basename, (err, nodes) => {
      if (err) {
        return callback(err);
      }

      if (nodes.length === 0) {
        return callback(null, null);
      }

      var found = null;
      async.forEach(nodes, (node, callback) => {
        node.getPath((err, path) => {
          if (err) {
            return callback(err);
          }

          if (path === remotePath) {
            found = node;
          }

          callback();
        });
      }, (err) => {
        return callback(err, found);
      });
    });
  }

  static searchBy(field, value, callback) {
    return cache.searchBy(field, value, callback);
  }

  static uploadDirectory(localPath, remoteFolder, options, callback) {
    localPath = path.resolve(localPath);

    if (remoteFolder === undefined) {
      remoteFolder = '/';
    }

    remoteFolder = Utils.getPathArray(remoteFolder);
    remoteFolder.push(Utils.getPathArray(localPath).pop());
    remoteFolder = remoteFolder.join('/');

    var iterateDirectory = (directory, callback) => {
      fs.readdir(directory, (err, list) => {
        if (err) {
          return callback(err);
        }

        async.forEachSeries(list, (item, callback) => {
          var itemPath = `${directory}/${item}`;
          var remotePath = path.dirname(itemPath).replace(localPath, remoteFolder);
          fs.stat(itemPath, (err, stat) => {
            if (err) {
              return callback(err);
            }

            if (stat.isDirectory()) {
              return iterateDirectory(itemPath, callback);
            }

            return Node.uploadFile(itemPath, remotePath, options, (err, data) => {
              if (err) {
                return callback(err);
              }

              callback();
            });
          });
        }, (err) => {
          callback(err);
        });
      });
    };

    iterateDirectory(localPath, callback);
  }

  static uploadFile(localPath, remotePath, options, callback) {
    var retval = {
      success: false,
      data: {}
    };

    var defaultOptions = {
      overwrite: false,
      suppressDedupe: false
    };

    for (let key in defaultOptions) {
      if (options[key] === undefined) {
        options[key] = defaultOptions[key];
      }
    }

    if (typeof options.onFileComplete !== 'function') {
      options.onFileComplete = (localPath, remotePath, retval, callback) => {
        callback();
      };
    }

    if (typeof options.onFileProgress !== 'function') {
      options.onFileProgress = () => {
      };
    }

    if (typeof options.onFileUpload !== 'function') {
      options.onFileUpload = (localPath, callback) => {
        callback();
      };
    }

    var basename = path.basename(localPath);

    remotePath = Utils.getPathArray(remotePath ? remotePath : '/').join('/');

    Node.createDirectoryPath(remotePath, (err, data) => {
      if (err) {
        return callback(err);
      }

      if (data.success === false) {
        return callback(null, data);
      }

      var remoteFolder = data.data;

      Node.exists(`${remotePath}/${path.basename(localPath)}`, localPath, (err, data) => {
        if (err) {
          return callback(err);
        }

        if (data.success === true) {
          // Node exists remotely
          if (data.data.pathMatch === true && data.data.md5Match === true) {
            retval.data = data.data;

            return options.onFileComplete(localPath, remotePath, retval, () => {
              callback(null, retval);
            });
          } else if (data.data.pathMatch === true && data.data.md5Match === false) {
            if (options.overwrite === true) {
              return data.data.node.overwrite(localPath, options, callback);
            }

            retval.data = data.data;

            return options.onFileComplete(localPath, remotePath, retval, () => {
              callback(null, retval);
            });
          } else if (data.data.pathMatch === false && data.data.md5Match === true) {
            if (options.suppressDedupe === false) {
              retval.data = data.data;

              return options.onFileComplete(localPath, remotePath, retval, () => {
                callback(null, retval);
              });
            }
          }
        }

        var params = {};
        if (options.suppressDedupe) {
          params.suppress = 'deduplication';
        }

        options.onFileUpload(localPath, () => {
          var progressInterval = null;
          var request = Request.post({
            url: `${account.contentUrl}nodes`,
            headers: {
              Authorization: `Bearer ${account.token.access_token}`
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
          }, (err, response, body) => {
            clearInterval(progressInterval);
            if (err) {
              return callback(err);
            }

            retval.data = JSON.parse(body);
            retval.data.statusCode = response.statusCode;

            if (response.statusCode === 201) {
              retval.success = true;
              retval.data = new Node(retval.data);

              return retval.data.save((err, data) => {
                if (err) {
                  return callback(err);
                }

                return options.onFileComplete(localPath, remotePath, retval, () => {
                  callback(null, retval);
                });
              });
            } else if (response.statusCode === 401 || response.statusCode === 400 || response.statusCode === 500 || response.statusCode === 503) {
              if (options.retry >= options.retryAttempts) {
                retval.data.message = 'Failed retry attempt(s).';

                return options.onFileComplete(localPath, remotePath, retval, () => {
                  callback(null, retval);
                });
              }

              return account.sync({}, (err, data) => {
                if (err) {
                  return callback(err);
                }

                account.authorize(null, (err, data) => {
                  if (err) {
                    return callback(err);
                  }

                  if (data.success) {
                    var retryOptions = {};
                    for (let key in options) {
                      retryOptions[key] = options[key];
                    }

                    retryOptions.overwrite = true;
                    retryOptions.retry++;

                    retval.success = false;
                    retval.data.message = 'Token expired. Reauthenticating and retrying.';
                    retval.retry = true;

                    return options.onFileComplete(localPath, remotePath, retval, () => {
                      Node.uploadFile(localPath, remotePath, retryOptions, callback);
                    });
                  }

                  return callback(Error('Failed to reauthenticate with Cloud Drive: ' + JSON.stringify(data.data)));
                });
              });
            }

            return options.onFileComplete(localPath, remotePath, retval, () => {
              callback(null, retval);
            });
          });

          progressInterval = setInterval(() => {
            options.onFileProgress(localPath, request.req);
          }, 250);
        });
      });
    });
  }
}

module.exports = Node;
