# Changelog

All Notable changes to `clouddrive-node` will be documented in this file

## 0.2.2

### fixed
- Incorrect prototypal inheritance with some objects

## 0.2.1

### Added
- This app can now be used without needing API credentials! If you attempt to `init` your account without specifying a `client-id` or `client-secret`, the app will request authorization to your account via credentials owned by me (the creator of this repo). NOTE: No personal information is saved.
- Added various options to pass into `download` function. This provides ability to do things like output progress bars, run code before download, and run code on completion. The CLI now utilizes this for displaying progress bars for each file downloaded/uploaded.

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