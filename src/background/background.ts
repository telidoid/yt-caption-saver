import type { Message } from '../types/messages';
import { YOUTUBE_TIMEDTEXT_PATTERN } from '../constants';

// Background script: intercepts YouTube's own timedtext requests to capture
// the `pot` (Proof of Origin Token) parameter, which is required to fetch
// subtitle content from YouTube's API.

const potByTab = new Map<number, string>();

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.type === 'xmlhttprequest' && details.tabId >= 0) {
      const url = new URL(details.url);
      const pot = url.searchParams.get('pot');
      const fromExt = url.searchParams.get('fromExt');
      // Only capture pot from YouTube's own requests, not our extension's
      if (pot && !fromExt) {
        potByTab.set(details.tabId, pot);
      }
    }
  },
  { urls: [YOUTUBE_TIMEDTEXT_PATTERN] }
);

browser.tabs.onRemoved.addListener((tabId) => {
  potByTab.delete(tabId);
});

browser.runtime.onMessage.addListener((message: Message, sender) => {
  if (message.type === 'GET_POT') {
    const pot = sender.tab?.id != null ? potByTab.get(sender.tab.id) ?? null : null;
    const response: Message = { type: 'POT_RESPONSE', payload: { pot } };
    return Promise.resolve(response);
  }
  return false;
});
