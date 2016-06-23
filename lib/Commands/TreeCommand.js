'use strict';

var Command = require('./Command'),
  Node = require('../Node'),
  async = require('async'),
  colors = require('colors');

class TreeCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      var remotePath = args[0],
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

          var opts = {
            remote: options.remote,
          };
          if (options.assets) {
            opts.showAssets = true;
          }

          if (options.markdown) {
            Command.log('- ' + node.getName());

            return TreeCommand.buildMarkdownTree(node, ' ', opts, resolve);
          }

          Command.log(node.getName());

          return TreeCommand.buildAsciiTree(node, '', opts, resolve);
        });
      });
    });
  }

  static buildAsciiTree(node, prefix, options, callback) {
    node.getChildren({
      remote: options.remote,
    }, (err, nodes) => {
      var counter = 0;
      async.forEachSeries(nodes, (node, callback) => {
        var itemPrefix = prefix;

        if (counter === nodes.length - 1) {
          if (node.isFolder()) {
            itemPrefix += '└─┬ ';
          } else {
            itemPrefix += '└── ';
          }
        } else {
          if (node.isFolder()) {
            itemPrefix += '├─┬ ';
          } else {
            itemPrefix += '├── ';
          }
        }

        if (node.isFolder()) {
          Command.log(itemPrefix + node.getName().blue);
        } else {
          Command.log(itemPrefix + node.getName());
        }

        counter++;
        if (node.isFolder() || options.showAssets) {
          return TreeCommand.buildAsciiTree(
            node,
            prefix + (counter === nodes.length ? '  ' : '| '),
            options,
            callback
          );
        }

        return callback();
      }, err => {
        callback(err);
      });
    });
  }

  static buildMarkdownTree(node, prefix, options, callback) {
    node.getChildren({
      remote: options.remote,
    }, (err, nodes) => {
      async.forEachSeries(nodes, (node, callback) => {
        Command.log(`${prefix}- ${node.getName()}`);
        if (node.isFolder() || options.showAssets) {
          return TreeCommand.buildMarkdownTree(node, `${prefix} `, options, callback);
        }

        callback();
      }, err => {
        callback(err);
      });
    });
  }
}

module.exports = TreeCommand;
