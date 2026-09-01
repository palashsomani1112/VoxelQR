import { QUIET } from '../sculpt/build.js';
import { noteLayout } from './note.js';

const FONT_STACK = "Karla, 'Helvetica Neue', Helvetica, Arial, sans-serif";

function escapeXml(text) {
  return text.replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]
  ));
}

export function svgString(code, {
  ink, ground, size = 1024, radius = 0, note = '', notePosition = 'below',
} = {}) {
  const tile = code.size + QUIET * 2;
  const layout = noteLayout(note, { tile, position: notePosition });
  const paths = [];
  for (let y = 0; y < code.size; y++) {
    let run = 0;
    for (let x = 0; x <= code.size; x++) {
      const dark = x < code.size && code.modules[y][x] === true;
      if (dark) {
        run++;
        continue;
      }
      if (run > 0) {
        paths.push(`M${QUIET + x - run} ${QUIET + y}h${run}v1h${-run}z`);
        run = 0;
      }
    }
  }
  const height = Math.round((size * layout.totalHeight) / tile);
  const text = layout.lines.map((line, index) => (
    `<text x="${(tile / 2).toFixed(3)}" y="${(layout.firstBaseline + index * layout.lineHeight).toFixed(3)}"`
    + ` font-family="${FONT_STACK}" font-size="${layout.fontSize.toFixed(3)}"`
    + ` fill="${ink}" text-anchor="middle">${escapeXml(line)}</text>`
  )).join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}"`,
    ` viewBox="0 0 ${tile} ${layout.totalHeight.toFixed(3)}" shape-rendering="crispEdges">`,
    `<rect width="${tile}" height="${layout.totalHeight.toFixed(3)}" rx="${radius}" fill="${ground}"/>`,
    `<g transform="translate(0 ${layout.codeY.toFixed(3)})" shape-rendering="crispEdges">`,
    `<path fill="${ink}" d="${paths.join('')}"/>`,
    '</g>',
    text ? `<g shape-rendering="auto">${text}</g>` : '',
    '</svg>',
  ].join('');
}

export function drawFlat(canvas, code, {
  ink, ground, pixels = 1024, margin = true, note = '', notePosition = 'below',
}) {
  const tile = code.size + (margin ? QUIET * 2 : 0);
  const scale = Math.max(1, Math.floor(pixels / tile));
  const edge = tile * scale;
  const layout = noteLayout(margin ? note : '', { tile, position: notePosition });

  canvas.width = edge;
  canvas.height = Math.round(layout.totalHeight * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = ink;
  const offset = margin ? QUIET : 0;
  const top = layout.codeY * scale;
  for (let y = 0; y < code.size; y++) {
    for (let x = 0; x < code.size; x++) {
      if (code.modules[y][x] === true) {
        ctx.fillRect((x + offset) * scale, top + (y + offset) * scale, scale, scale);
      }
    }
  }

  if (layout.lines.length) {
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `${(layout.fontSize * scale).toFixed(1)}px ${FONT_STACK}`;
    layout.lines.forEach((line, index) => {
      ctx.fillText(line, edge / 2, (layout.firstBaseline + index * layout.lineHeight) * scale);
    });
  }
  return canvas;
}

export function densityNote(code) {
  const grain = code.size <= 25 ? 'chunky blocks'
    : code.size <= 33 ? 'medium blocks'
      : code.size <= 41 ? 'small blocks'
        : 'fine grain';
  return {
    label: `Version ${code.version}${code.level}, ${code.size} modules, ${grain}`,
    crowded: code.version > 6,
  };
}
