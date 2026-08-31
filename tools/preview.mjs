import { writeFileSync } from 'node:fs';
import { encode } from '../src/qr/encoder.js';
import { buildScene, SLAB } from '../src/sculpt/build.js';
import { TEMPLATE_IDS } from '../src/sculpt/templates.js';
import { paletteFor, groundFor, mixHex, SCAN_GROUND, scanInk, sceneGround } from '../src/palettes.js';
import { sanitize, colorsFor, DEFAULT_CONFIG } from '../src/config.js';
import { shadowCells, shadowMask, isShaded } from '../src/render/shadows.js';
import { weatherFor } from '../src/weather.js';

const UW = 6.2;
const UV = 3.1;
const UH = 5.4;

function shade(hex, amount) {
  return mixHex(hex, amount < 0 ? '#000000' : '#FFFFFF', Math.abs(amount));
}

function scenePolys(scene, colors, ground, flip, ink, weather = weatherFor('clear')) {
  const half = scene.size / 2;
  const polys = [];

  const project = (x, y, z) => {
    const ix = (x - y) * UW;
    const iy = (x + y) * UV - z * UH;
    const tx = (x - y) * 0 + (x - half) * 8.6;
    const ty = (y - half) * 8.6;
    return [ix + (tx - ix) * flip, iy + (ty - iy) * flip];
  };

  const edge = [
    [-4, -4], [scene.size + 4, -4], [scene.size + 4, scene.size + 4], [-4, scene.size + 4],
  ];
  const weatherTint = weather.tint;
  const paint = (hex, amount = weather.tintAmount) => (
    weatherTint && amount > 0 ? mixHex(hex, weatherTint, amount) : hex
  );
  const groundTint = mixHex(ground.tint, SCAN_GROUND, flip);

  const add = (pts, color) => polys.push([pts, color]);

  add([[-4, scene.size + 4, 0], [scene.size + 4, scene.size + 4, 0],
    [scene.size + 4, scene.size + 4, -1.4], [-4, scene.size + 4, -1.4]].map(([x, y, z]) => project(x, y, z)),
  shade(ground.edge, 0.06));
  add([[scene.size + 4, -4, 0], [scene.size + 4, scene.size + 4, 0],
    [scene.size + 4, scene.size + 4, -1.4], [scene.size + 4, -4, -1.4]].map(([x, y, z]) => project(x, y, z)),
  shade(ground.edge, -0.12));
  add(edge.map(([x, y]) => project(x, y, 0)), groundTint);

  const mask = shadowMask(scene);
  const shadeAmount = 0.3 * weather.shadow * Math.max(0, 1 - flip / 0.7);
  if (flip < 0.7) {
    const shade = mixHex(ground.tint, '#2f3a2c', 0.34 * weather.shadow);
    for (const cell of shadowCells(scene)) {
      add([
        project(cell.x, cell.y, 0.02),
        project(cell.x + 1, cell.y, 0.02),
        project(cell.x + 1, cell.y + 1, 0.02),
        project(cell.x, cell.y + 1, 0.02),
      ], shade);
    }
  }

  for (const tuft of scene.tufts) {
    if (flip > 0.3) break;
    add([project(tuft.x, tuft.y, 0), project(tuft.x + 0.4, tuft.y - 0.2, 0.5),
      project(tuft.x + 0.2, tuft.y, 0)], ground.detailColor);
  }

  const boxes = [];
  for (const column of scene.columns) {
    const top = column.top + (SLAB - column.top) * flip;
    const base = column.base * (1 - flip);
    if (top - base < 0.02) continue;
    boxes.push({ ...column, top, base, decor: false });
  }
  if (flip < 0.6) {
    for (const block of scene.decor) {
      const fade = Math.max(0, 1 - flip / 0.6);
      const height = (block.top - block.base) * fade;
      if (height < 0.05) continue;
      boxes.push({ ...block, base: block.base + (block.top - block.base) * (1 - fade), top: block.base + (block.top - block.base) * (1 - fade) + height, decor: true });
    }
  }

  boxes.sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.base - b.base);

  for (const box of boxes) {
    let raw = paint(colors[box.slot]);
    if (!box.decor && isShaded(mask, box)) raw = mixHex(raw, '#2f3a2c', shadeAmount);
    const color = flip > 0 ? mixHex(raw, ink, flip) : raw;
    const gap = box.decor ? 0.08 : 0.06 * (1 - flip);
    const x0 = box.x + gap;
    const x1 = box.x + 1 - gap;
    const y0 = box.y + gap;
    const y1 = box.y + 1 - gap;
    add([project(x0, y1, box.top), project(x1, y1, box.top),
      project(x1, y1, box.base), project(x0, y1, box.base)], shade(color, -0.18));
    add([project(x1, y0, box.top), project(x1, y1, box.top),
      project(x1, y1, box.base), project(x1, y0, box.base)], shade(color, -0.3));
    add([project(x0, y0, box.top), project(x1, y0, box.top),
      project(x1, y1, box.top), project(x0, y1, box.top)], color);
  }

  return polys;
}

