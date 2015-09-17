var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');
var colors = require('colors');

var DiskUsageCommand = new Command({
    offline: false
});

DiskUsageCommand.run = function (id, options) {
    return Promise.denodeify(Node.loadById)(id)
        .then(function (node) {
            if (!node) {
                console.log(colors.red("No node found with ID '" + id + "'"));

                return 1;
            }

            return Promise.denodeify(node.getPath).call(node)
                .then(function (path) {
                    console.log(path)
                });
        });
};

module.exports = DiskUsageCommand;
