import type { Message } from '../types/messages';
import { YOUTUBE_TITLE_SUFFIX, UNSAFE_FILENAME_CHARS, BLOB_CLEANUP_DELAY_MS } from '../constants';
import { xmlToSrt, xmlToTxt } from './converter';

export async function downloadSubtitle(
  baseUrl: string,
  languageCode: string,
  format: 'srt' | 'txt',
): Promise<void> {
  const pot = await fetchPotToken();
  const fullUrl = baseUrl + '&fromExt=true&c=WEB&pot=' + pot;

  const response = await fetch(fullUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch subtitles: ${response.status}`);
  }
  const xml = await response.text();

  const content = format === 'srt' ? xmlToSrt(xml) : xmlToTxt(xml);
  const title = document.title.replace(YOUTUBE_TITLE_SUFFIX, '');
  const safeTitle = title.replace(UNSAFE_FILENAME_CHARS, '_').trim();

  saveTextAsFile(content, `${safeTitle}.${languageCode}.${format}`);
}

async function fetchPotToken(): Promise<string> {
  const request: Message = { type: 'GET_POT' };
  const response = await browser.runtime.sendMessage(request) as Message;

  if (response.type !== 'POT_RESPONSE' || !response.payload.pot) {
    throw new Error('No POT token available. Please enable subtitles (CC button) and refresh the page.');
  }
  return response.payload.pot;
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
  setTimeout(() => {
    URL.revokeObjectURL(href);
    link.remove();
  }, BLOB_CLEANUP_DELAY_MS);
}
