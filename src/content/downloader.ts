import type { Message } from '../types/messages';
import {
  UNSAFE_FILENAME_CHARS, BLOB_CLEANUP_DELAY_MS,
  POT_POLL_INTERVAL_MS, POT_POLL_TIMEOUT_MS, WINDOWS_RESERVED_NAMES, MAX_FILENAME_LENGTH,
  YOUTUBE_ALLOWED_ORIGINS,
} from '../constants';
import { xmlToSrt, xmlToTxt } from './converter';

const CC_BUTTON_SELECTOR = '.ytp-subtitles-button';

export async function downloadSubtitle(
  baseUrl: string,
  languageCode: string,
  format: 'srt' | 'txt',
  title: string,
): Promise<void> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error('Invalid subtitle URL');
  }
  if (!YOUTUBE_ALLOWED_ORIGINS.includes(parsedUrl.origin)) {
    throw new Error('Subtitle URL is not from YouTube');
  }

  const pot = await fetchPotToken();
  parsedUrl.searchParams.set('fromExt', 'true');
  parsedUrl.searchParams.set('c', 'WEB');
  parsedUrl.searchParams.set('pot', pot);

  const response = await fetch(parsedUrl.href);
  if (!response.ok) {
    throw new Error(`Failed to fetch subtitles: ${response.status}`);
  }
  const xml = await response.text();

  const content = format === 'srt' ? xmlToSrt(xml) : xmlToTxt(xml);
  const safeTitle = sanitizeFilename(title);

  saveTextAsFile(content, `${safeTitle}.${languageCode}.${format}`);
}

async function requestPot(): Promise<string | null> {
  try {
    const request: Message = { type: 'GET_POT' };
    const response = await browser.runtime.sendMessage(request) as Message | undefined;
    if (response?.type === 'POT_RESPONSE' && response.payload.pot) {
      return response.payload.pot;
    }
  } catch {
    // sendMessage can throw if background script isn't ready
  }
  return null;
}

async function pollForPot(): Promise<string | null> {
  const deadline = Date.now() + POT_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const pot = await requestPot();
    if (pot) return pot;
    await new Promise((r) => setTimeout(r, POT_POLL_INTERVAL_MS));
  }
  return null;
}

/** Clicks the CC button if captions are off. Returns a restore callback, or null if the button wasn't found. */
function enableCaptions(): (() => void) | null {
  const btn = document.querySelector(CC_BUTTON_SELECTOR) as HTMLButtonElement | null;
  if (!btn) return null;
  if (btn.getAttribute('aria-pressed') === 'false') {
    btn.click();
    return () => btn.click();
  }
  return () => {};
}

async function fetchPotToken(): Promise<string> {
  const existing = await requestPot();
  if (existing) return existing;

  const restore = enableCaptions();
  if (!restore) {
    throw new Error('No POT token available. Could not find the CC button to enable subtitles automatically.');
  }

  try {
    const pot = await pollForPot();
    if (pot) return pot;
    throw new Error('No POT token captured after enabling subtitles. Please try refreshing the page.');
  } finally {
    restore();
  }
}

function sanitizeFilename(title: string): string {
  let name = title.replace(UNSAFE_FILENAME_CHARS, '_').replace(/_+/g, '_').trim();
  name = name.replace(/^\.+/, '').replace(/[.\s]+$/, '');
  if (!name || name === '_' || WINDOWS_RESERVED_NAMES.test(name)) {
    name = 'video';
  }
  if (name.length > MAX_FILENAME_LENGTH) {
    name = name.slice(0, MAX_FILENAME_LENGTH);
  }
  return name;
}

function saveTextAsFile(text: string, fileName: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const href = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.download = fileName;
  link.href = href;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(href);
  }, BLOB_CLEANUP_DELAY_MS);
}
