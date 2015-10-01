var Command = require('./Command');
var colors = require('colors');
var Promise = require('promise');

var ClearCacheCommand = new Command({
    offline: false
});

ClearCacheCommand.run = function () {
    var self = this;

    self.account.checkpoint = null;

    return Promise.denodeify(self.account.save).call(self.account)
        .then(function () {
            return Promise.denodeify(self.account.cache.deleteAllNodes).call(self.account.cache)
                .then(function () {
                    return 0;
                });
        }, function (err) {
            console.log(err.message.red);

            return 1;
        });
};

module.exports = ClearCacheCommand;
