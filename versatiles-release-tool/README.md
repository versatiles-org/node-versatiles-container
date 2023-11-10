# VersaTiles Release Tools

Tools used internally for:

* creating Markdown documentation of TypeScript libraries: [`vrt ts2md`](#subcommand-vrt-ts2md)
* creating Markdown documentation of executables: [`vrt cmd2md`](#subcommand-vrt-cmd2md)
* inserting Markdown into documents: [`vrt insertmd`](#subcommand-vrt-insertmd)
* updating "Table of Content" in Markdown files: [`vrt inserttoc`](#subcommand-vrt-inserttoc)

# Command `vrt`

<!--- This chapter is generated automatically --->

```console
$ vrt
Usage: vrt [options] [command]

versatiles release and documentaion tool

Options:
  -h, --help                     display help for command

Commands:
  ts2md <typescript> <tsconfig>  documents a TypeScript file and outputs it to
                                 stdout
  cmd2md <command>               documents a runnable command and outputs it to
                                 stdout
  insertmd <readme> [heading]    takes Markdown from stdin and insert it into a
                                 Markdown file
  inserttoc <readme> [heading]   updates the TOC in a Markdown file
  help [command]                 display help for command
```

## Subcommand: `vrt ts2md`

```console
$ vrt ts2md
Usage: vrt ts2md [options] <typescript> <tsconfig>

documents a TypeScript file and outputs it to stdout

Arguments:
  typescript  Filename of the TypeScript file
  tsconfig    Filename of tsconfig.json

Options:
  -h, --help  display help for command
```

## Subcommand: `vrt cmd2md`

```console
$ vrt cmd2md
Usage: vrt cmd2md [options] <command>

documents a runnable command and outputs it to stdout

Arguments:
  command     command to run

Options:
  -h, --help  display help for command
```

## Subcommand: `vrt insertmd`

```console
$ vrt insertmd
Usage: vrt insertmd [options] <readme> [heading]

takes Markdown from stdin and insert it into a Markdown file

Arguments:
  readme      Markdown file, like a readme.md
  heading     Heading in the Markdown file (default: "# API")

Options:
  -h, --help  display help for command
```

## Subcommand: `vrt inserttoc`

```console
$ vrt inserttoc
Usage: vrt inserttoc [options] <readme> [heading]

updates the TOC in a Markdown file

Arguments:
  readme      Markdown file, like a readme.md
  heading     Heading in the Markdown file (default: "# Table of Content")

Options:
  -h, --help  display help for command
```
