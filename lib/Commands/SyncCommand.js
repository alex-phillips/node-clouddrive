var Command = require('./Command');
var Promise = require('promise');
var colors = require('colors');

var SyncCommand = new Command({
    offline: false
});

SyncCommand.run = function (cmd, options) {
    var self = this;

    return Promise.denodeify(self.account.authorize).call(self.account, null)
        .then(function (data) {
            if (data.success === true) {
                Command.startSpinner("Syncing...");

                return Promise.denodeify(self.account.sync).call(self.account)
                    .then(function () {
                        Command.stopSpinner();
                        console.log("Done.");

                        return 0;
                    });
            } else {
                console.log("Account not authorized with Amazon's Cloud Drive. Run `init` command first.".red);

                return 1;
            }
        });
};

module.exports = SyncCommand;
