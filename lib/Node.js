'use strict';

let ParameterBag = require('./ParameterBag'),
  fs = require('fs'),
  path = require('path'),
  async = require('async'),
  got = require('got'),
  Utils = require('./Utils'),
  mkdirp = require('mkdirp'),
  FormData = require('form-data'),
  initialized = false,
  account = null,
  cache = null;

class Node extends ParameterBag {
  del(callback) {
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
    let retval = {
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
      options.onFileComplete = (response, body, retval, data, callback) => {
        callback();
      };
    }

    let stream,
      saveToFile = false;
    if (!options.stream) {
      saveToFile = true;
      localPath = path.resolve(localPath);

      try {
        let stat = fs.lstatSync(localPath);
        if (stat.isDirectory()) {
          localPath += '/' + this.getName();
        }

        if (fs.existsSync(localPath)) {
          retval.success = false;
          retval.data.exists = true;
          retval.data.md5_match = false;

          if (options.checkMd5) {
            return Utils.getFileMd5(localPath, (err, md5) => {
              if (md5 === this.getMd5()) {
                retval.data.md5_match = true;
                retval.data.message = 'File already exists and is identical to remote copy';
              } else {
                retval.data.message = 'File already exists but does not match remote copy';
              }

              return options.onFileComplete(null, null, retval, {
                node: this,
                localPath: localPath
              }, () => {
                callback(null, retval);
              });
            });
          }

          retval.data.message = 'File already exists';

          return options.onFileComplete(null, null, retval, {
            node: this,
            localPath: localPath
          }, () => {
            callback(null, retval);
          });
        }
      } catch (e) {}

      stream = fs.createWriteStream(`${localPath}.__incomplete`);
    } else {
      stream = options.stream;
    }

    options.onFileDownload(this, () => {
      let response = null,
        request = got.stream(`${account.contentUrl}nodes/${this.getId()}/content`, {
        headers: {
          Authorization: `Bearer ${account.token.access_token}`
        },
        query: options.queryParams,
        timeout: 3600000,
      })
        .on('response', res => {
          response = res;
        })
        .on('end', () => {
          if (!stream.isTTY) {
            stream.close();
          }

          retval.success = true;

          if (saveToFile) {
            fs.renameSync(`${localPath}.__incomplete`, localPath);
          }

          return options.onFileComplete(response, null, retval, {
            node: this,
            localPath: localPath
          }, () => {
            callback(null, retval);
          });
        });

      if (options.onFileProgress) {
        request.on('data', data => {
          options.onFileProgress(data);
        });
      }

      request.pipe(stream);
    });
  }

  downloadFolder(localPath, options, callback) {
    let retval = {
      success: true,
      data: {}
    };

    localPath = `${path.resolve(localPath)}/${this.getName()}`;

    try {
      fs.statSync(localPath);
    } catch (e) {
      mkdirp.sync(localPath);
    }

    this.getChildren({
      remote: options.remote,
    }, (err, children) => {
      if (err) {
        return callback(err);
      }

      async.forEachSeries(children, (child, callback) => {
        return child.download(localPath, options, callback);
      }, err => {
        return callback(err, retval);
      });
    });
  }

