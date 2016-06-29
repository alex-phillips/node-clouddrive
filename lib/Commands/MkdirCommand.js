'use strict';

let Command = require('./Command'),
  Node = require('../Node');

class MkdirCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      let path = args[0];

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
            return reject(Error(`Failed creating remote directory '${path}'`));
          }

          Command.info(`Successfully created remote directory '${path}'`);

          return resolve();
        });
      });
    });
  }
}

module.exports = MkdirCommand;
