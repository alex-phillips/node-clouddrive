var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');
var colors = require('colors');

var MoveCommand = new Command({
    offline: false
});

MoveCommand.run = function (remotePath, newPath, options) {
    var self = this;

    if (!newPath) {
        newPath = '';
    }

    return Promise.denodeify(self.initialize).call(self)
        .then(function () {
            return Promise.denodeify(self.account.authorize).call(self.account, null)
                .then(function (data) {
                    if (data.success === true) {
                        return Promise.denodeify(Node.loadByPath)(remotePath)
                            .then(function (node) {
                                if (!node) {
                                    var notFound = "No node exists at path '" + remotePath + "'";
                                    console.log(notFound.red);

                                    return 1;
                                }

                                return Promise.denodeify(Node.loadByPath)(newPath)
                                    .then(function (newParent) {
                                        if (!newParent || !newParent.isFolder()) {
                                            var notFound = "No directory exists at path '" + newPath + "'";
                                            console.log(notFound.red);

                                            return 1;
                                        }

                                        return Promise.denodeify(node.move).call(node, newParent)
                                            .then(function (data) {
                                                if (data.success) {
                                                    console.log(colors.green("Successfully moved node to '" + newPath + "'"));
                                                } else {
                                                    console.log(colors.red("Failed to move node to '" + newPath + "'"));
                                                    console.log(data.data)
                                                }
                                            });
                                    })
                            });
                    } else {
                        console.log("Account not authorized with Amazon's Cloud Drive. Run `init` command first.".red);

                        return 1;
                    }
                });
        });
};

module.exports = MoveCommand;
