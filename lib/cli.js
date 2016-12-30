'use strict';

let semver = require('semver'),
  pkgJson = require('../package.json'),
  chalk = require('chalk'),
  yargs = require('yargs'),
  Command = require('./Commands/Command'),
  Config = require('./Config'),
  Logger = require('./Logger'),
  async = require('async'),
  crypto = require('crypto'),
  banner = `   ________                __   ____       _
  / ____/ /___  __  ______/ /  / __ \\_____(_)   _____
 / /   / / __ \\/ / / / __  /  / / / / ___/ / | / / _ \\
/ /___/ / /_/ / /_/ / /_/ /  / /_/ / /  / /| |/ /  __/
\\____/_/\\____/\\__,_/\\__,_/  /_____/_/  /_/ |___/\\___/
`;

// check that we're using Node.js 0.12 or newer
try {
	if (semver.lt(process.version, '0.12.0')) {
		console.error(`${chalk.cyan.bold(pkgJson.name)}, CLI version ${pkgJson.version}
${chalk.white.bgRed(`ERROR: ${pkgJson.name} requires Node.js 0.12 or newer`)}
Visit ${chalk.cyan('http://nodejs.org/')} to download a newer version.`);

		process.exit(1);
	}
} catch (e) {}

Command.setAppName('clouddrive-node');

