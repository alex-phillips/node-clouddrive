var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');
var async = require('async');
var Utils = require('../Utils');
var colors = require('colors');
var elegantSpinner = require('elegant-spinner');
var logUpdate = require('log-update');

var frame = elegantSpinner();

var DiskUsageCommand = new Command({
    offline: false
});

DiskUsageCommand.run = function (remotePath, options) {
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

            var size = 0;

            Command.startSpinner("Calculating ");

            return new Promise(function (resolve, reject) {
                calculateSize(node, function () {
                    Command.stopSpinner(Utils.convertFileSize(size));
                    resolve();
                });
            });

            function calculateSize (node, callback) {
                node.getChildren(function (err, children) {
                    async.forEach(children, function (child, callback) {
                        var nodeSize = child.get('contentProperties.size');
                        if (nodeSize) {
                            size += nodeSize;
                        }

                        if (child.isFolder()) {
                            return calculateSize(child, callback);
                        }

                        callback();
                    }, function () {
                        callback(null);
                    });
                });
            }
        });
};

module.exports = DiskUsageCommand;