  getChildren(options, callback) {
    if (!options.remote) {
      return cache.getNodeChildren(this, callback);
    }

    got.get(`${account.metadataUrl}nodes/${this.getId()}/children`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      },
    })
      .then(response => {
        let children = [];
        if (response.statusCode !== 200) {
          return callback(Error(response.body));
        }

        let data = JSON.parse(response.body).data;
        for (let i = 0; i < data.length; i++) {
          children.push(new Node(data[i]));
        }

        return callback(null, children);
      })
      .catch(err => {
        return callback(err);
      });
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
    let retval = {
      success: false,
      data: {}
    };

    if (generateLink === undefined) {
      generateLink = false;
    }

    let query = {
      tempLink: generateLink
    };

    got.get(`${account.metadataUrl}nodes/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      },
      query: query
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
    let remotePath = [];

    buildPath(this);

    function buildPath(node) {
      remotePath.push(node.getName());
      if (node.isRoot()) {
        return callback(null, remotePath.reverse().join('/'));
      }

      let parent = null,
        parentIds = node.getParentIds(),
        counter = 0;

      async.whilst(
        () => {
          if (parent || counter === parentIds.length) {
            return false;
          }

          return true;
        },
        callback => {
          Node.loadById(parentIds[counter], (err, result) => {
            if (err) {
              return callback(err);
            }

            parent = result;
            counter++;
            callback(err);
          });
        },
        err => {
          if (err) {
            return callback(err);
          }

          if (!parent) {
            return callback(null, null);
          }

          if (parent.isRoot()) {
            return callback(null, remotePath.reverse().join('/'));
          }

          buildPath(parent);
        }
      );
    }
  }

  getSize() {
    return this.get('contentProperties.size');
  }

  getStatus() {
    return this.get('status');
  }

  inTrash() {
    return this.get('status') === Node.STATUS_TRASH;
  }

  isAsset() {
    return this.get('kind') === Node.KIND_ASSET;
  }

  isFile() {
    return this.get('kind') === Node.KIND_FILE;
  }

  isFolder() {
    return this.get('kind') === Node.KIND_FOLDER;
  }

  isPending() {
    return this.get('status') === Node.STATUS_PENDING;
  }

  isRoot() {
    return this.get('isRoot');
  }

  link(idParent, callback) {
    let retval = {
      success: false,
      data: {}
    };

    got.put(`${account.metadataUrl}nodes/${idParent}/children/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      }
    })
      .then(response => {
        retval.data = JSON.parse(response.body);

        if (response.statusCode === 200) {
          retval.success = true;
          this.replace(retval.data);

          return this.save(() => {
            return callback(null, retval);
          });
        }

        return callback(null, retval);
      })
      .catch(err => {
        return callback(err);
      });
  }

  unlink(idParent, callback) {
    let retval = {
      success: false,
      data: {}
    };

    got.delete(`${account.metadataUrl}nodes/${idParent}/children/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      }
    })
      .then(response => {
        retval.data = JSON.parse(response.body);

        if (response.statusCode === 200) {
          retval.success = true;
          this.replace(retval.data);

          return this.save(() => {
            return callback(null, retval);
          });
        }

        return callback(null, retval);
      })
      .catch(err => {
        return callback(err);
      });
  }

  move(newParent, callback) {
    let retval = {
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

    got.post(`${account.metadataUrl}nodes/${newParent.getId()}/children`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      },
      body: JSON.stringify({
        fromParent: this.getParentIds()[0],
        childId: this.getId()
      })
    })
      .then(response => {
        retval.data = JSON.parse(response.body);

        if (response.statusCode === 200) {
          retval.success = true;
          this.replace(retval.data);

          return this.save(() => {
            return callback(null, retval);
          });
        }

        return callback(null, retval);
      })
      .catch(err => {
        return callback(err);
      });
  }

  overwrite(localPath, options, callback) {
    let retval = {
      success: false,
      data: {}
    };

    if (!this.isFile()) {
      retval.data.message = 'Only file contents can be overwritten';

      return callback(null, retval);
    }

    if (typeof options.onFileComplete !== 'function') {
      options.onFileComplete = (response, body, retval, data, callback) => {
        callback();
      };
    }

    if (typeof options.onFileUpload !== 'function') {
      options.onFileUpload = (localPath, callback) => {
        callback();
      };
    }

    options.onFileUpload(localPath, () => {
      let progressInterval = null,
        form = new FormData(),
        stream = fs.createReadStream(localPath);

      form.append('content', stream);
      let headers = form.getHeaders();
      headers.Authorization = `Bearer ${account.token.access_token}`;

      if (options.onFileProgress) {
        stream.on('data', chunk => {
          options.onFileProgress(localPath, chunk);
        });
      }

      got.put(`${account.contentUrl}nodes/${this.getId()}/content`, {
        headers: headers,
        body: form,
        timeout: 3600000,
      })
        .then(response => {
          stream.close();

          this.getPath((err, remotePath) => {
            if (err) {
              return callback(err);
            }

            retval.data = JSON.parse(response.body);
            retval.success = true;
            this.replace(retval.data);

            return this.save(() => {
              options.onFileComplete(response, response.body, retval, {
                localPath: localPath,
                remotePath: remotePath
              }, () => {
                callback(null, retval);
              });
            });
          });
        })
        .catch(err => {
          stream.close();
          this.getPath((err, remotePath) => {
            if (err) {
              return callback(err);
            }

            if (options.retryAttempt >= options.numRetries) {
              retval.data.message = `Error ${err}. Failed retry attempt(s). Skipping file.`;

              return options.onFileComplete(null, err.message, retval, {
                localPath: localPath,
                remotePath: remotePath
              }, () => {
                callback(null, retval);
              });
            }

            return account.authorize(null, {force: true}, (err, data) => {
              if (err) {
                return callback(err);
              }

              if (data.success) {
                return account.sync({}, (err, data) => {
                  if (err) {
                    return callback(err);
                  }

                  let retryOptions = {};
                  for (let key in options) {
                    retryOptions[key] = options[key];
                  }

                  retryOptions.retry++;

                  retval.success = false;
                  retval.data.message = `Error ${err}. Reauthenticating and retrying.`;
                  retval.retry = true;

                  return options.onFileComplete(null, err.message, retval, {
                    localPath: localPath,
                    remotePath: remotePath
                  }, () => {
                    this.overwrite(localPath, retryOptions, callback);
                  });
                });
              }

              return callback(Error('Failed to reauthenticate with Cloud Drive: ' + JSON.stringify(data.data)));
            });
          });
        });
    });
  }

  rename(name, callback) {
    let retval = {
      success: false,
      data: {}
    };

    got.patch(`${account.metadataUrl}nodes/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      },
      body: JSON.stringify({
        name: name
      })
    })
      .then(response => {
        retval.data = JSON.parse(response.body);

        if (response.statusCode === 200) {
          retval.success = true;
          this.replace(retval.data);

          return this.save(() => {
            return callback(null, retval);
          });
        }

        return callback(null, retval);
      })
      .catch(err => {
        return callback(err);
      });
  }

  restore(options, callback) {
    let retval = {
      success: false,
      data: {},
    };

    if (this.getStatus() === 'AVAILABLE') {
      retval.data.message = 'Node is not in the trash';

      return callback(null, retval);
    }

    got.post(`${account.metadataUrl}trash/${this.getId()}/restore`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      }
    })
      .then(response => {
        retval.data = JSON.parse(response.body);

        if (response.statusCode === 200) {
          retval.success = true;
          this.replace(retval.data);

          return this.save(() => {
            return callback(null, retval);
          });
        }

        return callback(null, retval);
      })
      .catch(err => {
        return callback(err);
      });
  }

  save(callback) {
    return cache.saveNode(this, callback);
  }

  trash(options, callback) {
    let retval = {
      success: false,
      data: {}
    };

    if (this.inTrash()) {
      retval.data.message = 'Node is already in the trash';

      return callback(null, retval);
    }

    got.put(`${account.metadataUrl}trash/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      }
    })
      .then(response => {
        retval.data = JSON.parse(response.body);
        if (response.statusCode === 200) {
          retval.success = true;
          this.replace(retval.data);

          return this.save(() => {
            return callback(null, retval);
          });
        }

        return callback(null, retval);
      })
      .catch(err => {
        return callback(err);
      });
  }

  static createDirectoryPath(path, callback) {
    let retval = {
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

        let previousNode = root;
        let remotePath = '';
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
        }, err => {
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
    let retval = {
      success: false,
      data: {}
    };

    if (!(parentId instanceof Array)) {
      parentId = [parentId];
    }

    got.post(`${account.metadataUrl}nodes`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      },
      body: JSON.stringify({
        name: name,
        parents: parentId,
        kind: 'FOLDER'
      }),
    })
      .then(response => {
        retval.data = JSON.parse(response.body);

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
      })
      .catch(err => {
        return callback(err);
      });
  }

  static exists(remotePath, localPath, callback) {
    let retval = {
      success: false,
      data: {
        message: '',
        exists: false,
        md5Match: false,
        pathMatch: false,
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
                let nodeIds = [];
                for (let i = 0; i < md5Nodes.length; i++) {
                  nodeIds.push(md5Nodes[i].getId());
                }

                retval.success = true;
                retval.data.exists = true;
                retval.data.message = 'Nodes existing with the same MD5 at other locations: ' + nodeIds.join(', ');

                retval.data.md5Match = true;
                retval.data.nodes = nodeIds;

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
        let remoteMd5 = pathNode.getMd5();
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

  static getTrash(callback) {
    got.get(`${account.metadataUrl}trash`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      }
    })
      .then(response => {
        return callback(null, JSON.parse(response.body));
      })
      .catch(err => {
        return callback(err);
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

    let basename = path.basename(remotePath);

    Node.loadByName(basename, (err, nodes) => {
      if (err) {
        return callback(err);
      }

      if (nodes.length === 0) {
        return callback(null, null);
      }

      let found = null;
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
      }, err => {
        return callback(err, found);
      });
    });
  }

  static restore(id, callback) {
    let retval = {
      success: false,
      data: {}
    };

    got.post(`${account.metadataUrl}trash/${id}/restore`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      }
    })
      .then(response => {
        retval.data = JSON.parse(response.body);

        if (response.statusCode === 200) {
          retval.success = true;
          let node = new Node(retval.data);

          return node.save(() => {
            return callback(null, retval);
          });
        }

        return callback(null, retval);
      })
      .catch(err => {
        return callback(err);
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

    let iterateDirectory = (directory, callback) => {
      fs.readdir(directory, (err, list) => {
        if (err) {
          return callback(err);
        }

        async.forEachSeries(list, (item, callback) => {
          let itemPath = `${directory}/${item}`;
          let remotePath = path.dirname(itemPath).replace(localPath, remoteFolder);
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
        }, err => {
          callback(err);
        });
      });
    };

    iterateDirectory(localPath, callback);
  }

  static uploadFile(localPath, remotePath, options, callback) {
    let retval = {
      success: false,
      data: {}
    };

    let defaultOptions = {
      overwrite: false,
      suppressDedupe: false
    };

    for (let key in defaultOptions) {
      if (options[key] === undefined) {
        options[key] = defaultOptions[key];
      }
    }

    if (typeof options.onFileComplete !== 'function') {
      options.onFileComplete = (response, body, retval, data, callback) => {
        callback();
      };
    }

    if (typeof options.onFileUpload !== 'function') {
      options.onFileUpload = (localPath, callback) => {
        callback();
      };
    }

    let basename = path.basename(localPath);
    if (options.ignoreFiles && basename.match(new RegExp(options.ignoreFiles))) {
      return callback(null, {
        success: false,
        data: {
          message: `File '${basename}' is an ignored`
        }
      });
    }

    remotePath = Utils.getPathArray(remotePath ? remotePath : '/').join('/');

    Node.createDirectoryPath(remotePath, (err, data) => {
      if (err) {
        return callback(err);
      }

      if (data.success === false) {
        return callback(null, data);
      }

      let remoteFolder = data.data;

      Node.exists(`${remotePath}/${path.basename(localPath)}`, localPath, (err, data) => {
        if (err) {
          return callback(err);
        }

        if (options.dryRun === true) {
          return options.onFileComplete(null, null, retval, {
            localPath: localPath,
            remotePath: remotePath
          }, () => {
            callback(null, retval);
          });
        }

        if (data.success === true) {
          // Node exists remotely
          if (data.data.pathMatch === true && data.data.md5Match === true) {
            if (options.force === true) {
              return data.data.node.overwrite(localPath, options, callback);
            }

            retval.data = data.data;

            return options.onFileComplete(null, null, retval, {
              localPath: localPath,
              remotePath: remotePath
            }, () => {
              callback(null, retval);
            });
          } else if (data.data.pathMatch === true && data.data.md5Match === false) {
            if (options.overwrite === true || data.data.node.isPending()) {
              return data.data.node.overwrite(localPath, options, callback);
            }

            retval.data = data.data;

            return options.onFileComplete(null, null, retval, {
              localPath: localPath,
              remotePath: remotePath
            }, () => {
              callback(null, retval);
            });
          } else if (data.data.pathMatch === false && data.data.md5Match === true) {
            if (options.suppressDedupe === false) {
              retval.data = data.data;

              return options.onFileComplete(null, null, retval, {
                localPath: localPath,
                remotePath: remotePath
              }, () => {
                callback(null, retval);
              });
            }
          }
        }

        let params = {};
        if (options.suppressDedupe) {
          params.suppress = 'deduplication';
        }

        options.onFileUpload(localPath, () => {
          let progressInterval = null,
            form = new FormData(),
            stream = fs.createReadStream(localPath);

          form.append('metadata', JSON.stringify({
            kind: 'FILE',
            name: basename,
            parents: [
              remoteFolder.getId()
            ]
          }));
          form.append('content', stream);

          if (options.onFileProgress) {
            stream.on('data', chunk => {
              options.onFileProgress(localPath, chunk);
            });
          }

          let headers = form.getHeaders();
          headers.Authorization = `Bearer ${account.token.access_token}`;

          got.post(`${account.contentUrl}nodes`, {
            headers: headers,
            query: params,
            body: form,
            timeout: 3600000,
          })
            .then(response => {
              stream.close();
              retval.data.statusCode = response.statusCode;
              retval.data = JSON.parse(response.body);
              retval.success = true;
              retval.data = new Node(retval.data);

              return retval.data.save((err, data) => {
                if (err) {
                  return callback(err);
                }

                return options.onFileComplete(response, response.body, retval, {
                  localPath: localPath,
                  remotePath: remotePath
                }, () => {
                  callback(null, retval);
                });
              });
            })
            .catch(err => {
              stream.close();
              this.getPath((err, remotePath) => {
                if (options.retryAttempt >= options.numRetries) {
                  retval.data.message = `Error ${err}. Failed retry attempt(s). Skipping file.`;

                  return options.onFileComplete(null, err.message, retval, {
                    localPath: localPath,
                    remotePath: remotePath
                  }, () => {
                    callback(null, retval);
                  });
                }

                return account.authorize(null, {force: true}, (err, data) => {
                  if (err) {
                    return callback(err);
                  }

                  if (data.success) {
                    return account.sync({}, (err, data) => {
                      if (err) {
                        return callback(err);
                      }

                      let retryOptions = {};
                      for (let key in options) {
                        retryOptions[key] = options[key];
                      }

                      retryOptions.retryAttempt++;

                      retval.success = false;
                      retval.data.message = `Error ${err}. Reauthenticating and retrying.`;
                      retval.retry = true;

                      return options.onFileComplete(null, err.message, retval, {
                        localPath: localPath,
                        remotePath: remotePath
                      }, () => {
                        Node.uploadFile(localPath, remotePath, retryOptions, callback);
                      });
                    });
                  }

                  return callback(Error('Failed to reauthenticate with Cloud Drive: ' + JSON.stringify(data.data)));
                });
              });
            });
        });
      });
    });
  }
}

Node.STATUS_PENDING = 'PENDING';
Node.STATUS_AVAILABLE = 'AVAILABLE';
Node.STATUS_TRASH = 'TRASH';
Node.STATUS_PURGED = 'PURGED';
Node.KIND_FILE = 'FILE';
Node.KIND_FOLDER = 'FOLDER';
Node.KIND_ASSET = 'ASSET';

module.exports = Node;
