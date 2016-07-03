'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  async = require('async');

class TrashCommand extends Command {
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
            return node.trash((err, result) => {
              if (err) {
                return reject(err);
              }

              if (!data.success) {
                return reject(Error('Failed to trash node'));
              }

              Command.info('Node successfully moved to trash');

              return resolve();
            });
          }

          Command.log('Recursively removing nodes...', 3);
          return this.trash(node, (err, result) => {
            if (err) {
              return reject(err);
            }

            return resolve();
          });
        });
      });
    });
  }

  trash(node, callback) {
    if (node.isFile()) {
      return this.trashNode(node, callback);
    }

    node.getChildren({
      remote: this.options.remote,
    }, (err, children) => {
      async.forEachSeries(children, (child, callback) => {
        if (child.isFolder()) {
          return this.trash(child, callback);
        }

        this.trashNode(child, (err, result) => {
          if (err) {
            return callback(err);
          }

          if (result.success) {
            return callback();
          }

          return callback(Error(JSON.stringify(result)));
        });
      }, err => {
        if (err) {
          return callback(err);
        }

        this.trashNode(node, callback);
      });
    });
  }

  trashNode(node, callback) {
    let retval = {
      success: true,
      data: {},
    };

    if (node.inTrash()) {
      Command.warn(`Node ${node.getName()} (${node.getId()}) is already in the trash`, 2);

      return callback(null, retval);
    }

    Command.log(`Attempting to remove ${node.getKind()} node ${node.getName()} (${node.getId()})`, 2);

    return node.trash((err, result) => {
      if (err) {
        return callback(err);
      }

      if (result.success) {
        Command.info(`Trashed node ${node.getName()} (${node.getId()})`);
      } else {
        Command.error(`Failed to trash node ${node.getName()} (${node.getId()}): ${JSON.stringify(result)}`);
      }

      return callback(null, result);
    });
  }
}

module.exports = TrashCommand;
