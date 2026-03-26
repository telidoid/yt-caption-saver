interface TimedCue {
  start: number;
  duration: number;
  text: string;
}

function parseTimedTextXml(xml: string): TimedCue[] {
  if (!xml.trim()) {
    throw new Error('Empty subtitle XML received from YouTube');
  }
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid subtitle XML received from YouTube');
  }
  const elements = Array.from(doc.getElementsByTagName('text'));

  return elements
    .map((el) => {
      const start = parseFloat(el.getAttribute('start') ?? '');
      const duration = parseFloat(el.getAttribute('dur') ?? '');
      const text = (el.textContent ?? '').trim();
      return {
        start: Number.isFinite(start) ? start : 0,
        duration: Number.isFinite(duration) ? duration : 0,
        text,
      };
    })
    .filter((cue) => cue.text.length > 0);
}

function formatTimestamp(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const total = Math.floor(totalMs / 1000);
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
  return blocks.join('\n\n') + '\n';
}

export function xmlToTxt(xml: string): string {
  const cues = parseTimedTextXml(xml);
  return cues.map((c) => c.text).join('\n') + '\n';
}
