var Command = require('./Command');
var promise = require('promise');

var ClearCacheCommand = new Command({
  offline: true
});

ClearCacheCommand.run = function() {
  var self = this;

  return promise.denodeify(self.initialize).call(self)
    .then(function() {
      self.account.checkpoint = null;
      return promise.denodeify(self.account.save).call(self.account)
        .then(function() {
          return promise.denodeify(self.account.cache.deleteAllNodes).call(self.account.cache)
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
