#!/usr/bin/env node

'use strict';

var program = require('commander');
var Command = require('../lib/Commands/Command');

program.version('0.2.2');

program.command('cat <path>')
  .description('Output contents of remote file to STDOUT')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(path, options) {
    let CatCommand = require('../lib/Commands/CatCommand');
    new CatCommand({offline: false}).execute(path, options);
  });

program.command('clearcache')
  .description('Clear the local cache')
  .action(function() {
    let ClearCacheCommand = require('../lib/Commands/ClearCacheCommand');
    new ClearCacheCommand({offline: true}).execute();
  });

program.command('config [key] [value]')
  .description('Read, write, and remove config options')
  .option('-r, --remove', 'Remove / reset the config option to its default value')
  .action(function(key, value, options) {
    let ConfigCommand = require('../lib/Commands/ConfigCommand');
    new ConfigCommand({offline: true}).execute(key, value, options);
  });

program.command('download <src> [dest]')
  .description('Download remote file or folder to specified local path')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(src, dest, options) {
    let DownloadCommand = require('../lib/Commands/DownloadCommand');
    new DownloadCommand({offline: false}).execute(src, dest, options);
  });

program.command('du [path]')
  .description('Display the disk usage (recursively) for the specified node')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(path, options) {
    let DiskUsageCommand = require('../lib/Commands/DiskUsageCommand');
    new DiskUsageCommand({offline: true}).execute(path, options);
  });

program.command('find [query]')
  .description('Find nodes that match a name (partials acceptable)')
  .option('-t, --time', 'Sort nodes by time modified')
  .action(function(query, options) {
    let FindCommand = require('../lib/Commands/FindCommand');
    new FindCommand({offline: true}).execute(query, options);
  });

program.command('info')
  .description('Show Cloud Drive account info')
  .action(function(options) {
    let InfoCommand = require('../lib/Commands/InfoCommand');
    new InfoCommand({offline: false}).execute(options);
  });

program.command('init')
  .description('Initialize and authorize with Amazon Cloud Drive')
  .action(function() {
    let InitCommand = require('../lib/Commands/InitCommand');
    new InitCommand({offline: false}).execute();
  });

program.command('link [path]')
  .description('Generate a temporary, pre-authenticated download link')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(path, options) {
    let LinkCommand = require('../lib/Commands/LinkCommand');
    new LinkCommand({offline: false}).execute(path, options);
  });

program.command('ls [path]')
  .description('List all remote nodes belonging to a specified node')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .option('-t, --time', 'Sort nodes by time modified')
  .action(function(path, options) {
    let ListCommand = require('../lib/Commands/ListCommand');
    new ListCommand({offline: true}).execute(path, options);
  });

program.command('metadata [path]')
  .description('Retrieve metadata of a node by its path')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(path, options) {
    let MetadataCommand = require('../lib/Commands/MetadataCommand');
    new MetadataCommand({offline: true}).execute(path, options);
  });

program.command('mkdir <path>')
  .description('Create a remote directory path (recursively)')
  .action(function(path, options) {
    let MkdirCommand = require('../lib/Commands/MkdirCommand');
    new MkdirCommand({offline: false}).execute(path, options);
  });

program.command('mv <path> [new_path]')
  .description('Move a remote node to a new directory')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(path, newPath, options) {
    let MoveCommand = require('../lib/Commands/MoveCommand');
    new MoveCommand({offline: false}).execute(path, newPath, options);
  });

program.command('pending')
  .description('List the nodes that have a status of "PENDING"')
  .option('-t, --time', 'Sort nodes by time modified')
  .action(function(options) {
    let ListPendingCommand = require('../lib/Commands/ListPendingCommand');
    new ListPendingCommand({offline: true}).execute(options);
  });

program.command('quota')
  .description('Show Cloud Drive account quota')
  .action(function(options) {
    let QuotaCommand = require('../lib/Commands/QuotaCommand');
    new QuotaCommand({offline: false}).execute(options);
  });

program.command('rename <path> <name>')
  .description('Rename a remote node')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(path, name, options) {
    let RenameCommand = require('../lib/Commands/RenameCommand');
    new RenameCommand({offline: false}).execute(path, name, options);
  });

program.command('resolve <id>')
  .description('Return the remote path of a node by its ID')
  .action(function(id) {
    let ResolveCommand = require('../lib/Commands/ResolveCommand');
    new ResolveCommand({offline: true}).execute(id);
  });

program.command('restore <path>')
  .description('Restore a remote node from the trash')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(path, options) {
    let RestoreCommand = require('../lib/Commands/RestoreCommand');
    new RestoreCommand({offline: false}).execute(path, options);
  });

program.command('rm <path>')
  .description('Move a remote Node to the trash')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(path, options) {
    let TrashCommand = require('../lib/Commands/TrashCommand');
    new TrashCommand({offline: false}).execute(path, options);
  });

program.command('sync')
  .description('Sync the local cache with Amazon Cloud Drive')
  .action(function() {
    let SyncCommand = require('../lib/Commands/SyncCommand');
    new SyncCommand({offline: false}).execute();
  });

program.command('trash')
  .description('List all nodes in the trash')
  .option('-t, --time', 'Sort nodes by time modified')
  .action(function(options) {
    let ListTrashCommand = require('../lib/Commands/ListTrashCommand');
    new ListTrashCommand({offline: true}).execute(options);
  });

program.command('tree [path]')
  .description('Print directory tree of the given node')
  .option('-m, --markdown', 'Output tree in Markdown')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .option('-a, --assets', 'Include ASSET nodes')
  .action(function(path, options) {
    let TreeCommand = require('../lib/Commands/TreeCommand');
    new TreeCommand({offline: true}).execute(path, options);
  });

program.command('upload <src> [dest]')
  .description('Upload local file or folder to remote directory')
  .option('-o, --overwrite', 'Overwrite the remote file if it already exists')
  .action(function(src, dest, options) {
    let UploadCommand = require('../lib/Commands/UploadCommand');
    new UploadCommand({offline: false}).execute(src, dest, options);
  });

program.command('usage')
  .description('Show Cloud Drive account usage')
  .action(function(options) {
    let UsageCommand = require('../lib/Commands/UsageCommand');
    new UsageCommand({offline: false}).execute(options);
  });

program.command('*')
  .action(function(cmd) {
    Command.error(`Invalid command '${cmd}'`);
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
