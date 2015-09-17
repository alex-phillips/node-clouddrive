var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');

var ListPendingCommand = new Command({
    offline: false
});

ListPendingCommand.run = function (cmd, options) {
    var self = this;

    return Promise.denodeify(Node.filter)({
        status: 'PENDING'
    })
        .then(function (nodes) {
            self.list(nodes);

            return 0;
        });
};

module.exports = ListPendingCommand;
