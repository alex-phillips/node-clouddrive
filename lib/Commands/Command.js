'use strict';

let path = require('path'),
  fs = require('fs-extra'),
  ParameterBag = require('../ParameterBag'),
  Account = require('../Account'),
  Node = require('../Node'),
  Utils = require('../Utils'),
  Logger = require('../Logger'),
  chalk = require('chalk'),
  moment = require('moment'),
  elegantSpinner = require('elegant-spinner'),
  envPaths = require('env-paths'),
  logUpdate = require('log-update'),
  paths = null,
  spinner = null,
  spinnerText = '';

class Command {
  constructor(config = {}, appConfig = {}) {
    if (Command.APP_NAME === null) {
      throw Error('No app name set');
    }

    this.params = {
      offline: false
    };

    for (let key in config) {
      if (this.params[key] === undefined) {
        continue;
      }

      this.params[key] = config[key];
    }

    if (appConfig.constructor.name !== 'Config') {
      throw Error(`Second parameter must be an instance of 'Config'.`);
    }

    this.config = appConfig;
  }

  execute(args, options) {
    if (options.remote) {
      this.params.offline = false;
    }

    if (options.debug) {
      Logger.warn('Running in debug mode');
      let memwatch = require('memwatch-next');
      memwatch.on('leak', info => {
        Logger.warn(info);
      });
    }

    try {
      Logger.debug(`Running ${this.constructor.name}`);
      this.run.apply(this, arguments)
        .then(() => {
          Command.shutdown(0);
        }, err => {
          if (err) {
            switch (err.code) {
              case 'ENOTFOUND':
                Logger.error(`Unable to connect. Please make sure you have network access: ${err}`);
                break;
              default:
                Logger.error(`${err}`);
            }
          }
          Command.shutdown(1);
        });
    } catch (err) {
      if (err) {
        Logger.error(`Uncaught error: ${err}`);
        Logger.debug(`Stack: ${err.stack}`);
      }
      Command.shutdown(1);
    }
  }

  initialize(callback) {
    this.initializeDatabase(err => {
      if (err) {
        return callback(err);
      }

      Logger.debug('Successfully conncted to databse.');

      this.account.load(err => {
        if (err) {
          return callback(err);
        }

        Logger.debug('Successfully loaded account.');

        if (this.params.offline === false) {
          return this.account.authorize(null, {}, (err, data) => {
            if (err) {
              return callback(err);
            }

            Logger.debug('Successfully authenticated with Amazon account.');

            return callback(null, data);
          });
        }

        return callback();
      });
    });
  }

  initializeDatabase(callback) {
    Logger.debug('Connecting to databsae');
    Logger.silly(`Database config: `, this.config.get('database'));
    switch (this.config.get('database.driver')) {
      case 'sqlite':
        let SQLite = require('../Cache/SQLite3');
        new SQLite({
          client: 'sqlite3',
          connection: {
            filename: `${Command.getCacheDirectory()}/${this.config.get('auth.email')}.db`
          }
        }, (err, cache) => {
          this.account = new Account(this.config.get('auth.email'), cache, this.config.get('auth.id'), this.config.get('auth.secret'));
          Node.init(this.account, cache);
          callback(null);
        });
        break;
      case 'mysql':
        let MySQL = require('../Cache/MySQL');
        new MySQL({
          client: 'mysql',
          connection: {
            host: this.config.get('database.host'),
            user: this.config.get('database.username'),
            password: this.config.get('database.password'),
            database: this.config.get('database.database')
          }
        }, (err, cache) => {
          this.account = new Account(this.config.get('auth.email'), cache, this.config.get('auth.id'), this.config.get('auth.secret'));
          Node.init(this.account, cache);
          callback(null);
        });
        break;
      case 'mongo':
        let Mongo = require('../Cache/Mongo');
        new Mongo({}, (err, cache) => {
          this.account = new Account(this.config.get('auth.email'), cache.config.get('auth.id'), this.config.get('auth.secret'), cache);
          Node.init(this.account, cache);
          callback(null);
        });
        break;
    }
  }

  run(cmd, options) {

  }

  static getAppName() {
    return Command.APP_NAME;
  }

