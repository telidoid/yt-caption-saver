# YT Caption Saver

**https://github.com/telidoid/yt-caption-saver**

Firefox extension that saves captions from YouTube videos as SRT or plain text files.

## Features

- Download subtitles directly from YouTube video pages via inline links below the video title
- Also accessible from the browser toolbar popup with format selection
- Supports SRT (with timestamps) and plain text (text only) formats
- Handles both manual and auto-generated caption tracks
- Works with YouTube's SPA navigation

## How It Works

1. A background script intercepts YouTube's own timedtext API requests to capture the POT (Proof of Origin Token) required for subtitle access.
2. When you open a YouTube video, the extension fetches the page HTML to extract available caption tracks.
3. Clickable subtitle links appear below the video title. Clicking one fetches the subtitle XML, converts it to SRT, and triggers a file download.
4. The toolbar popup offers the same functionality with an additional format selector (SRT or TXT).

## Build Requirements

- **Node.js:** v18 or later
- **npm:** v9 or later

## Build Instructions

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Build with file watching for development
npm run build:watch

# Type-check without building
npm run typecheck

# Package as .xpi for distribution
npm run package
```

The compiled extension will be in the `dist/` directory. Load `dist/manifest.json` in Firefox via `about:debugging` to test.

## Project Structure

```
src/
  background/background.ts   -- intercepts YouTube requests to capture POT token (per-tab)
  content/
    content.ts               -- entrypoint: UI lifecycle, polling, message listeners
    subtitle-parser.ts       -- fetch video HTML and extract caption tracks (with caching)
    converter.ts             -- timedtext XML to SRT/TXT conversion
    downloader.ts            -- POT token fetch, subtitle download, file save
    ui.ts                    -- in-page subtitle link rendering
  popup/
    popup.ts                 -- toolbar popup UI logic
    popup.html               -- toolbar popup HTML
  types/messages.ts          -- shared message type definitions
  constants.ts               -- shared constants (URLs, timing, colors)
public/
  manifest.json              -- Firefox WebExtension manifest (v2)
  icons/                     -- extension icons
scripts/
  build.mjs                  -- esbuild bundler script
```

## Permissions

- **activeTab** -- access the active tab to communicate with content scripts
- **webRequest** -- intercept YouTube's timedtext API requests to capture POT tokens
- **youtube.com** -- run content scripts and monitor requests on YouTube

## License

MIT
