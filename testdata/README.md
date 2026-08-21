# Test data

## `island.versatiles`

A real-world v02 container (Brotli-compressed `pbf` tiles, zoom 8-14) used for most tests.

## `dummy-zstd.versatiles`

A minimal v02 container with `precompression = 3` (Zstandard), used to test zstd support.
The tiles are not real vector tiles — each one contains the plain text `tile {z}/{x}/{y}`,
which keeps the fixture at a few hundred bytes and makes assertions readable.

Regenerate with [versatiles-rs](https://github.com/versatiles-org/versatiles-rs):

```bash
mkdir -p tiles/{0/0,1/0,1/1}
for f in 0/0/0 1/0/0 1/0/1 1/1/0 1/1/1; do printf 'tile %s' "$f" > "tiles/$f.pbf"; done
versatiles convert -c zstd tiles dummy-zstd.versatiles
rm -r tiles
```
