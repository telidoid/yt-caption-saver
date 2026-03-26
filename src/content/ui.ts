import { type SubtitleTrack, trackDisplayName } from '../types/messages';
import { COLOR_LINK, COLOR_MUTED, COLOR_ERROR, ERROR_DISPLAY_DURATION_MS } from '../constants';
import { downloadSubtitle } from './downloader';

export const CONTAINER_ID = 'yt-subtitle-downloader';
const STYLE_ID = 'yt-subtitle-downloader-styles';
const LINK_CLASS = 'yt-subtitle-link';

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `.${LINK_CLASS} { text-decoration: none; } .${LINK_CLASS}:hover { text-decoration: underline; }`;
  document.head.appendChild(style);
}

const CONTAINER_STYLE =
  'padding:8px 0;margin:4px 0;font-size:13px;line-height:1.6;' +
  `color:${COLOR_MUTED};display:flex;flex-wrap:wrap;align-items:center;gap:4px 0`;

const LINK_STYLE =
  `margin-right:10px;cursor:pointer;color:${COLOR_LINK};font-size:13px`;

const INSERTION_SELECTORS = [
  '#bottom-row',
  '#meta #meta-contents #container #top-row',
];

function findInsertionPoint(): Element | null {
  for (const selector of INSERTION_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

const FORMAT_SELECT_ID = 'yt-subtitle-format';

function getSelectedFormat(): 'srt' | 'txt' {
  const select = document.getElementById(FORMAT_SELECT_ID) as HTMLSelectElement | null;
  return select?.value === 'txt' ? 'txt' : 'srt';
}

function createFormatSelect(): HTMLSelectElement {
  const select = document.createElement('select');
  select.id = FORMAT_SELECT_ID;
  select.style.cssText = `margin-right:10px;font-size:12px;background:#1a1a1a;color:${COLOR_MUTED};border:1px solid #555;border-radius:3px;padding:1px 4px`;
  for (const fmt of ['srt', 'txt'] as const) {
    const opt = document.createElement('option');
    opt.value = fmt;
    opt.textContent = fmt.toUpperCase();
    select.appendChild(opt);
  }
  return select;
}

function createTrackLink(track: SubtitleTrack): HTMLAnchorElement {
  const link = document.createElement('a');
  link.textContent = trackDisplayName(track);
  link.href = '#';
  link.setAttribute('role', 'button');
  link.style.cssText = LINK_STYLE;
  link.className = LINK_CLASS;
  let isDownloading = false;

  link.addEventListener('click', (e) => {
    e.preventDefault();
    if (isDownloading) return;
    isDownloading = true;
    link.style.color = COLOR_MUTED;
    link.textContent = 'Downloading...';

    downloadSubtitle(track.baseUrl, track.languageCode, getSelectedFormat())
      .then(() => {
        link.textContent = trackDisplayName(track);
        link.style.color = COLOR_LINK;
      })
      .catch((err) => {
        link.textContent = 'Error';
        link.style.color = COLOR_ERROR;
        console.error('[YT Caption Saver] Subtitle download failed:', err);
        setTimeout(() => {
          link.textContent = trackDisplayName(track);
          link.style.color = COLOR_LINK;
        }, ERROR_DISPLAY_DURATION_MS);
      })
      .finally(() => {
        isDownloading = false;
      });
  });

  return link;
}

export function renderInPageUI(tracks: SubtitleTrack[]): void {
  ensureStyles();
  document.getElementById(CONTAINER_ID)?.remove();

  const insertPoint = findInsertionPoint();
  if (!insertPoint || !insertPoint.parentNode) {
    console.warn('[YT Caption Saver] Could not find insertion point for UI');
    return;
  }

  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.style.cssText = CONTAINER_STYLE;

  const label = document.createElement('span');
  label.textContent = 'Subtitles: ';
  label.style.marginRight = '6px';
  container.appendChild(label);

  if (tracks.length === 0) {
    const noSubs = document.createElement('span');
    noSubs.textContent = 'none available';
    noSubs.style.fontStyle = 'italic';
    container.appendChild(noSubs);
  } else {
    container.appendChild(createFormatSelect());
    for (const track of tracks) {
      container.appendChild(createTrackLink(track));
    }
  }

  insertPoint.parentNode.insertBefore(container, insertPoint);
}

export function isUIPresent(): boolean {
  return document.getElementById(CONTAINER_ID) !== null;
}

export function canInsertUI(): boolean {
  return findInsertionPoint() !== null;
}
