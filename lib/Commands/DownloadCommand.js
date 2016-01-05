'use strict';

var Command = require('./Command'),
  Node = require('../Node'),
  Utils = require('../Utils'),
  ProgressBar = require('progress'),
  logUpdate = require('log-update');

class DownloadCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      var remotePath = args[0],
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

          var queryParams = {};
          if (options.dimensions) {
            queryParams.viewBox = options.dimensions;
          }

          var bar = null,
            start,
            opts = {
              queryParams: queryParams,
              onFileDownload: (node, callback) => {
                bar = new ProgressBar(`:percent[:bar] :speed eta :etas (:current / :total bytes)`, {
                  complete: '=',
                  incomplete: ' ',
                  width: 20,
                  total: node.getSize(),
                  clear: true,
                  print: false
                });

                start = new Date();
                callback();
              },
              onFileProgress: (data) => {
                bar.tick(data.length, {
                  speed: `${Utils.convertFileSize(Math.round(bar.curr / ((new Date() - start) / 1000)), 2)}/s`
                });
                logUpdate(`Downloading ${node.getName()}\n${bar.lastDraw}`);
              },
              onFileComplete: (node, localPath, retval, callback) => {
                // Clear out progress bar
                if (bar !== null && !bar.complete) {
                  bar.tick(node.getSize());
                  bar = null;
                }

                logUpdate.clear();

                if (retval.success) {
                  Command.info(`Successfully downloaded '${localPath}'`);

                  return callback();
                }

                var message = `Failed to download '${localPath}'`;
                if (retval.data.message) {
                  message += ': ' + retval.data.message;
                }

                if (retval.data.exists) {
                  Command.warn(message);
                } else {
                  Command.error(message);
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
