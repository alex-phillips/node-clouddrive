#!/usr/bin/env node
var program = require('commander');
var colors = require('colors');

program.version("0.1.0");

program
    .command('init')
    .description("Initialize and authorize with Amazon's Cloud Drive")
    .action(function() {
        require('../lib/Commands/InitCommand').execute();
    });

program.command('sync')
    .description("Sync the local cache with Amazon Cloud Drive")
    .action(function () {
        require('../lib/Commands/SyncCommand').execute();
    });

program.command('clearcache')
    .description('Clear the local cache')
    .action(function () {
        require('../lib/Commands/ClearCacheCommand').execute();
    });

program.command('metadata [remotePath]')
    .description("Retrieve metadata of a node by its path")
    .option('-i, --id', 'Specify the remote node by its ID rather than path')
    .action(function (remotePath, options) {
        require('../lib/Commands/MetadataCommand').execute(remotePath, options);
    });

program.command('config [option] [value]')
    .description('Read, write, and remove config options')
    .option('-r', '--remove', 'Remove / reset the config option to its default value')
    .action(function (option, value, options) {
        require('../lib/Commands/ConfigCommand').execute(option, value, options);
    });

program.command('ls [remote_path]')
    .description('List all remote nodes belonging to a specified node')
    .option('-i, --id', 'Specify the remote node by its ID rather than path')
    .option('-t, --time', 'Sort nodes by time modified')
    .action(function (remotePath, options) {
        require('../lib/Commands/ListCommand').execute(remotePath, options);
    });

program.command('trash')
    .description('List all nodes in the trash')
    .option('-t, --time', 'Sort nodes by time modified')
    .action(function (options) {
        require('../lib/Commands/ListTrashCommand').execute(options);
    });

program.command('rm <remote_path>')
    .description('Move a remote Node to the trash')
    .option('-i, --id', 'Specify the remote node by its ID rather than path')
    .action(function (remotePath, options) {
        require('../lib/Commands/TrashCommand').execute(remotePath, options);
    });

program.command('restore <remote_path>')
    .description('Restore a remote node from the trash')
    .option('-i, --id', 'Specify the remote node by its ID rather than path')
    .action(function (remotePath, options) {
        require('../lib/Commands/RestoreCommand').execute(remotePath, options);
    });

program.command('du [remote_path]')
    .description('Display the disk usage (recursively) for the specified node')
    .option ('-i, --id', 'Specify the remote node by its ID rather than path')
    .action(function (remotePath, options) {
        require('../lib/Commands/DiskUsageCommand').execute(remotePath, options);
    });

program.command('tree [remote_path]')
    .description('Print directory tree of the given node')
    .option('-m, --markdown', 'Output tree in Markdown')
    .option ('-i, --id', 'Specify the remote node by its ID rather than path')
    .action(function (remotePath, options) {
        require('../lib/Commands/TreeCommand').execute(remotePath, options);
    });

program.command('resolve <id>')
    .description("Return a node's remote path by its ID")
    .action(function (id) {
        require('../lib/Commands/ResolveCommand').execute(id);
    });

program.command('rename <remote_path> <name>')
    .description("Rename a remote node")
    .option ('-i, --id', 'Specify the remote node by its ID rather than path')
    .action(function (remotePath, name, options) {
        require('../lib/Commands/RenameCommand').execute(remotePath, name, options);
    });

program.command('mkdir <remote_path>')
    .description("Create a remote directory path (recursively)")
    .action(function (cmd, options) {
        require('../lib/Commands/MkdirCommand').execute(cmd, options);
    });

program.command('mv <remote_path> [new_path]>')
    .description("Move a remote node to a new directory")
    .action(function (remotePath, newPath, options) {
        require('../lib/Commands/MoveCommand').execute(remotePath, newPath, options);
    });

program.command('pending')
    .description("List the nodes that have a status of 'PENDING'")
    .option('-t, --time', 'Sort nodes by time modified')
    .action(function (options) {
        require('../lib/Commands/ListPendingCommand').execute(options);
    });

program.command('link [remote_path]')
    .description("Generate a temporary, pre-authenticated download link")
    .option ('-i, --id', 'Specify the remote node by its ID rather than path')
    .action(function (remotePath, options) {
        require('../lib/Commands/LinkCommand').execute(remotePath, options);
    });

program.command('find [query]')
    .description("Find nodes that match a name (partials acceptable)")
    .option('-t, --time', 'Sort nodes by time modified')
    .action(function (query, options) {
        require('../lib/Commands/FindCommand').execute(query, options);
    });

program.command('download <remote_path> [local_path]')
    .description("Download remote file or folder to specified local path")
    .option ('-i, --id', 'Specify the remote node by its ID rather than path')
    .action(function (remotePath, localPath, options) {
        require('../lib/Commands/DownloadCommand').execute(remotePath, localPath, options);
    });

program.command('upload <local_path> [remote_path]')
    .description("Upload local file or folder to remote directory")
    .option ('-o, --overwrite', 'Overwrite the remote file if it already exists')
    .action(function (localPath, remotePath, options) {
        require('../lib/Commands/UploadCommand').execute(localPath, remotePath, options);
    });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
