var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');
var colors = require('colors');

var LinkCommand = new Command({
    offline: false
});

LinkCommand.run = function (remotePath, options) {
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

                        if (!node.isFile()) {
                            console.log("Links can only be created for files.".red);

                            return 1;
                        }

                        return Promise.denodeify(node.getMetadata).call(node, true)
                            .then(function (data) {
                                if (data.success === false) {
                                    console.log(colors.red("Failed to retrieve metadata for node '" + remotePath + "'"));
                                    console.log(data.data);

                                    return 1;
                                }

                                if (data.data.tempLink === undefined) {
                                    console.log(colors.red("Failed retrieving temporary link. Make sure you have permission."));

                                    return 1;
                                }

                                console.log(data.data.tempLink);

                                return 0;
                            });
                    });
            } else {
                console.log("Account not authorized with Amazon's Cloud Drive. Run `init` command first.".red);

                return 1;
            }
        });
};

module.exports = LinkCommand;
