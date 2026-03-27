import type { Message } from '../types/messages';
import { YOUTUBE_TIMEDTEXT_PATTERN, YOUTUBE_ALLOWED_ORIGINS } from '../constants';

// Background script: intercepts YouTube's own timedtext requests to capture
// the `pot` (Proof of Origin Token) parameter, which is required to fetch
// subtitle content from YouTube's API.

const MAX_POT_ENTRIES = 100;
const STORAGE_KEY = 'potByTab';
const potByTab = new Map<number, string>();

// Restore potByTab from storage on wake-up (non-persistent event page)
const restoreReady = browser.storage.local.get(STORAGE_KEY).then((data) => {
  const stored = data[STORAGE_KEY];
  if (stored && typeof stored === 'object') {
    for (const [key, value] of Object.entries(stored)) {
      if (typeof value === 'string') {
        potByTab.set(Number(key), value);
      }
    }
  }
}).catch(() => { /* storage read failed; start with empty cache */ });

function persistPotCache(): void {
  const obj: Record<string, string> = {};
  for (const [key, value] of potByTab) {
    obj[String(key)] = value;
  }
  browser.storage.local.set({ [STORAGE_KEY]: obj });
}

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.type === 'xmlhttprequest' && details.tabId >= 0) {
      const url = new URL(details.url);
      const pot = url.searchParams.get('pot');
      const fromExt = url.searchParams.get('fromExt');
      // Only capture pot from YouTube's own requests, not our extension's
      if (pot && !fromExt) {
        // Evict oldest entry if at capacity
        if (!potByTab.has(details.tabId) && potByTab.size >= MAX_POT_ENTRIES) {
          const oldest = potByTab.keys().next().value!;
          potByTab.delete(oldest);
        }
        potByTab.set(details.tabId, pot);
        persistPotCache();
      }
    }
  },
  { urls: [YOUTUBE_TIMEDTEXT_PATTERN] }
);

browser.tabs.onRemoved.addListener((tabId) => {
  if (potByTab.delete(tabId)) {
    persistPotCache();
  }
});

// Clear stale POT when the user navigates away from the page within the same tab
browser.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0 && !YOUTUBE_ALLOWED_ORIGINS.some((o) => details.url.startsWith(o))) {
    if (potByTab.delete(details.tabId)) {
      persistPotCache();
    }
  }
});

browser.runtime.onMessage.addListener((message: Message, sender) => {
  if (message.type === 'GET_POT') {
    // Wait for storage restoration before responding
    return restoreReady.then(() => {
      // Only respond to requests from YouTube tabs
      const senderUrl = sender.tab?.url ?? sender.url ?? '';
      if (!YOUTUBE_ALLOWED_ORIGINS.some((o) => senderUrl.startsWith(o))) {
        return { type: 'POT_RESPONSE', payload: { pot: null } } as Message;
      }
      const pot = sender.tab?.id != null ? potByTab.get(sender.tab.id) ?? null : null;
      return { type: 'POT_RESPONSE', payload: { pot } } as Message;
    });
  }
  return false;
});
