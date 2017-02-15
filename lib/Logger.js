'use strict';

let chalk = require('chalk'),
  winston = require('winston'),
  moment = require('moment'),
  logUpdate = require('log-update'),
  Utils = require('./Utils'),
  instance = null,
  levels = {
    error: 0,
    warn: 1,
    info: 2,
    verbose: 3,
    debug: 4,
    silly: 5,
  };

class Logger {
  static getInstance(config = {verbosity: 'error'}) {
    if (instance === null) {
      if (config.cliTimestamp === true) {
        config.cliTimestamp = Logger.timestamp;
      }
      let showLevels = levels[config.verbosity] <= levels.info ? false : true,
        transports = [
          new (winston.transports.Console)({
            level: config.verbosity,
            colorize: config.colorize,
            align: showLevels,
            handleExceptions: true,
            timestamp: config.cliTimestamp,
            showLevel: showLevels,
          }),
        ];

      if (config.file) {
        transports.push(new (winston.transports.File)({
          filename: config.file,
          level: config.logLevel,
          align: true,
          timestamp: Logger.timestamp,
          json: false,
          handleExceptions: true,
          colorize: false,
        }));
      }

      instance = new (winston.Logger)({
        transports: transports,
      });
    }

    return instance;
  }

  static flushAndExit(code) {
    return process.exit(code);
    // if (!Logger.getInstance().transports.file) {
    //   return process.exit(code);
    // }
    //
    // return Logger.getInstance().transports.file.on('flush', () => {
    //   process.exit(code);
    // });
  }

  static getLogLevel() {
    return Logger.getInstance().transports.file.level;
  }

  static getOutputLevel() {
    return Logger.getInstance().transports.console.level;
  }

  static info(message, data = null, callback = null) {
    logUpdate.clear();
    Logger.getInstance().info(message, data, callback);
    logUpdate.done();
  }

  static error(message, data = null, callback = null) {
    logUpdate.clear();
    Logger.getInstance().error(message, data, callback);
    logUpdate.done();
  }

  static warn(message, data = null, callback = null) {
    logUpdate.clear();
    Logger.getInstance().warn(message, data, callback);
    logUpdate.done();
  }

  static verbose(message, data = null, callback = null) {
    logUpdate.clear();
    Logger.getInstance().verbose(message, data, callback);
    logUpdate.done();
  }

  static debug(message, data = null, callback = null) {
    logUpdate.clear();
    Logger.getInstance().debug(message, data, callback);
    logUpdate.done();
  }

  static silly(message, data = null, callback = null) {
    logUpdate.clear();
    Logger.getInstance().silly(message, data, callback);
    logUpdate.done();
  }

  static setConsoleLevel(level) {
    if (Logger.getInstance().transports.console) {
      let showLevel = levels[level] <= levels.info ? false : true;
      Logger.getInstance().transports.console.level = level;
      Logger.getInstance().transports.console.showLevel = showLevel;
      Logger.getInstance().transports.console.align = showLevel;
    }
  }

  static setFileLevel(level) {
    if (Logger.getInstance().transports.file) {
      Logger.getInstance().transports.file.level = level;
    }
  }

  static timestamp() {
    return moment().format('YYYY-MM-DD HH:mm:ss');
  }
}

module.exports = Logger;
