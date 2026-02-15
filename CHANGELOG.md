# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-02-15

### Bug Fixes

- update GitHub Actions workflow to trigger on published releases only
- add missing types entry in tsconfig.json
- change access modifier of getBlockIndex and getTileIndex methods to public

## [1.3.0] - 2026-02-14

### Features

- add Prettier configuration and integrate with ESLint

### Bug Fixes

- update homepage URL in package.json
- update GitHub Actions workflow to use setup-node and refine deployment conditions
- correct typo in comments regarding block index length
- enhance error handling in decompress function to include error message
- move protocol validation to the beginning of getHTTPReader function
- correct typo in error message for requested position validation
- enhance error handling for server response status in getHTTPReader function
- improve request timeout handling in getHTTPReader function
- update error assertion in decompress tests to use toThrow
- update check script to include format check and adjust format command quotes
- add formatting check step in CI workflow

### Build System

- **deps-dev:** bump the npm group with 6 updates
- **deps:** bump actions/checkout from 5 to 6 in the action group
- **deps:** bump actions/cache from 4 to 5 in the action group
- **deps-dev:** bump the npm group with 8 updates
- **deps-dev:** bump the npm group with 7 updates

### Chores

- remove jsr.json configuration file
- update devDependencies to latest versions

### Styles

- format code

