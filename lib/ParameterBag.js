'use strict';

class ParameterBag {
  constructor(data) {
    this.replace(data);
  }

  flatten() {
    var flatten = (data, prefix) => {
      if (prefix === undefined) {
        prefix = '';
      }

      var retval = {};
      for (var i in data) {
        if (typeof data[i] === 'object') {
          var nestedObj = flatten(data[i], `${prefix}${i}.`);
          for (var j in nestedObj) {
            retval[j] = nestedObj[j];
          }
        } else {
          retval['' + prefix + i] = data[i];
        }
      }

      return retval;
    };

    return flatten(this.data);
  }

  get(path, defaultValue) {
    if (defaultValue === undefined) {
      defaultValue = null;
    }

    var retval = this.data;

    path = path.split('.');
    for (let i = 0; i < path.length; i++) {
      if (retval[path[i]] === undefined) {
        return defaultValue;
      }

      retval = retval[path[i]];
    }

    return retval;
  }

  getData() {
    return this.data;
  }

  replace(data) {
    this.data = {};
    for (var i in data) {
      this.set(i, data[i]);
    }
  }

  set(key, value) {
    var keys = key.split('.');
    var xary = this.data;
    while (key = keys.shift()) {
      if (keys.length === 0) {
        xary[key] = value;
        break;
      }

      if (xary[key] === undefined) {
        xary[key] = {};
      }

      xary = xary[key];
    }
  }
}

module.exports = ParameterBag;
