var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');

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
                                    Command.error(notFound);

                                    return 1;
                                }

                                return Promise.denodeify(Node.loadByPath)(newPath)
                                    .then(function (newParent) {
                                        if (!newParent || !newParent.isFolder()) {
                                            var notFound = "No directory exists at path '" + newPath + "'";
                                            Command.error(notFound);

                                            return 1;
                                        }

                                        return Promise.denodeify(node.move).call(node, newParent)
                                            .then(function (data) {
                                                if (data.success) {
                                                    Command.info("Successfully moved node to '" + newPath + "'");
                                                } else {
                                                    Command.error("Failed to move node to '" + newPath + "'");
                                                    Command.log(data.data)
                                                }
                                            });
                                    })
                            });
                    } else {
                        Command.error("Account not authorized with Amazon's Cloud Drive. Run `init` command first.");

                        return 1;
                    }
                });
        });
};

module.exports = MoveCommand;
