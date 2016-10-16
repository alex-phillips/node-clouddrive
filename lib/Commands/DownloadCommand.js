'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Utils = require('../Utils'),
  Logger = require('../Logger'),
  ProgressBar = require('progress'),
  logUpdate = require('log-update');

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
            firstRun = true,
            lastRun = null,
            opts = {
              remote: options.remote,
              queryParams: queryParams,
              checkMd5: this.config.get('download.checkMd5'),
              onFileDownload: (node, callback) => {
                if (this.config.get('cli.progressBars')) {
                  bytesDownloaded = 0;
                  downloadingNode = node;
                  lastRun = Date.now();
                  bar = new ProgressBar(':percent[:bar] :speed eta :etas (:downloaded / :filesize)', {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: node.getSize(),
                    clear: true,
                    print: false,
                    renderThrottle: this.config.get('cli.progressInterval')
                  });
                }

                return callback();
              },
              onFileProgress: (data) => {
                if (bar) {
                  if (firstRun === true) {
                    logUpdate.done();
                    firstRun = false;
                  }

                  bytesDownloaded += data.length;
                  bytesTransfered += data.length;

                  let message = `Downloading ${downloadingNode.getName()}`,
                    timeDiff = Date.now() - lastRun;

                  if (timeDiff >= this.config.get('cli.progressInterval') || bytesDownloaded >= downloadingNode.getSize()) {
                    lastRun = Date.now();
                    bar.tick(bytesTransfered, {
                      speed: `${Utils.convertFileSize(Math.round(bytesTransfered / (timeDiff / 1000)), 2)}/s`,
                      downloaded: Utils.convertFileSize(bytesDownloaded),
                      filesize: Utils.convertFileSize(downloadingNode.getSize()),
                    });
                    message += `\n${bar.lastDraw}`;
                    logUpdate(message);
                    bytesTransfered = 0;
                  }
                }
              },
              onFileComplete: (response, body, retval, data, callback) => {
                // Clear out progress bar
                if (bar !== null && !bar.complete) {
                  bar.tick(data.node.getSize());
                  bar = null;
                }

                logUpdate.clear();

                if (response) {
                  Logger.debug(`Response returned with status code ${response.statusCode}`);
                }

                if (retval.success) {
                  Logger.info(`Successfully downloaded '${data.localPath}'`);

                  return callback();
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

                callback();
              }
            };

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
  }
}

module.exports = DownloadCommand;
