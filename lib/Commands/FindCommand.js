var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');

var FindCommand = new Command({
    offline: true
});

FindCommand.run = function (query, options) {
    var self = this;

    var sort = Command.SORT_BY_NAME;
    if (options.time) {
        sort = Command.SORT_BY_DATE;
    }

    return Promise.denodeify(self.initialize).call(self)
        .then(function () {
            return Promise.denodeify(Node.searchBy)('name', query)
                .then(function (nodes) {
                    self.list(nodes, sort);

                    return 0;
                });
        });
};

module.exports = FindCommand;
