var Command = require('./Command');
var Node = require('../Node');
var promise = require('promise');

var FindCommand = new Command({
  offline: true
});

FindCommand.run = function(query, options) {
  var self = this;

  var sort = Command.SORT_BY_NAME;
  if (options.time) {
    sort = Command.SORT_BY_DATE;
  }

  return promise.denodeify(self.initialize).call(self)
    .then(function() {
      Command.startSpinner('Searching ');

      return promise.denodeify(Node.searchBy)('name', query)
        .then(function(nodes) {
          Command.stopSpinner();

          self.list(nodes, {
            sortOrder: sort,
            showTrash: self.config.get('show.trash'),
            showPending: self.config.get('show.pending')
          });

          return 0;
        });
    });
};

module.exports = FindCommand;
