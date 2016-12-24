'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  async = require('async'),
  inquirer = require('inquirer');

class CatCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      let remotePath = args[0],
        searchFunction = Node.loadByPath,
        notFound = `No node exists at path '${remotePath}'`;
      if (options.id) {
        searchFunction = Node.loadById;
        notFound = `No node exists with ID '${remotePath}'`;
      }

      if (remotePath) {
        remotePath = remotePath.trim();
      }

      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        searchFunction(remotePath, (err, node) => {
          if (err) {
            return reject(err);
          }

          if (!node) {
            return reject(Error(notFound));
          }

          let opts = {
            stream: process.stdout,
            decrypt: options.decrypt,
            password: this.config.get('crypto.password'),
          };

          if (!node.isFile()) {
            return reject(Error('Node must be a file'));
          }

          async.waterfall([
            callback => {
              if (!options.decrypt || !options.password) {
                return callback();
              }

              inquirer.prompt([
                {
                  type: 'password',
                  name: 'password',
                  message: 'password: '
                }
              ], answers => {
                opts.password = answers.password;
                callback();
              });
            },
            callback => {
              node.download('', opts, (err, data) => {
                if (err) {
                  return reject(err);
                }

                if (data.success) {
                  return resolve();
                }

                return reject(Error(data.data.message));
              });
            },
          ], err => {
            if (err) {
              return reject(err);
            }

            return resolve();
          });
        });
      });
    });
  }
}

module.exports = CatCommand;
