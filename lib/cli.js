'use strict';

var semver = require('semver'),
  pkgJson = require('../package.json'),
  chalk = require('chalk'),
  yargs = require('yargs'),
  Command = require('./Commands/Command'),
  Config = require('./Config'),
  async = require('async'),
  banner = `   ________                __   ____       _
  / ____/ /___  __  ______/ /  / __ \\_____(_)   _____
 / /   / / __ \\/ / / / __  /  / / / / ___/ / | / / _ \\
/ /___/ / /_/ / /_/ / /_/ /  / /_/ / /  / /| |/ /  __/
\\____/_/\\____/\\__,_/\\__,_/  /_____/_/  /_/ |___/\\___/
`;

// check that we're using Node.js 0.10 or newer
try {
	if (semver.lt(process.version, '0.10.0')) {
		console.error(`${chalk.cyan.bold(pkgJson.name)}, CLI version ${pkgJson.version}
${chalk.white.bgRed('ERROR: Titanium requires Node.js 0.10 or newer')}
Visit ${chalk.cyan('http://nodejs.org/')} to download a newer version.`);
		process.exit(1);
	}
} catch (e) {}

var appConfig = {
  commands: {
    cat: {
      offline: false,
      usage: '[flags] <path>',
      desc: 'Print files to STDOUT',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        }
      },
      file: './Commands/CatCommand',
    },
    clearcache: {
      offline: true,
      usage: '',
      desc: 'Clear the local cache',
      options: {},
      file: './Commands/ClearCacheCommand',
    },
    config: {
      offline: true,
      usage: '[flags] [key] [value]',
      desc: 'Read, write, and reset config values',
      options: {
        r: {
          group: 'Flags:',
          alias: 'reset',
          demand: false,
          desc: 'Reset the config option to its default value',
          type: 'boolean',
        }
      },
      file: './Commands/ConfigCommand',
    },
    download: {
      offline: false,
      usage: '[flags] [options] <src> [dest]',
      desc: 'Download remote file or folder to specified local path',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        },
        remote: {
          group: 'Flags:',
          demand: false,
          desc: 'Force the command to fetch from the API',
          type: 'boolean',
        },
        s: {
          group: 'Options:',
          alias: 'size',
          demand: false,
          desc: 'Maximum width or height (if image)',
          type: 'string',
        },
      },
      file: './Commands/DownloadCommand',
    },
    du: {
      offline: true,
      usage: '[flags] [path]',
      desc: 'Display the disk usage (recursively) for the specified node',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        },
        remote: {
          group: 'Flags:',
          demand: false,
          desc: 'Force the command to fetch from the API',
          type: 'boolean',
        },
      },
      file: './Commands/DiskUsageCommand',
    },
    exists: {
      offline: true,
      usage: '[flags] <src...> <dest>',
      desc: 'Check if a file or folder exists remotely',
      options: {},
      file: './Commands/ExistsCommand',
    },
    find: {
      offline: true,
      usage: '[flags] <query>',
      desc: 'Search for nodes by name',
      options: {
        t: {
          group: 'Flags:',
          alias: 'time',
          demand: false,
          desc: 'Sort nodes by modified time',
          type: 'boolean',
        }
      },
      file: './Commands/FindCommand',
    },
    info: {
      offline: false,
      usage: '',
      desc: 'Show Cloud Drive account info',
      options: {},
      file: './Commands/InfoCommand',
    },
    init: {
      offline: false,
      usage: '',
      desc: 'Initialize and authorize with Amazon Cloud Drive',
      options: {},
      file: './Commands/InitCommand',
    },
    link: {
      offline: false,
      usage: '[flags] <path>',
      desc: 'Link a file to exist under another directory',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        }
      },
      file: './Commands/LinkCommand',
    },
    ls: {
      offline: true,
      usage: '[flags] [path]',
      desc: 'List all remote nodes belonging to a specified node',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        },
        remote: {
          group: 'Flags:',
          demand: false,
          desc: 'Force the command to fetch from the API',
          type: 'boolean',
        },
        t: {
          group: 'Flags:',
          alias: 'time',
          demand: false,
          desc: 'Sort nodes by modified time',
          type: 'boolean',
        }
      },
      file: './Commands/ListCommand',
    },
    metadata: {
      offline: true,
      usage: '[flags] [path]',
      desc: 'Retrieve metadata of a node by its path',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        }
      },
      file: './Commands/MetadataCommand',
    },
    mkdir: {
      offline: false,
      usage: ' <path>',
      desc: 'Create a remote directory path (recursively)',
      options: {},
      file: './Commands/MkdirCommand',
    },
    mv: {
      offline: false,
      usage: '[flags] <path> [new_path]',
      desc: 'Move a remote node to a new directory',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        }
      },
      file: './Commands/MoveCommand',
    },
    pending: {
      offline: true,
      usage: '[flags]',
      desc: 'List the nodes that have a status of "PENDING"',
      options: {
        t: {
          group: 'Flags:',
          alias: 'time',
          demand: false,
          desc: 'Sort nodes by modified time',
          type: 'boolean',
        }
      },
      file: './Commands/ListPendingCommand',
    },
    quota: {
      offline: false,
      usage: '',
      desc: 'Show Cloud Drive account quota',
      options: {},
      file: './Commands/QuotaCommand',
    },
    rename: {
      offline: false,
      usage: '[flags] <path> <name>',
      desc: 'Rename a remote node',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        }
      },
      file: './Commands/RenameCommand',
    },
    resolve: {
      offline: true,
      usage: ' <id>',
      desc: 'Return the remote path of a node by its ID',
      options: {},
      file: './Commands/ResolveCommand',
    },
    restore: {
      offline: false,
      usage: '[flags] <path>',
      desc: 'Restore a remote node from the trash',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        },
        r: {
          group: 'Flags:',
          alias: 'recursive',
          demand: false,
          desc: 'Recursively restore nodes',
          type: 'boolean',
        },
        remote: {
          group: 'Flags:',
          demand: false,
          desc: 'Force a remote to be restored by its ID',
          type: 'booelan',
        },
      },
      file: './Commands/RestoreCommand',
    },
    rm: {
      offline: false,
      usage: '[flags] <path>',
      desc: 'Move a remote Node to the trash',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        },
        r: {
          group: 'Flags:',
          alias: 'recursive',
          demand: false,
          desc: 'Recursively delete nodes',
          type: 'boolean',
        },
        remote: {
          group: 'Flags:',
          demand: false,
          desc: 'Gather the child nodes via API call (instead of local cache) to deleting',
          type: 'boolean',
        },
      },
      file: './Commands/TrashCommand',
    },
    share: {
      offline: false,
      usage: '[flags] <path>',
      desc: 'Generate a temporary, pre-authenticated download link',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        }
      },
      file: './Commands/ShareCommand',
    },
    sync: {
      offline: false,
      usage: '',
      desc: 'Sync the local cache with Amazon Cloud Drive',
      options: {},
      file: './Commands/SyncCommand',
    },
    trash: {
      offline: true,
      usage: '[flags]',
      desc: 'List the nodes that have a status of "TRASH"',
      options: {
        t: {
          group: 'Flags:',
          alias: 'time',
          demand: false,
          desc: 'Sort nodes by modified time',
          type: 'boolean',
        },
        remote: {
          group: 'Flags:',
          demand: false,
          desc: 'View the trash listed by the API call',
          type: 'boolean',
        },
      },
      file: './Commands/ListTrashCommand',
    },
    tree: {
      offline: true,
      usage: '[flags] [path]',
      desc: 'Print directory tree of the given node',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        },
        remote: {
          group: 'Flags:',
          demand: false,
          desc: 'Force the command to fetch from the API',
          type: 'boolean',
        },
        a: {
          group: 'Flags:',
          alias: 'assets',
          demand: false,
          desc: 'Include ASSET nodes',
          type: 'boolean',
        },
        m: {
          group: 'Flags:',
          alias: 'markdown',
          demand: false,
          desc: 'Output tree in markdown',
          type: 'boolean',
        },
      },
      file: './Commands/TreeCommand',
    },
    unlink: {
      offline: false,
      usage: '[flags] <id> <parent>',
      desc: 'Unlink a node from a parent node',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the parent node by its ID instead of path',
          type: 'boolean',
        },
      },
      file: './Commands/UnlinkCommand',
    },
    upload: {
      offline: false,
      usage: '[flags] <src...> <dest>',
      desc: 'Upload local file(s) or folder(s) to remote directory',
      options: {
        o: {
          group: 'Flags:',
          alias: 'overwrite',
          demand: false,
          desc: 'Overwrite the remote file if it already exists',
          type: 'boolean',
        },
        f: {
          group: 'Flags:',
          alias: 'force',
          demand: false,
          desc: 'Force a re-upload of the file even if the path and MD5 both match',
          type: 'boolean',
        }
      },
      file: './Commands/UploadCommand',
    },
    usage: {
      offline: false,
      usage: '',
      desc: 'Show Cloud Drive account usage',
      options: {},
      file: './Commands/UsageCommand',
    },
    version: {
      offline: true,
      usage: '',
      desc: false,
      options: {},
      callback: callback => {
        Command.log(`v${pkgJson.version}`);
        callback(0);
      }
    }
  },
  global: {
    options: {
      h: {
        group: 'Global Flags:',
      },
      v: {
        group: 'Global Flags:',
        alias: 'verbose',
        demand: false,
        desc: 'Output verbosity: 1 for normal (-v), 2 for more verbose (-vv), and 3 for debug (-vvv)',
        type: 'count',
      },
      q: {
        group: 'Global Flags:',
        alias: 'quiet',
        demand: false,
        desc: 'Suppress all output',
        type: 'boolean',
      },
      V: {
        group: 'Global Flags:',
      },
    }
  }
},
  defaultConfig = {
    'auth.email': {
      type: 'string',
      default: '',
    },
    'auth.id': {
      type: 'string',
      default: '',
    },
    'auth.secret': {
      type: 'string',
      default: '',
    },
    'cli.colors': {
      type: 'bool',
      default: true,
    },
    'cli.ignoreFiles': {
      type: 'string',
      default: '^(\\.DS_Store|[Tt]humbs.db)$',
    },
    'cli.progressBars': {
      type: 'bool',
      default: true,
    },
    'cli.progressInterval': {
      type: 'string',
      default: 250,
    },
    'database.driver': {
      type: 'string',
      default: 'sqlite',
    },
    'database.host': {
      type: 'string',
      default: '127.0.0.1',
    },
    'database.database': {
      type: 'string',
      default: 'clouddrive',
    },
    'database.username': {
      type: 'string',
      default: 'root',
    },
    'database.password': {
      type: 'string',
      default: '',
    },
    'display.date': {
      type: 'choice',
      default: 'modified',
      choices: [
        'modified',
        'created',
      ],
    },
    'display.showPending': {
      type: 'bool',
      default: true,
    },
    'display.showTrash': {
      type: 'bool',
      default: true,
    },
    'download.checkMd5': {
      type: 'bool',
      default: true,
    },
    'json.pretty': {
      type: 'bool',
      default: false,
    },
    'log.level': {
      type: 'choice',
      default: 0,
      choices: [
        0,
        1,
        2,
        3,
      ],
    },
    'sync.chunkSize': {
      type: 'string',
      default: '',
    },
    'sync.maxNodes': {
      type: 'string',
      default: '',
    },
    'upload.duplicates': {
      type: 'bool',
      default: false,
    },
    'upload.numRetries': {
      type: 'string',
      default: 1,
    },
  };

