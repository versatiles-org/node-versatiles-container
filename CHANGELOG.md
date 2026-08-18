# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.1] - 2026-08-18

### Documentation

- expand usage examples with multiple real-world scenarios (#46) ([467a20c](https://github.com/versatiles-org/node-versatiles-container/commit/467a20c7dc617491d9962adebed9f5b17ab56eb7))

### Build System

- **deps:** bump actions/setup-node from 6 to 7 in the action group ([8f77d50](https://github.com/versatiles-org/node-versatiles-container/commit/8f77d50cc74308fd9cc5c5447a5bb349ccfb1bc7))

### Chores

- update funding information to reflect new organization details ([5cd21e1](https://github.com/versatiles-org/node-versatiles-container/commit/5cd21e12cc38731700a1eab98b6246c7e4b7007b))
- update devDependencies to latest versions ([2f44e36](https://github.com/versatiles-org/node-versatiles-container/commit/2f44e364272ea604c5a351d3bdeea305c1b1d19b))
- add security update groups for GitHub Actions and npm in dependabot configuration ([ede3d85](https://github.com/versatiles-org/node-versatiles-container/commit/ede3d85014a7b8f754de21becf9f185bc0a2b79f))
- update devDependencies to latest versions ([523e70e](https://github.com/versatiles-org/node-versatiles-container/commit/523e70efefec40ae63a4dfeb2c281b1b2d1790ed))

## [1.5.0] - 2026-07-08

### Features

- add idle timeout support to getHTTPReader function and enhance tests ([182762a](https://github.com/versatiles-org/node-versatiles-container/commit/182762a89996541ee1976e401a16413ea1754f7c))
- enhance error handling in getHTTPReader function and add corresponding tests ([b5ad8dc](https://github.com/versatiles-org/node-versatiles-container/commit/b5ad8dc4c9a17d8ef16893f7493ed89bc5845fea))
- implement close method for Container and Reader, add tests for functionality ([7f18bc6](https://github.com/versatiles-org/node-versatiles-container/commit/7f18bc67aab339a32e43d58bae5133957d4e8100))
- add validation for tile coordinates in getTile method ([b32e637](https://github.com/versatiles-org/node-versatiles-container/commit/b32e63776b700e9551cf38d1689a3f7e53b4044a))
- add error handling for truncated tile index in getTileIndex method ([5ea83c8](https://github.com/versatiles-org/node-versatiles-container/commit/5ea83c8127de2c34fc60471008e1435e4f075bc7))
- add validation for tile offsets exceeding safe integer range in getTileIndex method ([0b7b05d](https://github.com/versatiles-org/node-versatiles-container/commit/0b7b05da26cdd72c6be048850f653e44f03b1552))
- add clarification on byte offsets storage in Block interface documentation ([6168986](https://github.com/versatiles-org/node-versatiles-container/commit/616898633446dcd2a0aa4b0087e2dda4ab03c1ec))
- remove ts-node dependency from package.json ([61bc7ba](https://github.com/versatiles-org/node-versatiles-container/commit/61bc7ba116b244d2f003149a038948322224bc0b))
- remove deprecated 'c01' format from formats definition in index.ts ([5a7c533](https://github.com/versatiles-org/node-versatiles-container/commit/5a7c5338fe37135dd4d580a22884ccf0b41be9a7))
- expose getTileIndex method in TestContainer and update access modifier in Container ([b0b2bc6](https://github.com/versatiles-org/node-versatiles-container/commit/b0b2bc6c9c0fd0c41bb45765b783fa5e66995d34))
- update package.json to allow scripts for esbuild@0.28.1 ([66b62d6](https://github.com/versatiles-org/node-versatiles-container/commit/66b62d6ae731f7951a556a0809bdee4dc4400695))

### Tests

- add tests for handling non-2xx HTTP responses and invalid magic bytes ([7cd2a90](https://github.com/versatiles-org/node-versatiles-container/commit/7cd2a90b0c7f225247fd8d733ef406f23d596a95))

### Build System

- **deps-dev:** bump the npm group with 8 updates ([a03e507](https://github.com/versatiles-org/node-versatiles-container/commit/a03e50790cdf50399a98fad7f8b0e625ce821ed4))
- **deps:** bump the action group with 2 updates ([1d0c6c3](https://github.com/versatiles-org/node-versatiles-container/commit/1d0c6c343182b54b3839bdf464e671bef3d9b0c5))

### Chores

- update devDependencies to latest versions ([650114f](https://github.com/versatiles-org/node-versatiles-container/commit/650114f5fb3666208f32f83cb0bb4fd97dd0418b))
- update devDependencies to latest versions ([9a2c3ec](https://github.com/versatiles-org/node-versatiles-container/commit/9a2c3ec1cf576e6656b0dd3ebe8af7011215e8cd))

### Styles

- update code formatting ([ce25fdb](https://github.com/versatiles-org/node-versatiles-container/commit/ce25fdb9aa7d49dae2e4e34788b73fd9269c4795))

## [1.4.2] - 2026-05-15

### Bug Fixes

- add rootDir to compilerOptions in tsconfig.build.json ([254d234](https://github.com/versatiles-org/node-versatiles-container/commit/254d2342b50f63494e2592e4b26e55f9aefb042a))

### Build System

- **deps:** bump the action group with 2 updates ([46a5006](https://github.com/versatiles-org/node-versatiles-container/commit/46a5006df207b9c6a62414cf92a246396c0fed45))
- **deps:** bump actions/upload-pages-artifact in the action group ([c56c0d0](https://github.com/versatiles-org/node-versatiles-container/commit/c56c0d0ae8b6a65d764257e3d11f2315ff78abd4))

### Chores

- update devDependencies to latest versions ([f4a8970](https://github.com/versatiles-org/node-versatiles-container/commit/f4a8970d237a65266b7b79cbc899e11fe7152bf0))

## [1.4.1] - 2026-03-01

### Bug Fixes

- update README badges for NPM version, downloads, code coverage, CI status, and license

### Chores

- update devDependencies to latest versions

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

