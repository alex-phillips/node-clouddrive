var fs = require('fs');
var Command = require('./Command');
var Node = require('../Node');
var colors = require('colors');
var ProgressBar = require('progress');
var promise = require('promise');

var UploadCommand = new Command({
  offline: false
});

UploadCommand.run = function(localPath, remotePath, options) {
  var self = this;

  return promise.denodeify(self.initialize).call(self)
    .then(function() {
      return promise.denodeify(self.account.authorize).call(self.account, null)
        .then(function(data) {
          if (data.success === true) {
            if (!fs.existsSync(localPath)) {
              Command.error('No file exists at \'' + localPath + '\'');

              return 1;
            }

            var bar = null;
            var localFilesize = null;
            var bytesUploaded = null;
            var opts = {
              onFileUpload: function(localPath, callback) {
                bytesUploaded = 0;
                localFilesize = fs.statSync(localPath)['size'];
                bar = new ProgressBar('Uploading \'' + localPath + '\' [:bar] :percent :etas', {
                  complete: '=',
                  incomplete: ' ',
                  width: 20,
                  total: localFilesize,
                  clear: true
                });

                return callback();
              },
              onFileProgress: function(request) {
                if (request) {
                  var bytesDispatched = request.connection._bytesDispatched;
                  bar.tick(bytesDispatched - bytesUploaded);
                  bytesUploaded = request.connection._bytesDispatched;
                }
              },
              onFileComplete: function(localPath, remotePath, retval, callback) {
                // Clear out progress bar
                if (bar !== null && !bar.complete) {
                  bar.tick(localFilesize);
                  bar = null;
                  localFilesize = null;
                }

                if (retval.success) {
                  Command.info('Successfully uploaded file \'' + localPath + '\' to \'' + remotePath + '\'');
                } else {
                  var message = 'Failed to upload file \'' + localPath + '\'';
                  if (retval.data.message) {
                    message += ': ' + retval.data.message;
                  }

                  if (retval.data.exists !== undefined && retval.data.exists === true) {
                    if (retval.data.md5Match === true && retval.data.pathMatch === true) {
                      Command.warn(message);
                    } else {
                      Command.error(message);
                    }
                  } else {
                    Command.error(message);
                  }
                }

                return callback();
              }
            };

            if (options.overwrite) {
              opts.overwrite = true;
            }

            if (fs.lstatSync(localPath).isDirectory()) {
              return promise.denodeify(Node.uploadDirectory)(localPath, remotePath, opts)
                .then(function() {
                  return 0;
                });
            }

            return promise.denodeify(Node.uploadFile)(localPath, remotePath, opts)
              .then(function(data) {
                if (data.success) {
                  return 0;
                }

                return 1;
              });
          } else {
            Command.error('Account not authorized with Amazon Cloud Drive. Run `init` command first.');

            return 1;
          }
        }, function(err) {
          Command.error(err.message);

          return 1;
        });
    });
};

module.exports = UploadCommand;
