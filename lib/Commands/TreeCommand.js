var Command = require('./Command');
var Promise = require('promise');
var Node = require('../Node');
var async = require('async');
var Utils = require('../Utils');
var colors = require('colors');

var TreeCommand = new Command({
    offline: false
});

TreeCommand.run = function (remotePath, options) {
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

            console.log(node.getName());

            return new Promise(function (resolve,  reject) {
                if (options.markdown) {
                    return buildMarkdownTree(node, '', resolve);
                }

                return buildAsciiTree(node, '', resolve);
            });
        });

    function buildAsciiTree(node, prefix, callback) {
        node.getChildren(function (err, nodes) {
            var counter = 0;
            async.forEachSeries(nodes, function (node, callback) {
                var itemPrefix = prefix;

                if (counter === nodes.length - 1) {
                    if (node.isFolder()) {
                        itemPrefix += '└─┬ ';
                    } else {
                        itemPrefix += '└── ';
                    }
                } else {
                    if (node.isFolder()) {
                        itemPrefix += '├─┬ ';
                    } else {
                        itemPrefix += '├── ';
                    }
                }

                if (node.isFolder()) {
                    console.log(itemPrefix + node.getName().blue);
                } else {
                    console.log(itemPrefix + node.getName());
                }

                if (node.isFolder()) {
                    counter++;
                    return buildAsciiTree(
                        node,
                        prefix + (counter == nodes.length ? '  ' : '| '),
                        callback
                    );
                }

                counter++;
                return callback();
            }, function () {
                callback();
            })
        });
    }

    function buildMarkdownTree(node, prefix, callback) {
        node.getChildren(function (err, nodes) {
            async.forEachSeries(nodes, function (node, callback) {
                console.log(prefix + '- ' + node.getName());
                if (node.isFolder()) {
                    return buildMarkdownTree(node, prefix + ' ', callback);
                }

                callback();
            }, function () {
                callback();
            });
        });
    }
};

module.exports = TreeCommand;
