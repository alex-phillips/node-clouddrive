var Command = require('./Command');
var Promise = require('promise');

var UsageCommand = new Command({
    offline: false
});

UsageCommand.run = function () {
    var self = this;

    return Promise.denodeify(self.initialize).call(self)
        .then(function () {
            return Promise.denodeify(self.account.authorize).call(self.account, null)
                .then(function (data) {
                    if (data.success === true) {
                        return Promise.denodeify(self.account.getUsage).call(self.account)
                            .then(function (data) {
                                Command.log(JSON.stringify(data.data));

                                return 0;
                            }, function (err) {
                                Command.error(err.message);

                                return 1;
                            });
                    } else {
                        Command.error("Account not authorized with Amazon's Cloud Drive. Run `init` command first.");

                        return 1;
                    }
                }, function (err) {
                    Command.error(err.message);

                    return 1;
                });
        });
};

module.exports = UsageCommand;
