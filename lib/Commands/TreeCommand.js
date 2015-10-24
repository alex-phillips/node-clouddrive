var Command = require('./Command');
var Node = require('../Node');
var async = require('async');
var colors = require('colors');
var promise = require('promise');

var TreeCommand = new Command({
  offline: true
});

TreeCommand.run = function(remotePath, options) {
  var self = this;

  var searchFunction = Node.loadByPath;
  var notFound = 'No node exists at path \'' + remotePath + '\'';
  if (options.id) {
    searchFunction = Node.loadById;
    notFound = 'No node exists with ID \'' + remotePath + '\'';
  }

  if (remotePath) {
    remotePath = remotePath.trim();
  }

  return promise.denodeify(self.initialize).call(self)
    .then(function() {
      return promise.denodeify(searchFunction)(remotePath)
        .then(function(node) {
          if (!node) {
            Command.error(notFound);

            return 1;
          }

          return new promise(function(resolve, reject) {
            Command.log(node.getName());
            if (options.markdown) {
              return buildMarkdownTree(node, '', resolve);
            }

            return buildAsciiTree(node, '', resolve);
          });
        });
    });

  function buildAsciiTree(node, prefix, callback) {
    node.getChildren(function(err, nodes) {
      var counter = 0;
      async.forEachSeries(nodes, function(node, callback) {
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
          Command.log(itemPrefix + node.getName().blue);
        } else {
          Command.log(itemPrefix + node.getName());
        }

        counter++;
        if (node.isFolder()) {
          return buildAsciiTree(
            node,
            prefix + (counter === nodes.length ? '  ' : '| '),
            callback
          );
        }

        return callback();
      }, function() {
        callback();
      });
    });
  }

  function buildMarkdownTree(node, prefix, callback) {
    node.getChildren(function(err, nodes) {
      async.forEachSeries(nodes, function(node, callback) {
        Command.log(prefix + '- ' + node.getName());
        if (node.isFolder()) {
          return buildMarkdownTree(node, prefix + ' ', callback);
        }

        callback();
      }, function() {
        callback();
      });
    });
  }
};

module.exports = TreeCommand;
