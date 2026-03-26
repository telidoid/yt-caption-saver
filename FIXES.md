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
