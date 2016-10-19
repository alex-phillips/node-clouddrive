'use strict';

let fs = require('fs'),
  Command = require('./Command'),
  Node = require('../Node'),
  chalk = require('chalk'),
  ProgressBar = require('ascii-progress'),
  async = require('async'),
  logUpdate = require('log-update'),
  Utils = require('../Utils'),
  Logger = require('../Logger');

class UploadCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      let remotePath = args.pop();

      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        if (!data.success) {
          return reject(Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.'));
        }

        if (args.length === 0) {
          return reject(Error('Destination path must be specified'));
        }

        let bar = null,
          localFilesize = null,
          bytesUploaded = 0,
          bytesTransfered = 0,
          lastRun = null,
          opts = {
            force: options.force ? true : false,
            ignoreFiles: this.config.get('cli.ignoreFiles'),
            retryAttempt: 0,
            numRetries: this.config.get('upload.numRetries'),
            suppressDedupe: options.duplicates === true ? true : this.config.get('upload.duplicates'),
            checkMd5: this.config.get('upload.checkMd5'),
            onFileUpload: (localPath, callback) => {
              if (this.config.get('cli.progressBars')) {
                bytesUploaded = 0;
                localFilesize = fs.statSync(localPath).size;
                lastRun = Date.now();
                bar = new ProgressBar({
                  schema: `Uploading '${localPath}'\n:percent [:bar] :speed eta :etas (:uploaded / :filesize)`,
                  width: 40,
                  total: localFilesize,
                });
              }

              return callback();
            },
            onFileProgress: (localPath, chunk) => {
              if (bar) {
                bytesUploaded += chunk.length;
                bytesTransfered += chunk.length;

                let timeDiff = Date.now() - lastRun;
                if (timeDiff >= this.config.get('cli.progressInterval') || bytesUploaded >= localFilesize) {
                  lastRun = Date.now();
                  bar.tick(bytesTransfered, {
                    speed: `${Utils.convertFileSize(Math.round(bytesTransfered / (timeDiff / 1000)), 2)}/s`,
                    uploaded: Utils.convertFileSize(bytesUploaded),
                    filesize: Utils.convertFileSize(localFilesize),
                  });
                  bytesTransfered = 0;
                }
              }
            },
            onFileComplete: (response, body, retval, data, callback) => {
              // Clear out progress bar
              if (bar !== null && !bar.complete) {
                bar.clear();
                bar = null;
                localFilesize = null;
              }

              if (response) {
                if (!body) {
                  Logger.error(`Failed to upload file '${data.localPath}'. Invalid body returned: ${body}`);

                  return callback();
                }
              }

              if (retval.success) {
                Logger.info(`Successfully uploaded file '${data.localPath}' to '${data.remotePath}'`);
              } else {
                let message = `Failed to upload file '${data.localPath}'`;

                if (retval.data.message) {
                  message += `: ${retval.data.message}`;
                } else {
                  message += `: ${JSON.stringify(retval.data)}`;
                }

                if (retval.data.exists === true) {
                  if ((retval.data.md5Match === true || retval.data.sizeMatch === true) && retval.data.pathMatch === true) {
                    Logger.warn(message);
                  } else {
                    Logger.error(message);
                  }
                } else {
                  if (retval.data.retry !== undefined && retval.data.retry === true) {
                    Logger.warn(message);
                  } else {
                    Logger.error(message);
                  }
                }
              }

              return callback();
            }
          };

        if (options.overwrite) {
          opts.overwrite = true;
        }

        Logger.debug(`Beginning upload...`);
        async.forEachSeries(args, (localPath, callback) => {
          try {
            fs.statSync(localPath);
          } catch (e) {
            return reject(Error(`No file exists at '${localPath}'`));
          }

          if (fs.lstatSync(localPath).isDirectory()) {
            Logger.debug(`Local path '${localPath}' is a directory. Uploading recursively...`);
            return Node.uploadDirectory(localPath, remotePath, opts, (err, data) => {
              if (err) {
                return reject(err);
              }

              callback();
            });
          }

          Logger.debug(`Preparing to upload file '${localPath}'...`);
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
