[![Code Coverage](https://codecov.io/gh/versatiles-org/node-versatiles/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/node-versatiles)
[![GitHub Workflow Status)](https://img.shields.io/github/actions/workflow/status/versatiles-org/node-versatiles-container/ci.yml)](https://github.com/versatiles-org/node-versatiles-container/actions/workflows/ci.yml)

A client library for [VersaTiles containers](https://github.com/versatiles-org/versatiles-spec).

# Install

`npm i @versatiles/container`

# Usage Example

```js
import { Container } from "@versatiles/container";
import fs from "fs";

const container = new Container("https://example.org/planet.versatiles");
const header = await container.getHeader();
const tile = await container.getTileUncompressed(z, x, y);
fs.writeFileSync("tile." + header.tileFormat, tile);
```

# API

<!--- This chapter is generated automatically --->

## Classes

### Class: `Container`<a id="class_container"></a>

The `VersaTiles` class is a wrapper around a `.versatiles` container file. It provides methods\
to access tile data, metadata, and other properties within the container. <sup><a href="https://github.com/versatiles-org/node-versatiles-container/blob/e484579058a7333a6228803147bb9314e45f51a4/src/index.ts#L73">\[src]</a></sup>

#### Constructor: `new Container(source, options)`

Constructs a new instance of the VersaTiles class. <sup><a href="https://github.com/versatiles-org/node-versatiles-container/blob/e484579058a7333a6228803147bb9314e45f51a4/src/index.ts#L94">\[src]</a></sup>

**Parameters:**

- <code>source: string | [Reader](#type_reader)</code>\
  The data source for the tiles. This can be a URL starting with `http://` or `https://`,
  a path to a local file, or a custom `Reader` function that reads data chunks based on offset and length.
- <code>options: [OpenOptions](#interface_openoptions)</code> (optional)\
  Optional settings that configure tile handling.

#### Method: `getHeader()`

Asynchronously retrieves the header information from the `.versatiles` container. <sup><a href="https://github.com/versatiles-org/node-versatiles-container/blob/e484579058a7333a6228803147bb9314e45f51a4/src/index.ts#L116">\[src]</a></sup>

**Returns:** <code>Promise<[Header](#interface_header)></code>

#### Method: `getMetadata()`

Asynchronously retrieves the metadata associated with the `.versatiles` container.\
Metadata typically includes information about `vector_layers` for vector tiles.
If the container does not include metadata, this method returns `null`. <sup><a href="https://github.com/versatiles-org/node-versatiles-container/blob/e484579058a7333a6228803147bb9314e45f51a4/src/index.ts#L163">\[src]</a></sup>

**Returns:** <code>Promise\<undefined | string></code>

#### Method: `getTile(z, x, y)`

Asynchronously retrieves a specific tile's data as a Buffer. If the tile data is compressed as\
defined in the container header, the returned Buffer will contain the compressed data.
To obtain uncompressed data, use the `getTileUncompressed` method.
If the specified tile does not exist, the method returns `null`. <sup><a href="https://github.com/versatiles-org/node-versatiles-container/blob/e484579058a7333a6228803147bb9314e45f51a4/src/index.ts#L190">\[src]</a></sup>

**Parameters:**

- <code>z: number</code>\
  The zoom level of the tile.
- <code>x: number</code>\
  The x coordinate of the tile within its zoom level.
- <code>y: number</code>\
  The y coordinate of the tile within its zoom level.

**Returns:** <code>Promise\<null | Buffer></code>

#### Method: `getTileUncompressed(z, x, y)`

Asynchronously retrieves a specific tile's uncompressed data as a Buffer. This method first\
retrieves the compressed tile data using `getTile` and then decompresses it based on the
compression setting in the container header.
If the specified tile does not exist, the method returns `null`. <sup><a href="https://github.com/versatiles-org/node-versatiles-container/blob/e484579058a7333a6228803147bb9314e45f51a4/src/index.ts#L238">\[src]</a></sup>

**Parameters:**

- <code>z: number</code>\
  The zoom level of the tile.
- <code>x: number</code>\
  The x coordinate of the tile within its zoom level.
- <code>y: number</code>\
  The y coordinate of the tile within its zoom level.

**Returns:** <code>Promise\<null | Buffer></code>

## Interfaces

### Interface: `Header`<a id="interface_header"></a>

```typescript
interface {
  bbox: [number, number, number, number];
  blockIndexLength: number;
  blockIndexOffset: number;
  magic: string;
  metaLength: number;
  metaOffset: number;
  tileCompression: [Compression](#type_compression);
  tileFormat: [Format](#type_format);
  tileMime: string;
  version: string;
  zoomMax: number;
  zoomMin: number;
}
```

### Interface: `OpenOptions`<a id="interface_openoptions"></a>

```typescript
interface {
  tms: boolean;
}
```

## Type Aliases

### Type: `Compression`<a id="type_compression"></a>

**Type:** <code>"br" | "gzip" | "raw"</code>

### Type: `Format`<a id="type_format"></a>

**Type:** <code>"avif" | "bin" | "geojson" | "jpg" | "json" | "pbf" | "png" | "svg" | "topojson" | "webp"</code>

### Type: `Reader`<a id="type_reader"></a>

**Type:** <code>(position: number, length: number) => Promise\<Buffer></code>

# License

[Unlicense](./LICENSE.md)

# Future work

This library could be extended to run in a web browser to read VersaTiles containers via `fetch`.
