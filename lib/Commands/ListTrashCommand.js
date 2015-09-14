var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');

var ListTrashCommand = new Command({
    offline: false
});

ListTrashCommand.run = function (cmd, options) {
    var self = this;

    return Promise.denodeify(Node.getTrashedNodes)()
        .then(function (nodes) {
            self.list(nodes);

            return 0;
        });
};

module.exports = ListTrashCommand;
