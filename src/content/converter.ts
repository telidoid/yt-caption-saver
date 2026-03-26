interface TimedCue {
  start: number;
  duration: number;
  text: string;
}

function parseTimedTextXml(xml: string): TimedCue[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid subtitle XML received from YouTube');
  }
  const elements = Array.from(doc.getElementsByTagName('text'));

  return elements
    .map((el) => ({
      start: parseFloat(el.getAttribute('start') ?? '0'),
      duration: parseFloat(el.getAttribute('dur') ?? '0'),
      text: (el.textContent ?? '')
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .trim(),
    }))
    .filter((cue) => cue.text.length > 0);
}

function unescapeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function formatTimestamp(seconds: number): string {
  const ms = Math.floor(seconds * 1000) % 1000;
  const total = Math.floor(seconds);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return (
    String(hh).padStart(2, '0') + ':' +
    String(mm).padStart(2, '0') + ':' +
    String(ss).padStart(2, '0') + ',' +
    String(ms).padStart(3, '0')
  );
}

export function xmlToSrt(xml: string): string {
  const cues = parseTimedTextXml(xml);
  const blocks = cues.map((cue, i) =>
    `${i + 1}\n${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.start + cue.duration)}\n${cue.text}`
  );
  return unescapeHtmlEntities(blocks.join('\n\n') + '\n');
}

export function xmlToTxt(xml: string): string {
  const cues = parseTimedTextXml(xml);
  return unescapeHtmlEntities(cues.map((c) => c.text).join('\n') + '\n');
}
