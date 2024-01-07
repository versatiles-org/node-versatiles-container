# VersaTiles Server for Google Cloud Run

This tool solves perfectly the use cases, when you want to publish multiple map application using multiple versatiles tile sources in Google Cloud.
E.g. for data journalists, academia, ...

> \[!WARNING]
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
Usage: versatiles-google-cloud [options] <bucket-name>

Initialises a server to serve files from a specified Google Bucket to a Google
Load Balancer with CDN, handles HTTP headers and compression, and provides a
RESTful API for VersaTiles containers.
For more details, visit:
https://github.com/versatiles-org/node-versatiles/blob/main/packages/google-cloud/README.md

Arguments:
  bucket-name                   Name of the Google Cloud Storage bucket.

Options:
  -b, --base-url <url>          Set the public base URL. Defaults to
                                "http://localhost:<port>/".
  -d, --directory <prefix>      Set the bucket directory (prefix), e.g.,
                                "/public/".
  -f, --fast-recompression      Enable faster server responses by avoiding
                                recompression.
  -l, --local-directory <path>  Ignore bucket and use a local directory
                                instead. (Useful e.g. for local development.)
  -p, --port <port>             Set the server port. (default: 8080)
  -v, --verbose                 Enable verbose mode for detailed operational
                                logs.
  -h, --help                    display help for command
```

## License

[Unlicense](./LICENSE.md)
