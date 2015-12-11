#!/usr/bin/env node
'use strict';

var yargs = require('yargs'),
  colors = require('colors'),
  Command = require('../lib/Commands/Command'),
  semver = require('semver'),
  pkgJson = require('../package.json');

try {
  if (semver.lt(process.version.replace('v', ''), '0.10.0')) {
    console.error(`${pkgJson.name.cyan.bold}, CLI version ${pkgJson.version}`);
    Command.error('ERROR: Cloud Drive requires Node.js 0.10 or newer.');
    Command.log(`\nVisit ${'http://nodejs.org/'.cyan} to download a newer version.\n`);
  }
} catch (e) {
}

var config = {
  commands: [
    {
      command: 'cat',
      usage: '[options] <path>',
      description: 'Print files to STDOUT',
      options: {
        i: {
          alias: 'id',
          demand: false,
          describe: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/CatCommand'
    },
    {
      command: 'clearcache',
      usage: '[options]',
      description: 'Clear the local cache',
      options: {},
      file: '../lib/Commands/ClearCacheCommand'
    },
    {
      command: 'config',
      usage: '[options] [key] [value]',
      description: 'Read, write, and reset config values',
      options: {
        r: {
          alias: 'reset',
          demand: false,
          describe: 'Reset the config option to its default value',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/ConfigCommand'
    },
    {
      command: 'du',
      usage: '[options] [path]',
      description: 'Display the disk usage (recursively) for the specified node',
      options: {
        i: {
          alias: 'id',
          demand: false,
          describe: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/DiskUsageCommand'
    },
    {
      command: 'download',
      usage: '[options] <src> [dest]',
      description: 'Download remote file or folder to specified local path',
      options: {
        i: {
          alias: 'id',
          demand: false,
          describe: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/DownloadCommand'
    },
    {
      command: 'find',
      usage: '[options] <query>',
      description: 'Find nodes that contains a given string',
      options: {
        t: {
          alias: 'time',
          demand: false,
          describe: 'Sort nodes by modified time',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/FindCommand'
    },
    {
      command: 'info',
      usage: '[options]',
      description: 'Show Cloud Drive account info',
      options: {},
      file: '../lib/Commands/InfoCommand'
    },
    {
      command: 'init',
      usage: '[options]',
      description: 'Initialize and authorize with Amazon Cloud Drive',
      options: {},
      file: '../lib/Commands/InitCommand'
    },
    {
      command: 'link',
      usage: '[options] <path>',
      description: 'Generate a temporary, pre-authenticated download link',
      options: {
        i: {
          alias: 'id',
          demand: false,
          describe: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/LinkCommand'
    },
    {
      command: 'ls',
      usage: '[options] [path]',
      description: 'List all remote nodes belonging to a specified node',
      options: {
        i: {
          alias: 'id',
          demand: false,
          describe: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        },
        t: {
          alias: 'time',
          demand: false,
          describe: 'Sort nodes by modified time',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/ListCommand'
    },
    {
      command: 'pending',
      usage: '[options]',
      description: 'List the nodes that have a status of "PENDING"',
      options: {
        t: {
          alias: 'time',
          demand: false,
          describe: 'Sort nodes by modified time',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/ListPendingCommand'
    },
    {
      command: 'trash',
      usage: '[options]',
      description: 'List the nodes that have a status of "TRASH"',
      options: {
        t: {
          alias: 'time',
          demand: false,
          describe: 'Sort nodes by modified time',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/ListTrashCommand'
    },
    {
      command: 'metadata',
      usage: '[options] [path]',
      description: 'Retrieve metadata of a node by its path',
      options: {
        i: {
          alias: 'id',
          demand: false,
          describe: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/MetadataCommand'
    },
    {
      command: 'mkdir',
      usage: '[options] <path>',
      description: 'Create a remote directory path (recursively)',
      options: {},
      file: '../lib/Commands/MkdirCommand'
    },
    {
      command: 'mv',
      usage: '[options] <path> [new_path]',
      description: 'Move a remote node to a new directory',
      options: {
        i: {
          alias: 'id',
          demand: false,
          describe: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/MoveCommand'
    },
    {
      command: 'quota',
      usage: '[options]',
      description: 'Show Cloud Drive account quota',
      options: {},
      file: '../lib/Commands/QuotaCommand'
    },
    {
      command: 'rename',
      usage: '[options] <path> <name>',
      description: 'Rename a remote node',
      options: {
        i: {
          alias: 'id',
          demand: false,
          describe: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/RenameCommand'
    },
    {
      command: 'resolve',
      usage: '[options] <id>',
      description: 'Return the remote path of a node by its ID',
      options: {},
      file: '../lib/Commands/ResolveCommand'
    },
    {
      command: 'restore',
      usage: '[options] <path>',
      description: 'Restore a remote node from the trash',
      options: {
        i: {
          alias: 'id',
          demand: false,
          describe: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/RestoreCommand'
    },
    {
      command: 'sync',
      usage: '[options]',
      description: 'Sync the local cache with Amazon Cloud Drive',
      options: {},
      file: '../lib/Commands/SyncCommand'
    },
    {
      command: 'rm',
      usage: '[options] <path>',
      description: 'Move a remote Node to the trash',
      options: {
        i: {
          alias: 'id',
          demand: false,
          describe: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/TrashCommand'
    },
    {
      command: 'tree',
      usage: '[options] [path]',
      description: 'Print directory tree of the given node',
      options: {
        i: {
          alias: 'id',
          demand: false,
          describe: 'Specify the remote node by its ID instead of path',
          type: 'boolean'
        },
        a: {
          alias: 'assets',
          demand: false,
          describe: 'Include ASSET nodes',
          type: 'boolean'
        },
        m: {
          alias: 'markdown',
          demand: false,
          describe: 'Output tree in markdown',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/TreeCommand'
    },
    {
      command: 'upload',
      usage: '[options] <src> [dest]',
      description: 'Upload local file or folder to remote directory',
      options: {
        o: {
          alias: 'overwrite',
          demand: false,
          describe: 'Overwrite the remote file if it already exists',
          type: 'boolean'
        }
      },
      file: '../lib/Commands/UploadCommand'
    },
    {
      command: 'usage',
      usage: '[options]',
      description: 'Show Cloud Drive account usage',
      options: {},
      file: '../lib/Commands/UsageCommand'
    }
  ],
  globalFlags: {
    v: {
      alias: 'verbose',
      demand: false,
      describe: 'Output verbosity: 1 for normal, 2 for more verbose, and 3 for debug',
      type: 'count'
    },
    q: {
      alias: 'quiet',
      demand: false,
      describe: 'Suppress all output',
      type: 'boolean'
    }
  }
};

for (let i = 0; i < config.commands.length; i++) {
  let command = config.commands[i];
  yargs.command(command.command, command.description, (yargs, argv) => {
    argv = yargs.usage(`\nUsage: ${command.command} ${command.usage}`)
      .options(command.options)
      .options(config.globalFlags)
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

    var Cmd = require(command.file);
    new Cmd({offline: false}).execute(argv._.slice(1), argv);
  });
}

var argv = yargs
  .usage(`\nUsage: command [options] [arguments]`)
  .version(function() {
    return `v${pkgJson.version}`;
  })
  .alias('V', 'version')
  .help('h')
  .alias('h', 'help')
  .options(config.globalFlags)
  .epilog(`Copyright ${new Date().getFullYear()}`)
  .strict()
  .argv;

if (!argv._[0]) {
  yargs.showHelp();
}
