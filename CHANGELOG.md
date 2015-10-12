# Changelog

All Notable changes to `clouddrive-node` will be documented in this file

## 0.2.1

### Added
- Added `try/catch` support for `Errors` in command functions
- This app can now be used without needing API credentials! If you attempt to `init` your account without specifying a `client-id` or `client-secret`, the app will request authorization to your account via credentials owned by me (the creator of this repo). NOTE: No personal information is saved.

### Deprecated

### Fixed
- Was not exposing the code as an NPM module properly

## 0.2.0

### Added
- "Initial" release

## 0.1.0

### Added
- Mistake `npm` publish. Can no longer reference this version number, so `0.2.0` is the "initial" release