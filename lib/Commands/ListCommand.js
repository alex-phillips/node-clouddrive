'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  async = require('async'),
  inquirer = require('inquirer');

class ListCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      let remotePath = args[0],
        searchFunction = Node.loadByPath,
        notFound = `No node exists at path '${remotePath}'`,
        sort = Command.SORT_BY_NAME;

      if (options.id) {
        searchFunction = Node.loadById;
        notFound = `No node exists with ID '${remotePath}'`;
      }

      if (options.time) {
        sort = Command.SORT_BY_DATE;
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

          node.getChildren({
            remote: options.remote,
          }, (err, children) => {
            if (err) {
              return reject(err);
            }

            let opts = {
              sortOrder: sort,
              showTrash: this.config.get('display.showTrash'),
              showPending: this.config.get('display.showPending'),
              displayDate: this.config.get('display.date'),
              decrypt: options.decrypt,
              password: this.config.get('crypto.password'),
              algorithm: this.config.get('crypto.algorithm'),
            };

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
                Command.list(children, opts);

                return callback();
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
    });
  }
}

module.exports = ListCommand;
