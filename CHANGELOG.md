# Changelog

All Notable changes to `clouddrive-node` will be documented in this file

## 0.3.1

### Added
- Updated `yargs` package to version 4

### Fixed
- Now properly building `dist` code for `npm` distribution and including it (added `.npmignore`) when publishing

## 0.3.0

### Added
- `cat` command outputs contents of remote file to STDOUT
- Added "searching" spinner when running `find` command
- Refactored the entire codebase to use several ES6 features including classes, template strings, arrow function notations, etc
- Failed uploads due to expired tokens now retry `x` number of times (set in the config)
- Converted base CLI framework from `commander` to `yargs`.
- `sync` function now accepts parameters (i.e., `chunkSize`, `maxNodes`)
- Incomplete downloads now have file prefix (`.__incomplete`)
- Can now specify dimensions when downloading images
- More color information on listings output (red = in trash, yellow = pending)
- Added `config` option to toggle ANSI colors
- Added `config` option to toggle display of progress bars
- `Config` is now it's own object and separated from the `Command` class
- Added a `force` flag on file upload to overwrite remote node's contents even if the MD5 matches the local file
- Added `config` option to bypass MD5 check when downloading files

### Fixed
- `download` command no longer outputs multiple "failure" messages when it fails to download remote file
- Fixed authorization renewal issue where we weren't properly checking of the API key OR secret were both invalid
- Fixed exception when attempting to upload to `root` without any notation (empty path).
- Fixed bug where we were not properly reading boolean values from the saved config.
- All `async` operations now properly pass up their errors
- A file `Node` will automatically be overwritten on upload if its status is `PENDING`
- Node version check is now the first thing and with as few dependencies as possible

## 0.2.2

### Added
- `downloadFile` options now accepts an optional stream to write to
- `info` command retrieves and displays account information from Amazon
- Added a "catch all" for invalid commands instead of `clouddrive` not outputting anything
- Now using ES6 template strings

### Fixed
- Incorrect prototypal inheritance with some objects
- `authorize` call on `Account` ALWAYS checks to make sure we have a `metadataUrl` and `contentUrl`, not just on initial authorization
- Fixed output size of year string (and padding) for nodes not created in the current year
- `init` now outputs the URL for initial authentication for systems without a UI
- Added `repository` field in `package.json`
- Removed `promise` npm package dependency (using native promises)

## 0.2.1

### Added
- This app can now be used without needing API credentials! If you attempt to `init` your account without specifying a `client-id` or `client-secret`, the app will request authorization to your account via credentials owned by me (the creator of this repo). NOTE: No personal information is saved
- Added various options to pass into `download` function. This provides ability to do things like output progress bars, run code before download, and run code on completion. The CLI now utilizes this for displaying progress bars for each file downloaded/uploaded

### Deprecated

### Fixed
- Was not exposing the code as an NPM module properly
- Added `try/catch` support for `Errors` in command functions
- `pretty.json` config value actually controls JSON output formatting now

## 0.2.0

### Added
- "Initial" release

## 0.1.0

### Added
- Mistake `npm` publish. Can no longer reference this version number, so `0.2.0` is the "initial" release
