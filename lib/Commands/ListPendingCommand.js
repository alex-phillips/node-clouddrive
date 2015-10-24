var Command = require('./Command');
var Node = require('../Node');
var Promise = require('promise');

var ListPendingCommand = new Command({
  offline: true
});

ListPendingCommand.run = function(options) {
  var self = this;

  var sort = Command.SORT_BY_NAME;
  if (options.time) {
    sort = Command.SORT_BY_DATE;
  }

  return Promise.denodeify(self.initialize).call(self)
    .then(function() {
      return Promise.denodeify(Node.filter)({
        status: 'PENDING'
      })
        .then(function(nodes) {
          self.list(nodes, sort, false, true);

          return 0;
        });
    });
};

module.exports = ListPendingCommand;
