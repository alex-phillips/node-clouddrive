'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger');

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
            Logger.error(notFound);
          } else {
            if (this.config.get('json.pretty') === true) {
              let output = JSON.stringify(node.getData(), null, 2);
              output.split('\n').forEach(line => {
                Logger.info(line);
              });
            } else {
              Logger.info(JSON.stringify(node.getData()));
            }
          }

          resolve();
        });
      });
    });
  }
}

module.exports = MetadataCommand;
