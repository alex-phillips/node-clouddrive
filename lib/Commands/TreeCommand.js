'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger'),
  Utils = require('../Utils'),
  async = require('async'),
  chalk = require('chalk'),
  inquirer = require('inquirer');

class TreeCommand extends Command {
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

        let password = this.config.get('crypto.password');
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
              password = answers.password;
              callback();
            });
          },
          callback => {
            searchFunction(remotePath, (err, node) => {
              if (err) {
                return callback(err);
              }

              if (!node) {
                return callback(Error(notFound));
              }

              let opts = {
                remote: options.remote,
                decrypt: options.decrypt,
                password: password,
                algorithm: this.config.get('crypto.algorithm'),
              };
              if (options.assets) {
                opts.showAssets = true;
              }

              let name = node.getName();
              if (node.getLabels().indexOf('enc') !== -1 && options.decrypt) {
                name = Utils.decryptString(node.getName(), opts.password, opts.algorithm);
              }

              if (options.markdown) {
                Logger.info('- ' + name);

                return TreeCommand.buildMarkdownTree(node, ' ', opts, callback);
              }

              Logger.info(name);

              return TreeCommand.buildAsciiTree(node, '', opts, callback);
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
  }

  static buildAsciiTree(node, prefix, options, callback) {
    node.getChildren({
      remote: options.remote,
    }, (err, nodes) => {
      let counter = 0;
      async.forEachSeries(nodes, (node, callback) => {
        let itemPrefix = prefix;

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

        let name = node.getName();
        if (node.getLabels().indexOf('enc') !== -1 && options.decrypt) {
          name = Utils.decryptString(node.getName(), options.password, options.algorithm);
        }

        if (node.inTrash()) {
          Logger.info(`${itemPrefix}${chalk.red(name)}`);
        } else if (node.isFolder()) {
          Logger.info(`${itemPrefix}${chalk.blue(name)}`);
        } else {
          Logger.info(`${itemPrefix}${name}`);
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
        let name = node.getName();
        if (node.getLabels().indexOf('enc') !== -1 && options.decrypt) {
          name = Utils.decryptString(node.getName(), options.password, options.algorithm);
        }

        Logger.info(`${prefix}- ${name}`);
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
