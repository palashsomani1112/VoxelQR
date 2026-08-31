import { encode } from '../src/qr/encoder.js';
import { buildPayload } from '../src/qr/payloads.js';
import { DEFAULT_CONFIG, sanitize, encodeConfig, decodeConfig, roll, colorsFor } from '../src/config.js';
import { svgString, densityNote } from '../src/export/flat.js';
import { TEMPLATE_IDS } from '../src/sculpt/templates.js';
import { PALETTES, GROUNDS, SLOTS } from '../src/palettes.js';
import { QUIET } from '../src/sculpt/build.js';
import { shareBase, shareLink, embedSnippet } from '../src/export/share.js';

let failures = 0;
function check(name, ok, detail = '') {
  if (!ok) {
    failures++;
    console.log(`FAIL  ${name} ${detail}`);
  }
}

const samples = [
  DEFAULT_CONFIG,
  { ...DEFAULT_CONFIG, type: 'wifi', fields: { ssid: 'Küche & Co', password: 'a;b,c\\d', security: 'WEP' } },
  {
    ...DEFAULT_CONFIG,
    type: 'vcard',
    object: 'cat',
    palette: 'sakura',
    ground: 'water',
    tint: '#aabbcc',
    zones: { primary: '#123456', accent: '#fedcba' },
    ecc: 'Q',
    seed: 54321,
    overlay: false,
    fields: { first: 'Palash', last: 'Doe', org: 'Liberty Mutual', title: 'UX designer', city: 'Frankfurt' },
  },
];

for (const [index, sample] of samples.entries()) {
  const config = sanitize(sample);
  const packed = encodeConfig(config);
  const back = decodeConfig(packed);
  check(`config round trip ${index}`, JSON.stringify(back) === JSON.stringify(config),
    `${packed.length} chars`);
  check(`packed hash is url safe ${index}`, /^[A-Za-z0-9\-_]+$/.test(packed), packed.slice(0, 40));
}

const heavy = sanitize({
  ...DEFAULT_CONFIG,
  type: 'vcard',
  fields: {
    first: 'Palash', last: 'Doe', org: 'Liberty Mutual', title: 'UX designer',
    phone: '+49 170 1234567', email: 'palash@example.com', url: 'https://example.com',
    city: 'Frankfurt am Main', country: 'Germany',
  },
});
check('embed hash stays reasonable', encodeConfig(heavy).length < 500, `${encodeConfig(heavy).length}`);

check('unknown values fall back', (() => {
  const cleaned = sanitize({ ...DEFAULT_CONFIG, object: 'dragon', palette: 'neon', ground: 'lava', ecc: 'Z' });
  return cleaned.object === DEFAULT_CONFIG.object
    && cleaned.palette === DEFAULT_CONFIG.palette
    && cleaned.ground === DEFAULT_CONFIG.ground
    && cleaned.ecc === DEFAULT_CONFIG.ecc;
})());

check('garbage hash throws rather than corrupts', (() => {
  try {
    decodeConfig('not-valid-base64-$$$');
    return false;
  } catch {
    return true;
  }
})());

let rngState = 7;
const rand = () => {
  rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
  return rngState / 0x7fffffff;
};
const rolled = new Set();
for (let i = 0; i < 200; i++) {
  const next = roll(DEFAULT_CONFIG, rand);
  check('roll keeps the payload', JSON.stringify(next.fields) === JSON.stringify(DEFAULT_CONFIG.fields));
  check('roll picks a real object', TEMPLATE_IDS.includes(next.object), next.object);
  check('roll picks a real palette', next.palette in PALETTES, next.palette);
  check('roll picks a real ground', next.ground in GROUNDS, next.ground);
  check('roll clears overrides', Object.keys(next.zones).length === 0 && next.tint === null);
  rolled.add(`${next.object}/${next.palette}/${next.ground}`);
}
check('roll produces variety', rolled.size > 100, `${rolled.size} combinations`);

