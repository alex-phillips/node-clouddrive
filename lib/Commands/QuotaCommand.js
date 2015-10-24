var Command = require('./Command');
var promise = require('promise');

var QuotaCommand = new Command({
  offline: false
});

QuotaCommand.run = function() {
  var self = this;

  return promise.denodeify(self.initialize).call(self)
    .then(function() {
      return promise.denodeify(self.account.authorize).call(self.account, null)
        .then(function(data) {
          if (data.success === true) {
            return promise.denodeify(self.account.getQuota).call(self.account)
              .then(function(data) {
                if (self.config.get('json.pretty') === true) {
                  Command.log(JSON.stringify(data.data, null, 4));
                } else {
                  Command.log(JSON.stringify(data.data));
                }

                return 0;
              }, function(err) {
                Command.error(err.message);

                return 1;
              });
          } else {
            Command.error('Account not authorized with Amazon Cloud Drive. Run `init` command first.');

            return 1;
          }
        }, function(err) {
          Command.error(err.message);

          return 1;
        });
    });
};

module.exports = QuotaCommand;
