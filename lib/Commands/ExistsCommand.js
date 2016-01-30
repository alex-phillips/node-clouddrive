'use strict';

var fs = require('fs'),
  Command = require('./Command'),
  Node = require('../Node'),
  colors = require('colors'),
  async = require('async'),
  Utils = require('../Utils');

class UploadCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      var remotePath = args.pop();

      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        if (args.length === 0) {
          return reject(Error('Destination path must be specified'));
        }

        var opts = {
          dryRun: true,
          onFileComplete: (localPath, remotePath, retval, callback) => {
            if (retval.success === true) {
              // Node exists remotely
              if (retval.data.pathMatch === true && retval.data.md5Match === true) {
                Command.info(retval.data.message);
              } else if (retval.data.pathMatch === true && retval.data.md5Match === false) {
                Command.error(retval.data.message);
              } else if (retval.data.pathMatch === false && retval.data.md5Match === true) {
                Command.warn(retval.data.message);
              }
            } else {
              Command.error(retval.data.message);
            }

            return callback();
          }
        };

        async.forEachSeries(args, (localPath, callback) => {
          if (!fs.existsSync(localPath)) {
            return reject(Error(`No file exists at '${localPath}'`));
          }

          if (fs.lstatSync(localPath).isDirectory()) {
            return Node.uploadDirectory(localPath, remotePath, opts, (err, data) => {
              if (err) {
                return reject(err);
              }

              callback();
            });
          }

          Node.uploadFile(localPath, remotePath, opts, (err, data) => {
            if (err) {
              return reject(err);
            }

            callback();
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
}

module.exports = UploadCommand;
