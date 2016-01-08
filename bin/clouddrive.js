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
      usage: '[options] <path>',
      desc: 'Print files to STDOUT',
      options: {
        i: {
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/CatCommand'
    },
    clearcache: {
      usage: '[options]',
      desc: 'Clear the local cache',
      options: {},
      file: '../lib/Commands/ClearCacheCommand'
    },
    config: {
      usage: '[options] [key] [value]',
      desc: 'Read, write, and reset config values',
      options: {
        r: {
          alias: 'reset',
          demand: false,
          desc: 'Reset the config option to its default value',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/ConfigCommand'
    },
    du: {
      usage: '[options] [path]',
      desc: 'Display the disk usage (recursively) for the specified node',
      options: {
        i: {
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/DiskUsageCommand'
    },
    download: {
      usage: '[options] <src> [dest]',
      desc: 'Download remote file or folder to specified local path',
      options: {
        i: {
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        },
        d: {
          alias: 'dimensions',
          demand: false,
          desc: 'Maximum width or height (if image)',
          type: 'string'
        }
      },
      file: '../lib/Commands/DownloadCommand'
    },
    find: {
      usage: '[options] <query>',
      desc: 'Find nodes that contains a given string',
      options: {
        t: {
          alias: 'time',
          demand: false,
          desc: 'Sort nodes by modified time',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/FindCommand'
    },
    info: {
      usage: '[options]',
      desc: 'Show Cloud Drive account info',
      options: {},
      file: '../lib/Commands/InfoCommand'
    },
    init: {
      usage: '[options]',
      desc: 'Initialize and authorize with Amazon Cloud Drive',
      options: {},
      file: '../lib/Commands/InitCommand'
    },
    link: {
      usage: '[options] <path>',
      desc: 'Generate a temporary, pre-authenticated download link',
      options: {
        i: {
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/LinkCommand'
    },
    ls: {
      usage: '[options] [path]',
      desc: 'List all remote nodes belonging to a specified node',
      options: {
        i: {
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        },
        t: {
          alias: 'time',
          demand: false,
          desc: 'Sort nodes by modified time',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/ListCommand'
    },
    pending: {
      usage: '[options]',
      desc: 'List the nodes that have a status of "PENDING"',
      options: {
        t: {
          alias: 'time',
          demand: false,
          desc: 'Sort nodes by modified time',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/ListPendingCommand'
    },
    trash: {
      usage: '[options]',
      desc: 'List the nodes that have a status of "TRASH"',
      options: {
        t: {
          alias: 'time',
          demand: false,
          desc: 'Sort nodes by modified time',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/ListTrashCommand'
    },
    metadata: {
      usage: '[options] [path]',
      desc: 'Retrieve metadata of a node by its path',
      options: {
        i: {
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/MetadataCommand'
    },
    mkdir: {
      usage: '[options] <path>',
      desc: 'Create a remote directory path (recursively)',
      options: {},
      file: '../lib/Commands/MkdirCommand'
    },
    mv: {
      usage: '[options] <path> [new_path]',
      desc: 'Move a remote node to a new directory',
      options: {
        i: {
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/MoveCommand'
    },
    quota: {
      usage: '[options]',
      desc: 'Show Cloud Drive account quota',
      options: {},
      file: '../lib/Commands/QuotaCommand'
    },
    rename: {
      usage: '[options] <path> <name>',
      desc: 'Rename a remote node',
      options: {
        i: {
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/RenameCommand'
    },
    resolve: {
      usage: '[options] <id>',
      desc: 'Return the remote path of a node by its ID',
      options: {},
      file: '../lib/Commands/ResolveCommand'
    },
    restore: {
      usage: '[options] <path>',
      desc: 'Restore a remote node from the trash',
      options: {
        i: {
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/RestoreCommand'
    },
    sync: {
      usage: '[options]',
      desc: 'Sync the local cache with Amazon Cloud Drive',
      options: {},
      file: '../lib/Commands/SyncCommand'
    },
    rm: {
      usage: '[options] <path>',
      desc: 'Move a remote Node to the trash',
      options: {
        i: {
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/TrashCommand'
    },
    tree: {
      usage: '[options] [path]',
      desc: 'Print directory tree of the given node',
      options: {
        i: {
          alias: 'id',
          demand: false,
          desc: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        },
        a: {
          alias: 'assets',
          demand: false,
          desc: 'Include ASSET nodes',
          type: 'boolean'
        },
        m: {
          alias: 'markdown',
          demand: false,
          desc: 'Output tree in markdown',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/TreeCommand'
    },
    upload: {
      usage: '[options] <src...> <dest>',
      desc: 'Upload local file or folder to remote directory',
      options: {
        o: {
          alias: 'overwrite',
          demand: false,
          desc: 'Overwrite the remote file if it already exists',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/UploadCommand'
    },
    usage: {
      usage: '[options]',
      desc: 'Show Cloud Drive account usage',
      options: {},
      file: '../lib/Commands/UsageCommand'
    }
  },
  global: {
    options: {
      v: {
        alias: 'verbose',
        demand: false,
        desc: 'Output verbosity: 1 for normal, 2 for more verbose, and 3 for debug',
        type: 'count'
      },
      q: {
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
      argv = yargs.usage(`\nUsage: ${name} ${command.usage}`)
        .options(command.options)
        .options(config.global.options)
        .help('help')
        .alias('h', 'help')
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
      new Cmd({offline: false}).execute(argv._.slice(1), argv);
    });
  }
}

var argv = yargs
  .usage(`${banner}\nUsage: clouddrive command [options] [arguments]`)
  .version(function() {
    return `v${pkgJson.version}`;
  })
  .alias('V', 'version')
  .help('h')
  .alias('h', 'help')
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
