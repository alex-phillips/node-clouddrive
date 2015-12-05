var Command = require('./Command');
var Node = require('../Node');

var RenameCommand = new Command({
  offline: false
});

RenameCommand.run = function(path, options) {
  var self = this;

  return new Promise(function(resolve, reject) {
    self.initialize(function(err, data) {
      if (err) {
        return reject(err.message);
      }

      if (!data.success) {
        return reject('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
      }

      Node.createDirectoryPath(path, function(err, data) {
        if (err) {
          return reject(err.message);
        }

        if (!data.success) {
          return reject(`Failed creating remote directory '${path}'`);
        }

        return resolve(`Successfully created remote directory '${path}'`);
      });
    })
  });
};

module.exports = RenameCommand;
