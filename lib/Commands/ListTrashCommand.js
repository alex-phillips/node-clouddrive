var Command = require('./Command');
var Node = require('../Node');
var promise = require('promise');

var ListTrashCommand = new Command({
  offline: true
});

ListTrashCommand.run = function(options) {
  var self = this;

  var sort = Command.SORT_BY_NAME;
  if (options.time) {
    sort = Command.SORT_BY_DATE;
  }

  return promise.denodeify(self.initialize).call(self)
    .then(function() {
      return promise.denodeify(Node.filter)({
        status: 'TRASH'
      })
        .then(function(nodes) {
          self.list(nodes, sort, true);

          return 0;
        });
    });
};

module.exports = ListTrashCommand;
