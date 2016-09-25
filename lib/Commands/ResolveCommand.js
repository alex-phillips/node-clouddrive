'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger');

class ResolveCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      let id = args[0];
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
            return reject(Error(`No node found with ID '${id}'`));
          }

          node.getPath((err, path) => {
            Command.output(path);

            return resolve();
          });
        });
      });
    });
  }
}

module.exports = ResolveCommand;
