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
  async del() {
    return await cache.deleteNodeById(this.getId());
  }

  async download(localPath, options) {
    if (localPath === undefined || !localPath) {
      localPath = '.';
    }

    if (this.isFolder()) {
      return await this.downloadFolder(localPath, options);
    }

    return await this.downloadFile(localPath, options);
  }

  async downloadFile(localPath, options, callback) {
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
            let md5 = await Utils.getFileMd5(savePath);
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

            return retval;
          }

          retval.data.message = 'File already exists';

          this.emit('downloadComplete', null, null, retval, {
            node: this,
            localPath: savePath,
          });

          return retval;
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
    let error = null;
    await this._downloadFile(localPath, savePath, stream, downloadOptions);
  }

  _downloadFile(localPath, savePath, stream, downloadOptions) {
    let retval = {
      success: false,
      data: {},
    };

    return new Promise((resolve, reject) => {
      let request = got.stream(`${account.contentUrl}nodes/${this.getId()}/content`, {
        headers: {
          Authorization: `Bearer ${account.token.access_token}`
        },
        query: downloadOptions.queryParams,
        timeout: 3600000,
      })
        .on('response', response => {
          if (stream.isTTY) {
            response.on('end', () => {
              retval.success = true;
              this.emit('downloadComplete', response, null, retval, {
                node: this,
                localPath: savePath,
              });

              return resolve(retval);
            });
          } else {
            stream.on('finish', () => {
              stream.close();
              retval.success = true;
              fs.renameSync(`${savePath}.__incomplete`, savePath);
              this.emit('downloadComplete', response, null, retval, {
                node: this,
                localPath: savePath,
              });

              return resolve(retval);
            });
          }

          if (downloadOptions.decrypt) {
            Logger.verbose(`Creating decipher with password ${downloadOptions.password}, algorithm ${downloadOptions.algorithm}`);
            let decipher = crypto.createDecipher(downloadOptions.algorithm, downloadOptions.password);

            if (downloadOptions.armor) {
              Logger.debug(`De-armoring encrypted file`);
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

            return reject(Error(`Failed downloading ${savePath}`));
          }

          return account.authorize(null, {force: true})
            .then(data => {
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
            })
            .catch(reject);
        })
        .on('data', data => {
          this.emit('downloadProgress', data);
        });
      });
  }

  async downloadFolder(localPath, options) {
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

    let children = await this.getChildren({
      remote: options.remote,
    });

    let files = [],
      folders = [];

    for (let child of children) {
      if (child.isFile()) {
        files.push(child);
      } else {
        folders.push(child);
      }
    }

    Logger.debug(`Downloading ${options.maxConnections} concurrent file(s)`);

    let partitions = Utils.arrayPartition(files, options.maxConnections);
    for (let partition of partitions) {
      await Promise.all(partition.map(child => {
        child.on('fileDownload', (...args) => {
          this.emit('fileDownload', ...args);
        });
        child.on('downloadProgress', (...args) => {
          this.emit('downloadProgress', ...args);
        });
        child.on('downloadComplete', (...args) => {
          this.emit('downloadComplete', ...args);
        });

        return child.download(localPath, options);
      }))
    }

    for (let child of folders) {
      child.on('fileDownload', (...args) => {
        this.emit('fileDownload', ...args);
      });
      child.on('downloadProgress', (...args) => {
        this.emit('downloadProgress', ...args);
      });
      child.on('downloadComplete', (...args) => {
        this.emit('downloadComplete', ...args);
      });

      await child.download(localPath, options);
    }

    return retval;
  }

  async getChildren(options) {
    if (!options.remote) {
      return await cache.getNodeChildren(this);
    }

    Logger.verbose('Requesting nodes:folders:list endpoint');
    Logger.debug(`HTTP Request: GET '${account.metadataUrl}nodes/${this.getId()}/children'`);

    let response = await got.get(`${account.metadataUrl}nodes/${this.getId()}/children`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
    });

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);

    let children = [];
    if (response.statusCode !== 200) {
      throw Error(response.body);
    }

    let data = JSON.parse(response.body).data;
    for (let child of data) {
      children.push(new Node(child));
    }

    return children;
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

  async getMetadata(generateLink) {
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

    let response = await got.get(`${account.metadataUrl}nodes/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
      query: query,
    })

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);
    retval.data = JSON.parse(response.body);

    if (response.statusCode === 200) {
      retval.success = true;
    }

    return retval;
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

  async getPath() {
    let remotePath = [];

    return await buildPath(this);

    async function buildPath(node) {
      remotePath.push(node.getName());
      if (node.isRoot()) {
        return remotePath.reverse().join('/');
      }

      let parent = null,
        parentIds = node.getParentIds(),
        counter = 0;

      while (!parent && counter !== parentIds.length) {
        parent = await Node.loadById(parentIds[counter]);
        counter++;
      }

      if (!parent) {
        return null;
      }

      if (parent.isRoot()) {
        return remotePath.reverse().join('/');
      }

      return await buildPath(parent);
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

  async link(idParent) {
    let retval = {
      success: false,
      data: {},
    };

    Logger.verbose('Requesting nodes:children:add endpoint (link)');
    Logger.debug(`HTTP Request: PUT '${account.metadataUrl}nodes/${idParent}/children/${this.getId()}'`);

    let response = await got.put(`${account.metadataUrl}nodes/${idParent}/children/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
    });

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);
    retval.data = JSON.parse(response.body);

    if (response.statusCode === 200) {
      retval.success = true;
      this.replace(retval.data);
      await this.save();
    }

    return retval;
  }

  async unlink(idParent) {
    let retval = {
      success: false,
      data: {},
    };

    Logger.verbose('Requesting nodes:children:delete endpoint (unlink)');
    Logger.debug(`HTTP Request: DELETE '${account.metadataUrl}nodes/${idParent}/children/${this.getId()}'`);

    let response = await got.delete(`${account.metadataUrl}nodes/${idParent}/children/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
    });

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);
    retval.data = JSON.parse(response.body);

    if (response.statusCode === 200) {
      retval.success = true;
      this.replace(retval.data);
      await this.save();
    }

    return retval;
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

  async overwrite(localPath, options) {
    let retval = {
      success: false,
      data: {},
    };

    if (!this.isFile()) {
      retval.data.message = 'Only file contents can be overwritten';

      return retval;
    }

    Logger.verbose(`Overwriting node with file at '${localPath}'`);

    this.emit('fileUpload', localPath);
    let progressInterval = null,
      form = new FormData();

    let stream = await Node.getUploadStream(localPath, {
      encrypt: options.encrypt,
      password: options.password,
      algorithm: options.algorithm,
      armor: options.armor,
    });

    form.append('content', stream);
    let headers = form.getHeaders();
    headers.Authorization = `Bearer ${account.token.access_token}`;

    stream.on('data', chunk => {
      this.emit('uploadProgress', localPath, chunk);
    });

    Logger.verbose('Requesting nodes:files:overwrite endpoint');
    Logger.debug(`HTTP Request: PUT '${account.contentUrl}nodes/${this.getId()}/content'`);

    let error = null,
      response = null;
    try {
      response = await got.put(`${account.contentUrl}nodes/${this.getId()}/content`, {
        headers: headers,
        body: form,
        timeout: 3600000,
      });
    } catch (err) {
      error = err;
      response = err.response;
      Logger.error(`Failed to overwrite file: ${err}`);
    }

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);

    stream.close();

    if (options.encrypt) {
      Logger.debug(`Removing encrypted cache file at ${stream.path}`);
      fs.unlinkSync(stream.path);
    }

    let remotePath = await this.getPath();

    if (error) {
      if (options.retryAttempt >= options.numRetries) {
        retval.data.message = 'Failed retry attempt(s). Skipping file.';

        this.emit('uploadComplete', null, null, retval, {
          localPath: localPath,
          remotePath: remotePath,
        });

        return retval;
      }

      let auth = await account.authorize(null, {force: true});
      if (auth.success) {
        await account.sync({});
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

        return await this.overwrite(localPath, retryOptions);
      }

      throw Error(`Failed to reauthenticate with Cloud Drive: ${JSON.stringify(data.data)}`);
    }

    retval.data = JSON.parse(response.body);
    retval.success = true;
    this.replace(retval.data);
    await this.save();
    this.emit('uploadComplete', response, response.body, retval, {
      localPath: localPath,
      remotePath: remotePath,
    });

    return retval;
  }

  async rename(name) {
    let retval = {
      success: false,
      data: {},
    };

    Logger.verbose('Requesting nodes:files:patch endpoint (rename)');
    Logger.debug(`HTTP Request: PATCH '${account.metadataUrl}nodes/${this.getId()}'`);

    let response = await got.patch(`${account.metadataUrl}nodes/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      },
      body: JSON.stringify({
        name: name,
      })
    });

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);
    retval.data = JSON.parse(response.body);

    if (response.statusCode === 200) {
      retval.success = true;
      this.replace(retval.data);

      await this.save();
    }

    return retval;
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

  async save(callback) {
    return await cache.saveNode(this);
  }

  async trash() {
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

    let response = await got.put(`${account.metadataUrl}trash/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
    });

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);
    retval.data = JSON.parse(response.body);
    if (response.statusCode === 200) {
      retval.success = true;
      this.replace(retval.data);
      await this.save();
    }

    return retval;
  }

  async update(options) {
    let retval = {
      success: false,
      data: {},
    };

    Logger.verbose('Requesting nodes:files:patch endpoint (update)');
    Logger.debug(`HTTP Request: PATCH '${account.metadataUrl}nodes/${this.getId()}'`);

    let response = await got.patch(`${account.metadataUrl}nodes/${this.getId()}`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`
      },
      body: JSON.stringify({
        labels: options.labels || this.getLabels(),
        description: options.description || this.getDescription(),
      })
    });

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);
    retval.data = JSON.parse(response.body);

    if (response.statusCode === 200) {
      retval.success = true;
      this.replace(retval.data);
      await this.save();
    }

    return retval;
  }

  static async createDirectoryPath(path, options) {
    let retval = {
      success: false,
      data: {},
    };

    let node = await Node.loadByPath(path);
    if (node) {
      retval.success = true;
      retval.data = node;

      return retval;
    }

    Logger.debug(`Attempting to create folder path ${path}`);

    path = Utils.getPathArray(path);
    let root = await Node.getRoot();
    let previousNode = root;
    let remotePath = '';

    for (let part of path) {
      remotePath += `/${part}`;

      let partNode = await Node.loadByPath(remotePath);
      if (!partNode) {
        Logger.debug(`Creating folder node ${part}`);
        let mkdirResult = await Node.createFolder(part, previousNode.getId(), options);
        previousNode = mkdirResult.data;
        continue;
      }

      previousNode = partNode;
    }

    retval.success = true;
    retval.data = previousNode;

    return retval;
  }

  static async createFolder(name, parentId, options) {
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

    let response = await got.post(`${account.metadataUrl}nodes`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
      body: JSON.stringify({
        name: name,
        parents: parentId,
        kind: 'FOLDER',
        labels: options.labels || [],
      }),
    });

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);
    retval.data = JSON.parse(response.body);

    if (response.statusCode === 201) {
      retval.success = true;
      retval.data = new Node(retval.data);
      await retval.data.save();
    }

    return retval;
  }

  static async exists(remotePath, localPath, options) {
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

    let pathNode = await Node.loadByPath(remotePath);
    if (!pathNode) {
      if (localPath) {
        if (existsOptions.checkMd5) {
          let md5 = await Utils.getFileMd5(localPath);
          let md5Nodes = await Node.loadByMd5(md5);
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

            return retval;
          }

          retval.data.message = `Remote file '${remotePath}' does not exist`;

          return retval;
        }

        return retval;
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
          let localMd5 = await Utils.getFileMd5(localPath);
          if (remoteMd5 === localMd5) {
            retval.data.message = `File '${remotePath}' exists and is identical to local copy (md5)`;
            retval.data.md5Match = true;
          } else {
            retval.data.message = `File '${remotePath}' exists but does not match local checksum`;
          }

          return retval;
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

    return retval;
  }

  static async filter(filters) {
    return await cache.filter(filters);
  }

  static async getRoot() {
    let nodes = await Node.loadByName('Cloud Drive');
    if (nodes.length === 0) {
      throw Error('No node by name `Cloud Drive` found in the local cache');
    }

    for (let node of nodes) {
      if (node.isRoot()) {
        return node;
      }
    }

    throw Error('Unable to find root node');
  }

  static async getTrash() {
    Logger.verbose('Requesting tash:list endpoint');
    Logger.debug(`HTTP Request: GET '${account.metadataUrl}trash'`);

    let response = await got.get(`${account.metadataUrl}trash`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
    });

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);

    return JSON.parse(response.body);
  }

  static async getUploadStream(path, options) {
    return new Promise((resolve, reject) => {
      let stream = fs.createReadStream(path);
      if (!options.encrypt) {
        Logger.debug('Not encrypting upload stream');

        return resolve(stream);
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
            resolve(fs.createReadStream(tmpFile));
          });
      } else {
        Logger.debug('Encrypting file as binary data');
        stream.pipe(cipher)
          .pipe(fs.createWriteStream(tmpFile))
          .on('finish', () => {
            resolve(fs.createReadStream(tmpFile));
          });
      }
    });
  }

  static init(userAccount, cacheStore) {
    if (initialized === false) {
      account = userAccount;
      cache = cacheStore;
    }

    initialized = true;
  }

  static async loadById(id) {
    return await cache.findNodeById(id);
  }

  static async loadByName(name) {
    return await cache.findNodesByName(name);
  }

  static loadByMd5(md5, callback) {
    return cache.findNodesByMd5(md5, callback);
  }

  static async loadByPath(remotePath) {
    if (remotePath === undefined) {
      remotePath = '';
    }

    remotePath = Utils.trimPath(remotePath);
    if (!remotePath) {
      return await Node.getRoot();
    }

    let basename = path.basename(remotePath);

    let nodes = await Node.loadByName(basename);
    if (nodes.length === 0) {
      return null;
    }

    let found = null;
    for (let node of nodes) {
      let path = await node.getPath();
      if (path === remotePath) {
        found = node;
        break;
      }
    }

    return found;
  }

  static async restore(id) {
    let retval = {
      success: false,
      data: {}
    };

    Logger.verbose('Requesting trash:restore endpoint');
    Logger.debug(`HTTP Request: POST '${account.metadataUrl}trash/${id}/restore'`);

    let response = await got.post(`${account.metadataUrl}trash/${id}/restore`, {
      headers: {
        Authorization: `Bearer ${account.token.access_token}`,
      },
    });

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);
    retval.data = JSON.parse(response.body);

    if (response.statusCode === 200) {
      retval.success = true;
      let node = new Node(retval.data);
      await node.save();
    }

    return retval;
  }

  static async searchBy(field, value, callback) {
    return await cache.searchBy(field, value, callback);
  }

  static async upload(localPath, remotePath, options) {
    let stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      return await Node.uploadDirectory(localPath, remotePath, options);
    }

    return await Node.uploadFile(localPath, remotePath, options);
  }

  static async uploadDirectory(localPath, remoteRoot, options) {
    localPath = path.resolve(localPath);
    let remoteFolder = Utils.getPathArray(remoteRoot || '/');
    remoteFolder.push(Utils.getPathArray(localPath).pop());
    remoteFolder = remoteFolder.join('/');

    async function iterateDirectory (directory, callback) {
      let list = await fs.readdirSync(directory);
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

      let mkdirResult = await Node.createDirectoryPath(remotePath, {
        labels: options.encrypt ? ['enc'] : [],
      });

      if (mkdirResult.success === false) {
        return mkdirResult;
      }

      let files = [],
        folders = [];

      Logger.debug(`Separating files and folders for fast uploading`);
      for (let item of list) {
        let itemPath = `${directory}/${item}`;
        Logger.debug(`Checking node "${itemPath}"`);

        let stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
          folders.push(itemPath);
          continue;
        }

        files.push(itemPath);
      }

      Logger.debug(`Uploading ${options.maxConnections} concurrent file(s)`);

      let partitions = Utils.arrayPartition(files, options.maxConnections);
      for (let partition of partitions) {
        await Promise.all(partition.map(itemPath => {
          Logger.debug(`Uploading item '${itemPath}' to '${remotePath}'`);

          return Node.uploadFile(itemPath, remotePath, options);
        }));
      }

      for (let folder of folders) {
        Logger.debug(`Uploading folder: '${itemPath}' to remote path '${remoteFolder}'`);
        let remotePath = path.dirname(itemPath).replace(localPath, remoteFolder);
        await iterateDirectory(itemPath, callback);
      }
    }

    await iterateDirectory(localPath);
  }

  static async uploadFile(localPath, remotePath, options) {
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

      return retval;
    }

    if (uploadOptions.encrypt) {
      Logger.verbose(`Encrypting ${basename}`);
      basename = Utils.encryptString(basename, uploadOptions.password, uploadOptions.algorithm);
      Logger.verbose(`Encrypted filename: ${basename}`);
    }

    remotePath = Utils.getPathArray(remotePath || '/').join('/');

    let mkdirResult = await Node.createDirectoryPath(remotePath, {
      labels: uploadOptions.encrypt ? ['enc'] : [],
    });

    if (mkdirResult.success === false) {
      return mkdirResult;
    }

    let remoteFolder = mkdirResult.data;
    let stream = await Node.getUploadStream(localPath, {
      encrypt: uploadOptions.encrypt,
      password: uploadOptions.password,
      algorithm: uploadOptions.algorithm,
      armor: uploadOptions.armor,
    });

    let exists = await Node.exists(`${remotePath}/${basename}`, stream.path, uploadOptions);
    if (exists.success === true) {
      stream.close();

      if (uploadOptions.force === true || uploadOptions.overwrite === true || exists.data.node.isPending()) {
        // I REALLY wish there was a better way to do this... but since we
        // statically call `upload`, we need a way to still listen for events
        // on the node if it exsts and is going to be overwritten... maybe
        // we refactor so if it exsts, we return a false sucess and the
        // calling code can choose to overwrite?
        exists.data.node.on('fileUpload', (...args) => {
          Node.emit('fileUpload', ...args);
        });
        exists.data.node.on('uploadProgress', (...args) => {
          Node.emit('uploadProgress', ...args);
        });
        exists.data.node.on('uploadComplete', (...args) => {
          Node.emit('uploadComplete', ...args);
        });

        return await exists.data.node.overwrite(localPath, uploadOptions);
      } else {
        if (uploadOptions.encrypt) {
          Logger.debug(`Removing encrypted temp file '${stream.path}'`);
          try {
            fs.unlinkSync(stream.path);
            Logger.debug(`Successfully removed encrypted temp file '${stream.path}'`);
          } catch (e) {
            Logger.error(`Failed to remove encrypted temp file '${stream.path}': ${e}`);
          }
        }

        if (
          // Path matches and md5 or size matches
          (exists.data.pathMatch === true && (exists.data.md5Match === true || exists.data.sizeMatch))
          ||
          // Path matches but md5 is different
          (exists.data.pathMatch === true && exists.data.md5Match === false)
          ||
          // md5 matches another path and we are suppressing duplicates
          ((exists.data.pathMatch === false && exists.data.md5Match === true) && uploadOptions.suppressDedupe === false)
        ) {
          retval.data = exists.data;

          Node.emit('uploadComplete', null, null, retval, {
            localPath: localPath,
            remotePath: remotePath,
          });

          return retval;
        }
      }
    }

    let params = {};
    if (uploadOptions.suppressDedupe) {
      params.suppress = 'deduplication';
    }

    Node.emit('fileUpload', localPath);
    let progressInterval = null,
      form = new FormData();

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

    let error = null,
      response = null;
    try {
      response = await got.post(`${account.contentUrl}nodes`, {
        headers: headers,
        query: params,
        body: form,
        timeout: 3600000,
      });
    } catch (err) {
      error = err;
      response = err.response;
    }

    Logger.debug(`Response returned with status code ${response.statusCode}.`);
    Logger.silly(`Response body: ${response.body}`);
    stream.close();

    if (uploadOptions.encrypt) {
      Logger.debug(`Removing encrypted cache file at ${stream.path}`);
      fs.unlinkSync(stream.path);
    }

    if (error) {
      if (uploadOptions.retryAttempt >= uploadOptions.numRetries) {
        retval.data.message = `${err.message}. Failed retry attempt(s). Skipping file.`;

        Node.emit('uploadComplete', null, error.message, retval, {
          localPath: localPath,
          remotePath: remotePath,
        });

        return retval;
      }

      let auth = await account.authorize(null, {force: true});
      if (auth.success) {
        await account.sync({});
        let retryOptions = {};
        for (let key in uploadOptions) {
          retryOptions[key] = uploadOptions[key];
        }

        retryOptions.retryAttempt++;

        retval.success = false;
        retval.data.message = `${error}. Reauthenticating and retrying.`;
        retval.retry = true;

        Node.emit('uploadComplete', null, error.message, retval, {
          localPath: localPath,
          remotePath: remotePath,
        });

        return await Node.uploadFile(localPath, remotePath, retryOptions);
      }

      throw Error('Failed to reauthenticate with Cloud Drive: ' + JSON.stringify(data.data));
    }

    retval.data.statusCode = response.statusCode;
    retval.data = JSON.parse(response.body);
    retval.success = true;
    retval.data = new Node(retval.data);

    await retval.data.save();
    Node.emit('uploadComplete', response, response.body, retval, {
      localPath: localPath,
      remotePath: remotePath,
    });

    return retval;
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
