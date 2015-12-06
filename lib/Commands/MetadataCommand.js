'use strict';

var Command = require('./Command');
var Node = require('../Node');

class MetadataCommand extends Command {
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
