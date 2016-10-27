'use strict';

let events = require('events'),
  staticEvents = new events.EventEmitter();

class ParameterBag extends events.EventEmitter {
  constructor(data) {
    super();
    this.replace(data);
  }

  flatten() {
    let flatten = (data, prefix = '') => {
      let retval = {};
      for (let i in data) {
        if (typeof data[i] === 'object') {
          let nestedObj = flatten(data[i], `${prefix}${i}.`);
          for (let j in nestedObj) {
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

  get(path, defaultValue = null) {
    let retval = this.data;

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
    for (let i in data) {
      this.set(i, data[i]);
    }
  }

  set(key, value) {
    let keys = key.split('.'),
      xary = this.data;
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

  static on(...args) {
    staticEvents.on(...args);
  }

  static emit(...args) {
    staticEvents.emit(...args);
  }
}

module.exports = ParameterBag;
