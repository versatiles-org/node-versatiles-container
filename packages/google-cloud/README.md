# VersaTiles Server for Google Cloud Run

This tool solves perfectly the use cases, when you want to publish multiple map application using multiple versatiles tile sources in Google Cloud.
E.g. for data journalists, academia, ...

> [!WARNING]
> It is strongly recommended to always use a CDN in front of this server!

## Outline:

1. Store static files (\*.html, \*.js, \*.css, …) and map tiles (\*.versatiles) in a Google Storage Bucket.
2. Run this Node.js server in Google Cloud Run using Bucket name/path as argument
3. Put a Loadbalancer (with DNS and CDN) in front of the Google Cloud Run service.

* Now you can serve the files in the Bucket publicly.
* This server will make sure that every file will be compressed optimally according to "accept-encoding" header of the browser.
* \*.versatiles files will not be served. Instead the server will provide a simple GET API to access every tile, and serve them with optimal compression. E.g. tile x=4, y=5, z=6 in file `gs://bucket/map/earth.versatiles` could be accessed via `https://public.domain.com/map/earth.versatiles?tiles/6/4/5`

## Setup

## Install

## Run

## Test locally

## Options

<!--- This chapter is generated automatically --->

```console
$ versatiles-google-cloud
Usage: versatiles-server [options] <bucket name>

Simple VersaTiles server

Arguments:
  bucket name                  Name of the Google bucket

Options:
  -b, --base-url <url>         public base URL (default:
                               "http://localhost:<port>/")
  -d, --directory <directory>  bucket directory/prefix, e.g. "/public/"
  -f, --fast-recompress        Don't force Brotli compression, so the server
                               respond faster
  -p, --port <port>            Port to bind the server to (default: 8080)
  -v, --verbose                Tell me what you're doing
  -h, --help                   display help for command
```

## License

[Unlicense](./LICENSE.md)
