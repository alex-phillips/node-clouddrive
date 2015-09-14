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

    return Promise.denodeify(searchFunction)(remotePath)
        .then(function (node) {
            if (!node) {
                console.log(notFound);

                return 1;
            }

            return Promise.denodeify(node.trash).call(node)
                .then(function (data) {
                    if (!data.success) {
                        console.log("Failed to trash node".red)
                        console.log(data.data);
                    } else {
                        console.log("Node successfully moved to trash".green);
                    }
                });
        });
};

module.exports = TrashCommand;
