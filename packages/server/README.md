# VersaTiles - Server

A Node.js server for [VersaTiles containers](https://github.com/versatiles-org/versatiles-spec).

## Install globally

```bash
npm i -g @versatiles/server
```

## Run

```bash
versatiles-server --help
```

This will show you how to use the server with all options and arguments.

For example:

```bash
versatiles-server planet.versatiles
```

## Options

<!--- This chapter is generated automatically --->

```console
$ versatiles-server
Usage: versatiles-server [options] <source>

Simple VersaTiles server

Arguments:
  source                   VersaTiles container, can be a URL or filename of a
                           "*.versatiles" file

Options:
  -b, --base-url <url>     Base URL for the server (default:
                           "http://localhost:<port>/")
  -f, --fast               Only recompress data if it is really necessary.
                           Faster response, but more traffic.
  -h, --host <hostnameip>  Hostname or IP to bind the server to (default:
                           "0.0.0.0")
  -o, --open               Open map in web browser
  -p, --port <port>        Port to bind the server to (default: 8080)
  -t, --tms                Use TMS tile order (flip y axis)
  --help                   display help for command
```

## License

[Unlicense](./LICENSE.md)
