var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');
var colors = require('colors');

var ListCommand = new Command({
    offline: true
});

ListCommand.run = function (remotePath, options) {
    var self = this;

    var searchFunction = Node.loadByPath;
    var notFound = "No node exists at path '" + remotePath + "'";
    if (options.id) {
        searchFunction = Node.loadById;
        notFound = "No node exists with ID '" + remotePath + "'";
    }

    var sort = Command.SORT_BY_NAME;
    if (options.time) {
        sort = Command.SORT_BY_DATE;
    }

    return Promise.denodeify(self.initialize).call(self)
        .then(function () {
            return Promise.denodeify(self.initialize).call(self)
                .then(function () {
                    return Promise.denodeify(searchFunction)(remotePath)
                        .then(function (node) {
                            if (!node) {
                                console.log(notFound.red);

                                return 1;
                            }

                            return Promise.denodeify(node.getChildren).call(node)
                                .then(function (children) {
                                    self.list(children, sort);

                                    return 0;
                                });
                        });
                });
        });
};

module.exports = ListCommand;
