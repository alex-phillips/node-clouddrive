var Command = require('./Command');
var Promise = require('promise');

var ClearCacheCommand = new Command({
  offline: true
});

ClearCacheCommand.run = function() {
  var self = this;

  return Promise.denodeify(self.initialize).call(self)
    .then(function() {
      self.account.checkpoint = null;
      return Promise.denodeify(self.account.save).call(self.account)
        .then(function() {
          return Promise.denodeify(self.account.cache.deleteAllNodes).call(self.account.cache)
            .then(function() {
              Command.info('Done.');

              return 0;
            });
        }, function(err) {
          Command.error(err.message);

          return 1;
        });
    });
};

module.exports = ClearCacheCommand;
