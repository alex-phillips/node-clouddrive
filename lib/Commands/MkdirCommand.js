'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class MkdirCommand extends Command {
  run(args, options) {
    var path = args[0];

    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        if (!data.success) {
          return reject(Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.'));
        }

        Node.createDirectoryPath(path, (err, data) => {
          if (err) {
            return reject(err);
          }

          if (!data.success) {
            return reject(`Failed creating remote directory '${path}'`);
          }

          return resolve(`Successfully created remote directory '${path}'`);
        });
      });
    });
  }
}

module.exports = MkdirCommand;
