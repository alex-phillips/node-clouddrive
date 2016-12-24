'use strict';

let ParameterBag = require('./ParameterBag'),
  fs = require('fs-extra'),
  path = require('path'),
  async = require('async'),
  got = require('got'),
  Utils = require('./Utils'),
  Logger = require('./Logger'),
  FormData = require('form-data'),
  crypto = require('crypto'),
  base64stream = require('base64-stream'),
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
      data: {},
    };

    let downloadOptions = {
      stream: null,
      checkMd5: false,
      queryParams: null,
      decrypt: false,
      password: '',
      algorithm: '',
      armor: false,
    };

    for (let key in options) {
      if (downloadOptions[key] !== undefined) {
        downloadOptions[key] = options[key];
      }
    }

    let stream,
      saveToFile = false,
      savePath = localPath;
    if (!downloadOptions.stream) {
      saveToFile = true;
      savePath = path.resolve(localPath);

      try {
        let stat = fs.lstatSync(savePath);
        if (stat.isDirectory()) {
          if (options.decrypt) {
            savePath += `/${Utils.decryptString(this.getName(), downloadOptions.password, downloadOptions.algorithm)}`;
          } else {
            savePath += `/${this.getName()}`;
          }
        }

        if (fs.existsSync(savePath)) {
          retval.success = false;
          retval.data.exists = true;
          retval.data.md5_match = false;

          if (downloadOptions.checkMd5) {
            return Utils.getFileMd5(savePath, (err, md5) => {
              if (md5 === this.getMd5()) {
                retval.data.md5_match = true;
                retval.data.message = 'File already exists and is identical to remote copy';
              } else {
                retval.data.message = 'File already exists but does not match remote copy';
              }

              this.emit('downloadComplete', null, null, retval, {
                node: this,
                localPath: savePath,
              });

              return callback(null, retval);
            });
          }

          retval.data.message = 'File already exists';

          this.emit('downloadComplete', null, null, retval, {
            node: this,
            localPath: savePath,
          });

          return callback(null, retval);
        }
      } catch (e) {}

      stream = fs.createWriteStream(`${savePath}.__incomplete`);
    } else {
      stream = downloadOptions.stream;
    }

    Logger.verbose(`Downloading "${this.getName()}"`);
    Logger.debug('Requesting nodes:files:download endpoint');
    Logger.debug(`HTTP Request: GET '${account.contentUrl}nodes/${this.getId()}/content'`);
    this.emit('fileDownload', this);
    let error = null,
      request = got.stream(`${account.contentUrl}nodes/${this.getId()}/content`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      },
      query: downloadOptions.queryParams,
      timeout: 3600000,
    })
      .on('response', response => {
        response.on('end', () => {
          if (!stream.isTTY) {
            stream.close();
          }

          retval.success = true;

          if (saveToFile) {
            fs.renameSync(`${savePath}.__incomplete`, savePath);
          }

          this.emit('downloadComplete', response, null, retval, {
            node: this,
            localPath: savePath,
          });

          return callback(null, retval);
        });

        if (downloadOptions.decrypt) {
          Logger.verbose(`Creating decipher with password ${downloadOptions.password}, algorithm ${downloadOptions.algorithm}`);
          let decipher = crypto.createDecipher(downloadOptions.algorithm, downloadOptions.password);

          if (downloadOptions.armor) {
            response.pipe(base64stream.decode()).pipe(decipher).pipe(stream);
          } else {
            response.pipe(decipher).pipe(stream);
          }
        } else {
          response.pipe(stream);
        }
      })
      .on('error', err => {
        Logger.error(`Error downloading ${savePath}: ${err}`);
        try {
          fs.unlinkSync(`${savePath}.__incomplete`);
        } catch (e) {}

        if (downloadOptions.retryAttempt >= downloadOptions.numRetries) {
          retval.data.message = 'Failed retry attempt(s). Skipping file.';
          retval.success = false;

          this.emit('downloadComplete', null, null, retval, {
            node: this,
            localPath: savePath,
          });

          return callback(Error(`Failed downloading ${savePath}`), retval);
        }

        return account.authorize(null, {force: true}, (authErr, data) => {
          if (authErr) {
            return callback(authErr);
          }

          if (data.success) {
            return account.sync({}, (syncErr, data) => {
              if (syncErr) {
                return callback(syncErr);
              }

              let retryOptions = {};
              for (let key in downloadOptions) {
                retryOptions[key] = options[key];
              }

              retryOptions.retryAttempt++;

              retval.success = false;
              retval.data.message = `${err}. Reauthenticating and retrying.`;
              retval.retry = true;

              this.emit('downloadComplete', null, null, retval, {
                node: this,
                localPath: savePath,
              });

              return this.downloadFile(localPath, retryOptions, callback);
            });
          }

          return callback(Error(`Failed to reauthenticate with Cloud Drive: ${JSON.stringify(data.data)}`));
        });
      })
      // .on('end', err => {
      //   if (!stream.isTTY) {
      //     stream.close();
      //   }
      //
      //   if (err) {
      //     Logger.error(`Error downloading ${savePath}: ${err}`);
      //     return fs.unlinkSync(`${savePath}.__incomplete`, err => {
      //       return callback(err);
      //     });
      //   }
      //
      //   retval.success = true;
      //
      //   if (saveToFile) {
      //     fs.renameSync(`${savePath}.__incomplete`, savePath);
      //   }
      //
      //   this.emit('downloadComplete', response, null, retval, {
      //     node: this,
      //     localPath: savePath,
      //   })
      //
      //   return callback(null, retval);
      // })
      .on('data', data => {
        this.emit('downloadProgress', data);
      });
  }

  downloadFolder(localPath, options, callback) {
    let retval = {
      success: true,
      data: {},
    };

    if (options.decrypt) {
      localPath = `${path.resolve(localPath)}/${Utils.decryptString(this.getName(), options.password, options.algorithm)}`;
      Logger.debug(`Decrypted local path: ${localPath}`);
    } else {
      localPath = `${path.resolve(localPath)}/${this.getName()}`;
    }

    try {
      fs.statSync(localPath);
    } catch (e) {
      fs.mkdirsSync(localPath);
    }

    this.getChildren({
      remote: options.remote,
    }, (err, children) => {
      if (err) {
        return callback(err);
      }

      let files = [],
        folders = [];

      async.waterfall([
        callback => {
          async.forEach(children, (child, callback) => {
            if (child.isFile()) {
              files.push(child);
            } else {
              folders.push(child);
            }

            return callback();
          }, err => {
            return callback(err);
          });
        },
        callback => {
          Logger.debug(`Downloading ${options.maxConnections} concurrent file(s)`);
          async.forEachLimit(files, options.maxConnections, (child, callback) => {
            child.on('fileDownload', (...args) => {
              this.emit('fileDownload', ...args);
            });
            child.on('downloadProgress', (...args) => {
              this.emit('downloadProgress', ...args);
            });
            child.on('downloadComplete', (...args) => {
              this.emit('downloadComplete', ...args);
            });

            return child.download(localPath, options, callback);
          }, err => {
            return callback(err);
          });
        },
        callback => {
          async.forEachSeries(folders, (child, callback) => {
            child.on('fileDownload', (...args) => {
              this.emit('fileDownload', ...args);
            });
            child.on('downloadProgress', (...args) => {
              this.emit('downloadProgress', ...args);
            });
            child.on('downloadComplete', (...args) => {
              this.emit('downloadComplete', ...args);
            });

            return child.download(localPath, options, callback);
          }, err => {
            return callback(err);
          });
        },
      ], err => {
        return callback(err, retval);
      });
    });
  }

  getChildren(options, callback) {
    if (!options.remote) {
      return cache.getNodeChildren(this, callback);
    }

    Logger.verbose('Requesting nodes:folders:list endpoint');
    Logger.debug(`HTTP Request: GET '${account.metadataUrl}nodes/${this.getId()}/children'`);
    got.get(`${account.metadataUrl}nodes/${this.getId()}/children`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
    })
      .then(response => {
        Logger.debug(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
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

  getDescription() {
    return this.get('description');
  }

  getId() {
    return this.get('id');
  }

  getKind() {
    return this.get('kind');
  }

  getLabels() {
    return this.get('labels');
  }

  getMd5() {
    return this.get('contentProperties.md5');
  }

  getMetadata(generateLink, callback) {
    let retval = {
      success: false,
      data: {},
    };

    if (generateLink === undefined) {
      generateLink = false;
    }

    let query = {
      tempLink: generateLink,
    };

    Logger.verbose('Requesting nodes:files:get endpoint (metadata)');
    Logger.debug(`HTTP Request: GET '${account.metadataUrl}nodes/${this.getId()}'`);
    got.get(`${account.metadataUrl}nodes/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
      query: query,
    })
      .then(response => {
        Logger.debug(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
        retval.data = JSON.parse(response.body);

        if (response.statusCode === 200) {
          retval.success = true;
        }

        return callback(null, retval);
      })
      .catch(err => {
        return callback(err);
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

  getPathNodes(callback) {
    let retval = [],
      node = this;

    async.whilst(
      () => {
        return node.getParentIds().length > 0;
      },
      callback => {
        Node.loadById(node.getParentIds()[0], (err, parentNode) => {
          retval.push(parentNode);
          node = parentNode;
          callback(err);
        });
      },
      err => {
        return callback(err, retval);
      }
    );
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
      data: {},
    };

    Logger.verbose('Requesting nodes:children:add endpoint (link)');
    Logger.debug(`HTTP Request: PUT '${account.metadataUrl}nodes/${idParent}/children/${this.getId()}'`);
    got.put(`${account.metadataUrl}nodes/${idParent}/children/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
    })
      .then(response => {
        Logger.debug(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
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
      data: {},
    };

    Logger.verbose('Requesting nodes:children:delete endpoint (unlink)');
    Logger.debug(`HTTP Request: DELETE '${account.metadataUrl}nodes/${idParent}/children/${this.getId()}'`);
    got.delete(`${account.metadataUrl}nodes/${idParent}/children/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
    })
      .then(response => {
        Logger.debug(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
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
      data: {},
    };

    if (!newParent.isFolder()) {
      retval.data.message = 'New parent must be a FOLDER node';
      return callback(null, retval);
    }

    if (!this.isFile() && !this.isFolder()) {
      retval.data.message = 'You can only move FILE and FOLDER nodes';
      return callback(null, retval);
    }

    Logger.verbose('Requesting nodes:children:move endpoint');
    Logger.debug(`HTTP Request: POST '${account.metadataUrl}nodes/${newParent.getId()}/children'`);
    got.post(`${account.metadataUrl}nodes/${newParent.getId()}/children`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
      body: JSON.stringify({
        fromParent: this.getParentIds()[0],
        childId: this.getId(),
      }),
    })
      .then(response => {
        Logger.debug(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
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
      data: {},
    };

    if (!this.isFile()) {
      retval.data.message = 'Only file contents can be overwritten';

      return callback(null, retval);
    }

    this.emit('fileUpload', localPath);
    let progressInterval = null,
      form = new FormData(),
      stream = Node.getUploadStream(localPath, {
        encrypt: options.encrypt,
        password: options.password,
        algorithm: options.algorithm,
      }, (err, stream) => {
        if (err) {
          return callback(err);
        }

        // return request.put({
        //   url: `${account.contentUrl}nodes/${this.getId()}/content`,
        //   formData: {
        //     content: stream,
        //   },
        //   headers: {
        //     Authorization: `Bearer ${account.token.access_token}`,
        //   },
        // }, (err, response, body) => {
        //   if (err) {
        //     return callback(err);
        //   }
        //
        //   console.log(body);
        //   return callback(null, retval);
        // });

        form.append('content', stream);
        let headers = form.getHeaders();
        headers.Authorization = `Bearer ${account.token.access_token}`;

        stream.on('data', chunk => {
          this.emit('uploadProgress', localPath, chunk);
        });

        Logger.verbose('Requesting nodes:files:overwrite endpoint');
        Logger.debug(`HTTP Request: PUT '${account.contentUrl}nodes/${this.getId()}/content'`);
        got.put(`${account.contentUrl}nodes/${this.getId()}/content`, {
          headers: headers,
          body: form,
          timeout: 3600000,
        })
          .then(response => {
            Logger.debug(`Response returned with status code ${response.statusCode}.`);
            Logger.silly(`Response body: ${response.body}`);
            stream.close();

            if (options.encrypt) {
              Logger.debug(`Removing encrypted cache file at ${stream.path}`);
              fs.unlinkSync(stream.path);
            }

            this.getPath((err, remotePath) => {
              if (err) {
                return callback(err);
              }

              retval.data = JSON.parse(response.body);
              retval.success = true;
              this.replace(retval.data);

              return this.save(() => {
                this.emit('uploadComplete', response, response.body, retval, {
                  localPath: localPath,
                  remotePath: remotePath,
                });

                return callback(null, retval);
              });
            });
          })
          .catch(err => {
            stream.close();

            if (options.encrypt) {
              Logger.debug(`Removing encrypted cache file at ${stream.path}`);
              fs.unlinkSync(stream.path);
            }

            Logger.error(`Failed to overwrite file: ${err}`);
            this.getPath((err, remotePath) => {
              if (err) {
                return callback(err);
              }

              if (options.retryAttempt >= options.numRetries) {
                retval.data.message = 'Failed retry attempt(s). Skipping file.';

                this.emit('uploadComplete', null, null, retval, {
                  localPath: localPath,
                  remotePath: remotePath,
                });

                return callback(null, retval);
              }

              return account.authorize(null, {force: true}, (authErr, data) => {
                if (authErr) {
                  return callback(authErr);
                }

                if (data.success) {
                  return account.sync({}, (syncErr, data) => {
                    if (syncErr) {
                      return callback(syncErr);
                    }

                    let retryOptions = {};
                    for (let key in options) {
                      retryOptions[key] = options[key];
                    }

                    retryOptions.retryAttempt++;

                    retval.success = false;
                    retval.data.message = `${err}. Reauthenticating and retrying.`;
                    retval.retry = true;

                    this.emit('uploadComplete', null, null, retval, {
                      localPath: localPath,
                      remotePath: remotePath,
                    });

                    return this.overwrite(localPath, retryOptions, callback);
                  });
                }

                return callback(Error(`Failed to reauthenticate with Cloud Drive: ${JSON.stringify(data.data)}`));
              });
            });
          });
      });
  }

  rename(name, callback) {
    let retval = {
      success: false,
      data: {},
    };

    Logger.verbose('Requesting nodes:files:patch endpoint (rename)');
    Logger.debug(`HTTP Request: PATCH '${account.metadataUrl}nodes/${this.getId()}'`);
    got.patch(`${account.metadataUrl}nodes/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      },
      body: JSON.stringify({
        name: name,
      })
    })
      .then(response => {
        Logger.debug(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
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

  restore(callback) {
    let retval = {
      success: false,
      data: {},
    };

    if (this.getStatus() === 'AVAILABLE') {
      retval.data.message = 'Node is not in the trash';

      return callback(null, retval);
    }

    Logger.verbose('Requesting trash:restore endpoint');
    Logger.debug(`HTTP Request: POST '${account.metadataUrl}trash/${this.getId()}/restore'`);
    got.post(`${account.metadataUrl}trash/${this.getId()}/restore`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
    })
      .then(response => {
        Logger.debug(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
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

  trash(callback) {
    let retval = {
      success: false,
      data: {},
    };

    if (this.inTrash()) {
      retval.data.message = 'Node is already in the trash';

      return callback(null, retval);
    }

    Logger.verbose('Requesting trash:add endpoint');
    Logger.debug(`HTTP Request: PUT '${account.metadataUrl}trash/${this.getId()}'`);
    got.put(`${account.metadataUrl}trash/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
    })
      .then(response => {
        Logger.debug(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
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

  update(options, callback) {
    let retval = {
      success: false,
      data: {},
    };

    Logger.verbose('Requesting nodes:files:patch endpoint (update)');
    Logger.debug(`HTTP Request: PATCH '${account.metadataUrl}nodes/${this.getId()}'`);
    got.patch(`${account.metadataUrl}nodes/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      },
      body: JSON.stringify({
        labels: options.labels || this.getLabels(),
        description: options.description || this.getDescription(),
      })
    })
      .then(response => {
        Logger.debug(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
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

  static createDirectoryPath(path, options, callback) {
    let retval = {
      success: false,
      data: {},
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
              return Node.createFolder(part, previousNode.getId(), options, (err, data) => {
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

  static createFolder(name, parentId, options, callback) {
    let retval = {
      success: false,
      data: {},
    };

    if (!(parentId instanceof Array)) {
      parentId = [parentId];
    }

    Logger.debug(`Attempting to create remote folder '${name}' with parent ${parentId}`);
    Logger.verbose('Requesting nodes:folders:create endpoint');
    Logger.debug(`HTTP Request: POST '${account.metadataUrl}nodes'`);
    got.post(`${account.metadataUrl}nodes`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
      body: JSON.stringify({
        name: name,
        parents: parentId,
        kind: 'FOLDER',
        labels: options.labels || [],
      }),
    })
      .then(response => {
        Logger.debug(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
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

  static exists(remotePath, localPath, options, callback) {
    let retval = {
      success: false,
      data: {
        message: '',
        exists: false,
        md5Match: false,
        sizeMatch: false,
        pathMatch: false,
      },
    };

    let existsOptions = {
      checkMd5: false,
    };

    for (let key in options) {
      if (existsOptions[key] !== undefined) {
        existsOptions[key] = options[key];
      }
    }

    return Node.loadByPath(remotePath, (err, pathNode) => {
      if (err) {
        return callback(err);
      }

      if (!pathNode) {
        if (localPath) {
          if (existsOptions.checkMd5) {
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

          return callback(null, retval);
        }
      }

      retval.success = true;
      retval.data.exists = true;
      retval.data.pathMatch = true;
      retval.data.node = pathNode;
      retval.data.message = `Remote file '${remotePath}' exists`;

      if (localPath) {
        if (existsOptions.checkMd5) {
          let remoteMd5 = pathNode.getMd5();
          if (remoteMd5) {
            return Utils.getFileMd5(localPath, (err, localMd5) => {
              if (remoteMd5 === localMd5) {
                retval.data.message = `File '${remotePath}' exists and is identical to local copy (md5)`;
                retval.data.md5Match = true;
              } else {
                retval.data.message = `File '${remotePath}' exists but does not match local checksum`;
              }

              return callback(null, retval);
            });
          }

          retval.data.message = `File '${remotePath}' exists but no checksum is available`;
        } else {
          try {
            let stat = fs.statSync(localPath);
            if (stat.size === parseInt(pathNode.getSize())) {
              retval.data.message = `File '${remotePath}' exists and is identical to local copy (size)`;
              retval.data.sizeMatch = true;
            } else {
              retval.data.message = `File '${remotePath}' exists but does not match the local size`;
            }
          } catch (e) {}
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
    Logger.verbose('Requesting tash:list endpoint');
    Logger.debug(`HTTP Request: GET '${account.metadataUrl}trash'`);
    got.get(`${account.metadataUrl}trash`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
    })
      .then(response => {
        Logger.debug(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);

        return callback(null, JSON.parse(response.body));
      })
      .catch(err => {
        return callback(err);
      });
  }

  static getUploadStream(path, options, callback) {
    let stream = fs.createReadStream(path);
    if (!options.encrypt) {
      Logger.debug('Not encrypting upload stream');

      return callback(null, stream);
    }

    Logger.debug(`Encrypting upload stream with algorithm ${options.algorithm}`);
    let cipher = crypto.createCipher(options.algorithm, options.password),
      tmpFile = `${path}.enc`;

    if (options.armor) {
      Logger.debug('Encrypting file as ASCII data');
      stream.pipe(cipher)
        .pipe(base64stream.encode())
        .pipe(fs.createWriteStream(tmpFile))
        .on('finish', () => {
          callback(null, fs.createReadStream(tmpFile));
        });
    } else {
      Logger.debug('Encrypting file as binary data');
      stream.pipe(cipher)
        .pipe(fs.createWriteStream(tmpFile))
        .on('finish', () => {
          callback(null, fs.createReadStream(tmpFile));
        });
    }
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

    Logger.verbose('Requesting trash:restore endpoint');
    Logger.debug(`HTTP Request: POST '${account.metadataUrl}trash/${id}/restore'`);
    got.post(`${account.metadataUrl}trash/${id}/restore`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
    })
      .then(response => {
        Logger.debug(`Response returned with status code ${response.statusCode}.`);
        Logger.silly(`Response body: ${response.body}`);
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

  static upload(localPath, remotePath, options, callback) {
    fs.stat(localPath, (err, stat) => {
      if (err) {
        return callback(err);
      }

      if (stat.isDirectory()) {
        return Node.uploadDirectory(localPath, remotePath, options, callback);
      }

      return Node.uploadFile(localPath, remotePath, options, callback);
    });
  }

  static uploadDirectory(localPath, remoteRoot, options, callback) {
    localPath = path.resolve(localPath);
    let remoteFolder = Utils.getPathArray(remoteRoot || '/');
    remoteFolder.push(Utils.getPathArray(localPath).pop());
    remoteFolder = remoteFolder.join('/');

    let iterateDirectory = (directory, callback) => {
      fs.readdir(directory, (err, list) => {
        if (err) {
          return callback(err);
        }

        let remotePath = directory.replace(localPath, remoteFolder);
        if (options.encrypt) {
          let encryptedPath = Utils.trimPath(remotePath.replace(Utils.trimPath(remoteRoot), ''));
          encryptedPath = encryptedPath.split('/');
          Logger.verbose(`Encrypting folder path: ${encryptedPath.join('/')}`);

          for (let i = 0; i < encryptedPath.length; i++) {
            encryptedPath[i] = Utils.encryptString(encryptedPath[i], options.password, options.algorithm);
          }

          encryptedPath = encryptedPath.join('/');
          remotePath = `${Utils.trimPath(remoteRoot)}/${encryptedPath}`;
          Logger.verbose(`Encrypted path: ${remotePath}`);
        }

        Node.createDirectoryPath(remotePath, {
          labels: options.encrypt ? ['enc'] : [],
        }, (err, data) => {
          if (err) {
            return callback(err);
          }

          if (data.success === false) {
            return callback(null, data);
          }

          let files = [],
            folders = [];

          async.waterfall([
            // Separate files and folders
            callback => {
              Logger.debug(`Separating files and folders for fast uploading`);
              async.forEachSeries(list, (item, callback) => {
                let itemPath = `${directory}/${item}`;
                Logger.debug(`Checking node "${itemPath}"`);
                fs.stat(itemPath, (err, stat) => {
                  if (err) {
                    return callback(err);
                  }

                  if (stat.isDirectory()) {
                    folders.push(itemPath);
                  } else {
                    files.push(itemPath);
                  }

                  return callback();
                });
              }, err => {
                return callback(err);
              });
            },
            callback => {
              Logger.debug(`Uploading ${options.maxConnections} concurrent file(s)`);
              async.forEachLimit(files, options.maxConnections, (itemPath, callback) => {
                Logger.debug(`Uploading item '${itemPath}' to '${remotePath}'`);

                return Node.uploadFile(itemPath, remotePath, options, callback);
              }, err => {
                return callback(err);
              });
            },
            callback => {
              async.forEachSeries(folders, (itemPath, callback) => {
                Logger.debug(`Uploading folder: '${itemPath}' to remote path '${remoteFolder}'`);
                let remotePath = path.dirname(itemPath).replace(localPath, remoteFolder);

                return iterateDirectory(itemPath, callback);
              }, err => {
                return callback(err);
              });
            },
          ], err => {
            return callback(err);
          });
        });
      });
    };

    iterateDirectory(localPath, callback);
  }

  static uploadFile(localPath, remotePath, options, callback) {
    let retval = {
      success: false,
      data: {},
    };

    let uploadOptions = {
      overwrite: false,
      suppressDedupe: false,
      force: false,
      retryAttempt: 0,
      numRetries: 0,
      ignoreFiles: null,
      checkMd5: false,
      encrypt: false,
      password: '',
      algorithm: '',
      armor: false,
      labels: [],
    };

    for (let key in options) {
      if (uploadOptions[key] !== undefined) {
        uploadOptions[key] = options[key];
      }
    }

    let basename = path.basename(localPath);

    if (basename.match(new RegExp(uploadOptions.ignoreFiles))) {
      retval.data.message = `Ignoring ${basename}.`;

      Node.emit('uploadComplete', null, null, retval, {
        localPath: localPath,
        remotePath: remotePath,
      });

      return callback(null, retval);
    }

    if (uploadOptions.encrypt) {
      uploadOptions.checkMd5 = false;
      Logger.verbose(`Encrypting ${basename}`);
      basename = Utils.encryptString(basename, uploadOptions.password, uploadOptions.algorithm);
      Logger.verbose(`Encrypted filename: ${basename}`);
    }

    remotePath = Utils.getPathArray(remotePath || '/').join('/');

    Node.createDirectoryPath(remotePath, {
      labels: uploadOptions.encrypt ? ['enc'] : [],
    }, (err, data) => {
      if (err) {
        return callback(err);
      }

      if (data.success === false) {
        return callback(null, data);
      }

      let remoteFolder = data.data;

      Node.exists(`${remotePath}/${basename}`, localPath, uploadOptions, (err, data) => {
        if (err) {
          return callback(err);
        }

        if (data.success === true) {
          // Node exists remotely
          if (data.data.pathMatch === true && (data.data.md5Match === true || data.data.sizeMatch)) {
            if (uploadOptions.force === true) {
              // I REALLY wish there was a better way to do this... but since we
              // statically call `upload`, we need a way to still listen for events
              // on the node if it exsts and is going to be overwritten... maybe
              // we refactor so if it exsts, we return a false sucess and the
              // calling code can choose to overwrite?
              data.data.node.on('fileUpload', (...args) => {
                Node.emit('fileUpload', ...args);
              });
              data.data.node.on('uploadProgress', (...args) => {
                Node.emit('uploadProgress', ...args);
              });
              data.data.node.on('uploadComplete', (...args) => {
                Node.emit('uploadComplete', ...args);
              });

              return data.data.node.overwrite(localPath, uploadOptions, callback);
            }

            retval.data = data.data;

            Node.emit('uploadComplete', null, null, retval, {
              localPath: localPath,
              remotePath: remotePath,
            });

            return callback(null, retval);
          } else if (data.data.pathMatch === true && data.data.md5Match === false) {
            if (uploadOptions.overwrite === true || data.data.node.isPending()) {
              // I REALLY wish there was a better way to do this... but since we
              // statically call `upload`, we need a way to still listen for events
              // on the node if it exsts and is going to be overwritten... maybe
              // we refactor so if it exsts, we return a false sucess and the
              // calling code can choose to overwrite?
              data.data.node.on('fileUpload', (...args) => {
                Node.emit('fileUpload', ...args);
              });
              data.data.node.on('uploadProgress', (...args) => {
                Node.emit('uploadProgress', ...args);
              });
              data.data.node.on('uploadComplete', (...args) => {
                Node.emit('uploadComplete', ...args);
              });

              return data.data.node.overwrite(localPath, uploadOptions, callback);
            }

            retval.data = data.data;

            Node.emit('uploadComplete', null, null, retval, {
              localPath: localPath,
              remotePath: remotePath,
            });

            return callback(null, retval);
          } else if (data.data.pathMatch === false && data.data.md5Match === true) {
            if (uploadOptions.suppressDedupe === false) {
              retval.data = data.data;

              Node.emit('uploadComplete', null, null, retval, {
                localPath: localPath,
                remotePath: remotePath,
              });

              return callback(null, retval);
            }
          }
        }

        let params = {};
        if (uploadOptions.suppressDedupe) {
          params.suppress = 'deduplication';
        }

        Node.emit('fileUpload', localPath);
        let progressInterval = null,
          form = new FormData(),
          stream = Node.getUploadStream(localPath, {
            encrypt: uploadOptions.encrypt,
            password: uploadOptions.password,
            algorithm: uploadOptions.algorithm,
            armor: uploadOptions.armor,
          }, (err, stream) => {
            if (err) {
              return callback(err);
            }

            let metadata = {
              kind: 'FILE',
              name: basename,
              parents: [
                remoteFolder.getId(),
              ],
              labels: uploadOptions.labels,
            };

            form.append('metadata', JSON.stringify(metadata));
            form.append('content', stream);

            stream.on('data', chunk => {
              Node.emit('uploadProgress', localPath, chunk);
            });

            let headers = form.getHeaders();
            headers.Authorization = `Bearer ${account.token.access_token}`;

            Logger.debug('Uploading file with metadata:', JSON.stringify(metadata));
            Logger.verbose('Requesting nodes:files:upload endpoint');
            Logger.debug(`HTTP Request: POST '${account.contentUrl}nodes'`);
            got.post(`${account.contentUrl}nodes`, {
              headers: headers,
              query: params,
              body: form,
              timeout: 3600000,
            })
              .then(response => {
                Logger.debug(`Response returned with status code ${response.statusCode}.`);
                Logger.silly(`Response body: ${response.body}`);
                stream.close();

                if (uploadOptions.encrypt) {
                  Logger.debug(`Removing encrypted cache file at ${stream.path}`);
                  fs.unlinkSync(stream.path);
                }

                retval.data.statusCode = response.statusCode;
                retval.data = JSON.parse(response.body);
                retval.success = true;
                retval.data = new Node(retval.data);

                return retval.data.save((err, data) => {
                  if (err) {
                    return callback(err);
                  }

                  Node.emit('uploadComplete', response, response.body, retval, {
                    localPath: localPath,
                    remotePath: remotePath,
                  });

                  return callback(null, retval);
                });
              })
              .catch(err => {
                stream.close();

                if (uploadOptions.encrypt) {
                  Logger.debug(`Removing encrypted cache file at ${stream.path}`);
                  fs.unlinkSync(stream.path);
                }

                if (uploadOptions.retryAttempt >= uploadOptions.numRetries) {
                  retval.data.message = `${err.message}. Failed retry attempt(s). Skipping file.`;

                  Node.emit('uploadComplete', null, err.message, retval, {
                    localPath: localPath,
                    remotePath: remotePath,
                  });

                  return callback(null, retval);
                }

                return account.authorize(null, {force: true}, (authErr, data) => {
                  if (authErr) {
                    return callback(authErr);
                  }

                  if (data.success) {
                    return account.sync({}, (syncErr, data) => {
                      if (syncErr) {
                        return callback(syncErr);
                      }

                      let retryOptions = {};
                      for (let key in uploadOptions) {
                        retryOptions[key] = uploadOptions[key];
                      }

                      retryOptions.retryAttempt++;

                      retval.success = false;
                      retval.data.message = `${err}. Reauthenticating and retrying.`;
                      retval.retry = true;

                      Node.emit('uploadComplete', null, err.message, retval, {
                        localPath: localPath,
                        remotePath: remotePath,
                      });

                      return Node.uploadFile(localPath, remotePath, retryOptions, callback);
                    });
                  }

                  return callback(Error('Failed to reauthenticate with Cloud Drive: ' + JSON.stringify(data.data)));
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
