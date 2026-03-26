// YouTube URLs
export const YOUTUBE_WATCH_URL = 'https://www.youtube.com/watch?v=';
export const YOUTUBE_TIMEDTEXT_PATTERN = 'https://www.youtube.com/api/timedtext?*';
export const YOUTUBE_WATCH_PATH = 'youtube.com/watch';
export const YOUTUBE_TITLE_SUFFIX = / - YouTube$/i;

// Timing (ms)
export const UI_POLL_INTERVAL_MS = 500;
export const BLOB_CLEANUP_DELAY_MS = 10_000;
export const ERROR_DISPLAY_DURATION_MS = 3000;
export const POT_POLL_INTERVAL_MS = 100;
export const POT_POLL_TIMEOUT_MS = 5000;
export const POPUP_RETRY_DELAY_MS = 200;
export const POPUP_MAX_RETRIES = 10;

// UI colors
export const COLOR_LINK = '#3ea6ff';
export const COLOR_MUTED = '#aaa';
export const COLOR_ERROR = '#ff4444';

// Filename sanitization
export const UNSAFE_FILENAME_CHARS = /[/\\:*?"<>|\x00-\x1f]/g;
export const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM\d|LPT\d)(\.|$)/i;
export const MAX_FILENAME_LENGTH = 150;
