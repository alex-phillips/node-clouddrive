'use strict';

var Command = require('./Command');
var Node = require('../Node');

class MetadataCommand extends Command {
  run(remotePath, options) {
    var self = this;

    var searchFunction = Node.loadByPath;
    var notFound = `No node exists at path '${remotePath}'`;
    if (options.id) {
      searchFunction = Node.loadById;
      notFound = `No node exists with ID '${remotePath}'`;
    }

    if (remotePath) {
      remotePath = remotePath.trim();
    }

    return new Promise(function(resolve, reject) {
      self.initialize(function(err, data) {
        if (err) {
          return reject(err);
        }

        searchFunction(remotePath, function(err, node) {
          if (err) {
            return reject(err);
          }

          if (!node) {
            Command.error(notFound);
          } else {
            if (self.config.get('json.pretty') === true) {
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