function themedGround(config) {
  return sceneGround(
    paletteFor(config.palette),
    groundFor(config.ground),
    config.tint,
    weatherFor(config.weather),
  );
}

const frames = [];
const payload = process.argv[3] || 'https://example.com';
const mode = process.argv[2] || 'templates';

if (mode === 'templates') {
  for (const object of TEMPLATE_IDS) {
    const config = sanitize({ ...DEFAULT_CONFIG, object, palette: 'seafoam', ground: 'grass' });
    const code = encode(payload, config.ecc);
    const scene = buildScene({ code, template: object, seed: config.seed });
    frames.push({
      label: object,
      polys: scenePolys(scene, colorsFor(config), themedGround(config), 0, paletteFor(config.palette).ink),
    });
  }
} else if (mode === 'flip') {
  const config = sanitize({ ...DEFAULT_CONFIG, object: 'tree' });
  const code = encode(payload, config.ecc);
  const scene = buildScene({ code, template: config.object, seed: config.seed });
  for (const flip of [0, 0.35, 0.7, 1]) {
    frames.push({
      label: `flip ${flip}`,
      polys: scenePolys(scene, colorsFor(config), themedGround(config), flip, paletteFor(config.palette).ink),
    });
  }
} else if (mode === 'weather') {
  for (const id of ['clear', 'sunny', 'rain', 'snow', 'fog']) {
    const config = sanitize({ ...DEFAULT_CONFIG, object: 'tree', palette: 'seafoam', ground: 'grass', weather: id });
    const code = encode(payload, config.ecc);
    const scene = buildScene({ code, template: config.object, seed: config.seed });
    frames.push({
      label: `${id}`,
      polys: scenePolys(scene, colorsFor(config), themedGround(config), 0, paletteFor(config.palette).ink, weatherFor(id)),
    });
  }
} else if (mode === 'palettes') {
  for (const palette of ['seafoam', 'sorbet', 'sakura', 'mint', 'peach', 'arcade']) {
    const grounds = { seafoam: 'grass', sorbet: 'picnic', sakura: 'concrete', mint: 'water', peach: 'sand', arcade: 'deck' };
    const objects = { seafoam: 'tree', sorbet: 'flower', sakura: 'cat', mint: 'duck', peach: 'house', arcade: 'tower' };
    const config = sanitize({ ...DEFAULT_CONFIG, palette, ground: grounds[palette], object: objects[palette] });
    const code = encode(payload, config.ecc);
    const scene = buildScene({ code, template: config.object, seed: 4242 });
    frames.push({
      label: `${palette} / ${objects[palette]}`,
      polys: scenePolys(scene, colorsFor(config), themedGround(config), 0, paletteFor(config.palette).ink),
    });
  }
}

writeFileSync(process.argv[4] || '/home/claude/preview.json', JSON.stringify(frames));
console.log(`${frames.length} frames`);
