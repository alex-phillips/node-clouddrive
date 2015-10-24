var Command = require('./Command');
var Node = require('../Node');
var promise = require('promise');

var ResolveCommand = new Command({
  offline: true
});

ResolveCommand.run = function(id) {
  var self = this;

  if (id) {
    id = id.trim();
  }

  return promise.denodeify(self.initialize).call(self)
    .then(function() {
      return promise.denodeify(Node.loadById)(id)
        .then(function(node) {
          if (!node) {
            Command.error('No node found with ID \'' + id + '\'');

            return 1;
          }

          return promise.denodeify(node.getPath).call(node)
            .then(function(path) {
              Command.log(path);
            });
        });
    });
};

module.exports = ResolveCommand;
