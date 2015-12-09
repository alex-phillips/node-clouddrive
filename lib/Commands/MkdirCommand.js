'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class MkdirCommand extends Command {
  run(path, options) {
    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err.message);
        }

        if (!data.success) {
          return reject('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
        }

        Node.createDirectoryPath(path, (err, data) => {
          if (err) {
            return reject(err.message);
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
