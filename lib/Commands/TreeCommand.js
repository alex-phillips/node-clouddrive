'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger'),
  Utils = require('../Utils'),
  async = require('async'),
  chalk = require('chalk'),
  inquirer = require('inquirer');

class TreeCommand extends Command {
  async run(args, options) {
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

    await this.initialize();

    let password = this.config.get('crypto.password');
    if (options.decrypt && options.password) {
      let answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'password',
          message: 'password: '
        }
      ]);
      password = answers.password;
    }

    let node = await searchFunction(remotePath);
    if (!node) {
      throw Error(notFound);
    }

    let opts = {
      remote: options.remote,
      decrypt: options.decrypt,
      password: password,
      algorithm: this.config.get('crypto.algorithm'),
      'show-ids': options['show-ids'],
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

      return await TreeCommand.buildMarkdownTree(node, ' ', opts);
    }

    Logger.info(name);

    await TreeCommand.buildAsciiTree(node, '', opts);
  }

  static async buildAsciiTree(node, prefix, options) {
    let nodes = await node.getChildren({
      remote: options.remote,
    });

    let counter = 0;
    for (let node of nodes) {
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

      if (options['show-ids']) {
        name += ` (${node.getId()})`;
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
        return await TreeCommand.buildAsciiTree(
          node,
          prefix + (counter === nodes.length ? '  ' : '| '),
          options
        );
      }
    }
  }

  static async buildMarkdownTree(node, prefix, options) {
    let nodes = await node.getChildren({
      remote: options.remote,
    });

    for (let node of nodes) {
      let name = node.getName();
      if (node.getLabels().indexOf('enc') !== -1 && options.decrypt) {
        name = Utils.decryptString(node.getName(), options.password, options.algorithm);
      }

      if (options['show-ids']) {
        name += ` (${node.getId()})`;
      }

      Logger.info(`${prefix}- ${name}`);
      if (node.isFolder() || options.showAssets) {
        return await TreeCommand.buildMarkdownTree(node, `${prefix} `, options);
      }
    }
  }
}

module.exports = TreeCommand;
