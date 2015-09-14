var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');
var colors = require('colors');

var ListCommand = new Command({
    offline: false
});

ListCommand.run = function (remotePath, options) {
    var self = this;

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

            return Promise.denodeify(node.getChildren).call(node)
                .then(function (children) {
                    self.list(children);

                    return 0;
                });
        });
};

module.exports = ListCommand;
