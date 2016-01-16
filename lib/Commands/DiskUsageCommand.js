'use strict';

var Command = require('./Command'),
  Node = require('../Node'),
  async = require('async'),
  Utils = require('../Utils');

class DiskUsageCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      var remotePath = args[0],
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
              }, err => {
                callback(err);
              });
            });
          }
        });
      });
    });
  }
}

module.exports = DiskUsageCommand;