Command.setAppName('clouddrive-node');
var config = new Config(`${Command.getConfigPath()}/config.json`, defaultConfig);
if (!config.get('cli.colors')) {
  chalk.enabled = false;
}

async.forEachOfSeries(appConfig.commands, (command, name, callback) => {
  yargs.command(name, command.desc, yargs => {
    return yargs.usage(`\nUsage: ${name} ${command.usage}`)
      .options(command.options)
      .options(appConfig.global.options)
      .fail((message) => {
        yargs.showHelp();
        Command.error(message);
        Command.shutdown(1);
      });
  }, argv => {
    Command.VERBOSE_LEVEL = config.get('log.level');
    if (argv.verbose > 0) {
      Command.VERBOSE_LEVEL = argv.verbose;
    }
    if (argv.quiet) {
      Command.VERBOSE_LEVEL = -1;
    }

    // Load in the command file and run
    if (command.file) {
      var Cmd = require(command.file);
      new Cmd({offline: command.offline}, config).execute(argv._.slice(1), argv);
    } else if (command.callback) {
      // Otherwise,
      command.callback(code => {
        Command.shutdown(code);
      });
    } else {
      Command.error(`Command '${name}' does not have a valid config action`);
      Command.shutdown(1);
    }
  });

  callback();
}, err => {
  if (err) {
    Command.error(err);
    Command.shutdown(1);
  }

  var argv = yargs
    .usage(`${chalk.green(banner)}\nUsage: clouddrive command [flags] [options] [arguments]`)
    .version(function() {
      return `v${pkgJson.version}`;
    })
    .help('h')
    .alias('h', 'help')
    .alias('V', 'version')
    .options(appConfig.global.options)
    .epilog(`Copyright ${new Date().getFullYear()}`)
    .strict()
    .fail((message) => {
      yargs.showHelp();
      Command.error(message);
      Command.shutdown(1);
    })
    .argv;

  if (!argv._[0]) {
    yargs.showHelp();
  } else {
    if (!appConfig.commands[argv._[0]]) {
      yargs.showHelp();
      Command.error(`Invalid command: ${argv._[0]}`);
      Command.shutdown(1);
    }
  }
});
