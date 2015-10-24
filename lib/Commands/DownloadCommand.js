var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');
var Utils = require('../Utils');
var ProgressBar = require('progress');

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

                    var bar = null;
                    var opts = {
                        onFileDownload: function (node, callback) {
                            bar = new ProgressBar("Downloading '" + node.getName() + "' [:bar] :percent :etas", {
                                complete: '=',
                                incomplete: ' ',
                                width: 20,
                                total: node.getSize(),
                                clear: true
                            });

                            callback();
                        },
                        onFileProgress: function (data) {
                            bar.tick(data.length);
                        },
                        onFileComplete: function (node, localPath, retval, callback) {
                            // Clear out progress bar
                            if (bar !== null && !bar.complete) {
                                bar.tick(node.getSize());
                                bar = null;
                            }

                            Utils.getFileMd5(localPath, function (err, md5) {
                                if (md5 === node.getMd5()) {
                                    Command.info("Successfully downloaded '" + localPath + "'");
                                } else {
                                    Command.error("Failed to download '" + localPath + "'");
                                }

                                callback();
                            });
                        }
                    };

                    return Promise.denodeify(node.download).call(node, localPath, opts)
                        .then(function (data) {
                            if (data.success) {
                                return 0;
                            }

                            Command.error(data.data.message);

                            return 1;
                        });
                });
        });
};

module.exports = DownloadCommand;
