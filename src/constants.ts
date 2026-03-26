// YouTube URLs
export const YOUTUBE_WATCH_URL = 'https://www.youtube.com/watch?v=';
export const YOUTUBE_TIMEDTEXT_PATTERN = 'https://www.youtube.com/api/timedtext?*';
export const YOUTUBE_WATCH_PATH = 'youtube.com/watch';
export const YOUTUBE_TITLE_SUFFIX = / - YouTube$/i;

// Timing (ms)
export const UI_POLL_INTERVAL_MS = 500;
export const BLOB_CLEANUP_DELAY_MS = 1000;
export const ERROR_DISPLAY_DURATION_MS = 3000;

// UI colors
export const COLOR_LINK = '#3ea6ff';
export const COLOR_MUTED = '#aaa';
export const COLOR_ERROR = '#ff4444';

// Filename sanitization: characters unsafe for filesystems
export const UNSAFE_FILENAME_CHARS = /[/\\:*?"<>|]/g;
