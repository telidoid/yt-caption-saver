import type { Message } from '../types/messages';

// Background script: intercepts YouTube's own timedtext requests to capture
// the `pot` (Proof of Origin Token) parameter, which is required to fetch
// subtitle content from YouTube's API.

let lastPot: string | null = null;

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.type === 'xmlhttprequest') {
      const url = new URL(details.url);
      const pot = url.searchParams.get('pot');
      const fromExt = url.searchParams.get('fromExt');
      // Only capture pot from YouTube's own requests, not our extension's
      if (pot && !fromExt) {
        lastPot = pot;
      }
    }
  },
  { urls: ['https://www.youtube.com/api/timedtext?*'] }
);

browser.runtime.onMessage.addListener((message: Message) => {
  if (message.type === 'GET_POT') {
    const response: Message = { type: 'POT_RESPONSE', payload: { pot: lastPot } };
    return Promise.resolve(response);
  }
  return false;
});
