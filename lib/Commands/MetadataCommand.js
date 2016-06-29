'use strict';

let Command = require('./Command'),
  Node = require('../Node');

class MetadataCommand extends Command {
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
            Command.error(notFound);
          } else {
            if (this.config.get('json.pretty') === true) {
              Command.log(JSON.stringify(node.getData(), null, 4));
            } else {
              Command.log(JSON.stringify(node.getData()));
            }
          }

          resolve();
        });
      });
    });
  }
}

module.exports = MetadataCommand;
