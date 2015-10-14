var fs = require('fs');
var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');
var colors = require('colors');
var ProgressBar = require('progress');

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

                        var bar = null;
                        var localFilesize = null;
                        var opts = {
                            onFileUpload: function (localPath) {
                                localFilesize = fs.statSync(localPath)['size'];
                                bar = new ProgressBar("Uploading '" + localPath + "' [:bar] :percent :etas", {
                                    complete: '=',
                                    incomplete: ' ',
                                    width: 20,
                                    total: localFilesize,
                                    clear: true
                                });
                            },
                            onFileProgress: function (data) {
                                bar.tick(data);
                            },
                            onFileComplete: function (localPath, remotePath, retval) {
                                // Clear out progress bar
                                if (bar !== null && !bar.complete) {
                                    bar.tick(localFilesize);
                                    bar = null;
                                    localFilesize = null;
                                }

                                if (retval.success) {
                                    Command.info("Successfully uploaded file '" + localPath + "' to '" + remotePath + "'");
                                } else {
                                    var message = "Failed to upload file '" + localPath + "'";
                                    if (retval.data.message) {
                                        message += ": " + retval.data.message;
                                    }

                                    if (retval.data.exists !== undefined && retval.data.exists === true) {
                                        Command.warn(message);
                                    } else {
                                        Command.error(message);
                                    }
                                }
                            }
                        };

                        if (fs.lstatSync(localPath).isDirectory()) {
                            return Promise.denodeify(Node.uploadDirectory)(localPath, remotePath, opts)
                                .then(function (data) {
                                    return 0;
                                });
                        }

                        return Promise.denodeify(Node.uploadFile)(localPath, remotePath, opts)
                            .then(function (data) {
                                if (data.success) {
                                    return 0;
                                }

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
