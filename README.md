# VersaTiles

A client library for [VersaTiles](https://github.com/versatiles-org/versatiles-spec) containers.

## Install

`npm i -s versatiles`

## Usage Example

``` js

const versatiles = require("versatiles");
const fs = require("fs");

const c = versatiles("https://example.org/planet.versatiles").getTile(z,x,y, function(err, buffer){

	fs.writeFile("tile."+c.header.tile_format, buffer, function(){});

});

```

## API

### `versatiles(src, { tms: true, headers: {} })`

* `src`: can be a file path or url pointing to a versatiles container.
* `tms`: set `true` if versatiles container uses [tms scheme with inverted Y index](https://gist.github.com/tmcw/4954720)
* `headers`: additional request headers sent to the server when src is `http`
* `base`: base url for relative urls in style.json / tile.json when the builtin webserver is started

### `.getTile(z, x, y, function(err, tile))`

Get a tile as buffer from a versatiles container

### `.decompress(type, buffer, function(err, buffer))`

Decompress a buffer, with type bein `gzip`, `br` or null, obtainable from `header.tile_precompression`

### `.getHeader(function(err, header))`

Get the header of a versatiles container

### `.getMeta(function(err, metadata))`

Get the metadata of a versatiles container

### `.getZoomLevels(function(err, zoom))`

Get the available zoom levels of a versatiles container as an array of integers

``` js
[ 0, 1, 2, ... ];
```

### `.getBoundingBox(function(err, bbox))`

Get the bounding box as an array of floats in the order `WestLon`, `SouthLat`, `EastLon`, `NorthLat`.

``` js
[
	13.07373046875,
	52.32191088594773,
	13.77685546875,
	52.68304276227742
]
```

### `.server(...)`

Start a rudimentary webserver delivering tiles and metadata. Arguments are passed on to `http.server.listen()`

``` js
versatiles("./some.versatiles").server(8080, "localhost", function(){
	console.log("Listening on http://localhost:8080/");
});
```

#### Routes

* `/{z}/{x}/{y}` get tile
* `/tile.json` get [TileJSON](https://github.com/mapbox/tilejson-spec)
* `/style.json` get minimal [StyleJSON](https://docs.mapbox.com/mapbox-gl-js/style-spec/)
* `/` Display map in Browser with [maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) and [maplibre-gl-inspect](https://github.com/acalcutt/maplibre-gl-inspect)

## Standalone Server

When called directly, versatiles can act as a standalone server.

*This is for testing purposes, please feel discouraged from using this in a production environment.*

### Global Install

``` sh
npm i -g versatiles
versatiles-server <file|url> [--tms] [--port <port>] [--host <hostname|ip>] [--base https://example.org] [--header-<header-key> <header-value>]
```

### Local Install

``` sh
npm i versatiles
node node_modules/versatiles/versatiles.js <file|url> [--tms] [--port <port>] [--host <hostname|ip>] [--base https://example.org] [--header-<header-key> <header-value>]
```

## License

[Unlicense](./LICENSE.md)
