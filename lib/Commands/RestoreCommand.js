var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');
var colors = require('colors');

var RestoreCommand = new Command({
    offline: false
});

RestoreCommand.run = function (remotePath, options) {
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

            Command.startSpinner();

            return Promise.denodeify(node.restore).call(node)
                .then(function (data) {
                    Command.stopSpinner();
                    if (!data.success) {
                        console.log("Failed to restore node".red)
                    } else {
                        console.log("Node successfully stored from trash".green);
                    }
                });
        });
};

module.exports = RestoreCommand;
