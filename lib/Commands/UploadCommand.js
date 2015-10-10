var fs = require('fs');
var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');
var colors = require('colors');

var UploadCommand = new Command({
    offline: false
});

UploadCommand.run = function (localPath, remotePath, options) {
    var self = this;

    var opts = {};
    if (options.overwrite) {
        opts.overwrite = true;
    }

    return Promise.denodeify(self.initialize).call(self)
        .then(function () {
            return Promise.denodeify(self.account.authorize).call(self.account, null)
                .then(function (data) {
                    if (data.success === true) {
                        if (!fs.existsSync(localPath)) {
                            Command.error("No file exists at '" + localPath + "'");

                            return 1;
                        }

                        if (fs.lstatSync(localPath).isDirectory()) {
                            Command.log("Uploading " + localPath + "...");

                            opts.fileUploadCallback = function (localPath, remotePath, data, callback) {
                                if (data.success) {
                                    if (data.data instanceof Node) {
                                        return data.data.getPath(function (err, path) {
                                            Command.info("Successfully uploaded " + data.data.getName() + " to " + path);
                                            callback();
                                        });
                                    } else {
                                        Command.log(JSON.stringify(data));
                                        callback();
                                    }
                                } else {
                                    var message = "Failed to upload " + localPath + " to " + remotePath;
                                    if (data.data.message) {
                                        message += ": " + data.data.message;
                                    }

                                    Command.error(message);

                                    callback();
                                }
                            };

                            return Promise.denodeify(Node.uploadDirectory)(localPath, remotePath, opts)
                                .then(function (data) {
                                    Command.info('Done.');

                                    return 0;
                                });
                        }

                        Command.startSpinner("Uploading " + localPath + "... ");

                        return Promise.denodeify(Node.uploadFile)(localPath, remotePath, opts)
                            .then(function (data) {
                                Command.stopSpinner();
                                if (data.success) {
                                    Command.info("Successfully uploaded " + localPath + " to " + remotePath);

                                    return 0;
                                }

                                Command.error("Failed to upload node to '" + remotePath + "': " + data.data.message);

                                return 1;
                            });
                    } else {
                        Command.error("Account not authorized with Amazon's Cloud Drive. Run `init` command first.");

                        return 1;
                    }
                }, function (err) {
                    Command.error(err.message);

                    return 1;
                });
        });
};

module.exports = UploadCommand;
