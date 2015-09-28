var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');

var ListPendingCommand = new Command({
    offline: false
});

ListPendingCommand.run = function (options) {
    var self = this;

    var sort = Command.SORT_BY_NAME;
    if (options.time) {
        sort = Command.SORT_BY_DATE;
    }

    return Promise.denodeify(Node.filter)({
        status: 'PENDING'
    })
        .then(function (nodes) {
            self.list(nodes, sort);

            return 0;
        });
};

module.exports = ListPendingCommand;
