export const NOTE_LIMIT = 180;
export const NOTE_POSITIONS = ['above', 'below'];

export function cleanNote(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NOTE_LIMIT);
}

export function wrapNote(text, maxChars) {
  const clean = cleanNote(text);
  if (!clean) return [];
  const budget = Math.max(8, Math.floor(maxChars));
  const lines = [];
  let line = '';

  for (const word of clean.split(' ')) {
    if (!line) {
      line = word;
    } else if (`${line} ${word}`.length <= budget) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
    while (line.length > budget) {
      lines.push(line.slice(0, budget));
      line = line.slice(budget);
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function noteLayout(text, { tile, position = 'below' } = {}) {
  const fontSize = tile * 0.052;
  const lineHeight = fontSize * 1.34;
  const pad = tile * 0.045;
  const lines = wrapNote(text, tile / (fontSize * 0.52));
  const above = position === 'above';

  if (!lines.length) {
    return {
      lines: [],
      fontSize,
      lineHeight,
      pad,
      blockHeight: 0,
      totalHeight: tile,
      codeY: 0,
      firstBaseline: 0,
      above,
    };
  }

  const blockHeight = pad + lines.length * lineHeight + pad * 0.4;
  return {
    lines,
    fontSize,
    lineHeight,
    pad,
    blockHeight,
    totalHeight: tile + blockHeight,
    codeY: above ? blockHeight : 0,
    firstBaseline: (above ? pad : tile + pad) + fontSize * 0.86,
    above,
  };
}
