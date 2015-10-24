var Command = require('./Command');
var Node = require('../Node');
var async = require('async');
var Utils = require('../Utils');
var promise = require('promise');

var DiskUsageCommand = new Command({
  offline: true
});

DiskUsageCommand.run = function(remotePath, options) {
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

          var size = 0;
          var files = 0;
          var folders = 0;

          Command.startSpinner('Calculating ');

          return new promise(function(resolve, reject) {
            calculateSize(node, function() {
              Command.stopSpinner();
              Command.log(Utils.convertFileSize(size));

              if (options.verbose) {
                Command.log(files + ' files, ' + folders + ' folders');
              }

              resolve();
            });
          });

          function calculateSize(node, callback) {
            node.getChildren(function(err, children) {
              async.forEach(children, function(child, callback) {
                var nodeSize = child.getSize();
                if (nodeSize) {
                  size += nodeSize;
                }

                if (child.isFolder()) {
                  folders++;

                  return calculateSize(child, callback);
                } else {
                  files++;
                }

                callback();
              }, function() {
                callback(null);
              });
            });
          }
        });
    });
};

module.exports = DiskUsageCommand;
