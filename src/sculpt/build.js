import { templateFor } from './templates.js';

export const MIN_COLUMN = 0.4;
export const SLAB = 0.55;
export const QUIET = 4;

export function makeRng(seed) {
  let state = (seed | 0) || 1;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function finderRing(size, x, y) {
  const corners = [[0, 0], [size - 7, 0], [0, size - 7]];
  for (const [cx, cy] of corners) {
    if (x >= cx && x < cx + 7 && y >= cy && y < cy + 7) {
      return Math.max(Math.abs(x - cx - 3), Math.abs(y - cy - 3));
    }
  }
  return -1;
}

function isTiming(size, x, y) {
  if (x === 6 && y >= 8 && y < size - 8) return true;
  return y === 6 && x >= 8 && x < size - 8;
}

export function buildScene({ code, template: templateId, seed = 1, lift = 1 }) {
  const { size, modules } = code;
  const template = templateFor(templateId);
  const rng = makeRng(seed);

  const diameter = size * template.reach * 2;
  const radius = diameter / 2;
  const cx = size / 2;
  const cy = size * 0.46;
  const unit = 1 / diameter;

  const columns = [];
  const decor = [];
  const tufts = [];

  const localFor = (x, y) => {
    const nx = (x + 0.5 - cx) / radius;
    const ny = (y + 0.5 - cy) / radius;
    return { nx, ny, d: Math.hypot(nx, ny) };
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dark = modules[y][x] === true;
      const { nx, ny, d } = localFor(x, y);
      const ring = finderRing(size, x, y);

      if (!dark) {
        if (d <= 1) {
          const density = template.fill ?? 0.6;
          for (const part of template.decor(nx, ny)) {
            if (part.top - part.base < 0.02) continue;
            if (!part.keep && rng() > density) continue;
            decor.push({
              x, y,
              base: part.base * diameter * lift,
              top: part.top * diameter * lift,
              slot: part.slot,
            });
          }
        } else if (ring < 0 && rng() < 0.1) {
          tufts.push({ x: x + 0.25 + rng() * 0.5, y: y + 0.25 + rng() * 0.5 });
        }
        continue;
      }

      if (ring >= 0) {
        const height = ring <= 1 ? 2.6 : 1.5;
        columns.push({ x, y, base: 0, top: height, slot: 'landmark', kind: 'landmark' });
        continue;
      }

      const apron = MIN_COLUMN + 0.44 * Math.max(0, 1 - Math.max(0, d - 1) / 1.1);

      if (isTiming(size, x, y)) {
        columns.push({ x, y, base: 0, top: MIN_COLUMN, slot: 'scatter', kind: 'path' });
        continue;
      }

      const parts = d <= 1 ? template.sample(nx, ny) : [];
      const usable = parts.filter((p) => (p.top - p.base) * diameter >= MIN_COLUMN);

      if (usable.length === 0) {
        columns.push({ x, y, base: 0, top: apron, slot: 'scatter', kind: 'scatter' });
        continue;
      }

      const grounded = usable.some((p) => p.base * diameter < MIN_COLUMN);
      if (!grounded) {
        columns.push({ x, y, base: 0, top: MIN_COLUMN, slot: 'scatter', kind: 'stub' });
      }
      for (const part of usable) {
        columns.push({
          x, y,
          base: part.base * diameter * lift,
          top: part.top * diameter * lift,
          slot: part.slot,
          kind: 'object',
        });
      }
    }
  }

  return {
    size,
    quiet: QUIET,
    tile: size + QUIET * 2,
    unit,
    center: { x: cx, y: cy },
    radius,
    columns,
    decor,
    tufts,
    peak: columns.reduce((max, c) => Math.max(max, c.top), 0),
  };
}

export function footprint(scene) {
  const seen = new Set();
  for (const column of scene.columns) seen.add(`${column.x},${column.y}`);
  return seen;
}
