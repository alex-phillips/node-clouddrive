var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');

var DownloadCommand = new Command({
    offline: false
});

DownloadCommand.run = function (remotePath, localPath, options) {
    var self = this;

    var searchFunction = Node.loadByPath;
    var notFound = "No node exists at path '" + remotePath + "'";
    if (options.id) {
        searchFunction = Node.loadById;
        notFound = "No node exists with ID '" + remotePath + "'";
    }

    if (remotePath) {
        remotePath = remotePath.trim();
    }

    return Promise.denodeify(self.initialize).call(self)
        .then(function () {
            return Promise.denodeify(searchFunction)(remotePath)
                .then(function (node) {
                    if (!node) {
                        Command.error(notFound);

                        return 1;
                    }

                    Command.startSpinner("Downloading... ");

                    return Promise.denodeify(node.download).call(node, localPath)
                        .then(function (data) {
                            if (data.success) {
                                Command.stopSpinner();
                                Command.log('Done.');

                                return 0;
                            }

                            Command.stopSpinner();
                            Command.error(data.data.message);

                            return 1;
                        });
                });
        });
};

module.exports = DownloadCommand;
