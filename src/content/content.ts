import type { Message, VideoInfo } from '../types/messages';
import { YOUTUBE_TITLE_SUFFIX, UI_POLL_INTERVAL_MS } from '../constants';
import { fetchSubtitleTracks, clearTrackCache } from './subtitle-parser';
import { downloadSubtitle } from './downloader';
import { renderInPageUI, isUIPresent, canInsertUI } from './ui';

let lastVideoId: string | null = null;
let isCheckingUI = false;

function getVideoId(): string | null {
  return new URL(window.location.href).searchParams.get('v');
}

async function buildVideoInfo(): Promise<VideoInfo | null> {
  const videoId = getVideoId();
  if (!videoId) return null;
  const tracks = await fetchSubtitleTracks(videoId);
  return {
    videoId,
    title: document.title.replace(YOUTUBE_TITLE_SUFFIX, ''),
    availableTracks: tracks,
  };
}

// --- In-page UI lifecycle ---

async function checkAndRenderUI(): Promise<void> {
  if (isCheckingUI) return;
  const videoId = getVideoId();
  if (!videoId) return;
  if (videoId === lastVideoId && isUIPresent()) return;
  if (!canInsertUI()) return;

  isCheckingUI = true;
  try {
    lastVideoId = videoId;
    const tracks = await fetchSubtitleTracks(videoId);
    renderInPageUI(tracks);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      lastVideoId = null; // Reset so the next poll retries
    } else {
      throw err;
    }
  } finally {
    isCheckingUI = false;
  }
}

const uiPollInterval = setInterval(checkAndRenderUI, UI_POLL_INTERVAL_MS);

window.addEventListener('yt-navigate-finish', () => {
  lastVideoId = null;
  clearTrackCache();
});

window.addEventListener('beforeunload', () => {
  clearInterval(uiPollInterval);
});

// --- Message listeners (for popup) ---

browser.runtime.onMessage.addListener((message: Message) => {
  if (message.type === 'GET_VIDEO_INFO') {
    return buildVideoInfo().then((info): Message => ({
      type: 'VIDEO_INFO_RESPONSE', payload: info,
    }));
  }

  if (message.type === 'DOWNLOAD_SUBTITLE') {
    const { baseUrl, languageCode, format } = message.payload;
    return downloadSubtitle(baseUrl, languageCode, format)
      .then((): Message => ({ type: 'DOWNLOAD_RESULT', payload: { success: true } }))
      .catch((err: unknown): Message => {
        const error = err instanceof Error ? err.message : String(err);
        return { type: 'DOWNLOAD_RESULT', payload: { success: false, error } };
      });
  }

  return false;
});
