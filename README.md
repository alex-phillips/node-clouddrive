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
auth.email           =
auth.id              =
auth.secret          =
cli.colors           = true
cli.ignoreFiles      = ^(\.DS_Store|[Tt]humbs.db)$
cli.progressBars     = true
cli.progressInterval = 1000
database.driver      = sqlite
database.host        = 127.0.0.1
database.database    = clouddrive
database.username    = root
database.password    =
display.date         = modified
display.showPending  = true
display.showTrash    = true
download.checkMd5    = true
json.pretty          = false
log.level            = 0
sync.chunkSize       =
sync.maxNodes        =
upload.duplicates    = false
upload.numRetries    = 1

$ clouddrive config auth.email me@example.com
email saved
```

You will need to set the `email` for the Amazon account you wish to use with the CLI. The first run of the application will require you to run `clouddrive init` to authorize the CLI with your Amazon account. This will open a browser and take you to Amazon for authorization. After authorization, your access token will be printed in the browser. Simply copy and paste this back into the terminal.

Optionally, if you'd like to use your own Amazon Cloud Drive credentials, set the `auth.client-id` and `auth.client-secret` options using the `config` command.

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
Usage: clouddrive command [flags] [options] [arguments]

Commands:
  cat         Print files to STDOUT
  clearcache  Clear the local cache
  config      Read, write, and reset config values
  download    Download remote file or folder to specified local path
  du          Display the disk usage (recursively) for the specified node
  exists      Check if a file or folder exists remotely
  find        Search for nodes by name
  info        Show Cloud Drive account info
  init        Initialize and authorize with Amazon Cloud Drive
  link        Link a file to exist under another directory
  ls          List all remote nodes belonging to a specified node
  metadata    Retrieve metadata of a node by its path
  mkdir       Create a remote directory path (recursively)
  mv          Move a remote node to a new directory
  pending     List the nodes that have a status of "PENDING"
  quota       Show Cloud Drive account quota
  rename      Rename a remote node
  resolve     Return the remote path of a node by its ID
  restore     Restore a remote node from the trash
  rm          Move a remote Node to the trash
  share       Generate a temporary, pre-authenticated download link
  sync        Sync the local cache with Amazon Cloud Drive
  trash       List the nodes that have a status of "TRASH"
  tree        Print directory tree of the given node
  unlink      Unlink a node from a parent node
  upload      Upload local file(s) or folder(s) to remote directory
  usage       Show Cloud Drive account usage

Global Flags:
  -h, --help     Show help                                             [boolean]
  -v, --verbose  Output verbosity: 1 for normal (-v), 2 for more verbose (-vv),
                 and 3 for debug (-vvv)                                  [count]
  -q, --quiet    Suppress all output                                   [boolean]
  -V, --version  Show version number                                   [boolean]
```

### Config

The `config` command is used for reading, writing, and resetting config values for the CLI. The following options are available:
- `auth.email`: The email to use with the CLI
- `auth.id`: Custom Amazon API credentials if you would like to use your own
- `auth.secret`: Custom Amazon API credentials if you would like to use your own
- `cli.colors`: ANSI color output
- `cli.progressBars`: Display or suppress progress bars
- `database.driver`: Database type to use for the local cache (`sqlite`, `mysql`, or `mongo`)
- `database.host`: Host/IP the database exists on (if not SQLite)
- `database.database`: Database to use (MySQL)
- `database.username`: Database username for authentication
- `database.password`: Database password for authentication
- `display.date`: Display either `modified` or `created` date when listing nodes
- `display.showPending`: Toggle displaying of `PENDING` nodes with `ls` command
- `display.showTrash`: Toggle display of `TRASH` nodes with the `ls` command
- `download.checkMd5`: Perform or suppress MD5 check when downloading files
- `json.pretty`: Whether to format JSON output or not
- `upload.duplicates`: Allow duplicate files to be uploaded to Cloud Drive
- `upload.retryAttempt`: Number of attempts to upload a file
