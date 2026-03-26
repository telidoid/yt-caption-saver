import { type SubtitleTrack, trackDisplayName } from '../types/messages';
import { COLOR_LINK, COLOR_MUTED, COLOR_ERROR, ERROR_DISPLAY_DURATION_MS } from '../constants';
import { downloadSubtitle } from './downloader';

const CONTAINER_ID = 'yt-subtitle-downloader';
const STYLE_ID = 'yt-subtitle-downloader-styles';
const LINK_CLASS = 'yt-subtitle-link';

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `.${LINK_CLASS}:hover { text-decoration: underline; }`;
  document.head.appendChild(style);
}

const CONTAINER_STYLE =
  'padding:8px 0;margin:4px 0;font-size:13px;line-height:1.6;' +
  `color:${COLOR_MUTED};display:flex;flex-wrap:wrap;align-items:center;gap:4px 0`;

const LINK_STYLE =
  `margin-right:10px;cursor:pointer;color:${COLOR_LINK};text-decoration:none;font-size:13px`;

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

function createTrackLink(track: SubtitleTrack): HTMLAnchorElement {
  const link = document.createElement('a');
  link.textContent = trackDisplayName(track);
  link.href = '#';
  link.style.cssText = LINK_STYLE;
  link.className = LINK_CLASS;

  link.addEventListener('click', (e) => {
    e.preventDefault();
    link.style.color = COLOR_MUTED;
    link.textContent = 'Downloading...';

    downloadSubtitle(track.baseUrl, track.languageCode, 'srt')
      .then(() => {
        link.textContent = trackDisplayName(track);
        link.style.color = COLOR_LINK;
      })
      .catch((err) => {
        link.textContent = 'Error';
        link.style.color = COLOR_ERROR;
        console.error('Subtitle download failed:', err);
        setTimeout(() => {
          link.textContent = trackDisplayName(track);
          link.style.color = COLOR_LINK;
        }, ERROR_DISPLAY_DURATION_MS);
      });
  });

  return link;
}

export function renderInPageUI(tracks: SubtitleTrack[]): void {
  ensureStyles();
  document.getElementById(CONTAINER_ID)?.remove();

  const insertPoint = findInsertionPoint();
  if (!insertPoint) return;

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
    for (const track of tracks) {
      container.appendChild(createTrackLink(track));
    }
  }

  insertPoint.parentNode?.insertBefore(container, insertPoint);
}

export function isUIPresent(): boolean {
  return document.getElementById(CONTAINER_ID) !== null;
}

export function canInsertUI(): boolean {
  return findInsertionPoint() !== null;
}
