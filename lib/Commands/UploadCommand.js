'use strict';

var fs = require('fs'),
  Command = require('./Command'),
  Node = require('../Node'),
  colors = require('colors'),
  ProgressBar = require('progress');

class UploadCommand extends Command {
  run(localPath, remotePath, options) {
    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        if (!data.success) {
          return reject(Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.'));
        }

        if (!fs.existsSync(localPath)) {
          return reject(`No file exists at '${localPath}'`);
        }

        var bar = null;
        var localFilesize = null;
        var bytesUploaded = null;
        var opts = {
          onFileUpload: (localPath, callback) => {
            bytesUploaded = 0;
            localFilesize = fs.statSync(localPath)['size'];
            bar = new ProgressBar(`Uploading '${localPath}' [:bar] :percent :etas`, {
              complete: '=',
              incomplete: ' ',
              width: 20,
              total: localFilesize,
              clear: true
            });

            return callback();
          },
          onFileProgress: (request) => {
            if (request) {
              var bytesDispatched = request.connection._bytesDispatched;
              bar.tick(bytesDispatched - bytesUploaded);
              bytesUploaded = bytesDispatched;
            }
          },
          onFileComplete: (localPath, remotePath, retval, callback) => {
            // Clear out progress bar
            if (bar !== null && !bar.complete) {
              bar.tick(localFilesize);
              bar = null;
              localFilesize = null;
            }

            if (retval.success) {
              Command.info(`Successfully uploaded file '${localPath}' to '${remotePath}'`);
            } else {
              var message = `Failed to upload file '${localPath}'`;
              if (retval.data.message) {
                message += `: ${retval.data.message}`;
              } else {
                message += `: ${JSON.stringify(retval.data)}`;
              }

              if (retval.data.exists !== undefined && retval.data.exists === true) {
                if (retval.data.md5Match === true && retval.data.pathMatch === true) {
                  Command.warn(message);
                } else {
                  Command.error(message);
                }
              } else {
                if (retval.data.retry !== undefined && retval.data.retry === true) {
                  Command.warn(message);
                } else {
                  Command.error(message);
                }
              }
            }

            return callback();
          }
        };

        if (options.overwrite) {
          opts.overwrite = true;
        }

        if (fs.lstatSync(localPath).isDirectory()) {
          return Node.uploadDirectory(localPath, remotePath, opts, (err, data) => {
            if (err) {
              return reject(err);
            }

            return resolve();
          });
        }

        Node.uploadFile(localPath, remotePath, opts, (err, data) => {
          if (err) {
            return reject(err);
          }

          if (data.success) {
            return resolve();
          }

          return reject();
        });
      });
    });
  }
}

module.exports = UploadCommand;
