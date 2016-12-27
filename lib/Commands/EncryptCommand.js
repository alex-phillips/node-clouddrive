'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  crypto = require('crypto'),
  fs = require('fs-extra'),
  base64 = require('base64-stream'),
  zlib = require('zlib'),
  async = require('async'),
  inquirer = require('inquirer');

class EncryptCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      let filePath = args[0],
        savePath = args[1] || null,
        password = this.config.get('crypto.password');

      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        async.waterfall([
          callback => {
            if (!options.password) {
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
            let readStream = fs.createReadStream(filePath),
              cipher = crypto.createCipher(this.config.get('crypto.algorithm'), password),
              writeStream = process.stdout;

            if (savePath) {
              writeStream = fs.createWriteStream(savePath);
              writeStream.on('finish', callback);
            } else {
              readStream.on('end', callback);
            }

            readStream.pipe(cipher);

            if (this.config.get('crypto.armor') || options.armor) {
              readStream.pipe(base64.encode());
            }

            readStream.pipe(writeStream);
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
}

module.exports = EncryptCommand;
