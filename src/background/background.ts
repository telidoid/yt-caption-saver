import type { Message } from '../types/messages';
import { YOUTUBE_TIMEDTEXT_PATTERN } from '../constants';

// Background script: intercepts YouTube's own timedtext requests to capture
// the `pot` (Proof of Origin Token) parameter, which is required to fetch
// subtitle content from YouTube's API.

const MAX_POT_ENTRIES = 100;
const YOUTUBE_ORIGIN = 'https://www.youtube.com';
const potByTab = new Map<number, string>();

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
      }
    }
  },
  { urls: [YOUTUBE_TIMEDTEXT_PATTERN] }
);

browser.tabs.onRemoved.addListener((tabId) => {
  potByTab.delete(tabId);
});

// Clear stale POT when the user navigates away from the page within the same tab
browser.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    potByTab.delete(details.tabId);
  }
});

browser.runtime.onMessage.addListener((message: Message, sender) => {
  if (message.type === 'GET_POT') {
    // Only respond to requests from YouTube tabs
    const senderUrl = sender.tab?.url ?? sender.url ?? '';
    if (!senderUrl.startsWith(YOUTUBE_ORIGIN)) {
      return Promise.resolve({ type: 'POT_RESPONSE', payload: { pot: null } } as Message);
    }
    const pot = sender.tab?.id != null ? potByTab.get(sender.tab.id) ?? null : null;
    const response: Message = { type: 'POT_RESPONSE', payload: { pot } };
    return Promise.resolve(response);
  }
  return false;
});
