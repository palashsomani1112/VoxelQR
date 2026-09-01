export const SLOTS = ['primary', 'secondary', 'accent', 'landmark', 'scatter'];

export const SLOT_LABELS = {
  primary: 'Main mass',
  secondary: 'Support',
  accent: 'Highlight',
  landmark: 'Corner markers',
  scatter: 'Loose blocks',
};

export const PALETTES = {
  seafoam: {
    name: 'Seafoam',
    slots: { primary: '#9FD8A8', secondary: '#B98F6B', accent: '#F5B8C9', landmark: '#6FA97E', scatter: '#AFC7A6' },
    ink: '#39453A',
  },
  sorbet: {
    name: 'Sorbet',
    slots: { primary: '#F7B7C6', secondary: '#C98A79', accent: '#FFE3A3', landmark: '#D98A9E', scatter: '#E3C3C6' },
    ink: '#4A3038',
  },
  sakura: {
    name: 'Sakura',
    slots: { primary: '#F2C6DE', secondary: '#A98374', accent: '#FFF0BE', landmark: '#C892AE', scatter: '#D8BFCB' },
    ink: '#42303A',
  },
  mint: {
    name: 'Mint',
    slots: { primary: '#B4E7DA', secondary: '#8FA8A0', accent: '#FFD59A', landmark: '#77BCAB', scatter: '#BDD5CD' },
    ink: '#2C4340',
  },
  peach: {
    name: 'Peach soda',
    slots: { primary: '#FFC7A0', secondary: '#C08A6A', accent: '#A6DAE6', landmark: '#E0956C', scatter: '#E5C6AE' },
    ink: '#463126',
  },
  arcade: {
    name: 'Arcade',
    slots: { primary: '#7FC7B0', secondary: '#6E5A4E', accent: '#F2A65A', landmark: '#3F7D6B', scatter: '#8FA697' },
    ink: '#1F2A26',
  },
};

export const GROUNDS = {
  grass: { name: 'Grass', tint: '#C8E6A6', edge: '#B08A5E', detail: 'tufts', detailColor: '#A6CE7C' },
  sand: { name: 'Sand', tint: '#F4E3BE', edge: '#C9A874', detail: 'speckle', detailColor: '#E2CB9C' },
  water: { name: 'Water', tint: '#B9DFEA', edge: '#7FA9BC', detail: 'ripples', detailColor: '#9CCEDE' },
  snow: { name: 'Snow', tint: '#EEF3F6', edge: '#B9C4CC', detail: 'speckle', detailColor: '#DCE6EC' },
  picnic: { name: 'Picnic check', tint: '#F7DCDC', edge: '#C08A8A', detail: 'check', detailColor: '#EBBFBF' },
  deck: { name: 'Wood deck', tint: '#E0C39C', edge: '#A97C4F', detail: 'planks', detailColor: '#CFAE85' },
  concrete: { name: 'Lilac concrete', tint: '#DCD6E6', edge: '#A79FB5', detail: 'speckle', detailColor: '#CBC3D8' },
};

export const SCAN_GROUND = '#F4F7EE';

export const BACKDROPS = {
  paper: { name: 'Paper', color: '#F6F1E6' },
  mist: { name: 'Mist', color: '#E3EDF3' },
  blush: { name: 'Blush', color: '#F8E6EB' },
  lilac: { name: 'Lilac', color: '#ECE6F5' },
  butter: { name: 'Butter', color: '#F9F0D7' },
  sage: { name: 'Sage', color: '#E6EFE5' },
  clay: { name: 'Clay', color: '#F2E2D6' },
  slate: { name: 'Slate', color: '#2F3A36' },
  ink: { name: 'Ink', color: '#232B28' },
  clear: { name: 'None', color: null },
};

export function backdropFor(id) {
  return BACKDROPS[id] || BACKDROPS.slate;
}

export function paletteFor(id) {
  return PALETTES[id] || PALETTES.seafoam;
}

export function groundFor(id) {
  return GROUNDS[id] || GROUNDS.grass;
}

function channels(hex) {
  const clean = hex.replace('#', '');
  const value = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

export function toHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

export function mixHex(a, b, amount) {
  const from = channels(a);
  const to = channels(b);
  return toHex(from.map((v, i) => v + (to[i] - v) * amount));
}

export function luminance(hex) {
  const [r, g, b] = channels(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const light = Math.max(luminance(a), luminance(b));
  const dark = Math.min(luminance(a), luminance(b));
  return (light + 0.05) / (dark + 0.05);
}

export function onColor(hex) {
  return luminance(hex) > 0.42 ? '#26302C' : '#F3F1E8';
}

export function nudgeAway(color, from, target = 1.22) {
  if (contrastRatio(color, from) >= target) return color;
  const away = luminance(color) >= luminance(from) ? '#FFFFFF' : '#232B28';
  for (let step = 1; step <= 12; step++) {
    const shifted = mixHex(color, away, step / 24);
    if (contrastRatio(shifted, from) >= target) return shifted;
  }
  return mixHex(color, away, 0.5);
}

export function groundTintFor(palette, ground, custom) {
  if (custom) return custom;
  return nudgeAway(ground.tint, palette.slots.primary);
}

export function objectTintFor(palette, weather, slot = 'primary') {
  const base = palette.slots[slot];
  if (!weather || !weather.tint || !weather.tintAmount) return base;
  return mixHex(base, weather.tint, weather.tintAmount);
}

export function sceneGround(palette, ground, custom, weather) {
  const theme = { ...ground };
  theme.tint = custom || ground.tint;
  if (weather && weather.tint) {
    const amount = weather.groundAmount ?? weather.tintAmount;
    if (amount > 0) {
      theme.tint = mixHex(theme.tint, weather.tint, amount);
      theme.detailColor = mixHex(theme.detailColor, weather.tint, amount);
      theme.edge = mixHex(theme.edge, weather.tint, amount * 0.6);
    }
  }
  theme.tint = nudgeAway(theme.tint, objectTintFor(palette, weather));
  return theme;
}

export const SHADE_INK = '#2f3a2c';

export function shadeFor(tint, strength = 1, target = 1.22) {
  const base = mixHex(tint, SHADE_INK, 0.34 * strength);
  if (strength < 0.3) return base;
  if (contrastRatio(base, tint) >= target) return base;
  for (let step = 1; step <= 10; step++) {
    const deeper = mixHex(tint, '#000000', 0.18 + step * 0.08);
    if (contrastRatio(deeper, tint) >= target) return deeper;
  }
  return mixHex(tint, '#FFFFFF', 0.24);
}

export function scanInk(color, background, target = 5) {
  let mixed = color;
  for (let step = 0; step <= 20; step++) {
    mixed = mixHex(color, '#1A211C', step / 20);
    if (contrastRatio(mixed, background) >= target) return mixed;
  }
  return mixed;
}
