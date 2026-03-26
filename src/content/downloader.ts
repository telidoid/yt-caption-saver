import type { Message } from '../types/messages';
import {
  YOUTUBE_TITLE_SUFFIX, UNSAFE_FILENAME_CHARS, BLOB_CLEANUP_DELAY_MS,
  POT_POLL_INTERVAL_MS, POT_POLL_TIMEOUT_MS, WINDOWS_RESERVED_NAMES, MAX_FILENAME_LENGTH,
} from '../constants';
import { xmlToSrt, xmlToTxt } from './converter';

const ALLOWED_ORIGINS = ['https://www.youtube.com', 'https://youtube.com'];

export async function downloadSubtitle(
  baseUrl: string,
  languageCode: string,
  format: 'srt' | 'txt',
): Promise<void> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error('Invalid subtitle URL');
  }
  if (!ALLOWED_ORIGINS.includes(parsedUrl.origin)) {
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
  const title = document.title.replace(YOUTUBE_TITLE_SUFFIX, '');
  const safeTitle = sanitizeFilename(title);

  saveTextAsFile(content, `${safeTitle}.${languageCode}.${format}`);
}

async function fetchPotToken(): Promise<string> {
  const deadline = Date.now() + POT_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const request: Message = { type: 'GET_POT' };
      const response = await browser.runtime.sendMessage(request) as Message | undefined;

      if (response?.type === 'POT_RESPONSE' && response.payload.pot) {
        return response.payload.pot;
      }
    } catch {
      // sendMessage can throw if background script isn't ready; keep polling
    }
    await new Promise((r) => setTimeout(r, POT_POLL_INTERVAL_MS));
  }

  throw new Error('No POT token available. Please enable subtitles (CC button) and refresh the page.');
}

function sanitizeFilename(title: string): string {
  let name = title.replace(UNSAFE_FILENAME_CHARS, '_').replace(/_+/g, '_').trim();
  if (!name || name === '_' || WINDOWS_RESERVED_NAMES.test(name)) {
    name = 'video';
  }
  if (name.length > MAX_FILENAME_LENGTH) {
    name = name.slice(0, MAX_FILENAME_LENGTH);
  }
  return name;
}

function saveTextAsFile(text: string, fileName: string): void {
  const blob = new Blob([text], { type: 'text/plain' });
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
