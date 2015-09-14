var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');
var colors = require('colors');

var RenameCommand = new Command({
    offline: false
});

RenameCommand.run = function (path, options) {
    var self = this;

    return Promise.denodeify(self.account.authorize).call(self.account, null)
        .then(function (data) {
            if (data.success === true) {
                return Promise.denodeify(Node.createDirectoryPath)(path)
                    .then(function (data) {
                        if (!data.success) {
                            var msg = "Failed creating remote directory '" + path + "'";
                            console.log(msg.red);

                            return 1;
                        }

                        var msg = "Successfully created remote directory '" + path + "'";
                        console.log(msg.green);
                    });
            } else {
                console.log("Account not authorized with Amazon's Cloud Drive. Run `init` command first.".red);

                return 1;
            }
        });
};

module.exports = RenameCommand;
