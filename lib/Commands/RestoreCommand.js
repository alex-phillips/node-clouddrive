'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger'),
  async = require('async');

class RestoreCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      let remotePath = args[0],
        searchFunction = Node.loadByPath,
        notFound = `No node exists at path '${remotePath}'`;
      this.options = options;
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

        if (!data.success) {
          return reject(Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.'));
        }

        searchFunction(remotePath, (err, node) => {
          if (err) {
            return reject(err);
          }

          if (!node) {
            return reject(Error(notFound));
          }

          if (!options.recursive || !node.isFolder()) {
            return node.restore((err, result) => {
              if (err) {
                return reject(err);
              }

              if (result.success) {
                Logger.info(`Successfully restored node ${node.getName()} (${node.getId()})`);
              } else {
                Logger.error(`Failed to restore node ${node.getName()} (${node.getId()}): ${JSON.stringify(result)}`);
              }

              return resolve();
            });
          }

          Logger.info('Recursively restoring nodes...');

          return this.restore(node, err => {
            if (err) {
              return reject(err);
            }

            return resolve();
          });
        });
      });
    });
  }

  restore(node, callback) {
    this.restoreNode(node, (err, result) => {
      if (err) {
        return callback(err);
      }

      if (result.success && node.isFolder()) {
        return node.getChildren({
          remote: this.options.remote,
        }, (err, children) => {
          async.forEachSeries(children, (child, callback) => {
            this.restore(child, (err, result) => {
              return callback(err, result);
            });
          }, err => {
            return callback(err);
          });
        });
      }

      return callback(null, result);
    });
  }

  restoreNode(node, callback) {
    let retval = {
      success: true,
      data: {},
    };

    node.getPath((err, path) => {
      Logger.info(`Attempting to restore ${node.getKind()} node "${path}" (${node.getId()})...`);
      if (!node.inTrash()) {
        Logger.warn(`Node ${node.getName()} (${node.getId()}) is not in the trash`, 2);

        return callback(null, retval);
      }

      node.restore((err, result) => {
        if (err) {
          return callback(err);
        }

        if (result.success) {
          Logger.info(`Restored node "${path}" (${node.getId()})`);
        } else {
          Logger.error(`Failed to restore node "${path}" (${node.getId()}): ${JSON.stringify(result)}`);
        }

        return callback(null, result);
      });
    });
  }
}

module.exports = RestoreCommand;
