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

          var opts = {};
          if (options.assets) {
            opts.showAssets = true;
          }

          return new promise(function(resolve, reject) {
            if (options.markdown) {
              Command.log('- ' + node.getName());

              return buildMarkdownTree(node, ' ', opts, resolve);
            }

            Command.log(node.getName());

            return buildAsciiTree(node, '', opts, resolve);
          });
        });
    });

  function buildAsciiTree(node, prefix, options, callback) {
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
        if (node.isFolder() || options.showAssets) {
          return buildAsciiTree(
            node,
            prefix + (counter === nodes.length ? '  ' : '| '),
            options,
            callback
          );
        }

        return callback();
      }, function() {
        callback();
      });
    });
  }

  function buildMarkdownTree(node, prefix, options, callback) {
    node.getChildren(function(err, nodes) {
      async.forEachSeries(nodes, function(node, callback) {
        Command.log(prefix + '- ' + node.getName());
        if (node.isFolder() || options.showAssets) {
          return buildMarkdownTree(node, prefix + ' ', options, callback);
        }

        callback();
      }, function() {
        callback();
      });
    });
  }
};

module.exports = TreeCommand;
