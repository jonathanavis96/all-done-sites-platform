# Website (AllDoneSites)

This folder contains the actual Vite/React website.

## Dev

Run from this folder:

```bash
npm install
npm run dev
```

Or from repo root (wrapper script):

```bash
npm run dev
```

## Build

Run from this folder:

```bash
npm run build
```

Or from repo root (wrapper script):

```bash
npm run build
```

`npm run build` runs `vite build` and then generates static route pages (for GitHub Pages deep links / SEO) via `scripts/generate-static-pages.js`.

## Lint

```bash
npm run lint
```
