var Command = require('./Command');
var prompt = require('prompt');
var colors = require('colors');
var Promise = require('promise');
var elegantSpinner = require('elegant-spinner');
var logUpdate = require('log-update');

var frame = elegantSpinner();

var SyncCommand = new Command({
    offline: false
});

SyncCommand.run = function (cmd, options) {
    var self = this;

    return Promise.denodeify(self.account.authorize).call(self.account, null)
        .then(function (data) {
            if (data.success === true) {
                console.log("Syncing...");
                var spinner = setInterval(function () {
                    logUpdate(frame().cyan);
                }, 50);
                return Promise.denodeify(self.account.sync).call(self.account)
                    .then(function () {
                        clearInterval(spinner);
                        logUpdate('Done.');

                        return 0;
                    });
            } else {
                console.log("Account not authorized with Amazon's Cloud Drive. Run `init` command first.".red);

                return 1;
            }
        });
};

module.exports = SyncCommand;
