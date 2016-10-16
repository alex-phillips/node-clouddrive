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
  run(args, options) {
    return new Promise((resolve, reject) => {
      let remoteFolder = args.pop();

      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        if (args.length === 0) {
          return reject(Error('Destination path must be specified'));
        }

        async.forEachSeries(args, (localPath, callback) => {
          localPath = path.resolve(localPath);

          remoteFolder = Utils.getPathArray(remoteFolder);
          remoteFolder.push(Utils.getPathArray(localPath).pop());
          remoteFolder = remoteFolder.join('/');

          fs.stat(localPath, (err, stat) => {
            if (err) {
              return callback(err);
            }

            if (stat.isDirectory()) {
              this.iterateDirectory(localPath, remoteFolder, callback);
            } else {
              this.checkFile(localPath, `${remoteFolder}/${path.basename(localPath)}`, callback);
            }
          });
        }, err => {
          if (err) {
            return reject(err);
          }

          return resolve();
        });
      });
    });
  }

  iterateDirectory(directory, remoteFolder, callback) {
    fs.readdir(directory, (err, list) => {
      if (err) {
        return callback(err);
      }

      if (list.length === 0) {
        return callback();
      }

      async.forEachSeries(list, (item, callback) => {
        let itemPath = `${directory}/${item}`,
          remoteFile = itemPath.replace(directory, remoteFolder);
        this.checkFile(itemPath, remoteFile, callback);
      }, err => {
        callback(err);
      });
    });
  }

  checkFile(localPath, remoteFile, callback) {
    fs.stat(localPath, (err, stat) => {
      if (err) {
        return callback(err);
      }

      if (stat.isDirectory()) {
        return this.iterateDirectory(localPath, callback);
      }

      Node.exists(remoteFile, localPath, {
        checkMd5: this.config.get('upload.checkMd5'),
      }, (err, result) => {
        if (!result.success) {
          Logger.error(`File ${remoteFile} does not exist`);

          return callback();
        }

        if (result.data.pathMatch && (result.data.md5Match || result.data.sizeMatch)) {
          Logger.info(`File ${remoteFile} exists and is identical to local copy`);
        } else if (result.data.pathMatch) {
          Logger.warn(`File ${remoteFile} exists but does not match local copy`);
        } else {
          Logger.warn(`File ${remoteFile} exists at the following location: ${result.data.nodes.join(', ')}`);
        }

        return callback();
      });
    });
  }
}

module.exports = ExistsCommand;
