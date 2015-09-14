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

            var spinner = setInterval(function () {
                logUpdate("Calculating " + frame().cyan);
            }, 50);
            return calculateSize(node)
                .then(function () {
                    clearInterval(spinner);
                    logUpdate(Utils.convertFileSize(size));
                });

            function calculateSize (node) {
                return new Promise(function (resolve, reject) {
                    var nodeSize = node.get('contentProperties.size');
                    if (nodeSize) {
                        size += nodeSize;
                    }

                    if (node.isFolder()) {
                        return Promise.denodeify(node.getChildren).call(node)
                            .then(function (nodes) {
                                async.forEach(nodes, function (node, callback) {
                                    return calculateSize(node)
                                        .then(function () {
                                            callback();
                                        });
                                }, function () {
                                    resolve();
                                });
                            });
                    }

                    resolve();
                });
            }
        });
};

module.exports = DiskUsageCommand;
