'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Utils = require('../Utils'),
  Logger = require('../Logger'),
  ProgressBar = require('../ProgressBar'),
  async = require('async'),
  inquirer = require('inquirer');

class DownloadCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      let remotePath = args[0],
        localPath = args[1],
        searchFunction = Node.loadByPath,
        notFound = `No node exists at path '${remotePath}'`;
      if (options.id) {
        searchFunction = Node.loadById;
        notFound = `No node exists with ID '${remotePath}'`;
      }

      if (remotePath) {
        remotePath = remotePath.trim();
      }

      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        searchFunction(remotePath, (err, node) => {
          if (err) {
            return reject(err);
          }

          if (!node) {
            return reject(Error(notFound));
          }

          let queryParams = {};
          if (options.dimensions) {
            queryParams.viewBox = options.dimensions;
          }

          let bar = null,
            downloadingNode = null,
            bytesDownloaded = 0,
            bytesTransfered = 0,
            lastRun = null,
            startTime = null,
            opts = {
              remote: options.remote,
              queryParams: queryParams,
              maxConnections: this.config.get('download.maxConnections') || 1,
              retryAttempt: 0,
              numRetries: this.config.get('upload.numRetries'),
              checkMd5: this.config.get('download.checkMd5'),
              decrypt: options.decrypt || false,
              password: this.config.get('crypto.password'),
              algorithm: this.config.get('crypto.algorithm'),
              // armor: this.config.get('crypto.armor'),
            };

          async.waterfall([
            callback => {
              if (!options.decrypt || !options.password) {
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

            node.on('fileDownload', node => {
              if (this.config.get('cli.progressBars') && opts.maxConnections === 1) {
                startTime = Date.now();
                bytesDownloaded = 0;
                downloadingNode = node;
                lastRun = Date.now();
                bar = new ProgressBar(`Downloading ${downloadingNode.getName()}\n:percent[:bar] :speed eta :etas (:downloaded / :filesize)`, {
                  total: node.getSize(),
                  incomplete: ' ',
                  width: 40,
                  clear: false,
                  renderThrottle: this.config.get('cli.progressInterval')
                });
              }
            });

            node.on('downloadProgress', data => {
              if (bar) {
                bytesDownloaded += data.length;
                bytesTransfered += data.length;

                let timeDiff = Date.now() - lastRun;

                if (timeDiff >= this.config.get('cli.progressInterval') || bytesDownloaded >= downloadingNode.getSize()) {
                  lastRun = Date.now();
                  bar.tick(bytesTransfered, {
                    speed: `${Utils.convertFileSize(Math.round(bytesTransfered / (timeDiff / 1000)), 2)}/s`,
                    downloaded: Utils.convertFileSize(bytesDownloaded),
                    filesize: Utils.convertFileSize(downloadingNode.getSize()),
                  });
                  bytesTransfered = 0;
                }
              }
            });

            node.on('downloadComplete', (response, body, retval, data) => {
              // Clear out progress bar
              if (bar !== null) {
                bar.clear();
                bar = null;
              }

              if (response) {
                Logger.debug(`Response returned with status code ${response.statusCode}`);
              }

              if (retval.success) {
                return Logger.info(`Successfully downloaded '${data.localPath}'`);
              }

              let message = `Failed to download '${data.localPath}'`;
              if (retval.data.message) {
                message += ': ' + retval.data.message;
              }

              if (retval.data.exists) {
                Logger.warn(message);
              } else {
                Logger.error(message);
              }
            });

            node.download(localPath, opts, (err, data) => {
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
      });
    });
  }
}

module.exports = DownloadCommand;
