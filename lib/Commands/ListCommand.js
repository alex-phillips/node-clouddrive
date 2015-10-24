var Command = require('./Command');
var Node = require('../Node');
var promise = require('promise');

var ListCommand = new Command({
  offline: true
});

ListCommand.run = function(remotePath, options) {
  var self = this;

  var searchFunction = Node.loadByPath;
  var notFound = 'No node exists at path \'' + remotePath + '\'';
  if (options.id) {
    searchFunction = Node.loadById;
    notFound = 'No node exists with ID \'' + remotePath + '\'';
  }

  var sort = Command.SORT_BY_NAME;
  if (options.time) {
    sort = Command.SORT_BY_DATE;
  }

  if (remotePath) {
    remotePath = remotePath.trim();
  }

  return promise.denodeify(self.initialize).call(self)
    .then(function() {
      return promise.denodeify(self.initialize).call(self)
        .then(function() {
          return promise.denodeify(searchFunction)(remotePath)
            .then(function(node) {
              if (!node) {
                Command.error(notFound);

                return 1;
              }

              return promise.denodeify(node.getChildren).call(node)
                .then(function(children) {
                  self.list(children, sort, self.config.get('show.trash'), self.config.get('show.pending'));

                  return 0;
                });
            }, function(err) {
              Command.error(err.message);

              return 1;
            });
        }, function(err) {
          Command.error(err.message);

          return 1;
        });
    });
};

module.exports = ListCommand;
