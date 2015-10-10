# Amazon Cloud Drive CLI and SDK

## Install

```
npm install -g clouddrive
```

## Usage

### Initial Authorization

Before using the CLI, the config values for the application will need to be set. Use the `config` command to view and set the available options.

```
$ clouddrive config
email             =
client-id         =
client-secret     =
json.pretty       = false
upload.duplicates = false
database.driver   = sqlite
database.host     = 127.0.0.1
database.database = clouddrive
database.username = root
database.password =
show.trash        = true
show.pending      = true

$ clouddrive config email me@example.com
email saved
```

You will need to set values for `email` (for the Amazon Cloud Drive account to use), `client-id` and `client-secret` Cloud Drive API credentials. Once these values are set, run the `init` command to being the authorization process.

```
$ clouddrive init
Initializing...
Initial authorization is required
https://www.amazon.com/ap/oa?client_id=...
? url:
```

Naviage to the URL displayed to to authorize the app with your Cloud Drive account. This will redirect your browser to a new URL: paste that URL into the prompt.

### Syncing

Periodically (and after the initial authorization), you will need to run the `sync` command to pull down any Cloud Drive changes to the local cache. This local cache is required for the CLI to work.

```
$ clouddrive sync
```

### Commands

The CLI makes interacting with Cloud Drive feel like using a remote filesystem with commands such as `ls`, `du`, `mkdir`, etc.

```
Usage: clouddrive [options] [command]


Commands:

    clearcache                                     Clear the local cache
    config [options] [option] [value]              Read, write, and remove config options
    download [options] <remote_path> [local_path]  Download remote file or folder to specified local path
    du [options] [remote_path]                     Display the disk usage (recursively) for the specified node
    find [options] [query]                         Find nodes that match a name (partials acceptable)
    init                                           Initialize and authorize with Amazon's Cloud Drive
    link [options] [remote_path]                   Generate a temporary, pre-authenticated download link
    ls [options] [remote_path]                     List all remote nodes belonging to a specified node
    metadata [options] [remotePath]                Retrieve metadata of a node by its path
    mkdir <remote_path>                            Create a remote directory path (recursively)
    mv <remote_path> [new_path]                    Move a remote node to a new directory
    pending [options]                              List the nodes that have a status of 'PENDING'
    quota                                          Show Cloud Drive account quota
    rename [options] <remote_path> <name>          Rename a remote node
    resolve <id>                                   Return a node's remote path by its ID
    restore [options] <remote_path>                Restore a remote node from the trash
    rm [options] <remote_path>                     Move a remote Node to the trash
    sync                                           Sync the local cache with Amazon Cloud Drive
    trash [options]                                List all nodes in the trash
    tree [options] [remote_path]                   Print directory tree of the given node
    upload [options] <local_path> [remote_path]    Upload local file or folder to remote directory
    usage                                          Show Cloud Drive account usage

Options:

    -h, --help     output usage information
    -V, --version  output the version number
```
