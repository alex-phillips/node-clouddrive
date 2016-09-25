'use strict';

let path = require('path'),
  fs = require('fs'),
  ParameterBag = require('../ParameterBag'),
  Account = require('../Account'),
  Node = require('../Node'),
  Utils = require('../Utils'),
  Logger = require('../Logger'),
  chalk = require('chalk'),
  moment = require('moment'),
  elegantSpinner = require('elegant-spinner'),
  envPaths = require('env-paths'),
  mkdirp = require('mkdirp'),
  paths = null,
  spinner = null;

class Command {
  constructor(config, appConfig) {
    if (Command.APP_NAME === null) {
      throw Error('No app name set');
    }

    let defaults = {
      offline: false
    };

    if (config === undefined) {
      config = {};
    }

    for (let key in config) {
      if (defaults[key] === undefined) {
        continue;
      }

      defaults[key] = config[key];
    }

    this.params = defaults;
    this.config = appConfig;
  }

  execute(args, options) {
    if (options.remote) {
      this.params.offline = false;
    }

    try {
      Logger.info(`Running ${this.constructor.name}...`);
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
      }
      Command.shutdown(1);
    }
  }

  initialize(callback) {
    Logger.info('Initializing command.');
    this.initializeDatabase(err => {
      if (err) {
        return callback(err);
      }

      Logger.info('Successfully conncted to databse.');

      this.account.load(err => {
        if (err) {
          return callback(err);
        }

        Logger.info('Successfully loaded account.');

        if (this.params.offline === false) {
          return this.account.authorize(null, {}, (err, data) => {
            if (err) {
              return callback(err);
            }

            Logger.info('Successfully authenticated with Amazon account.');

            return callback(null, data);
          });
        }

        return callback();
      });
    });
  }

  initializeDatabase(callback) {
    Logger.info('Initializing database...');
    Logger.debug(`Database config: `, this.config.get('database'));
    switch (this.config.get('database.driver')) {
      case 'sqlite':
        Logger.verbose('Connecting to SQLite3 database...');
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
        Logger.verbose('Connecting to MySQL database...');
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
        Logger.verbose('Connecting to Mongo database...');
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
      mkdirp.sync(paths.cache);
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
      mkdirp.sync(paths.config);
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
      mkdirp.sync(paths.log);
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
      mkdirp.sync(paths.temp);
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

      console.log('%s  %s  %s %s %s %s', node.getId(), dateString, Utils.pad(node.getStatus(), 10), Utils.pad(node.getKind(), 7), Utils.pad(size, 6), name);
    }
  }

  static output(message) {
    console.log(message);
  }

  static setAppName(name) {
    Command.APP_NAME = name;
    paths = envPaths(name);
  }

  static shutdown(code) {
    if (code === undefined) {
      code = 0;
    }

    Logger.info(`Exiting with code ${code}`, 3);

    process.exit(code);
  }

  static startSpinner(message, verbosity) {
    if (Logger.getOutputLevel() !== 'warn') {
      return;
    }

    if (message === undefined) {
      message = '';
    }

    let frame = elegantSpinner();
    spinner = setInterval(() => {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(message + chalk.bold.cyan(frame()));
    }, 50);
  }

  static stopSpinner(message) {
    if (spinner) {
      clearInterval(spinner);
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      if (message) {
        Command.output(message);
      }
    }
  }
}

Command.APP_NAME = null;
Command.SORT_BY_NAME = 'name';
Command.SORT_BY_DATE = 'date';
Command.VERBOSE_LEVEL = 0;

module.exports = Command;
