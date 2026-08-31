import { QUIET } from '../sculpt/build.js';

export function svgString(code, { ink, ground, size = 1024, radius = 0 } = {}) {
  const tile = code.size + QUIET * 2;
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
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${tile} ${tile}" shape-rendering="crispEdges">`,
    `<rect width="${tile}" height="${tile}" rx="${radius}" fill="${ground}"/>`,
    `<path fill="${ink}" d="${paths.join('')}"/>`,
    '</svg>',
  ].join('');
}

export function drawFlat(canvas, code, { ink, ground, pixels = 1024, margin = true }) {
  const tile = code.size + (margin ? QUIET * 2 : 0);
  const scale = Math.max(1, Math.floor(pixels / tile));
  const edge = tile * scale;
  canvas.width = edge;
  canvas.height = edge;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, edge, edge);
  ctx.fillStyle = ink;
  const offset = margin ? QUIET : 0;
  for (let y = 0; y < code.size; y++) {
    for (let x = 0; x < code.size; x++) {
      if (code.modules[y][x] === true) {
        ctx.fillRect((x + offset) * scale, (y + offset) * scale, scale, scale);
      }
    }
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
