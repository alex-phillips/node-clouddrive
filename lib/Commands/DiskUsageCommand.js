'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  async = require('async'),
  Utils = require('../Utils');

class DiskUsageCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      let remotePath = args[0],
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

          let size = 0,
            files = 0,
            folders = 0;

          Command.startSpinner('Calculating ');

          calculateSize(node, () => {
            Command.stopSpinner();
            Command.log(Utils.convertFileSize(size));
            Command.log(`${files} files, ${folders} folders`, 1);

            resolve();
          });

          function calculateSize(node, callback) {
            node.getChildren({
              remote: options.remote,
            }, (err, children) => {
              async.forEach(children, (child, callback) => {
                let nodeSize = child.getSize();
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
