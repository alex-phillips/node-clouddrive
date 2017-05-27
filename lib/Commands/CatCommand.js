'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  async = require('async'),
  inquirer = require('inquirer');

class CatCommand extends Command {
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

    let node = await searchFunction(remotePath);
    if (!node) {
      throw Error(notFound);
    }

    let opts = {
      stream: process.stdout,
      decrypt: options.decrypt,
      password: this.config.get('crypto.password'),
      algorithm: this.config.get('crypto.algorithm'),
      armor: this.config.get('crypto.armor'),
    };

    if (!node.isFile()) {
      throw Error('Node must be a file');
    }

    if (options.decrypt && options.password) {
      let answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'password',
          message: 'password: '
        }
      ]);

      opts.password = answers.password;
    }

    let data = await node.download('', opts);
    if (!data.success) {
      throw Error(data.data.message);
    }
  }
}

module.exports = CatCommand;
