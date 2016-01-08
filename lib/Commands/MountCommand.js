'use strict';

var fs = require('fs'),
  pth = require('path'),
  Command = require('./Command'),
  Node = require('../Node'),
  async = require('async'),
  fuse = require('fuse-bindings'),
  mountPoint = '/Users/alexphillips/Desktop/mnt';

class MountCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        fuse.mount(mountPoint, {
          readdir: function(path, cb) {
            console.log('readdir(%s)', path);
            Node.loadByPath(path, (err, node) => {
              if (err) {
                console.log('error: ', err);

                return cb(0);
              }

              node.getChildren((err, nodes) => {
                if (err) {
                  console.log('error: ', err);

                  return cb(0);
                }

                let list = [];
                //console.log(`found ${nodes.length} children`);
                async.forEach(nodes, (child, callback) => {
                  list.push(child.getName());
                  callback();
                }, () => {
                  cb(0, list);
                });
              });
            });
          },
          getattr: function(path, cb) {
            //console.log('getattr: ', path);
            Node.loadByPath(path, (err, node) => {
              if (err) {
                console.log('error: ', err);

                return cb(0);
              }

              if (!node) {
                //console.log(`no node found for ${path}`);
                return cb(fuse.ENOENT)
              }

              let size = node.getSize();
              if (size === null) {
                size = 0;
              }

              let mode = 33188;
              if (node.isFolder()) {
                mode = 16877;
              }

              return cb(0, {
                mtime: node.getModifiedDate(),
                atime: node.getCreatedDate(),
                ctime: node.getCreatedDate(),
                size: size,
                mode: mode, // was 16877
                uid: process.getuid(),
                gid: process.getgid()
              });
            });
          },
          open: function(path, flags, cb) {
            //console.log('open(%s, %d)', path, flags);
            Node.loadByPath(path, (err, node) => {
              if (err) {
                console.log('error: ', err);

                return cb(0);
              }

              //cb(0, node.getId()); // 42 is an fd
              if (node.isFile()) {
                return fs.open(pth.join(Command.getCacheDirectory(), 'download', node.getId()), 'w+', (err, fd) => {
                  cb(0, fd);
                });
              }
            });
          },
          read: function(path, fd, buf, len, pos, cb) {
            console.log('read(%s, %d, %d, %d)', path, fd, len, pos);

            Node.loadByPath(path, (err, node) => {
              if (err) {
                console.log('error: ', err);

                return cb(0);
              }

              pos = pos ? pos : 0;

              if (node.getSize() == pos) {
                return cb(0);
              }

              return node.downloadChunk({

              }, pos, len, (err, retval) => {
                console.log(`chunk of length ${retval.data.bytesWritten} read`);
                retval.data.buffer.copy(buf);
                return cb(retval.data.bytesWritten);
              });
            });
          }
          //releasedir: function(path, fd, cb) {
        //    Node.loadByPath(path, (err, node) => {
          //    node.getChildren((err, children) => {
          //      async.forEach(children, (child, callback) => {
          //        //fs.close(fd, () => {
        //
          //        //});
          //        fs.unlink(pth.join(Command.getCacheDirectory(), 'download', node.getId()), () => {
        //        return cb(0);
        //        });
        //      });
        //    });
        //      });
        //      }
        });

        process.on('SIGINT', function () {
          console.log('unmounting ' + mountPoint);
          fuse.unmount(mountPoint, function () {
            return resolve();
          });
        });
      });
    });
  }
}

module.exports = MountCommand;
