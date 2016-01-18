'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class CatCommand extends Command {
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

          var opts = {
            stream: process.stdout
          };

          if (!node.isFile()) {
            return reject(Error('Node must be a file'));
          }

          node.download('', opts, (err, data) => {
            if (err) {
              return reject(err);
            }

            if (data.success) {
              return resolve();
            }

            return reject(Error(data.data.message));
          });
        });
      });
    });
  }
}

module.exports = CatCommand;
