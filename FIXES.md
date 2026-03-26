# Bug Fixes & Improvements (2026-03-26)

Comprehensive audit and fix of all identified issues across the extension.

---

## Critical Fixes

### 1. Event listener stacking on SPA navigation (`content.ts`)
**Problem:** `yt-navigate-finish` and `beforeunload` listeners were anonymous functions that could never be removed. On YouTube's SPA navigation, listeners accumulated because the content script persists across navigations.

**Fix:** Extracted listeners into named functions (`handleNavigateFinish`, `handleBeforeUnload`). The `beforeunload` handler now properly removes both listeners. Added `startPolling()`/`stopPolling()` helpers to manage the interval lifecycle.

### 2. AbortController race condition (`subtitle-parser.ts`)
**Problem:** After aborting a previous fetch and creating a new AbortController, the response from the old request could still be in-flight and get processed with stale state.

**Fix:** Captured the `signal` reference at fetch time and added a post-response guard (`if (signal.aborted) return []`) to bail out if the controller was aborted between the response arriving and processing completing.

### 3. Missing sender origin validation (`background.ts`)
**Problem:** The `GET_POT` message handler responded to any content script without verifying the sender originated from YouTube. A malicious page's content script could retrieve cached POT tokens.

**Fix:** Added origin check — `sender.tab?.url` or `sender.url` must start with `https://www.youtube.com` before returning the POT token. Returns `null` for non-YouTube senders.

---

## High-Severity Fixes

### 4. Blob URL revoked too early (`downloader.ts`, `constants.ts`)
**Problem:** `BLOB_CLEANUP_DELAY_MS` was 1 second, which could cause download failures if the browser hadn't finished processing the blob URL.

**Fix:** Increased `BLOB_CLEANUP_DELAY_MS` from `1000` to `10_000` (10 seconds). Also moved `link.remove()` to right after `link.click()` — the link element is no longer needed in the DOM once clicked; only the blob URL needs to persist.

### 5. Unhandled `sendMessage` errors in POT polling (`downloader.ts`)
**Problem:** `browser.runtime.sendMessage()` inside the `fetchPotToken` polling loop could throw (e.g., background script not ready), causing the entire function to reject instead of retrying.

**Fix:** Wrapped the `sendMessage` call in a try/catch inside the polling loop. Errors are silently caught and the loop continues polling until the deadline.

### 6. Missing payload null check (`content.ts`)
**Problem:** When handling `DOWNLOAD_SUBTITLE` messages, `message.payload` was destructured without a null check. If the payload was undefined, a TypeError would crash the handler.

**Fix:** Added an explicit `if (!message.payload)` guard that returns a `DOWNLOAD_RESULT` with `success: false` and an error message.

### 7. Promise rejection freezing download UI (`ui.ts`)
**Problem:** If `downloadSubtitle()` threw synchronously before returning a promise, the `.finally()` block would never execute, leaving `isDownloading = true` permanently and disabling the button.

**Fix:** Wrapped the `downloadSubtitle()` call in a try/catch. If a synchronous throw occurs before the promise chain settles, the catch block resets `isDownloading` and shows the error state.

---

## Medium-Severity Fixes

### 8. URL string concatenation instead of URL constructor (`downloader.ts`)
**Problem:** Query parameters were appended to `baseUrl` via string concatenation (`baseUrl + '&fromExt=true&...'`), which assumed `baseUrl` already contained a `?`. If YouTube's API ever returned a URL without query parameters, this would produce a malformed URL.

**Fix:** Replaced string concatenation with `URL` constructor and `searchParams.set()`:
```typescript
parsedUrl.searchParams.set('fromExt', 'true');
parsedUrl.searchParams.set('c', 'WEB');
parsedUrl.searchParams.set('pot', pot);
```

### 9. Invalid `baseUrl` construction wrapping (`downloader.ts`)
**Problem:** `new URL(baseUrl)` could throw on an invalid URL with an unhandled exception.

**Fix:** Wrapped in try/catch with a clear error message: `'Invalid subtitle URL'`.

