# VersaTiles

A client library for [VersaTiles containers](https://github.com/versatiles-org/versatiles-spec).

## Install

`npm i versatiles`

## Usage Example

``` js
import VersaTiles from 'versatiles';
import fs from 'fs';

const container = new VersaTiles('https://example.org/planet.versatiles');
const header = await container.getHeader();
const tile = await container.getTileUncompressed(z,x,y);
fs.writeFileSync('tile.' + header.tile_format, tile);
```

## API

### `new VersaTiles(src, { tms: true })`

* `src`: defines a readable VersaTiles container. It can be:
  - a string with a file path, e.g. `"tiles/planet.versatiles"`,
  - a string with an url, e.g. `"https://example.org/planet.versatiles"`,
  - an async function of the form:  
    `async function read(position, length) { }`  
	 that returns `length` bytes starting at `position`. This allows you to implement your own interface to read a VersaTiles container e.g. over other network protocols.
* `tms`: set `true` if the VersaTiles container uses [TMS scheme with inverted Y index](https://gist.github.com/tmcw/4954720)

### async `.getTile(z, x, y)`

Get a tile as `Buffer` from a VersaTiles container.
It might be compressed with `header.tile_compression`.

### async `.getTileUncompressed(z, x, y)`

Get a tile as `Buffer` from a VersaTiles container.

### async `.decompress(buffer, type)`

Decompress the `buffer`, with type `gzip`, `br` or null, obtainable from `header.tile_compression`

### async `.getHeader()`

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

### async `.getMeta()`

Get the meta data of a VersaTiles container

## License

[Unlicense](./LICENSE.md)

## Future work

This library could be extended to run in a web browser to read VersaTiles containers via `fetch`.
