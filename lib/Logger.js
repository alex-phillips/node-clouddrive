'use strict';

let chalk = require('chalk'),
  winston = require('winston'),
  moment = require('moment'),
  Utils = require('./Utils'),
  instance = null;

class Logger {
  static getInstance(config = {verbosity: 'error'}) {
    if (instance === null) {
      if (config.cliTimestamp === true) {
        config.cliTimestamp = Logger.timestamp;
      }
      let transports = [
        new (winston.transports.Console)({
          level: config.verbosity,
          colorize: true,
          align: true,
          handleExceptions: true,
          timestamp: config.cliTimestamp,
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
        }));
      }

      instance = new (winston.Logger)({
        transports: transports,
      });
    }

    return instance;
  }

  static getLogLevel() {
    return Logger.getInstance().transports.file.level;
  }

  static getOutputLevel() {
    return Logger.getInstance().transports.console.level;
  }

  static info(message) {
    Logger.getInstance().info(message);
  }

  static error(message) {
    Logger.getInstance().error(message);
  }

  static warn(message) {
    Logger.getInstance().warn(message);
  }

  static verbose(message) {
    Logger.getInstance().verbose(message);
  }

  static debug(message, data = null) {
    Logger.getInstance().debug(message, data);
  }

  static silly(message, data = null) {
    Logger.getInstance().silly(message, data);
  }

  static setConsoleLevel(level) {
    if (Logger.getInstance().transports.console) {
      Logger.getInstance().transports.console.level = level;
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
