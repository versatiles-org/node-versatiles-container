[![NPM version](https://img.shields.io/npm/v/%40versatiles%2Fcontainer)](https://www.npmjs.com/package/@versatiles/container)
[![NPM downloads](https://img.shields.io/npm/dt/%40versatiles%2Fcontainer)](https://www.npmjs.com/package/@versatiles/container)
[![Code coverage](https://codecov.io/gh/versatiles-org/node-versatiles-container/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/node-versatiles-container)
[![CI status](https://img.shields.io/github/actions/workflow/status/versatiles-org/node-versatiles-container/ci.yml)](https://github.com/versatiles-org/node-versatiles-container/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A client library for [VersaTiles containers](https://github.com/versatiles-org/versatiles-spec).

# Install

`npm i @versatiles/container`

# Usage Example

```js
import { Container } from "@versatiles/container";
import fs from "fs";

const container = new Container("https://example.org/planet.versatiles");
const header = await container.getHeader();
const tile = await container.getTileUncompressed(z, x, y);
fs.writeFileSync("tile." + header.tileFormat, tile);
```

# API

You can find a complete documentation of the API at
<https://versatiles.org/node-versatiles-container/>

## Dependency Graph

<!--- This chapter is generated automatically --->

```mermaid
---
config:
  layout: elk
---
flowchart TB

subgraph 0["src"]
1["index.ts"]
subgraph 2["lib"]
3["decompress.ts"]
4["reader_file.ts"]
5["reader_http.ts"]
6["interfaces.ts"]
end
end
1-->3
1-->4
1-->5

class 0,2 subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

# License

[Unlicense](./LICENSE)
