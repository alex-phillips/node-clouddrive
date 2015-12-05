var Command = require('./Command');
var Node = require('../Node');

var FindCommand = new Command({
  offline: true
});

FindCommand.run = function(query, options) {
  var self = this;

  var sort = Command.SORT_BY_NAME;
  if (options.time) {
    sort = Command.SORT_BY_DATE;
  }

  return new Promise(function(resolve, reject) {
    self.initialize(function(err, data) {
      if (err) {
        return reject(err.message);
      }

      Command.startSpinner('Searching ');

      Node.searchBy('name', query, function(err, nodes) {
        Command.stopSpinner();

        if (err) {
          return reject(err.message);
        }

        self.list(nodes, {
          sortOrder: sort,
          showTrash: self.config.get('show.trash'),
          showPending: self.config.get('show.pending')
        });

        return resolve();
      });
    })
  });
};

module.exports = FindCommand;
