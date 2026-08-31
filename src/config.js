import { PALETTES, GROUNDS, BACKDROPS, paletteFor } from './palettes.js';
import { WEATHER } from './weather.js';
import { TEMPLATE_IDS } from './sculpt/templates.js';

export const DEFAULT_CONFIG = {
  version: 1,
  type: 'url',
  fields: { url: 'https://github.com' },
  object: 'tree',
  palette: 'seafoam',
  zones: {},
  ground: 'grass',
  tint: null,
  backdrop: 'slate',
  backdropTint: null,
  weather: 'clear',
  azimuth: null,
  elevation: null,
  ecc: 'M',
  seed: 1337,
  overlay: true,
};

const SHORT = {
  version: 'v', type: 't', fields: 'f', object: 'o', palette: 'p',
  zones: 'z', ground: 'g', tint: 'n', ecc: 'e', seed: 's', overlay: 'y',
  backdrop: 'b', backdropTint: 'k', weather: 'w', azimuth: 'a', elevation: 'l',
};

const LONG = Object.fromEntries(Object.entries(SHORT).map(([k, v]) => [v, k]));

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeConfig(config) {
  const packed = {};
  for (const [key, short] of Object.entries(SHORT)) {
    const value = config[key];
    if (value === undefined || value === null) continue;
    if (key !== 'fields') {
      if (typeof value === 'object' && Object.keys(value).length === 0) continue;
      if (JSON.stringify(value) === JSON.stringify(DEFAULT_CONFIG[key])) continue;
    }
    packed[short] = value;
  }
  packed.v = config.version ?? 1;
  packed.f = config.fields || {};
  return toBase64Url(JSON.stringify(packed));
}

export function decodeConfig(encoded) {
  const packed = JSON.parse(fromBase64Url(encoded));
  const config = { ...DEFAULT_CONFIG, fields: {}, zones: {} };
  for (const [short, value] of Object.entries(packed)) {
    const key = LONG[short];
    if (key) config[key] = value;
  }
  return sanitize(config);
}

function isHex(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

export function sanitize(config) {
  const out = { ...DEFAULT_CONFIG, ...config };
  out.fields = { ...(config.fields || {}) };
  out.zones = { ...(config.zones || {}) };
  if (!TEMPLATE_IDS.includes(out.object)) out.object = DEFAULT_CONFIG.object;
  if (!PALETTES[out.palette]) out.palette = DEFAULT_CONFIG.palette;
  if (!GROUNDS[out.ground]) out.ground = DEFAULT_CONFIG.ground;
  if (!BACKDROPS[out.backdrop]) out.backdrop = DEFAULT_CONFIG.backdrop;
  if (!WEATHER[out.weather]) out.weather = DEFAULT_CONFIG.weather;
  out.azimuth = Number.isFinite(out.azimuth) ? out.azimuth : null;
  out.elevation = Number.isFinite(out.elevation) ? out.elevation : null;
  if (!isHex(out.backdropTint)) out.backdropTint = null;
  if (!isHex(out.tint)) out.tint = null;
  for (const [slot, value] of Object.entries(out.zones)) {
    if (!isHex(value)) delete out.zones[slot];
  }
  if (!['L', 'M', 'Q', 'H'].includes(out.ecc)) out.ecc = DEFAULT_CONFIG.ecc;
  out.seed = Number.isFinite(out.seed) ? Math.abs(Math.floor(out.seed)) % 100000 : 1;
  out.overlay = out.overlay !== false;
  return out;
}

export function colorsFor(config) {
  const palette = paletteFor(config.palette);
  return { ...palette.slots, ...config.zones };
}

export function roll(config, rng = Math.random) {
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const backdrops = Object.keys(BACKDROPS).filter((id) => id !== 'clear');
  return sanitize({
    ...config,
    zones: {},
    tint: null,
    backdropTint: null,
    object: pick(TEMPLATE_IDS),
    palette: pick(Object.keys(PALETTES)),
    ground: pick(Object.keys(GROUNDS)),
    backdrop: pick(backdrops),
    weather: pick(Object.keys(WEATHER)),
    seed: Math.floor(rng() * 100000),
  });
}

export function backdropColor(config) {
  if (config.backdropTint) return config.backdropTint;
  return BACKDROPS[config.backdrop] ? BACKDROPS[config.backdrop].color : null;
}
