'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
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

          this.restoreOptions = {
            remote: options.remote,
          };

          if (!options.recursive || !node.isFolder()) {
            return node.restore(this.restoreOptions, (err, result) => {
              if (err) {
                return reject(err);
              }

              if (result.success) {
                Command.log(`Successfully trashed node ${node.getPath()} (${node.getId()})`);
              } else {
                Command.error(`Failed to trash node ${node.getPath()} (${node.getId()}): ${JSON.stringify(result)}`);
              }

              return resolve();
            });
          }

          Command.log('Recursively restoring nodes...', 3);

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

    if (!node.inTrash()) {
      Command.warn(`Node ${node.getName()} (${node.getId()}) is not in the trash`, 2);

      return callback(null, retval);
    }

    Command.log(`Attempting to restore ${node.getKind()} node ${node.getName()} (${node.getId()})...`, 3);
    node.restore(this.restoreOptions, (err, result) => {
      if (err) {
        return callback(err);
      }

      if (result.success) {
        Command.info(`Restored node ${node.getName()} (${node.getId()})`, 2);
      } else {
        Command.error(`Failed to restore node ${node.getName()} (${node.getId()}): ${JSON.stringify(result)}`, 2);
      }

      return callback(null, result);
    });
  }
}

module.exports = RestoreCommand;
