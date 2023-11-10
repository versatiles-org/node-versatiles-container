A client library for [VersaTiles containers](https://github.com/versatiles-org/versatiles-spec).

# Table of Content

* [Install](#install)
* [Usage Example](#usage-example)
* [API](#api)
  * [Class: VersaTiles](#class_versatiles)
    * [constructor: new VersaTiles(source, options)](#constructor-new-versatilessource-options)
    * [async getHeader()](#async-getheader)
    * [async getMetadata()](#async-getmetadata)
    * [async getTileFormat()](#async-gettileformat)
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

The `VersaTiles` class is a wrapper around a `.versatiles` container file. It provides methods\
to access tile data, metadata, and other properties within the container. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/index.ts#L27">\[src]</a></sup>

### constructor: `new VersaTiles(source, options)`

Constructs a new instance of the VersaTiles class. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/index.ts#L50">\[src]</a></sup>

**Parameters:**

* `source: string | `[`Reader`](#type_reader)\
  The data source for the tiles. This can be a URL starting with `http://` or `https://`,
  a path to a local file, or a custom `Reader` function that reads data chunks based on offset and length.
* `options: `[`Options`](#interface_options) (optional)\
  Optional settings that configure tile handling.

**Returns:** [`VersaTiles`](#class_versatiles)
**Methods**

### `async getHeader()`

Asynchronously retrieves the header information from the `.versatiles` container.\
This method is primarily for internal use. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/index.ts#L75">\[src]</a></sup>

**Returns:** [`Header`](#interface_header)

### `async getMetadata()`

Asynchronously retrieves the metadata associated with the `.versatiles` container.\
Metadata typically includes information about `vector_layers` for vector tiles.
If the container does not include metadata, this method returns `null`. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/index.ts#L133">\[src]</a></sup>

**Returns:** `null | object`

### `async getTileFormat()`

Asynchronously determines the tile format, such as "png" or "pbf", based on the header information. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/index.ts#L153">\[src]</a></sup>

**Returns:** [`Format`](#type_format)

### `async getBlockIndex()`

Asynchronously retrieves a mapping of tile block indices. The map's keys are formatted as "{z},{x},{y}".\
This method is for internal use to manage tile lookup within the container. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/index.ts#L165">\[src]</a></sup>

**Returns:** `Map<string,`[`Block`](#interface_block)`>`

### `async getTileIndex(block)`

Asynchronously retrieves the tile index for a specified block. This is an internal method used to\
maintain a lookup for every tile within a block. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/index.ts#L244">\[src]</a></sup>

**Parameters:**

* `block: `[`Block`](#interface_block)\
  The block for which to retrieve the tile index.

**Returns:** [`TileIndex`](#interface_tileindex)

### `async getTile(z, x, y)`

Asynchronously retrieves a specific tile's data as a Buffer. If the tile data is compressed as\
defined in the container header, the returned Buffer will contain the compressed data.
To obtain uncompressed data, use the `getTileUncompressed` method.
If the specified tile does not exist, the method returns `null`. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/index.ts#L274">\[src]</a></sup>

**Parameters:**

* `z: number`\
  The zoom level of the tile.
* `x: number`\
  The x coordinate of the tile within its zoom level.
* `y: number`\
  The y coordinate of the tile within its zoom level.

**Returns:** `null | Buffer`

### `async getTileUncompressed(z, x, y)`

Asynchronously retrieves a specific tile's uncompressed data as a Buffer. This method first\
retrieves the compressed tile data using `getTile` and then decompresses it based on the
compression setting in the container header.
If the specified tile does not exist, the method returns `null`. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/index.ts#L322">\[src]</a></sup>

**Parameters:**

* `z: number`\
  The zoom level of the tile.
* `x: number`\
  The x coordinate of the tile within its zoom level.
* `y: number`\
  The y coordinate of the tile within its zoom level.

**Returns:** `null | Buffer`

## Interface: `Block`<a id="interface_block"></a>

Interface for a block of tiles including necessary metadata.\
For more details, refer to [spec v02](https://github.com/versatiles-org/versatiles-spec/blob/main/v02/readme.md#block_index). <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/interfaces.ts#L85">\[src]</a></sup>
**Properties**

* `level: number`\
  The zoom level for this block.
* `column: number`\
  The column position of this block at the current zoom level.
* `row: number`\
  The row position of this block at the current zoom level.
* `colMin: number`\
  Minimum column index for tiles stored in this block (range: 0-255).
* `rowMin: number`\
  Minimum row index for tiles stored in this block (range: 0-255).
* `colMax: number`\
  Maximum column index for tiles stored in this block (range: 0-255).
* `rowMax: number`\
  Maximum row index for tiles stored in this block (range: 0-255).
* `blockOffset: number`\
  Byte position where this block starts in the file container.
* `tileIndexOffset: number`\
  Byte position where the tile index starts within the container.
* `tileIndexLength: number`\
  Length of the tile index in bytes.
* `tileCount: number`\
  The number of tiles contained in this block.
* `tileIndex: `[`TileIndex`](#interface_tileindex) (optional)\
  Optional tile index if it has been fetched.

## Interface: `Header`<a id="interface_header"></a>

Interface for the metadata header of a `*.Versatiles` container. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/interfaces.ts#L52">\[src]</a></sup>
**Properties**

* `magic: string`\
  Identifier for the container format, usually "versatiles\_v02".
* `version: string`\
  Version of the container format, typically "v02".
* `tileFormat: `[`Format`](#type_format)\
  The format used for storing tiles.
* `tileCompression: `[`Compression`](#type_compression)\
  The type of compression applied to tiles.
* `zoomMin: number`\
  The minimum zoom level.
* `zoomMax: number`\
  The maximum zoom level.
* `bbox: [number, number, number, number]`\
  Bounding box coordinates as \[lon\_min, lat\_min, lon\_max, lat\_max].
* `metaOffset: number`\
  The byte offset for metadata within the container.
* `metaLength: number`\
  The byte size of the metadata. A value of 0 means no metadata.
* `blockIndexOffset: number`\
  The byte offset for the block index within the container.
* `blockIndexLength: number`\
  The byte size of the block index. A value of 0 indicates no tiles in the container.

## Interface: `Options`<a id="interface_options"></a>

Interface for defining the options available for reading a container. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/interfaces.ts#L119">\[src]</a></sup>
**Properties**

* `tms: boolean`\
  If set to true, uses the [TMS (Tile Map Service) tile ordering](https://wiki.openstreetmap.org/wiki/TMS) where y=0 is the southernmost point.

## Interface: `TileIndex`<a id="interface_tileindex"></a>

Interface for the index structure used for tiles within a block. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/interfaces.ts#L108">\[src]</a></sup>
**Properties**

* `offsets: Float64Array`\
  Array indicating the start byte positions of tiles within the block.
* `lengths: Float64Array`\
  Array specifying the byte lengths of the tiles. A length of 0 means the tile is not stored.

## Type: `Compression`<a id="type_compression"></a>

Supported compression.\
`null` signifies that the data is uncompressed. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/interfaces.ts#L5">\[src]</a></sup>

**Type:** `"br" | "gzip" | null`

## Type: `Format`<a id="type_format"></a>

Supported tile formats. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/interfaces.ts#L11">\[src]</a></sup>

**Type:** `"avif" | "bin" | "geojson" | "jpeg" | "json" | "pbf" | "png" | "svg" | "topojson" | "webp" | null`

## Type: `Reader`<a id="type_reader"></a>

Type definition for an asynchronous function to read a container's content.

This can be useful for accessing data stored in various storage mediums. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/575beea/container/src/interfaces.ts#L33">\[src]</a></sup>

**Type:** `(position: number, length: number) => Promise<Buffer>`

# License

[Unlicense](./LICENSE.md)

# Future work

This library could be extended to run in a web browser to read VersaTiles containers via `fetch`.
