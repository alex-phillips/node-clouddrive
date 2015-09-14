var Command = require('./Command');
var prompt = require('prompt');
var colors = require('colors');
var Promise = require('promise');

var ClearCacheCommand = new Command({
    offline: false
});

ClearCacheCommand.run = function (cmd, options) {
    var self = this;

    self.account.checkpoint = null;

    return Promise.denodeify(self.account.save).call(self.account)
        .then(function () {
            return 0;
        });
};

module.exports = ClearCacheCommand;
