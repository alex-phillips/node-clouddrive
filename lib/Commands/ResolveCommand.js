var Command = require('./Command');
var Node = require('../Node');

var ResolveCommand = new Command({
  offline: true
});

ResolveCommand.run = function(id) {
  var self = this;

  if (id) {
    id = id.trim();
  }

  return Promise.denodeify(self.initialize).call(self)
    .then(function() {
      return Promise.denodeify(Node.loadById)(id)
        .then(function(node) {
          if (!node) {
            Command.error('No node found with ID \'' + id + '\'');

            return 1;
          }

          return Promise.denodeify(node.getPath).call(node)
            .then(function(path) {
              Command.log(path);
            });
        });
    });
};

module.exports = ResolveCommand;
