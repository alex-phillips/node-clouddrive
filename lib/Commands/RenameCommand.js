'use strict';

var Command = require('./Command');
var Node = require('../Node');

class RenameCommand extends Command {
  run(remotePath, name, options) {
    var self = this;

    return new Promise(function(resolve, reject) {
      self.initialize(function(err, data) {
        if (err) {
          return reject(err.message);
        }

        if (!data.success) {
          return reject('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
        }

        var searchFunction = Node.loadByPath;
        var notFound = `No node exists at path '${remotePath}'`;
        if (options.id) {
          searchFunction = Node.loadById;
          notFound = `No node exists with ID '${remotePath}'`;
        }

        if (remotePath) {
          remotePath = remotePath.trim();
        }

        searchFunction(remotePath, function(err, node) {
          if (err) {
            return reject(err.message);
          }

          if (!node) {
            return reject(notFound);
          }

          node.rename(name, function(err, data) {
            if (err) {
              return reject(err.message);
            }

            if (!data.success) {
              return reject(`Failed to rename node to '${name}'`);
            }

            Command.info(`Successfully renamed node to '${name}'`);

            return resolve();
          });
        });
      });
    });
  }
}

module.exports = RenameCommand;
