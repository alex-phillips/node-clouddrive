'use strict';

let fs = require('fs'),
  Command = require('./Command'),
  Node = require('../Node'),
  chalk = require('chalk'),
  ProgressBar = require('../ProgressBar'),
  async = require('async'),
  inquirer = require('inquirer'),
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
          startTime = null,
          opts = {
            force: !!options.force,
            ignoreFiles: this.config.get('cli.ignoreFiles'),
            maxConnections: this.config.get('upload.maxConnections') || 1,
            retryAttempt: 0,
            numRetries: this.config.get('upload.numRetries'),
            suppressDedupe: options.duplicates === true ? true : this.config.get('upload.duplicates'),
            checkMd5: options.checksum || this.config.get('upload.checkMd5'),
            encrypt: options.encrypt || false,
            password: this.config.get('crypto.password'),
            algorithm: this.config.get('crypto.algorithm'),
            armor: this.config.get('crypto.armor'),
            labels: options.labels || [],
          };

        if (options.overwrite) {
          opts.overwrite = true;
        }

        if (options.encrypt) {
          if (opts.labels.indexOf('enc') === -1) {
            opts.labels.push('enc');
          }
        }

        async.waterfall([
          callback => {
            if (!options.encrypt || !options.password) {
              return callback();
            }

            inquirer.prompt([
              {
                type: 'password',
                name: 'password',
                message: 'password: '
              }
            ], answers => {
              opts.password = answers.password;
              callback();
            });
          },
        ], err => {
          if (err) {
            return reject(err);
          }

          Node.on('fileUpload', localPath => {
            if (this.config.get('cli.progressBars') && opts.maxConnections === 1) {
              startTime = Date.now();
              bytesUploaded = 0;
              localFilesize = fs.statSync(localPath).size;
              lastRun = Date.now();
              bar = new ProgressBar(`Uploading '${localPath}'\n:percent [:bar] :speed eta :etas (:uploaded / :filesize)`, {
                total: localFilesize,
                incomplete: ' ',
                width: 40,
                clear: false,
                renderThrottle: this.config.get('cli.progressInterval')
              });
            }
          });

          Node.on('uploadProgress', (localPath, chunk) => {
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
          });

          Node.on('uploadComplete', (response, body, retval, data) => {
            // Clear out progress bar
            if (bar !== null) {
              bar.clear();
              bar = null;
              localFilesize = null;
            }

            if (response) {
              if (!body) {
                return Logger.error(`Failed to upload file '${data.localPath}'. Invalid body returned: ${body}`);
              }
            }

            if (retval.success) {
              Logger.info(`Successfully uploaded file '${data.localPath}' to '${data.remotePath}'`);
              if (options['remove-source-files']) {
                Logger.verbose(`Attempting to remove local file '${data.localPath}'`);
                try {
                  fs.unlinkSync(data.localPath);
                  Logger.verbose(`Successfully removed local file '${data.localPath}'`);
                } catch (e) {
                  Logger.error(`Failed to remove source file '${data.localPath}': ${e}`);
                }
              }
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
                  if (options['remove-source-files']) {
                    Logger.verbose(`Attempting to remove local file '${data.localPath}'`);
                    try {
                      fs.unlinkSync(data.localPath);
                      Logger.verbose(`Successfully removed local file '${data.localPath}'`);
                    } catch (e) {
                      Logger.error(`Failed to remove source file '${data.localPath}': ${e}`);
                    }
                  }
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
          });

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
    });
  }
}

module.exports = UploadCommand;
