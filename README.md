# Cloudtiles

A client library for [OpenCloudTiles](https://github.com/OpenCloudTiles/opencloudtiles-specification)

## Install

`npm i -s cloudtiles`

## Usage Example

``` js

const cloudtiles = require("cloudtiles");
const fs = require("fs");

const c = cloudtiles("https://example.org/planet.cloudtiles").getTile(z,x,y, function(err, buffer){
	
	fs.writeFile("tile."+c.header.tile_format, buffer, function(){});
	
});

```

## API

### `cloudtiles(src, { invertY: true })`

* `src`: can be a file path or url pointing to a cloudtiles container.
* `invertY`: set `true` if cloudtiles container uses inverted Y index

### `.getTile(z, x, y, function(err, tile))`

Get a tile as buffer from a cloudtiles container

### `.getHeader(function(err, header))`

Get the header of a cloudtiles container

### `.getMeta(function(err, metadata))`

Get the metadata of a cloudtiles container

### `.getZoomLevels(function(err, zoom))`

Get the available zoom levels of a cloudtiles container as an array of strings

``` js
[ '0', '1', '2', ... ];
```

### `.getBoundingBox(function(err, bbox))`

Get the approximate bounding box of the highest available zoom level array of floats in the order `WestLon`, `SouthLat`, `EastLon`, `NorthLat`.

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
cloudtiles("./some.cloudtiles").server(8080, "localhost", function(){
	console.log("Listening on http://localhost:8080/");
});
```

#### Routes

* `/{z}/{x}/{y}` get tile
* `/tile.json` get [TileJSON](https://github.com/mapbox/tilejson-spec)

## License

[UNLICENSE](https://unlicense.org/)