### 10. Filename length overflow (`downloader.ts`, `constants.ts`)
**Problem:** `sanitizeFilename` truncated to `MAX_FILENAME_LENGTH` (200), but the language code and file extension (e.g., `.en.srt`) were appended after truncation, potentially exceeding filesystem limits (255 bytes).

**Fix:** Reduced `MAX_FILENAME_LENGTH` from `200` to `150`, leaving room for the language code, format extension, and multi-byte characters.

### 11. Filename all-underscores edge case (`downloader.ts`)
**Problem:** After replacing unsafe characters with `_`, a title like `???` would become `___` which passed the emptiness check but produced a poor filename.

**Fix:** Added `replace(/_+/g, '_')` to collapse consecutive underscores, and added `name === '_'` to the fallback check so single-underscore results get replaced with `'video'`.

### 12. No URL validation on subtitle track `baseUrl` (`subtitle-parser.ts`)
**Problem:** `baseUrl` values from YouTube's response were passed through unchecked. A malformed or non-YouTube URL could be used for downloads.

**Fix:** Added URL validation in the filter step — each track's `baseUrl` is parsed with `new URL()` and its origin must be `https://www.youtube.com`. Invalid URLs are silently filtered out.

### 13. Type assertion without runtime check (`popup.ts`)
**Problem:** `formatEl.value as 'srt' | 'txt'` was a compile-time-only assertion with no runtime validation. If the HTML changed, an invalid format could be sent.

**Fix:** Added a `getSelectedFormat()` helper with a `VALID_FORMATS` array and runtime inclusion check. Falls back to `'srt'` for any unexpected value.

---

## Low-Severity Fixes

### 14. Inconsistent log prefixes (`ui.ts`)
**Problem:** Some error logs used the `[YT Caption Saver]` prefix, others didn't.

**Fix:** Added the `[YT Caption Saver]` prefix to all `console.error` and `console.warn` calls in `ui.ts`.

### 15. Silent failure on missing insertion point (`ui.ts`)
**Problem:** If `insertPoint.parentNode` was null, the UI wouldn't render with no feedback.

**Fix:** Added explicit null check for both `insertPoint` and `insertPoint.parentNode`, with a `console.warn` when the insertion point can't be found.

### 16. Dead code: unnecessary try/catch around async call (`ui.ts`)
**Problem:** The `downloadSubtitle()` call in the click handler was wrapped in a synchronous try/catch with a `settled` flag. Since `downloadSubtitle` is an `async` function, it always returns a promise and never throws synchronously — the outer catch block could never execute.

**Fix:** Removed the dead try/catch and `settled` flag, leaving just the promise chain (`.then()/.catch()/.finally()`).

---

## Second-Pass Fixes (2026-03-26)

### 17. `webNavigation.onCommitted` clears POT too aggressively (`background.ts`)
**Problem:** Every same-tab navigation deleted the POT token, including YouTube SPA navigations within youtube.com. The POT was cleared before the new video's timedtext request could re-populate it, causing "No POT token available" errors on the next download attempt.

**Fix:** Added a URL check — only clear POT when navigating **away** from YouTube (`!details.url.startsWith(YOUTUBE_ORIGIN)`), preserving the token during intra-YouTube SPA navigations.

### 18. UI not re-rendered immediately after SPA navigation (`content.ts`)
**Problem:** `handleNavigateFinish` cleared state and removed the old UI container, but relied on the next polling interval tick (up to 500ms) to detect the new video and re-render.

**Fix:** Added a `checkAndRenderUI()` call at the end of `handleNavigateFinish` for immediate re-render on navigation.

### 19. `beforeunload` handler permanently breaks extension in SPA context (`content.ts`)
**Problem:** The `beforeunload` handler removed the `yt-navigate-finish` listener and stopped polling. In YouTube's SPA model, `beforeunload` can fire on navigations that don't actually unload the page. Once triggered, the extension was permanently broken until a full page reload.

**Fix:** Removed the `beforeunload` handler entirely. Content script cleanup on true page unload happens automatically when the browsing context is destroyed — explicit teardown is unnecessary and harmful in SPA contexts.

