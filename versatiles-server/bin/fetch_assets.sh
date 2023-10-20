#!/usr/bin/env bash
cd "$(dirname "$0")/../static"

mkdir assets || true
cd assets
ASSETS=$(pwd)

echo "add maplibre"
cd $ASSETS
rm -fr maplibre
curl -Ls "https://github.com/maplibre/maplibre-gl-js/releases/latest/download/dist.zip" > maplibre.tmp.zip
unzip -jqd maplibre maplibre.tmp.zip dist/maplibre-gl.css dist/maplibre-gl.js
rm maplibre.tmp.zip

echo "add fonts"
cd $ASSETS
rm -fr fonts
mkdir fonts
cd fonts
curl -Ls "https://github.com/versatiles-org/versatiles-fonts/releases/latest/download/noto_sans.tar.gz" | gzip -d | tar -xf -


echo "add sprites"
cd $ASSETS
rm -fr sprites
curl -Ls "https://github.com/versatiles-org/versatiles-sprites/releases/latest/download/sprites.tar.gz" | gzip -d | tar -xf -
