#!/usr/bin/env node
'use strict';

var yargs = require('yargs'),
  colors = require('colors'),
  Command = require('../lib/Commands/Command'),
  semver = require('semver'),
  pkgJson = require('../package.json'),
  banner = `_________ .__                   .___ ________        .__
\\_   ___ \\|  |   ____  __ __  __| _/ \\______ \\_______|__|__  __ ____
/    \\  \\/|  |  /  _ \\|  |  \\/ __ |   |    |  \\_  __ \\  \\  \\/ // __ \\
\\     \\___|  |_(  <_> )  |  / /_/ |   |    \`   \\  | \\/  |\\   /\\  ___/
 \\______  /____/\\____/|____/\\____ |  /_______  /__|  |__| \\_/  \\___  >
        \\/                       \\/          \\/                    \\/
`.green;

try {
  if (semver.lt(process.version.replace('v', ''), '4.0.0')) {
    console.error(`${pkgJson.name.cyan.bold}, CLI version ${pkgJson.version}`);
    Command.error('ERROR: Cloud Drive requires Node.js 4.0.0 or newer.');
    Command.log(`\nVisit ${'http://nodejs.org/'.cyan} to download a newer version.\n`);
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
      file: '../lib/Commands/CatCommand'
    },
    clearcache: {
      offline: true,
      usage: '',
      desc: 'Clear the local cache',
      options: {},
      file: '../lib/Commands/ClearCacheCommand'
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
      file: '../lib/Commands/ConfigCommand'
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
      file: '../lib/Commands/DiskUsageCommand'
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
      file: '../lib/Commands/DownloadCommand'
    },
    find: {
      offline: true,
      usage: '[flags] <query>',
      desc: 'Find nodes that contains a given string',
      options: {
        t: {
          group: 'Flags:',
          alias: 'time',
          demand: false,
          desc: 'Sort nodes by modified time',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/FindCommand'
    },
    info: {
      offline: false,
      usage: '',
      desc: 'Show Cloud Drive account info',
      options: {},
      file: '../lib/Commands/InfoCommand'
    },
    init: {
      offline: false,
      usage: '',
      desc: 'Initialize and authorize with Amazon Cloud Drive',
      options: {},
      file: '../lib/Commands/InitCommand'
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
      file: '../lib/Commands/LinkCommand'
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
      file: '../lib/Commands/ListCommand'
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
      file: '../lib/Commands/ListPendingCommand'
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
      file: '../lib/Commands/ListTrashCommand'
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
      file: '../lib/Commands/MetadataCommand'
    },
    mkdir: {
      offline: false,
      usage: ' <path>',
      desc: 'Create a remote directory path (recursively)',
      options: {},
      file: '../lib/Commands/MkdirCommand'
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
      file: '../lib/Commands/MoveCommand'
    },
    quota: {
      offline: false,
      usage: '',
      desc: 'Show Cloud Drive account quota',
      options: {},
      file: '../lib/Commands/QuotaCommand'
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
      file: '../lib/Commands/RenameCommand'
    },
    resolve: {
      offline: true,
      usage: ' <id>',
      desc: 'Return the remote path of a node by its ID',
      options: {},
      file: '../lib/Commands/ResolveCommand'
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
      file: '../lib/Commands/RestoreCommand'
    },
    sync: {
      offline: false,
      usage: '',
      desc: 'Sync the local cache with Amazon Cloud Drive',
      options: {},
      file: '../lib/Commands/SyncCommand'
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
      file: '../lib/Commands/TrashCommand'
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
      file: '../lib/Commands/TreeCommand'
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
        }
      },
      file: '../lib/Commands/UploadCommand'
    },
    usage: {
      offline: false,
      usage: '',
      desc: 'Show Cloud Drive account usage',
      options: {},
      file: '../lib/Commands/UsageCommand'
    }
  },
  global: {
    options: {
      v: {
        group: 'Global Flags:',
        alias: 'verbose',
        demand: false,
        desc: 'Output verbosity: 1 for normal, 2 for more verbose, and 3 for debug',
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

for (let name in config.commands) {
  if (config.commands.hasOwnProperty(name)) {
    let command = config.commands[name];
    yargs.command(name, command.desc, (yargs, argv) => {
      // Fix to remove groups added by global app (below)
      // until `yargs` fixes issue of not deleting groups on reset
      var groups = yargs.getGroups();
      Object.keys(groups).forEach(group => delete groups[group]);

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
          process.exit(1);
        })
        .argv;

      Command.VERBOSE_LEVEL = argv.verbose;
      if (argv.quiet) {
        Command.VERBOSE_LEVEL = -1;
      }

      let Cmd = require(command.file);
      new Cmd({offline: command.offline}).execute(argv._.slice(1), argv);
    });
  }
}

var argv = yargs
  .usage(`${banner}\nUsage: clouddrive command [flags] [options] [arguments]`)
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
  .argv;

if (!argv._[0]) {
  yargs.showHelp();
} else {
  if (!config.commands[argv._[0]]) {
    yargs.showHelp();
    Command.error(`Invalid command: ${argv._[0]}`);
    process.exit(1);
  }
}
