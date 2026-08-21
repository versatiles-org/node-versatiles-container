# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-08-21

This release makes the library strict about containers it cannot read correctly, adds Zstandard support, and drops the obsolete v01 format. It requires Node.js 22.15 or newer.

The headline fix is that a container the library could not actually decode used to be reported as readable, with its tile data handed back mislabelled. That now fails loudly. If `getHeader()` starts throwing on a file that "worked" in 1.x, the 1.x behaviour was returning corrupt data.

### Breaking changes

#### Node.js 22.15 or newer is required

Previously `>= 18`. Zstandard decompression uses the `node:zlib` zstd bindings, added in Node 22.15. Node 18 and 20 are both past end-of-life.

#### Containers with unknown header values are rejected (#50)

`tile_format` and `precompression` values the library did not recognise fell back to `bin` and `raw`. Reading a zstd container this way reported `tileCompression: 'raw'`, and `getTileUncompressed()` returned the **still-compressed** zstd frame — with no error raised anywhere. The failure surfaced far from its cause, usually as a protobuf parse error.

Both now throw:

```
Unsupported tile_format value 5 in v02 container header
Unsupported precompression value 7 in v02 container header
```

This is what the container spec requires: a reader must reject a reserved value, not substitute a default.

#### `versatiles_v01` containers can no longer be read

The v01 format is obsolete. Opening one throws:

```
versatiles_v01 containers are no longer supported. Convert it to v02 with: versatiles convert <input> <output>
```

`Header.version` is therefore always `'v02'`.

#### `Compression` gained a `'zstd'` member

```ts
export type Compression = 'br' | 'gzip' | 'raw' | 'zstd';
```

Exhaustive `switch` statements over this type need a `zstd` branch.

#### `decompress()` rejects unknown compression instead of passing data through

It previously resolved with the input buffer unchanged for anything it did not recognise, which is how mislabelled data reached callers unnoticed. It now rejects.

#### Deep imports are blocked

The package declares an `exports` map. `@versatiles/container` and `@versatiles/container/package.json` resolve; anything else — for example `@versatiles/container/dist/lib/decompress.js` — fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`.

#### The unused `Decompressor` type was removed

It was exported from the internal interfaces module, but never used and never re-exported from the package entry point.

#### HTTP connections are pooled per container, not per process

Each reader now owns its keep-alive agent, so `close()` can release exactly the sockets that reader opened. A process creating many short-lived containers against the same host no longer shares connections between them.

### Added

#### Zstandard containers (#51)

`precompression = 3` containers — written by versatiles-rs since v3.2.0 via `versatiles convert -c zstd` — are now read and decompressed.

#### `timeout` option

```ts
new Container("https://example.org/planet.versatiles", { timeout: 30000 });
```

Idle timeout in milliseconds for HTTP(S) sources, applied while waiting for response headers and between body chunks, so a slow but progressing download is not aborted. Defaults to 10000. The HTTP reader always supported this; there was previously no way to set it through `Container`.

#### `close()` now releases HTTP connections

`Container.close()` previously only closed file descriptors and was a no-op for HTTP sources, despite documenting otherwise. It now destroys the reader's connection agent as well.

#### `OpenOptions.tms` is optional

`new Container(url, { timeout: 5000 })` type-checks. `tms` was previously a required property, so any options object had to include it.

### Fixed

- The README license badge showed MIT; the project is Unlicense.
- `getMetadata()` was documented as returning `null` and "an object". It returns a `string`, or `undefined` when the container holds no metadata.
- The file reader was documented as returning empty or short buffers past end-of-file. It throws a `RangeError`.
- The HTTP user-agent advertised an unrelated npm package.

### Internal

- Type-aware ESLint rules and `noUncheckedIndexedAccess` enabled; `target`/`lib` aligned to the Node baseline.
- CI runs on Node 22 and 24 instead of Node 20 alone.
- Test coverage raised to 96.8% of statements and 99.0% of lines, including the HTTP reader's error paths.
- Removed the dead `bin/probe.js` helper.

### Migration

1. Upgrade to Node.js 22.15 or newer.
2. Convert any v01 containers: `versatiles convert old.versatiles new.versatiles`.
3. Add a `zstd` branch to any exhaustive `switch` over `Compression`.
4. Replace deep imports into `dist/` with imports from the package entry point.
5. Expect `getHeader()` to throw for containers 1.x accepted silently — see the first breaking change above.

---

[Full commit list](https://github.com/versatiles-org/node-versatiles-container/compare/v1.5.1...v2.0.0)

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

