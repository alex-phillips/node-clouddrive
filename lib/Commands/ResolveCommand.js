'use strict';

var Command = require('./Command');
var Node = require('../Node');

class ResolveCommand extends Command {
  run(id) {
    var self = this;

    if (id) {
      id = id.trim();
    }

    return new Promise(function(resolve, reject) {
      self.initialize(function(err, data) {
        if (err) {
          return reject(err.message);
        }

        Node.loadById(id, function(err, node) {
          if (err) {
            return reject(err.message);
          }

          if (!node) {
            return reject(`No node found with ID '${id}'`);
          }

          node.getPath(function(err, path) {
            Command.log(path);

            return resolve();
          });
        });
      });
    });
  }
}

module.exports = ResolveCommand;
