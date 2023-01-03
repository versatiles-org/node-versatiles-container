# Cloudtiles

A client library for [OpenCloudTiles](https://github.com/OpenCloudTiles/opencloudtiles-tools)

## Usage Example

``` js

const cloudtiles = require("cloudtiles");
const fs = require("fs");

const c = cloudtiles("https://example.org/planet.cloudtiles").getTile(z,x,y, function(err, buffer){
	
	fs.writeFile("tile."+c.header.tile_format, buffer, function(){});
	
});

```

## API

### `cloudtiles(src)`

* `src` can be a file path or url pointing to a cloudtiles container.

### `.getTile(z, x, y, function(err, tile))`

Get a tile as buffer from a cloudtiles container

### `.getHeader(function(err, header))`

Get the header of a cloudtiles container

### `.getMeta(function(err, metadata))`

Get the metadata of a cloudtiles container


## License

[UNLICENSE](https://unlicense.org/)