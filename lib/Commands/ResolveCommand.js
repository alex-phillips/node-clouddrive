'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class ResolveCommand extends Command {
  run(args, options) {
    var id = args[0];
    if (id) {
      id = id.trim();
    }

    return new Promise((resolve, reject) => {
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
