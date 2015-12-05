var Command = require('./Command');

var UsageCommand = new Command({
  offline: false
});

UsageCommand.run = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    self.initialize(function(err, data) {
      if (err) {
        return reject(err.message);
      }

      if (!data.success) {
        return reject('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
      }

      self.account.getUsage(function(err, data) {
        if (err) {
          return reject(err.message);
        }

        if (self.config.get('json.pretty') === true) {
          Command.log(JSON.stringify(data.data, null, 4));
        } else {
          Command.log(JSON.stringify(data.data));
        }

        return resolve();
      });
    });
  });
};

module.exports = UsageCommand;
