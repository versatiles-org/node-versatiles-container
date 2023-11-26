# VersaTiles Server for Google Cloud Run

This tool solves perfectly the use cases, when you want to publish multiple map application using multiple versatiles tile sources in Google Cloud.
E.g. for data journalists, academia, ...

> [!WARNING]
> It is strongly recommended to always use a CDN in front of this server!


## Outline:

1. Store static files (\*.html, \*.js, \*.css, …) and map tiles (\*.versatiles) in a Google Storage Bucket.
2. Run this Node.js server in Google Cloud Run using Bucket name/path as argument
3. Put a Loadbalancer (with DNS and CDN) in front of the Google Cloud Run service.

- Now you can serve the files in the Bucket publicly.
- This server will make sure that every file will be compressed optimally according to "accept-encoding" header of the browser.
- \*.versatiles files will not be served. Instead the server will provide a simple GET API to access every tile, and serve them with optimal compresseion. E.g. tile x=4, y=5, z=6 in file `gs://bucket/map/earth.versatiles` could be accessed via `https://public.domain.com/map/earth.versatiles?x=4&y=5&z=6`


## Setup

## Install

## Run

## Test locally

## Options

<!--- This chapter is generated automatically --->

```console
$ versatiles-server
Usage: versatiles-server [options] <source>

Simple VersaTiles server

Arguments:
  source                    VersaTiles container, can be a URL or filename of a
                            "*.versatiles" file

Options:
  -b, --base-url <url>      Base URL for the server (default:
                            "http://localhost:<port>/")
  -c, --compress            Compress data if needed. Slower, but reduces
                            traffic. (default: true)
  -i, --host <hostname|ip>  Hostname or IP to bind the server to (default:
                            "0.0.0.0")
  -o, --open                Open map in web browser (default: false)
  -p, --port <port>         Port to bind the server to (default: 8080)
  -t, --tms                 Use TMS tile order (flip y axis) (default: false)
  -h, --help                display help for command
```

## License

[Unlicense](./LICENSE.md)
