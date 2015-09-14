var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');
var colors = require('colors');

var RenameCommand = new Command({
    offline: false
});

RenameCommand.run = function (remotePath, name, options) {
    var self = this;

    return Promise.denodeify(self.account.authorize).call(self.account, null)
        .then(function (data) {
            if (data.success === true) {
                var searchFunction = Node.loadByPath;
                var notFound = "No node exists at path '" + remotePath + "'";
                if (options.id) {
                    searchFunction = Node.loadById;
                    notFound = "No node exists with ID '" + remotePath + "'";
                }

                return Promise.denodeify(searchFunction)(remotePath)
                    .then(function (node) {
                        if (!node) {
                            console.log(notFound.red);

                            return 1;
                        }

                        return Promise.denodeify(node.rename).call(node, name)
                            .then(function (data) {
                                var msg = null;
                                if (data.success) {
                                    msg = "Successfully renamed node to '" + name + "'";
                                    console.log(msg.green);
                                } else {
                                    msg = "Failed to rename node to '" + name + "'";
                                    console.log(msg.red);
                                }
                            });
                    });
            } else {
                console.log("Account not authorized with Amazon's Cloud Drive. Run `init` command first.".red);

                return 1;
            }
        });
};

module.exports = RenameCommand;