let cliConfig = {
  commands: {
    'about': {
      offline: true,
      usage: '',
      desc: 'Print app-specific information',
      options: {},
      file: './Commands/AboutCommand',
    },
    'cat': {
      offline: false,
      usage: '[flags] <path>',
      demand: 1,
      desc: 'Print files to STDOUT',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        },
        decrypt: {
          group: 'Flags:',
          demand: false,
          desc: 'Decrypt files when downloading',
          type: 'boolean',
        },
        armor: {
          group: 'Flags:',
          demand: false,
          desc: 'Decrypt ASCII data - default is binary data',
          type: 'boolean',
        },
        password: {
          group: 'Flags:',
          alias: 'p',
          demand: false,
          desc: 'Prompt for decryption password',
          type: 'boolean',
        },
      },
      file: './Commands/CatCommand',
    },
    'clearcache': {
      offline: true,
      usage: '',
      desc: 'Clear the local cache',
      options: {},
      file: './Commands/ClearCacheCommand',
    },
    'config': {
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
        },
      },
      file: './Commands/ConfigCommand',
    },
    'encrypt': {
      offline: true,
      usage: '<path>',
      demand: 1,
      desc: 'Encrypt a file',
      options: {
        password: {
          group: 'Flags:',
          alias: 'p',
          demand: false,
          desc: 'Prompt for decryption password',
          type: 'boolean',
        },
        armor: {
          group: 'Flags:',
          demand: false,
          desc: 'Create ASCII output - default is a binary format',
          type: 'boolean',
        },
      },
      file: './Commands/EncryptCommand',
    },
    'decrypt': {
      offline: true,
      usage: '<path>',
      demand: 1,
      desc: 'Decrypt a file',
      options: {
        password: {
          group: 'Flags:',
          alias: 'p',
          demand: false,
          desc: 'Prompt for decryption password',
          type: 'boolean',
        },
        armor: {
          group: 'Flags:',
          demand: false,
          desc: 'Decrypt ASCII data - default is binary data',
          type: 'boolean',
        },
      },
      file: './Commands/DecryptCommand',
    },
    'delete-everything': {
      offline: true,
      usage: '',
      desc: 'Remove all files and folders related to the CLI',
      options: {},
      file: './Commands/DeleteEverythingCommand',
    },
    'download': {
      offline: false,
      usage: '[flags] [options] <src> [dest]',
      demand: 1,
      desc: 'Download remote file or folder to specified local path',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        },
        decrypt: {
          group: 'Flags:',
          demand: false,
          desc: 'Decrypt files when downloading',
          type: 'boolean',
        },
        armor: {
          group: 'Flags:',
          demand: false,
          desc: 'Decrypt ASCII data - default is binary data',
          type: 'boolean',
        },
        password: {
          group: 'Flags:',
          alias: 'p',
          demand: false,
          desc: 'Prompt for decryption password',
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
    'du': {
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
    'exists': {
      offline: true,
      usage: '[flags] <src...> <dest>',
      demand: 2,
      desc: 'Check if a file or folder exists remotely',
      options: {},
      file: './Commands/ExistsCommand',
    },
    'find': {
      offline: true,
      usage: '[flags] <query>',
      demand: 1,
      desc: 'Search for nodes by name',
      options: {
        t: {
          group: 'Flags:',
          alias: 'time',
          demand: false,
          desc: 'Sort nodes by modified time',
          type: 'boolean',
        },
      },
      file: './Commands/FindCommand',
    },
    'info': {
      offline: false,
      usage: '',
      desc: 'Show Cloud Drive account info',
      options: {},
      file: './Commands/InfoCommand',
    },
    'init': {
      offline: false,
      usage: '',
      desc: 'Initialize and authorize with Amazon Cloud Drive',
      options: {},
      file: './Commands/InitCommand',
    },
    'link': {
      offline: false,
      usage: '[flags] <path>',
      demand: 1,
      desc: 'Link a file to exist under another directory',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        },
      },
      file: './Commands/LinkCommand',
    },
    'ls': {
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
        t: {
          group: 'Flags:',
          alias: 'time',
          demand: false,
          desc: 'Sort nodes by modified time',
          type: 'boolean',
        },
        decrypt: {
          group: 'Flags:',
          demand: false,
          desc: 'Decrypt files when downloading',
          type: 'boolean',
        },
        password: {
          group: 'Flags:',
          alias: 'p',
          demand: false,
          desc: 'Prompt for decryption password',
          type: 'boolean',
        },
        remote: {
          group: 'Flags:',
          demand: false,
          desc: 'Force the command to fetch from the API',
          type: 'boolean',
        },
      },
      file: './Commands/ListCommand',
    },
    'metadata': {
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
        },
      },
      file: './Commands/MetadataCommand',
    },
    'mkdir': {
      offline: false,
      usage: '<path>',
      demand: 1,
      desc: 'Create a remote directory path (recursively)',
      options: {},
      file: './Commands/MkdirCommand',
    },
    'mv': {
      offline: false,
      usage: '[flags] <path> <new_path>',
      demand: 1,
      desc: 'Move a remote node to a new directory',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        },
      },
      file: './Commands/MoveCommand',
    },
    'pending': {
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
        },
      },
      file: './Commands/ListPendingCommand',
    },
    'quota': {
      offline: false,
      usage: '',
      desc: 'Show Cloud Drive account quota',
      options: {},
      file: './Commands/QuotaCommand',
    },
    'rename': {
      offline: false,
      usage: '[flags] <path> <name>',
      demand: 2,
      desc: 'Rename a remote node',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        },
      },
      file: './Commands/RenameCommand',
    },
    'resolve': {
      offline: true,
      usage: '<id>',
      demand: 1,
      desc: 'Return the remote path of a node by its ID',
      options: {},
      file: './Commands/ResolveCommand',
    },
    'restore': {
      offline: false,
      usage: '[flags] <path>',
      demand: 1,
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
    'rm': {
      offline: false,
      usage: '[flags] <path>',
      demand: 1,
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
    'share': {
      offline: false,
      usage: '[flags] <path>',
      demand: 1,
      desc: 'Generate a temporary, pre-authenticated download link',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        },
      },
      file: './Commands/ShareCommand',
    },
    'sync': {
      offline: false,
      usage: '',
      desc: 'Sync the local cache with Amazon Cloud Drive',
      options: {},
      file: './Commands/SyncCommand',
    },
    'trash': {
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
    'tree': {
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
        decrypt: {
          group: 'Flags:',
          demand: false,
          desc: 'Decrypt files when downloading',
          type: 'boolean',
        },
        password: {
          group: 'Flags:',
          alias: 'p',
          demand: false,
          desc: 'Prompt for decryption password',
          type: 'boolean',
        },
        remote: {
          group: 'Flags:',
          demand: false,
          desc: 'Force the command to fetch from the API',
          type: 'boolean',
        },
        'show-ids': {
          group: 'Flags:',
          demand: false,
          desc: 'Include each node\'s ID on output',
          type: 'boolean',
        },
      },
      file: './Commands/TreeCommand',
    },
    'update': {
      offline: false,
      usage: '[flags] <path> [options]',
      demand: 1,
      desc: `Update a node's metadata`,
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean',
        },
        description: {
          group: 'Options:',
          demand: false,
          desc: 'Update the description',
          type: 'string',
        },
        labels: {
          group: 'Options:',
          demand: false,
          desc: 'Update the labels',
          type: 'array',
        },
      },
      file: './Commands/UpdateCommand',
    },
    'unlink': {
      offline: false,
      usage: '[flags] <id> <parent>',
      demand: 2,
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
    'upload': {
      offline: false,
      usage: '[flags] <src...> <dest>',
      demand: 2,
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
        },
        d: {
          group: 'Flags:',
          alias: 'duplicates',
          demand: false,
          desc: 'Allow duplicate uploads',
          type: 'boolean',
        },
        checksum: {
          group: 'Flags:',
          demand: false,
          desc: 'Compare remote MD5 checksum instead of filesize',
          type: 'boolean',
        },
        encrypt: {
          group: 'Flags:',
          demand: false,
          desc: 'Encrypt files before uploading',
          type: 'boolean',
        },
        armor: {
          group: 'Flags:',
          demand: false,
          desc: 'Create ASCII output - default is a binary format',
          type: 'boolean',
        },
        password: {
          group: 'Flags:',
          alias: 'p',
          demand: false,
          desc: 'Prompt for decryption password',
          type: 'boolean',
        },
        'remove-source-files': {
          group: 'Flags:',
          demand: false,
          desc: 'Delete local files upon successful upload',
          type: 'boolean',
        },
        labels: {
          group: 'Options:',
          demand: false,
          desc: 'Update the labels',
          type: 'array',
        },
      },
      file: './Commands/UploadCommand',
    },
    'usage': {
      offline: false,
      usage: '',
      desc: 'Show Cloud Drive account usage',
      options: {},
      file: './Commands/UsageCommand',
    },
    'version': {
      offline: true,
      usage: '',
      desc: false,
      options: {},
      callback: callback => {
        Logger.info(`v${pkgJson.version}`);
        callback(0);
      },
    },
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
    },
  },
},
  appConfig = {
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
    'cli.timestamp': {
      type: 'bool',
      default: false,
    },
    'crypto.algorithm': {
      type: 'choice',
      default: 'aes-256-ctr',
      choices: crypto.getCiphers(),
    },
    'crypto.armor': {
      type: 'bool',
      default: false,
    },
    'crypto.password': {
      type: 'string',
      default: '',
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
    'download.maxConnections': {
      type: 'string',
      default: 1,
    },
    'json.pretty': {
      type: 'bool',
      default: false,
    },
    'log.file': {
      type: 'string',
      default: `${Command.getLogDirectory()}/main.log`,
    },
    'log.level': {
      type: 'choice',
      default: 'info',
      choices: [
        'info',
        'verbose',
        'debug',
        'silly',
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
    'upload.checkMd5': {
      type: 'bool',
      default: false,
    },
    'upload.maxConnections': {
      type: 'string',
      default: 1,
    },
    'upload.numRetries': {
      type: 'string',
      default: 1,
    },
  };

let config = new Config(`${Command.getConfigDirectory()}/config.json`, appConfig);
if (!config.get('cli.colors')) {
  chalk.enabled = false;
}

Logger.getInstance({
  file: config.get('log.file'),
  logLevel: config.get('log.level'),
  verbosity: 'warn',
  cliTimestamp: config.get('cli.timestamp'),
  colorize: config.get('cli.colors'),
});

async.forEachOfSeries(cliConfig.commands, (command, name, callback) => {
  yargs.command(name, command.desc, yargs => {
    return yargs.usage(`${command.desc}\n\n${chalk.magenta('Usage:')}\n  ${name} ${command.usage}`)
      .options(command.options)
      .options(cliConfig.global.options)
      .demand(command.demand || 0)
      .strict()
      .fail(message => {
        yargs.showHelp();
        Logger.error(message);
        Command.shutdown(1);
      });
  }, argv => {
    let cliVerbosity = 'info';
    switch (parseInt(argv.verbose)) {
      case 1:
        cliVerbosity = 'verbose';
        break;
      case 2:
        cliVerbosity = 'debug';
        break;
      case 3:
        cliVerbosity = 'silly';
        break;
      default:
        break;
    }

    if (argv.quiet) {
      cliVerbosity = 'error';
    }

    Logger.setConsoleLevel(cliVerbosity);

    // Load in the command file and run
    if (command.file) {
      let Cmd = require(command.file);
      new Cmd({offline: command.offline}, config).execute(argv._.slice(1), argv);
    } else if (command.callback) {
      // Otherwise,
      command.callback(code => {
        Command.shutdown(code);
      });
    } else {
      Logger.error(`Command '${name}' does not have a valid config action`);
      Command.shutdown(1);
    }
  });

  callback();
}, err => {
  if (err) {
    Logger.error(err);
    Command.shutdown(1);
  }

  let argv = yargs
    .usage(`${chalk.cyan(banner)}
${chalk.cyan('Cloud Drive')} version ${chalk.magenta(pkgJson.version)}

${chalk.magenta('Usage:')}
  clouddrive command [flags] [options] [arguments]`)
    .version(function() {
      return `v${pkgJson.version}`;
    })
    .help('h')
    .alias('h', 'help')
    .alias('V', 'version')
    .updateStrings({
      'Commands:': chalk.magenta('Commands:'),
      'Flags:': chalk.magenta('Flags:'),
      'Options:': chalk.magenta('Options:'),
      'Global Flags:': chalk.magenta('Global Flags:'),
    })
    .options(cliConfig.global.options)
    .epilog(`Copyright ${new Date().getFullYear()}`)
    .strict()
    .fail((message) => {
      yargs.showHelp();
      Logger.error(message);
      Command.shutdown(1);
    })
    .recommendCommands()
    .argv;

  if (!argv._[0]) {
    yargs.showHelp();
  } else {
    if (!cliConfig.commands[argv._[0]]) {
      yargs.showHelp();
      Command.shutdown(1);
    }
  }
});
