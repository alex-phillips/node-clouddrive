'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class ResolveCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      var id = args[0];
      if (!id) {
        return reject(Error('ID is required to resolve'));
      }

      id = id.trim();

      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        Node.loadById(id, (err, node) => {
          if (err) {
            return reject(err);
          }

          if (!node) {
            return reject(`No node found with ID '${id}'`);
          }

          node.getPath((err, path) => {
            Command.log(path);

            return resolve();
          });
        });
      });
    });
  }
}

module.exports = ResolveCommand;
