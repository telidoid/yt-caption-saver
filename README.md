# YT Caption Saver

**https://github.com/telidoid/yt-caption-saver**

Firefox extension to save captions from YouTube videos as SRT or plain text.

## Build Requirements

- **OS:** Linux, macOS, or Windows
- **Node.js:** v18 or later (tested with v25.8.1)
- **npm:** v9 or later (tested with v11.12.0)

## Build Instructions

```bash
# 1. Install dependencies
npm install

# 2. Build the extension
npm run build
```

The compiled extension will be in the `dist/` directory. Load `dist/manifest.json` in Firefox via `about:debugging` to test.

## Build Tool

The build uses [esbuild](https://esbuild.github.io/) to bundle TypeScript source files into plain JavaScript. Each entry point (`src/background/background.ts`, `src/content/content.ts`, `src/popup/popup.ts`) is bundled into a single IIFE file in `dist/`.

## Project Structure

```
src/
  background/background.ts   — webRequest interceptor for pot token
  content/
    content.ts               — entrypoint: UI lifecycle + message listeners
    subtitle-parser.ts       — fetch video HTML and extract caption tracks
    converter.ts             — XML → SRT/TXT conversion
    downloader.ts            — pot token fetch, subtitle download, file save
    ui.ts                    — in-page DOM rendering
  popup/
    popup.ts                 — popup UI logic
    popup.html               — popup HTML
  types/messages.ts          — shared message types
  constants.ts               — shared constants
public/
  manifest.json              — extension manifest
  icons/                     — extension icons
scripts/
  build.mjs                  — esbuild build script
```

## License

MIT
