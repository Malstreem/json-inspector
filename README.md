# JSON Inspector

A browser-based tool for editing JSON and exploring its structure as an
interactive graph.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (by default, `http://localhost:3000`).

## Features

- Edit JSON with syntax highlighting, formatting, and inline parse diagnostics.
- Explore nested objects and arrays in a graph; expand or collapse branches.
- Search visible graph rows, pan and zoom, and fit the graph to the viewport.
- Open `.json` and `.geojson` files.
- Export the graph as an SVG image.

The graph is cleared when the editor contains invalid JSON, so it never appears
to represent data that failed to parse.

## Checks

```sh
npm test
npm run build
```
