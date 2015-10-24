#!/usr/bin/env node
var program = require('commander');
var colors = require('colors');

program.version('0.2.1');

program.command('clearcache')
  .description('Clear the local cache')
  .action(function() {
    require('../lib/Commands/ClearCacheCommand').execute();
  });

program.command('config [key] [value]')
  .description('Read, write, and remove config options')
  .option('-r, --remove', 'Remove / reset the config option to its default value')
  .action(function(key, value, options) {
    require('../lib/Commands/ConfigCommand').execute(key, value, options);
  });

program.command('download <src> [dest]')
  .description('Download remote file or folder to specified local path')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(src, dest, options) {
    require('../lib/Commands/DownloadCommand').execute(src, dest, options);
  });

program.command('du [path]')
  .description('Display the disk usage (recursively) for the specified node')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(path, options) {
    require('../lib/Commands/DiskUsageCommand').execute(path, options);
  });

program.command('find [query]')
  .description('Find nodes that match a name (partials acceptable)')
  .option('-t, --time', 'Sort nodes by time modified')
  .action(function(query, options) {
    require('../lib/Commands/FindCommand').execute(query, options);
  });

program
  .command('init')
  .description('Initialize and authorize with Amazon Cloud Drive')
  .action(function() {
    require('../lib/Commands/InitCommand').execute();
  });

program.command('link [remote_path]')
  .description('Generate a temporary, pre-authenticated download link')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(remotePath, options) {
    require('../lib/Commands/LinkCommand').execute(remotePath, options);
  });

program.command('ls [remote_path]')
  .description('List all remote nodes belonging to a specified node')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .option('-t, --time', 'Sort nodes by time modified')
  .action(function(remotePath, options) {
    require('../lib/Commands/ListCommand').execute(remotePath, options);
  });

program.command('metadata [remotePath]')
  .description('Retrieve metadata of a node by its path')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(remotePath, options) {
    require('../lib/Commands/MetadataCommand').execute(remotePath, options);
  });

program.command('mkdir <remote_path>')
  .description('Create a remote directory path (recursively)')
  .action(function(cmd, options) {
    require('../lib/Commands/MkdirCommand').execute(cmd, options);
  });

program.command('mv <remote_path> [new_path]')
  .description('Move a remote node to a new directory')
  .action(function(remotePath, newPath, options) {
    require('../lib/Commands/MoveCommand').execute(remotePath, newPath, options);
  });

program.command('pending')
  .description('List the nodes that have a status of "PENDING"')
  .option('-t, --time', 'Sort nodes by time modified')
  .action(function(options) {
    require('../lib/Commands/ListPendingCommand').execute(options);
  });

program.command('quota')
  .description('Show Cloud Drive account quota')
  .action(function(options) {
    require('../lib/Commands/QuotaCommand').execute(options);
  });

program.command('rename <path> <name>')
  .description('Rename a remote node')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(path, name, options) {
    require('../lib/Commands/RenameCommand').execute(path, name, options);
  });

program.command('resolve <id>')
  .description('Return the remote path of a node by its ID')
  .action(function(id) {
    require('../lib/Commands/ResolveCommand').execute(id);
  });

program.command('restore <path>')
  .description('Restore a remote node from the trash')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(path, options) {
    require('../lib/Commands/RestoreCommand').execute(path, options);
  });

program.command('rm <path>')
  .description('Move a remote Node to the trash')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(path, options) {
    require('../lib/Commands/TrashCommand').execute(path, options);
  });

program.command('sync')
  .description('Sync the local cache with Amazon Cloud Drive')
  .action(function() {
    require('../lib/Commands/SyncCommand').execute();
  });

program.command('trash')
  .description('List all nodes in the trash')
  .option('-t, --time', 'Sort nodes by time modified')
  .action(function(options) {
    require('../lib/Commands/ListTrashCommand').execute(options);
  });

program.command('tree [remote_path]')
  .description('Print directory tree of the given node')
  .option('-m, --markdown', 'Output tree in Markdown')
  .option('-i, --id', 'Specify the remote node by its ID rather than path')
  .action(function(remotePath, options) {
    require('../lib/Commands/TreeCommand').execute(remotePath, options);
  });

program.command('upload <src> [dest]')
  .description('Upload local file or folder to remote directory')
  .option('-o, --overwrite', 'Overwrite the remote file if it already exists')
  .action(function(src, dest, options) {
    require('../lib/Commands/UploadCommand').execute(src, dest, options);
  });

program.command('usage')
  .description('Show Cloud Drive account usage')
  .action(function(localPath, remotePath, options) {
    require('../lib/Commands/UsageCommand').execute(options);
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
