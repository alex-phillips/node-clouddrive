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

    return Promise.denodeify(self.account.authorize).call(self.account, null)
        .then(function (data) {
            if (data.success === true) {
                if (fs.lstatSync(localPath).isDirectory()) {
                    console.log("Only FILE uploads are currently supported".red);

                    return 1;
                }

                return Promise.denodeify(Node.uploadFile)(localPath, remotePath, opts)
                    .then(function (data) {
                        if (data.success) {
                            console.log(colors.green("Successfully uploaded " + localPath));

                            return 0;
                        }

                        console.log(colors.red("Failed to upload node to " + remotePath + ": " + data.data.message));

                        return 1;
                    });
            } else {
                console.log("Account not authorized with Amazon's Cloud Drive. Run `init` command first.".red);

                return 1;
            }
        });
};

module.exports = UploadCommand;
