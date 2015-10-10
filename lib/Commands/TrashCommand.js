var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');

var TrashCommand = new Command({
    offline: false
});

TrashCommand.run = function (remotePath, options) {
    var searchFunction = Node.loadByPath;
    var notFound = "No node exists at path '" + remotePath + "'";
    if (options.id) {
        searchFunction = Node.loadById;
        notFound = "No node exists with ID '" + remotePath + "'";
    }

    if (remotePath) {
        remotePath = remotePath.trim();
    }

    var self = this;
    return Promise.denodeify(self.initialize).call(self)
        .then(function () {
            return Promise.denodeify(searchFunction)(remotePath)
                .then(function (node) {
                    if (!node) {
                        Command.error(notFound);

                        return 1;
                    }

                    return Promise.denodeify(node.trash).call(node)
                        .then(function (data) {
                            if (!data.success) {
                                Command.error("Failed to trash node");
                                Command.log(data.data);
                            } else {
                                Command.info("Node successfully moved to trash");
                            }
                        });
                });
        });
};

module.exports = TrashCommand;
