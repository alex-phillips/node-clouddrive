var Command = require('./Command');
var Promise = require('promise');
var colors = require('colors');

var SyncCommand = new Command({
    offline: false
});

SyncCommand.run = function () {
    var self = this;

    return Promise.denodeify(self.initialize).call(self)
        .then(function () {
            return Promise.denodeify(self.account.authorize).call(self.account, null)
                .then(function (data) {
                    if (data.success === true) {
                        Command.startSpinner("Syncing... ");

                        return Promise.denodeify(self.account.sync).call(self.account)
                            .then(function () {
                                Command.stopSpinner();
                                Command.log('Done.');

                                return 0;
                            }, function (err) {
                                Command.stopSpinner();
                                Command.error(err.message);

                                return 1;
                            });
                    } else {
                        Command.error("Account not authorized with Amazon's Cloud Drive. Run `init` command first.");

                        return 1;
                    }
                }, function (err) {
                    console.log(err.message.red);

                    return 1;
                });
        });
};

module.exports = SyncCommand;
