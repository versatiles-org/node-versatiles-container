A client library for [VersaTiles containers](https://github.com/versatiles-org/versatiles-spec).

# Table of Content

* [Install](#install)
* [Usage Example](#usage-example)
* [API](#api)
  * [Class: VersaTiles](#class_versatiles)
    * [constructor: new VersaTiles(source, options)](#constructor-new-versatilessource-options)
    * [async getHeader()](#async-getheader)
    * [async getMetadata()](#async-getmetadata)
    * [async getBlockIndex()](#async-getblockindex)
    * [async getTileIndex(block)](#async-gettileindexblock)
    * [async getTile(z, x, y)](#async-gettilez-x-y)
    * [async getTileUncompressed(z, x, y)](#async-gettileuncompressedz-x-y)
  * [Interface: Block](#interface_block)
  * [Interface: Header](#interface_header)
  * [Interface: Options](#interface_options)
  * [Interface: TileIndex](#interface_tileindex)
  * [Type: Compression](#type_compression)
  * [Type: Format](#type_format)
  * [Type: Reader](#type_reader)
* [API-old](#api-old)
  * [new VersaTiles(src, { tms: true })](#new-versatilessrc-tms-true)
  * [async .getTile(z, x, y)](#async-gettilez-x-y)
  * [async .getTileUncompressed(z, x, y)](#async-gettileuncompressedz-x-y)
  * [async .decompress(buffer, type)](#async-decompressbuffer-type)
  * [async .getHeader()](#async-getheader)
  * [async .getMeta()](#async-getmeta)
* [License](#license)
* [Future work](#future-work)

# Install

`npm i versatiles`

# Usage Example

```js
import VersaTiles from 'versatiles';
import fs from 'fs';

const container = new VersaTiles('https://example.org/planet.versatiles');
const header = await container.getHeader();
const tile = await container.getTileUncompressed(z,x,y);
fs.writeFileSync('tile.' + header.tile_format, tile);
```

# API

## Class: `VersaTiles`<a id="class_versatiles"></a>

VersaTiles class is a wrapper around a `*.versatiles` container that allows to access all tiles, metadata and other properties. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/b579549/versatiles/src/index.ts#L26">\[src]</a></sup>

### constructor: `new VersaTiles(source, options)`

Creates a new VersaTiles instance. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/b579549/versatiles/src/index.ts#L42">\[src]</a></sup>

**Parameters:**

* `source: string | `[`Reader`](#type_reader)\
  The data source, usually a `*.versatiles` container. Can be either a local filename, an URL, or a [Reader](#type_Reader) function.
* `options: `[`Options`](#interface_options) (optional)\
  Additional options.

**Returns:** [`VersaTiles`](#class_versatiles)
**Methods**

### `async getHeader()`

Gets the header information of this container.\
This is used internally. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/b579549/versatiles/src/index.ts#L73">\[src]</a></sup>

**Returns:** [`Header`](#interface_header)

### `async getMetadata()`

Gets the metadata describing the tiles.\
For vector tiles metadata is usually a Buffer containing a JSON, describing `vector_layers`.
If there is no metadata in the container, this function returns `null`. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/b579549/versatiles/src/index.ts#L133">\[src]</a></sup>

**Returns:** `null | Buffer`

### `async getBlockIndex()`

Gets the block index.\
This is used internally to keep a lookup of every tile block in the container.
The keys of this `map` have the form "{z},{x},{y}". <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/b579549/versatiles/src/index.ts#L159">\[src]</a></sup>

**Returns:** `Map<string,`[`Block`](#interface_block)`>`

### `async getTileIndex(block)`

Gets the tile index for given block.\
This is used internally to keep a lookup of every tile in the block. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/b579549/versatiles/src/index.ts#L237">\[src]</a></sup>

**Parameters:**

* `block: `[`Block`](#interface_block)\
  The block to get the tile index for.

**Returns:** [`TileIndex`](#interface_tileindex)

### `async getTile(z, x, y)`

Returns a tile as Buffer.\
If the container header has defined a tile\_compression, the returned Buffer contains compressed tile data. Use the method `getTileUncompressed` to get uncompressed tile data.
If the tile cannot be found, `null` is returned. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/b579549/versatiles/src/index.ts#L266">\[src]</a></sup>

**Parameters:**

* `z: number`\
  Zoom level.
* `x: number`\
  X coordinate.
* `y: number`\
  Y coordinate.

**Returns:** `null | Buffer`

### `async getTileUncompressed(z, x, y)`

Returns an uncompressed tile as Buffer.\
Use the method `getTile` to get pre-compressed tile data.
If the tile cannot be found, `null` is returned. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/b579549/versatiles/src/index.ts#L313">\[src]</a></sup>

**Parameters:**

* `z: number`\
  Zoom level.
* `x: number`\
  X coordinate.
* `y: number`\
  Y coordinate.

**Returns:** `null | Buffer`

## Interface: `Block`<a id="interface_block"></a>

Defines a block of tiles, including all necessary metadata. see also the [spec v02](https://github.com/versatiles-org/versatiles-spec/blob/main/v02/readme.md#block_index) <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/b579549/versatiles/src/interfaces.ts#L80">\[src]</a></sup>
**Properties**

* `level: number`\
  zoom level
* `column: number`\
  column of the block in this zoom level
* `row: number`\
  row of the block in this zoom level
* `colMin: number`\
  minimum column where a tile is stored in this block (0..255)
* `rowMin: number`\
  minimum row where a tile is stored in this block (0..255)
* `colMax: number`\
  maximum column where a tile is stored in this block (0..255)
* `rowMax: number`\
  maximum row where a tile is stored in this block (0..255)
* `blockOffset: number`\
  byte position of this block in the container
* `tileIndexOffset: number`\
  byte position of the tile index in the container
* `tileIndexLength: number`\
  byte length of the tile index
* `tileCount: number`\
  number of tiles in this block
* `tileIndex: `[`TileIndex`](#interface_tileindex) (optional)\
  tile index, if it was already fetched

## Interface: `Header`<a id="interface_header"></a>

Defines the header of a container. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/b579549/versatiles/src/interfaces.ts#L49">\[src]</a></sup>
**Properties**

* `magic: string`\
  first bytes of the container, usually "versatiles\_v02"
* `version: string`\
  version of the versatiles container, usually "v02"
* `tileFormat: `[`Format`](#type_format)\
  file format of the stored tiles
* `tileCompression: `[`Compression`](#type_compression)\
  compression of the stored tiles
* `zoomMin: number`\
  minimum zoom level
* `zoomMax: number`\
  maximum zoom level
* `bbox: [number, number, number, number]`\
  bounding box of this container: `[lon_min, lat_min, lon_min, lat_min]`
* `metaOffset: number`\
  position of the first byte of the metadata inside the container. metadata is compressed with `tileCompression`.
* `metaLength: number`\
  length of the metadata in bytes. `metaLength = 0` means there is no metadata.
* `blockIndexOffset: number`\
  position of the first byte of the block index inside the container. block index is compressed with brotli.
* `blockIndexLength: number`\
  length of the block index in bytes. `blockIndexLength = 0` means there aren't any tiles in the container.

## Interface: `Options`<a id="interface_options"></a>

Defines supported options for reading a container. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/b579549/versatiles/src/interfaces.ts#L113">\[src]</a></sup>
**Properties**

* `tms: boolean`\
  if true, the [TMS (Tile Map Service) tile ordering](https://wiki.openstreetmap.org/wiki/TMS)  is used, so y = 0 means south

## Interface: `TileIndex`<a id="interface_tileindex"></a>

Defines an index of tiles inside a block. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/b579549/versatiles/src/interfaces.ts#L102">\[src]</a></sup>
**Properties**

* `offsets: Float64Array`\
  array of positions of the first byte of the tiles inside the block. tiles are compressed with `tileCompression`.
* `lengths: Float64Array`\
  array of length of the tiles in bytes. `lengths[i] = 0` means that this tile does not stored.

## Type: `Compression`<a id="type_compression"></a>

Different types of supported compressions. `null` means uncompressed. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/b579549/versatiles/src/interfaces.ts#L5">\[src]</a></sup>

**Type:** `"gzip" | "br" | null`

## Type: `Format`<a id="type_format"></a>

Different file formats. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/b579549/versatiles/src/interfaces.ts#L12">\[src]</a></sup>

**Type:** `"avif" | "bin" | "geojson" | "jpeg" | "json" | "pbf" | "png" | "svg" | "topojson" | "webp" | null`

## Type: `Reader`<a id="type_reader"></a>

Defines an asynchronous container reader function.\
It's basically a function that returns `length`s bytes starting at `position` of a container file.
You can define your own reader function to access containers via any network/interface/hardware. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/b579549/versatiles/src/interfaces.ts#L30">\[src]</a></sup>

**Type:** `(position: number, length: number) => Promise<Buffer>`

# API-old

## `new VersaTiles(src, { tms: true })`

* `src`: defines a readable VersaTiles container. It can be:
  * a string with a file path, e.g. `"tiles/planet.versatiles"`,
  * a string with an url, e.g. `"https://example.org/planet.versatiles"`,
  * an async function of the form:\
    `async function read(position, length) { }`\
    that returns `length` bytes starting at `position`. This allows you to implement your own interface to read a VersaTiles container e.g. over other network protocols.
* `tms`: set `true` if the VersaTiles container uses [TMS scheme with inverted Y index](https://gist.github.com/tmcw/4954720)

## async `.getTile(z, x, y)`

Get a tile as `Buffer` from a VersaTiles container.
It might be compressed with `header.tile_compression`.

## async `.getTileUncompressed(z, x, y)`

Get a tile as `Buffer` from a VersaTiles container.

## async `.decompress(buffer, type)`

Decompress the `buffer`, with type `gzip`, `br` or null, obtainable from `header.tile_compression`

## async `.getHeader()`

Get the header of a VersaTiles container. Typically it contains:

```javascript
{
	tile_format: // 'pbf', 'png', 'jpeg', ...
	tile_compression: // null, 'gzip' or 'br',
	zoom_min: // minimum zoom level
	zoom_max: // maximum zoom level
	bbox_min_x: // minimum longitude of the bounding box
	bbox_min_y: // minimum latitude of the bounding box
	bbox_max_x: // maximum longitude of the bounding box
	bbox_max_y: // maximum latitude of the bounding box
	...
}
```

The other properties are used internally to read the container. You can find a complete list in [the VersaTiles container specification](https://github.com/versatiles-org/versatiles-spec/blob/main/v02/readme.md#file_header)

## async `.getMeta()`

Get the meta data of a VersaTiles container

# License

[Unlicense](./LICENSE.md)

# Future work

This library could be extended to run in a web browser to read VersaTiles containers via `fetch`.
