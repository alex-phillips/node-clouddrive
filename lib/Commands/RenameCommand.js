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
                                if (data.success) {
                                    console.log(colors.green("Successfully renamed node to '" + name + "'"));

                                    return 0;
                                }

                                console.log(colors.red("Failed to rename node to '" + name + "'"));

                                return 1;
                            });
                    });
            } else {
                console.log("Account not authorized with Amazon's Cloud Drive. Run `init` command first.".red);

                return 1;
            }
        });
};

module.exports = RenameCommand;
