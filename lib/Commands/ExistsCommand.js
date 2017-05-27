'use strict';

let fs = require('fs'),
  Command = require('./Command'),
  Node = require('../Node'),
  chalk = require('chalk'),
  async = require('async'),
  path = require('path'),
  Utils = require('../Utils'),
  Logger = require('../Logger');

class ExistsCommand extends Command {
  async run(args, options) {
    let remoteFolder = args.pop();

    await this.initialize();

    if (args.length === 0) {
      throw Error('Destination path must be specified');
    }

    for (let localPath of args) {
      localPath = path.resolve(localPath);

      remoteFolder = Utils.getPathArray(remoteFolder);
      remoteFolder.push(Utils.getPathArray(localPath).pop());
      remoteFolder = remoteFolder.join('/');

      let stat = fs.statSync(localPath);
      if (stat.isDirectory()) {
        await this.iterateDirectory(localPath, remoteFolder);
      } else {
        await this.checkFile(localPath, `${remoteFolder}/${path.basename(localPath)}`);
      }
    }
  }

  async iterateDirectory(directory, remoteFolder) {
    let list = fs.readdirSync(directory);
    if (list.length === 0) {
      return;
    }

    for (let item of list) {
      let itemPath = `${directory}/${item}`,
        remoteFile = itemPath.replace(directory, remoteFolder);
      await this.checkFile(itemPath, remoteFile);
    }
  }

  async checkFile(localPath, remoteFile) {
    let stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      return await this.iterateDirectory(localPath);
    }

    let exists = await Node.exists(remoteFile, localPath, {
      checkMd5: this.config.get('upload.checkMd5'),
    });
    if (!exists.success) {
      Logger.error(`File ${remoteFile} does not exist`);

      return;
    }

    if (result.data.pathMatch && (result.data.md5Match || result.data.sizeMatch)) {
      Logger.info(`File ${remoteFile} exists and is identical to local copy`);
    } else if (result.data.pathMatch) {
      Logger.warn(`File ${remoteFile} exists but does not match local copy`);
    } else {
      Logger.warn(`File ${remoteFile} exists at the following location: ${result.data.nodes.join(', ')}`);
    }
  }
}

module.exports = ExistsCommand;