for (const config of samples.map(sanitize)) {
  const colors = colorsFor(config);
  check('colours cover every slot', SLOTS.every((slot) => /^#[0-9a-f]{6}$/i.test(colors[slot])),
    JSON.stringify(colors));
}

const code = encode('https://example.com', 'M');
const svg = svgString(code, { ink: '#39453a', ground: '#ffffff' });
check('svg has one path', (svg.match(/<path/g) || []).length === 1);
check('svg viewBox includes the quiet zone',
  svg.includes(`viewBox="0 0 ${code.size + QUIET * 2} ${code.size + QUIET * 2}"`), svg.slice(0, 160));
check('svg is well formed', svg.startsWith('<svg') && svg.endsWith('</svg>'));
check('svg uses crisp edges', svg.includes('shape-rendering="crispEdges"'));

const runs = svg.match(/h(\d+)v1h-\1z/g) || [];
const runTotal = runs.reduce((sum, run) => sum + Number(run.match(/h(\d+)/)[1]), 0);
let darkCount = 0;
for (let y = 0; y < code.size; y++) {
  for (let x = 0; x < code.size; x++) if (code.modules[y][x]) darkCount++;
}
check('svg draws every dark module', runTotal === darkCount, `${runTotal} vs ${darkCount}`);

check('density note reads plainly', densityNote(code).label.startsWith('Version 2M'), densityNote(code).label);
check('density warns past version 6', densityNote(encode('y'.repeat(200), 'M')).crowded);
check('density stays calm at low versions', densityNote(code).crowded === false);

check('vcard payload feeds the encoder', (() => {
  const text = buildPayload('vcard', samples[2].fields);
  return encode(text, 'M').size >= 25;
})());

const locations = [
  { origin: 'http://localhost:8000', pathname: '/', base: 'http://localhost:8000/' },
  { origin: 'http://localhost:8000', pathname: '/index.html', base: 'http://localhost:8000/' },
  { origin: 'https://palash.github.io', pathname: '/voxel-qr/', base: 'https://palash.github.io/voxel-qr/' },
  { origin: 'https://palash.github.io', pathname: '/voxel-qr/index.html', base: 'https://palash.github.io/voxel-qr/' },
  { origin: 'https://example.com', pathname: '/a/b/page.html', base: 'https://example.com/a/b/' },
];

for (const spot of locations) {
  check(`share base for ${spot.pathname}`, shareBase(spot) === spot.base, shareBase(spot));
  const snippet = embedSnippet(shareBase(spot), 'PACKED');
  check(`embed points at embed.html for ${spot.pathname}`,
    snippet.includes(`${spot.base}embed.html#c=PACKED`), snippet.split('\n')[0]);
  check(`embed has one iframe for ${spot.pathname}`,
    (snippet.match(/<iframe/g) || []).length === 1 && snippet.trim().endsWith('</iframe>'));
  check(`embed carries a title for ${spot.pathname}`, snippet.includes('title="Scan this code"'));
  check(`embed has no double slash for ${spot.pathname}`,
    !snippet.replace(/https?:\/\//, '').includes('//'), snippet.split('\n')[0]);
  check(`share link keeps the page for ${spot.pathname}`,
    shareLink(spot, 'PACKED') === `${spot.origin}${spot.pathname}#c=PACKED`, shareLink(spot, 'PACKED'));
}

const liveConfig = sanitize({ ...DEFAULT_CONFIG, type: 'wifi', fields: { ssid: 'Guest net', password: 'p a s s', security: 'SAE' } });
const livePacked = encodeConfig(liveConfig);
const liveSnippet = embedSnippet('https://palash.github.io/voxel-qr/', livePacked);
check('embed hash survives a round trip',
  JSON.stringify(decodeConfig(liveSnippet.match(/#c=([A-Za-z0-9\-_]+)/)[1])) === JSON.stringify(liveConfig));
check('embed hash needs no url escaping', /^[A-Za-z0-9\-_]+$/.test(livePacked), livePacked);

check('embed sizes are numbers',
  embedSnippet('x/', 'y', { width: 400, height: 440 }).includes('width="400" height="440"'));

console.log(failures === 0 ? 'app: all checks passed' : `app: ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