  static getCacheDirectory() {
    if (Command.APP_NAME === null) {
      throw Error('No app name set');
    }

    try {
      fs.statSync(paths.cache);
    } catch (e) {
      fs.mkdirsSync(paths.cache);
    }

    return paths.cache;
  }

  static getConfigDirectory() {
    if (Command.APP_NAME === null) {
      throw Error('No app name set');
    }

    try {
      fs.statSync(paths.config);
    } catch (e) {
      fs.mkdirsSync(paths.config);
    }

    return paths.config;
  }

  static getLogDirectory() {
    if (Command.APP_NAME === null) {
      throw Error('No app name set');
    }

    try {
      fs.statSync(paths.log);
    } catch (e) {
      fs.mkdirsSync(paths.log);
    }

    return paths.log;
  }

  static getTempDirectory() {
    if (Command.APP_NAME === null) {
      throw Error('No app name set');
    }

    try {
      fs.statSync(paths.temp);
    } catch (e) {
      fs.mkdirsSync(paths.temp);
    }

    return paths.temp;
  }

  static list(nodes, options) {
    if (!options) {
      options = {};
    }

    switch (options.sortOrder) {
      case Command.SORT_BY_DATE:
        nodes.sort((a, b) => {
          if (a.getModifiedDate() < b.getModifiedDate()) {
            return -1;
          }
          if (a.getModifiedDate() > b.getModifiedDate()) {
            return 1;
          }

          return 0;
        });
        break;
      default:
        nodes.sort((a, b) => {
          if (a.getName().toLowerCase() < b.getName().toLowerCase()) {
            return -1;
          }
          if (a.getName().toLowerCase() > b.getName().toLowerCase()) {
            return 1;
          }

          return 0;
        });
        break;
    }

    for (let i = 0; i < nodes.length; i++) {
      let node = nodes[i];

      if (node.inTrash() && options.showTrash === false) {
        continue;
      }

      if (node.isPending() && options.showPending === false) {
        continue;
      }

      let now = new Date(),
        date = null;

      switch (options.displayDate) {
        case 'created':
          date = new Date(node.getCreatedDate());
          break;
        default:
          date = new Date(node.getModifiedDate());
          break;
      }

      let month = Utils.pad(moment(date).format('MMM'), 4),
        day = Utils.pad(moment(date).format('D'), 2, 'left'),
        dateString = `${month} ${day}  ${moment(date).format('YYYY')}`;

      if (now.getYear() === date.getYear()) {
        dateString = `${month} ${day} ${Utils.pad(moment(date).format('H:mm'), 5, 'left')}`;
      }

      let name = node.getName();
      if (options.decrypt && node.getLabels().indexOf('enc') !== -1) {
        name = Utils.decryptString(node.getName(), options.password, options.algorithm);
      }

      switch (node.getStatus()) {
        case Node.STATUS_TRASH:
          name = chalk.red(name);
          break;
        case Node.STATUS_PENDING:
          name = chalk.yellow(name);
          break;
        default:
          if (node.isFolder()) {
            name = chalk.blue(name);
          }
          break;
      }

      let size = Utils.convertFileSize(node.getSize(), 0);

      Logger.info(`${node.getId()}  ${dateString}  ${Utils.pad(node.getStatus(), 10)} ${Utils.pad(node.getKind(), 7)} ${Utils.pad(size, 6)} ${name}`);
    }
  }

  static setAppName(name) {
    Command.APP_NAME = name;
    paths = envPaths(name);
  }

  static shutdown(code) {
    if (code === undefined) {
      code = 0;
    }

    Logger.debug(`Exiting with code ${code}`);
    Logger.flushAndExit(code);
  }

  static startSpinner(message, verbosity) {
    if (Logger.getOutputLevel() !== 'info') {
      return;
    }

    spinnerText = message || '';

    let frame = elegantSpinner();
    logUpdate.done();
    spinner = setInterval(() => {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(spinnerText + chalk.bold.cyan(frame()));
    }, 50);
  }

  static updateSpinnerText(message) {
    spinnerText = message || '';
  }

  static stopSpinner(message) {
    if (spinner) {
      clearInterval(spinner);
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      if (message) {
        console.log(message);
      }
    }
  }
}

Command.APP_NAME = null;
Command.SORT_BY_NAME = 'name';
Command.SORT_BY_DATE = 'date';
Command.VERBOSE_LEVEL = 0;

module.exports = Command;
