'use strict';

var Command = require('./Command');
var Node = require('../Node');
var Utils = require('../Utils');
var ProgressBar = require('progress');

class DownloadCommand extends Command {
  run(remotePath, localPath, options) {
    var searchFunction = Node.loadByPath;
    var notFound = `No node exists at path '${remotePath}'`;
    if (options.id) {
      searchFunction = Node.loadById;
      notFound = `No node exists with ID '${remotePath}'`;
    }

    if (remotePath) {
      remotePath = remotePath.trim();
    }

    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err.message);
        }

        searchFunction(remotePath, (err, node) => {
          if (err) {
            return reject(err.message);
          }

          if (!node) {
            return reject(notFound);
          }

          var bar = null;
          var opts = {
            onFileDownload: (node, callback) => {
              bar = new ProgressBar(`Downloading ${node.getName()} [:bar] :percent :etas`, {
                complete: '=',
                incomplete: ' ',
                width: 20,
                total: node.getSize(),
                clear: true
              });

              callback();
            },
            onFileProgress: (data) => {
              bar.tick(data.length);
            },
            onFileComplete: (node, localPath, retval, callback) => {
              // Clear out progress bar
              if (bar !== null && !bar.complete) {
                bar.tick(node.getSize());
                bar = null;
              }

              if (retval.success) {
                return Utils.getFileMd5(localPath, (err, md5) => {
                  if (err) {
                    return callback(err);
                  }

                  if (md5 === node.getMd5()) {
                    Command.info(`Successfully downloaded '${localPath}'`);
                  } else {
                    Command.error(`Failed to download '${localPath}'`);
                  }

                  callback();
                });
              }

              var message = `Failed to download '${localPath}'`;
              if (retval.data.message) {
                message += ': ' + retval.data.message;
              }

              if (retval.data.exists) {
                if (retval.data.md5_match) {
                  Command.warn(message);
                } else {
                  Command.error(message);
                }
              } else {
                Command.error(message);
              }

              callback();
            }
          };

          node.download(localPath, opts, (err, data) => {
            if (err) {
              return reject(err.message);
            }

            if (data.success) {
              return resolve();
            }

            return reject(data.data.message);
          });
        })
      });
    });
  }
}

module.exports = DownloadCommand;
