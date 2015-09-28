var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');

var ListTrashCommand = new Command({
    offline: false
});

ListTrashCommand.run = function (options) {
    var self = this;

    var sort = Command.SORT_BY_NAME;
    if (options.time) {
        sort = Command.SORT_BY_DATE;
    }

    return Promise.denodeify(Node.filter)({
        status: "TRASH"
    })
        .then(function (nodes) {
            self.list(nodes, sort);

            return 0;
        });
};

module.exports = ListTrashCommand;
