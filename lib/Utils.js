'use strict';

let fs = require('fs'),
  crypto = require('crypto');

class Utils {
  static arrayUnique(xary) {
    xary = xary.sort(function(a, b) {
      return a * 1 - b * 1;
    });

    let retval = [xary[0]];
    // Start loop at 1 as element 0 can never be a duplicate
    for (var i = 1; i < xary.length; i++) {
      if (xary[i - 1] !== xary[i]) {
        retval.push(xary[i]);
      }
    }

    return retval;
  }

  static convertFileSize(bytes, decimals = 2) {
    let size = bytes ? bytes : 0,
      sizes = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
      factor = Math.floor((size.toString().length - 1) / 3);

    size = size / Math.pow(1024, factor);

    return parseFloat(size.toFixed(decimals)) + sizes[factor];
  }

  static getFileMd5(filepath, callback) {
    let sum = crypto.createHash('md5');

    if (callback && typeof callback === 'function') {
      let fileStream = fs.createReadStream(filepath);

      fileStream.on('error', err => {
        return callback(err, null);
      });

      fileStream.on('data', chunk => {
        try {
          sum.update(chunk);
        } catch (ex) {
          return callback(ex, null);
        }
      });

      fileStream.on('end', () => {
        return callback(null, sum.digest('hex'));
      });
    } else {
      sum.update(fs.readFileSync(filepath));

      return sum.digest('hex');
    }
  }

  static getPathArray(path) {
    let retval = [];
    path = path.split('/');
    for (let i = 0; i < path.length; i++) {
      if (path[i]) {
        retval.push(path[i]);
      }
    }

    return retval;
  }

  static pad(string, length, side) {
    if (!side) {
      side = 'right';
    }

    switch (side) {
      case 'left':
        return (string.toString().length < length) ? Utils.pad(` ${string}`, length, side) : string;
      default:
        return (string.toString().length < length) ? Utils.pad(`${string} `, length, side) : string;
    }
  }

  static trimPath(string) {
    while (string.charAt(0) === '/') {
      string = string.substring(1);
    }

    while (string.charAt(string.length - 1) === '/') {
      string = string.substring(0, string.length - 1);
    }

    return string;
  }
}

module.exports = Utils;
