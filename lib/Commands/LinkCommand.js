'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class LinkCommand extends Command {
  run(args, options) {
    var remotePath = args[0];

    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        if (!data.success) {
          return reject(Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.'));
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

        searchFunction(remotePath, (err, node) => {
          if (err) {
            return reject(err);
          }

          if (!node) {
            return reject(Error(notFound));
          }

          if (!node.isFile()) {
            return reject(Error('Links can only be created for files.'));
          }

          node.getMetadata(true, (err, data) => {
            if (err) {
              return reject(err);
            }

            if (data.success === false) {
              return reject(`Failed to retrieve metadata for node '${remotePath}': ${JSON.stringify(data.data)}`);
            }

            if (data.data.tempLink === undefined) {
              return reject(Error('Failed retrieving temporary link. Make sure you have permission.'));
            }

            Command.log(data.data.tempLink);

            return resolve();
          });
        });
      });
    });
  }
}

module.exports = LinkCommand;
