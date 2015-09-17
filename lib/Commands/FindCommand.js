var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');

var FindCommand = new Command({
    offline: false
});

FindCommand.run = function (query, options) {
    var self = this;

    return Promise.denodeify(Node.searchBy)('name', query)
        .then(function (nodes) {
            self.list(nodes);

            return 0;
        });
};

module.exports = FindCommand;
