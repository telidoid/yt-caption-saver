import { type Message, type VideoInfo, type SubtitleTrack, trackDisplayName } from '../types/messages';
import { YOUTUBE_WATCH_PATH, POPUP_RETRY_DELAY_MS, POPUP_MAX_RETRIES } from '../constants';

const statusEl = document.getElementById('status')!;
const trackListEl = document.getElementById('track-list')!;
const formatRowEl = document.getElementById('format-row') as HTMLDivElement;
const formatEl = document.getElementById('format') as HTMLSelectElement;

async function sendMessageWithRetry(tabId: number, message: Message): Promise<Message> {
  for (let attempt = 0; attempt < POPUP_MAX_RETRIES; attempt++) {
    try {
      return await browser.tabs.sendMessage(tabId, message) as Message;
    } catch {
      if (attempt === POPUP_MAX_RETRIES - 1) throw new Error('Content script not ready');
      await new Promise((r) => setTimeout(r, POPUP_RETRY_DELAY_MS));
    }
  }
  throw new Error('Content script not ready');
}

async function init(): Promise<void> {
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!activeTab?.id || !activeTab.url?.includes(YOUTUBE_WATCH_PATH)) {
    statusEl.textContent = 'Open a YouTube video to use this extension.';
    return;
  }

  statusEl.textContent = 'Detecting subtitle tracks...';

  const request: Message = { type: 'GET_VIDEO_INFO' };
  let response: Message;
  try {
    response = await sendMessageWithRetry(activeTab.id, request);
  } catch {
    statusEl.textContent = 'Could not connect to the page. Try refreshing.';
    return;
  }

  if (response?.type !== 'VIDEO_INFO_RESPONSE' || !response.payload) {
    statusEl.textContent = 'No subtitle tracks found for this video.';
    return;
  }

  renderTracks(response.payload);
}

function renderTracks(info: VideoInfo): void {
  statusEl.textContent = `"${info.title}"`;

  if (info.availableTracks.length === 0) {
    trackListEl.innerHTML = '<p style="font-size:0.875rem;color:#666">No subtitle tracks found.</p>';
    return;
  }

  formatRowEl.style.display = '';
  trackListEl.innerHTML = '';

  for (const track of info.availableTracks) {
    const div = document.createElement('div');
    div.className = 'track-item';

    const label = document.createElement('span');
    label.textContent = trackDisplayName(track);

    const btn = document.createElement('button');
    btn.textContent = 'Download';
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      btn.disabled = true;
      downloadTrack(track).finally(() => { btn.disabled = false; });
    });

    div.appendChild(label);
    div.appendChild(btn);
    trackListEl.appendChild(div);
  }
}

async function downloadTrack(track: SubtitleTrack): Promise<void> {
  const format = formatEl.value as 'srt' | 'txt';
  statusEl.textContent = 'Downloading...';

  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) {
    statusEl.textContent = 'Error: no active tab.';
    return;
  }

  const request: Message = {
    type: 'DOWNLOAD_SUBTITLE',
    payload: { baseUrl: track.baseUrl, languageCode: track.languageCode, format },
  };
  let response: Message;
  try {
    response = await browser.tabs.sendMessage(activeTab.id, request) as Message;
  } catch {
    statusEl.textContent = 'Could not connect to the page. Try refreshing.';
    return;
  }

  if (response?.type === 'DOWNLOAD_RESULT') {
    statusEl.textContent = response.payload.success
      ? 'Download started.'
      : `Error: ${response.payload.error}`;
  } else {
    statusEl.textContent = 'Error: unexpected response from page.';
  }
}

init().catch(console.error);