### 20. Missing `charset=utf-8` on blob MIME type (`downloader.ts`)
**Problem:** The Blob was created with `type: 'text/plain'` without specifying a charset. Non-ASCII subtitle text (accented characters, CJK, etc.) could be misinterpreted on platforms that don't default to UTF-8.

**Fix:** Changed MIME type to `'text/plain;charset=utf-8'`.

### 21. Origin validation mismatch between `background.ts` and `downloader.ts` (`constants.ts`, `background.ts`, `downloader.ts`, `subtitle-parser.ts`)
**Problem:** `background.ts` checked `senderUrl.startsWith('https://www.youtube.com')` (www only), while `downloader.ts` used a local `ALLOWED_ORIGINS` array that also included `https://youtube.com` (non-www). `subtitle-parser.ts` had its own hardcoded `YOUTUBE_ORIGIN` constant. The inconsistency could cause origin checks to pass in one module but fail in another.

**Fix:** Extracted `YOUTUBE_ALLOWED_ORIGINS` into `constants.ts` and updated all three modules (`background.ts`, `downloader.ts`, `subtitle-parser.ts`) to import and use the shared list.

### 22. `trackCache` in `subtitle-parser.ts` is unbounded
**Problem:** The `Map<string, SubtitleTrack[]>` grew without limit. Each unique video ID added an entry only cleared on SPA navigation. A long-lived tab visiting many videos would accumulate entries indefinitely.

**Fix:** Added `MAX_TRACK_CACHE_ENTRIES = 50` cap with FIFO eviction via a `cacheSet()` helper. All three `trackCache.set` call sites now go through `cacheSet()`.

### 23. `sanitizeFilename` doesn't strip leading/trailing dots (`downloader.ts`)
**Problem:** After replacing unsafe chars, filenames like `...video...` passed through. Leading dots create hidden files on Unix; Windows doesn't handle trailing dots/spaces well.

**Fix:** Added `.replace(/^\.+/, '').replace(/[.\s]+$/, '')` after the initial sanitization pass, before the emptiness check.

### 24. HTML entity decoding gaps in subtitle text (`converter.ts`)
**Problem:** `DOMParser` with `text/xml` handles standard XML entities (`&amp;`, `&lt;`) but not HTML-specific named entities like `&nbsp;` or numeric entities like `&#39;`. YouTube subtitles sometimes contain these, resulting in raw entity text in downloaded files.

**Fix:** Added a `decodeHtmlEntities()` helper that uses a `<textarea>` element's `innerHTML`/`value` roundtrip to decode all HTML entities. Applied to each cue's text after extraction from the XML.

### 25. `popup.ts` doesn't retry `DOWNLOAD_SUBTITLE` messages
**Problem:** `init()` used `sendMessageWithRetry` for `GET_VIDEO_INFO`, but `downloadTrack` used a raw `browser.tabs.sendMessage`. If the content script was momentarily unresponsive, the download failed without retrying.

**Fix:** Changed `downloadTrack` to use `sendMessageWithRetry` for the `DOWNLOAD_SUBTITLE` message.

### 26. Background script uses `"persistent": true` (`manifest.json`)
**Problem:** The background script never unloaded, consuming resources even when idle.

**Fix:** Changed to `"persistent": false` (event page). The `potByTab` map is lost on unload, but the existing polling/retry logic in `fetchPotToken` handles this gracefully — YouTube's own subtitle requests will re-populate the POT when the user interacts with the page.

---

## Third-Pass Fixes (2026-03-26)

### 27. Infinite recursion in `cacheSet` helper (`subtitle-parser.ts`)
**Problem:** A bulk find-and-replace accidentally converted `trackCache.set()` inside the `cacheSet` helper to `cacheSet()`, causing infinite recursion. Every subtitle fetch would crash with a stack overflow.

**Fix:** Restored `trackCache.set(videoId, tracks)` inside the `cacheSet` function body.

### 28. Dead `stopPolling` function (`content.ts`)
**Problem:** After removing the `beforeunload` handler (fix #19), `stopPolling()` had no remaining callers and was dead code.

**Fix:** Removed the `stopPolling` function.
