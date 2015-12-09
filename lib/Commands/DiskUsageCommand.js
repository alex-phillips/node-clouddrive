'use strict';

var Command = require('./Command'),
  Node = require('../Node'),
  async = require('async'),
  Utils = require('../Utils');

class DiskUsageCommand extends Command {
  run(remotePath, options) {
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

          var size = 0;
          var files = 0;
          var folders = 0;

          Command.startSpinner('Calculating ');

          calculateSize(node, () => {
            Command.stopSpinner();
            Command.log(Utils.convertFileSize(size));

            if (options.verbose) {
              Command.log(`${files} files, ${folders} folders`);
            }

            resolve();
          });

          function calculateSize(node, callback) {
            node.getChildren((err, children) => {
              async.forEach(children, (child, callback) => {
                var nodeSize = child.getSize();
                if (nodeSize) {
                  size += nodeSize;
                }

                if (child.isFolder()) {
                  folders++;

                  return calculateSize(child, callback);
                }

                files++;
                callback();
              }, () => {
                callback(null);
              });
            });
          }
        });
      });
    });
  }
}

module.exports = DiskUsageCommand;
