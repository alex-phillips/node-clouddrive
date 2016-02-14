#!/usr/bin/env node
'use strict';

var semver = require('semver'),
  pkgJson = require('../package.json'),
  colors = require('colors'),
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

try {
  if (semver.lt(process.version.replace('v', ''), '4.0.0')) {
    console.log(`${pkgJson.name.green}, CLI version ${pkgJson.version}`);
    console.error('ERROR: Cloud Drive requires Node.js 4.0.0 or newer.'.white.bgRed);
    console.error(`\nVisit ${'http://nodejs.org/'.cyan} to download a newer version.\n`);
    process.exit(1);
  }
} catch (e) {
}

var config = {
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
          type: 'boolean'
        }
      },
      file: './Commands/CatCommand'
    },
    clearcache: {
      offline: true,
      usage: '',
      desc: 'Clear the local cache',
      options: {},
      file: './Commands/ClearCacheCommand'
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
          type: 'boolean'
        }
      },
      file: './Commands/ConfigCommand'
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
          type: 'boolean'
        }
      },
      file: './Commands/DiskUsageCommand'
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
          type: 'boolean'
        },
        d: {
          group: 'Options:',
          alias: 'dimensions',
          demand: false,
          desc: 'Maximum width or height (if image)',
          type: 'string'
        }
      },
      file: './Commands/DownloadCommand'
    },
    exists: {
      offline: true,
      usage: '[flags] <src...> <dest>',
      desc: 'Check if a file or folder exists remotely',
      options: {},
      file: './Commands/ExistsCommand'
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
          type: 'boolean'
        }
      },
      file: './Commands/FindCommand'
    },
    info: {
      offline: false,
      usage: '',
      desc: 'Show Cloud Drive account info',
      options: {},
      file: './Commands/InfoCommand'
    },
    init: {
      offline: false,
      usage: '',
      desc: 'Initialize and authorize with Amazon Cloud Drive',
      options: {},
      file: './Commands/InitCommand'
    },
    link: {
      offline: false,
      usage: '[flags] <path>',
      desc: 'Generate a temporary, pre-authenticated download link',
      options: {
        i: {
          group: 'Flags:',
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: './Commands/LinkCommand'
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
          type: 'boolean'
        },
        t: {
          group: 'Flags:',
          alias: 'time',
          demand: false,
          desc: 'Sort nodes by modified time',
          type: 'boolean'
        }
      },
      file: './Commands/ListCommand'
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
          type: 'boolean'
        }
      },
      file: './Commands/ListPendingCommand'
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
          type: 'boolean'
        }
      },
      file: './Commands/ListTrashCommand'
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
          type: 'boolean'
        }
      },
      file: './Commands/MetadataCommand'
    },
    mkdir: {
      offline: false,
      usage: ' <path>',
      desc: 'Create a remote directory path (recursively)',
      options: {},
      file: './Commands/MkdirCommand'
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
          type: 'boolean'
        }
      },
      file: './Commands/MoveCommand'
    },
    quota: {
      offline: false,
      usage: '',
      desc: 'Show Cloud Drive account quota',
      options: {},
      file: './Commands/QuotaCommand'
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
          type: 'boolean'
        }
      },
      file: './Commands/RenameCommand'
    },
    resolve: {
      offline: true,
      usage: ' <id>',
      desc: 'Return the remote path of a node by its ID',
      options: {},
      file: './Commands/ResolveCommand'
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
          type: 'boolean'
        }
      },
      file: './Commands/RestoreCommand'
    },
    sync: {
      offline: false,
      usage: '',
      desc: 'Sync the local cache with Amazon Cloud Drive',
      options: {},
      file: './Commands/SyncCommand'
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
          type: 'boolean'
        }
      },
      file: './Commands/TrashCommand'
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
          type: 'boolean'
        },
        a: {
          group: 'Flags:',
          alias: 'assets',
          demand: false,
          desc: 'Include ASSET nodes',
          type: 'boolean'
        },
        m: {
          group: 'Flags:',
          alias: 'markdown',
          demand: false,
          desc: 'Output tree in markdown',
          type: 'boolean'
        }
      },
      file: './Commands/TreeCommand'
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
          type: 'boolean'
        },
        f: {
          group: 'Flags:',
          alias: 'force',
          demand: false,
          desc: 'Force a re-upload of the file even if the path and MD5 both match',
          type: 'boolean'
        }
      },
      file: './Commands/UploadCommand'
    },
    usage: {
      offline: false,
      usage: '',
      desc: 'Show Cloud Drive account usage',
      options: {},
      file: './Commands/UsageCommand'
    }
  },
  global: {
    options: {
      v: {
        group: 'Global Flags:',
        alias: 'verbose',
        demand: false,
        desc: 'Output verbosity: 1 for normal (-v), 2 for more verbose (-vv), and 3 for debug (-vvv)',
        type: 'count'
      },
      q: {
        group: 'Global Flags:',
        alias: 'quiet',
        demand: false,
        desc: 'Suppress all output',
        type: 'boolean'
      }
    }
  }
};

var appConfig = new Config(Command.getConfigPath());
if (!appConfig.get('cli.colors')) {
  colors.enabled = false;
}

async.forEachOfSeries(config.commands, (command, name, callback) => {
  yargs.command(name, command.desc, (yargs, argv) => {
    argv = yargs.usage(`\nUsage: ${name} ${command.usage}`)
      .options(command.options)
      .help('help')
      .alias('h', 'help')
      .group('h', 'Global Flags:')
      .options(config.global.options)
      .strict()
      .fail((message) => {
        yargs.showHelp();
        Command.error(message);
        Command.shutdown(1);
      })
      .argv;

    Command.VERBOSE_LEVEL = argv.verbose;
    if (argv.quiet) {
      Command.VERBOSE_LEVEL = -1;
    }

    var Cmd = require(command.file);
    new Cmd({offline: command.offline}, appConfig).execute(argv._.slice(1), argv);
  });

  callback();
}, err => {
  if (err) {
    Command.error(err);
    Command.shutdown(1);
  }

  var argv = yargs
    .usage(`${banner.green}\nUsage: clouddrive command [flags] [options] [arguments]`)
    .version(function() {
      return `v${pkgJson.version}`;
    })
    .alias('V', 'version')
    .group('V', 'Flags:')
    .help('h')
    .alias('h', 'help')
    .group('h', 'Global Flags:')
    .options(config.global.options)
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
    if (!config.commands[argv._[0]]) {
      yargs.showHelp();
      Command.error(`Invalid command: ${argv._[0]}`);
      Command.shutdown(1);
    }
  }
});