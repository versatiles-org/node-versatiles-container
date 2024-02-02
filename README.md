[![Code Coverage](https://codecov.io/gh/versatiles-org/node-versatiles/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/node-versatiles)
[![GitHub Workflow Status)](https://img.shields.io/github/actions/workflow/status/versatiles-org/node-versatiles-container/ci.yml)](https://github.com/versatiles-org/node-versatiles-container/actions/workflows/ci.yml)

A client library for [VersaTiles containers](https://github.com/versatiles-org/versatiles-spec).

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

<!--- This chapter is generated automatically --->

<details>

<summary><h2>Class: <code>Container</code><a id="class_container"></a></h2></summary>

The `VersaTiles` class is a wrapper around a `.versatiles` container file. It provides methods\
to access tile data, metadata, and other properties within the container. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/99b1c91/versatiles-container/src/index.ts#L38">\[src]</a></sup>

<details>

<summary><h3>Constructor: <code>new Container&#40;source, options&#41;</code></h3></summary>

Constructs a new instance of the VersaTiles class. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/99b1c91/versatiles-container/src/index.ts#L61">\[src]</a></sup>

**Parameters:**

* <code>source: string | [Reader](#type_reader)</code>\
  The data source for the tiles. This can be a URL starting with `http://` or `https://`,
  a path to a local file, or a custom `Reader` function that reads data chunks based on offset and length.
* <code>options: [OpenOptions](#interface_openoptions)</code> (optional)\
  Optional settings that configure tile handling.

**Returns:** <code>[Container](#class_container)</code>

</details>

<details>

<summary><h3>Method: <code>getHeader&#40;&#41;</code></h3></summary>

Asynchronously retrieves the header information from the `.versatiles` container. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/99b1c91/versatiles-container/src/index.ts#L85">\[src]</a></sup>

**Returns:** <code>Promise<[Header](#interface_header)></code>

</details>

<details>

<summary><h3>Method: <code>getMetadata&#40;&#41;</code></h3></summary>

Asynchronously retrieves the metadata associated with the `.versatiles` container.\
Metadata typically includes information about `vector_layers` for vector tiles.
If the container does not include metadata, this method returns `null`. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/99b1c91/versatiles-container/src/index.ts#L132">\[src]</a></sup>

**Returns:** <code>Promise\<undefined | string></code>

</details>

<details>

<summary><h3>Method: <code>getTile&#40;z, x, y&#41;</code></h3></summary>

Asynchronously retrieves a specific tile's data as a Buffer. If the tile data is compressed as\
defined in the container header, the returned Buffer will contain the compressed data.
To obtain uncompressed data, use the `getTileUncompressed` method.
If the specified tile does not exist, the method returns `null`. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/99b1c91/versatiles-container/src/index.ts#L159">\[src]</a></sup>

**Parameters:**

* <code>z: number</code>\
  The zoom level of the tile.
* <code>x: number</code>\
  The x coordinate of the tile within its zoom level.
* <code>y: number</code>\
  The y coordinate of the tile within its zoom level.

**Returns:** <code>Promise\<null | Buffer></code>

</details>

<details>

<summary><h3>Method: <code>getTileUncompressed&#40;z, x, y&#41;</code></h3></summary>

Asynchronously retrieves a specific tile's uncompressed data as a Buffer. This method first\
retrieves the compressed tile data using `getTile` and then decompresses it based on the
compression setting in the container header.
If the specified tile does not exist, the method returns `null`. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/99b1c91/versatiles-container/src/index.ts#L207">\[src]</a></sup>

**Parameters:**

* <code>z: number</code>\
  The zoom level of the tile.
* <code>x: number</code>\
  The x coordinate of the tile within its zoom level.
* <code>y: number</code>\
  The y coordinate of the tile within its zoom level.

**Returns:** <code>Promise\<null | Buffer></code>

</details>

</details>

<details>

<summary><h2>Interface: <code>Header</code><a id="interface_header"></a></h2></summary>

Interface for the metadata header of a `*.Versatiles` container. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/99b1c91/versatiles-container/src/interfaces.ts#L57">\[src]</a></sup>

* <code>magic: string</code>\
  Identifier for the container format, usually "versatiles\_v02".
* <code>version: string</code>\
  Version of the container format, typically "v02".
* <code>tileFormat: [Format](#type_format)</code>\
  The format used for storing tiles.
* <code>tileMime: string</code>\
  The MIME type of the tiles.
* <code>tileCompression: [Compression](#type_compression)</code>\
  The type of compression applied to tiles.
* <code>zoomMin: number</code>\
  The minimum zoom level.
* <code>zoomMax: number</code>\
  The maximum zoom level.
* <code>bbox: \[number, number, number, number]</code>\
  Bounding box coordinates as \[lon\_min, lat\_min, lon\_max, lat\_max].
* <code>metaOffset: number</code>\
  The byte offset for metadata within the container.
* <code>metaLength: number</code>\
  The byte size of the metadata. A value of 0 means no metadata.
* <code>blockIndexOffset: number</code>\
  The byte offset for the block index within the container.
* <code>blockIndexLength: number</code>\
  The byte size of the block index. A value of 0 indicates no tiles in the container.

</details>

<details>

<summary><h2>Interface: <code>OpenOptions</code><a id="interface_openoptions"></a></h2></summary>

Interface for defining the options available for reading a container. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/99b1c91/versatiles-container/src/interfaces.ts#L125">\[src]</a></sup>

* <code>tms: boolean</code>\
  If set to true, uses the [TMS (Tile Map Service) tile ordering](https://wiki.openstreetmap.org/wiki/TMS) where y=0 is the southernmost point.

</details>

<details>

<summary><h2>Type: <code>Compression</code><a id="type_compression"></a></h2></summary>

Supported compression.\
`null` signifies that the data is uncompressed. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/99b1c91/versatiles-container/src/interfaces.ts#L5">\[src]</a></sup>

**Type:** <code>"br" | "gzip" | "raw"</code>

</details>

<details>

<summary><h2>Type: <code>Format</code><a id="type_format"></a></h2></summary>

Supported tile formats. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/99b1c91/versatiles-container/src/interfaces.ts#L11">\[src]</a></sup>

**Type:** <code>"avif" | "bin" | "geojson" | "jpeg" | "json" | "pbf" | "png" | "svg" | "topojson" | "webp"</code>

</details>

<details>

<summary><h2>Type: <code>Reader</code><a id="type_reader"></a></h2></summary>

Type definition for reading content from a VersaTiles container.

This is useful for implementing new container readers, e.g. reading over other network protocols. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/99b1c91/versatiles-container/src/interfaces.ts#L37">\[src]</a></sup>

**Type:** <code>(position: number, length: number) => Promise<Buffer></code>

</details>

# License

[Unlicense](./LICENSE.md)

# Future work

This library could be extended to run in a web browser to read VersaTiles containers via `fetch`.
