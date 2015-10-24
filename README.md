# Amazon Cloud Drive CLI and SDK

Amazon's Cloud Drive offers unlimited cloud storage but no good way to interact with your data (upload, download, find, etc). The web app is lacking and the desktop app is sub-par. So here's a command-line interface and SDK for interacting with Cloud Drive as if it were a filesystem.

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

You will need to set the `email` for the Amazon account you wish to use with the CLI. The first run of the application will require you to run `clouddrive `init` to authorize the CLI with your Amazon account. This will open a browser and take you to amazon for authorization. After authorization, your access token will be printed in the browser. Simply copy and paste this back into the terminal.

Optionally, if you'd like to use your own Amazon Cloud Drive credentials, set the `client-id` and `client-secret` options using the `config` command.

```
$ clouddrive init
Initializing...
Initial authorization is required
https://www.amazon.com/ap/oa?client_id=...
? url:
```

Naviage to the URL displayed to to authorize the app with your Cloud Drive account using your credentials. This will redirect your browser to a new URL: paste that URL back into the prompt.

### Syncing

The first time you run the CLI (after initialization), you will need to (and periodically after the initial sync) run the `sync` command to pull down any Cloud Drive changes to the local cache. This local cache is required for the CLI to work and speeds up reading information when 'browsing' Cloud Drive using the CLI. This also makes many commands available for offline use.

```
$ clouddrive sync
```

### Commands

The CLI makes interacting with Cloud Drive feel like using a remote filesystem with commands such as `ls`, `du`, `mkdir`, etc.

```
Usage: clouddrive [options] [command]


Commands:

    clearcache                       Clear the local cache
    config [options] [key] [value]   Read, write, and remove config options
    download [options] <src> [dest]  Download remote file or folder to specified local path
    du [options] [path]              Display the disk usage (recursively) for the specified node
    find [options] [query]           Find nodes that match a name (partials acceptable)
    init                             Initialize and authorize with Amazon Cloud Drive
    link [options] [remote_path]     Generate a temporary, pre-authenticated download link
    ls [options] [remote_path]       List all remote nodes belonging to a specified node
    metadata [options] [remotePath]  Retrieve metadata of a node by its path
    mkdir <remote_path>              Create a remote directory path (recursively)
    mv <remote_path> [new_path]      Move a remote node to a new directory
    pending [options]                List the nodes that have a status of "PENDING"
    quota                            Show Cloud Drive account quota
    rename [options] <path> <name>   Rename a remote node
    resolve <id>                     Return the remote path of a node by its ID
    restore [options] <path>         Restore a remote node from the trash
    rm [options] <path>              Move a remote Node to the trash
    sync                             Sync the local cache with Amazon Cloud Drive
    trash [options]                  List all nodes in the trash
    tree [options] [remote_path]     Print directory tree of the given node
    upload [options] <src> [dest]    Upload local file or folder to remote directory
    usage                            Show Cloud Drive account usage

Options:

    -h, --help     output usage information
    -V, --version  output the version number
```

### Config

The `config` command is used for reading, writing, and resetting config values for the CLI. The following options are available:
- `email`: The email to use with the CLI
- `client-id`: Custom Amazon API credentials if you would like to use your own
- `client-secret`: Custom Amazon API credentials if you would like to use your own
- `json.pretty`: Any commands that generate JSON-displayed data will be formatted on output (`metadata`, `quota`, `usage`, etc.)
- `upload.duplicates`: Allow multiple files with the same MD5 to exist in Cloud Drive
- `database.driver`: Database type to use for the local cache (`sqlite`, `mysql`, `mongo`)
- `database.host`: Host/IP the database exists on (if not SQLite)
- `database.database`: Database to use (MySQL)
- `database.username`: Database username for authentication
- `database.password`: Database password for authentication
- `show.trash`: Display trashed nodes with the `ls` command
- `show.pending`: Display pending nodes with the `ls` command

