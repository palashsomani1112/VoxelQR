import { encode } from '../src/qr/encoder.js';
import { buildPayload } from '../src/qr/payloads.js';
import { DEFAULT_CONFIG, sanitize, encodeConfig, decodeConfig, roll, colorsFor } from '../src/config.js';
import { svgString, densityNote } from '../src/export/flat.js';
import { wrapNote, cleanNote, noteLayout, NOTE_LIMIT } from '../src/export/note.js';
import { TEMPLATE_IDS } from '../src/sculpt/templates.js';
import { PALETTES, GROUNDS, SLOTS } from '../src/palettes.js';
import { QUIET } from '../src/sculpt/build.js';
import { WEATHER, WEATHER_IDS } from '../src/weather.js';
import { shareBase, viewLink, editLink, embedSnippet } from '../src/export/share.js';

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
    fields: { first: 'Alex', last: 'Morgan', org: 'Example Company', title: 'Designer', city: 'Anytown' },
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
    first: 'Alex', last: 'Morgan', org: 'Example Company', title: 'Designer',
    phone: '+1 555 0100', email: 'alex@example.com', url: 'https://example.com',
    city: 'Anytown', country: 'Country',
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
const tileUnits = code.size + QUIET * 2;
check('svg viewBox includes the quiet zone',
  svg.includes(`viewBox="0 0 ${tileUnits} ${tileUnits.toFixed(3)}"`), svg.slice(0, 160));
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
  { origin: 'https://example.github.io', pathname: '/voxel-qr/', base: 'https://example.github.io/voxel-qr/' },
  { origin: 'https://example.github.io', pathname: '/voxel-qr/index.html', base: 'https://example.github.io/voxel-qr/' },
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
  const shared = viewLink(shareBase(spot), 'PACKED');
  check(`shared link points at the viewer for ${spot.pathname}`,
    shared === `${spot.base}view.html#c=PACKED`, shared);
  check(`shared link is not the editor for ${spot.pathname}`,
    !shared.includes('index.html') && !/\/#c=/.test(shared), shared);
  check(`edit link keeps the current page for ${spot.pathname}`,
    editLink(spot, 'PACKED') === `${spot.origin}${spot.pathname}#c=PACKED`, editLink(spot, 'PACKED'));
}

const liveConfig = sanitize({ ...DEFAULT_CONFIG, type: 'wifi', fields: { ssid: 'Guest net', password: 'p a s s', security: 'SAE' } });
const livePacked = encodeConfig(liveConfig);
const liveSnippet = embedSnippet('https://example.github.io/voxel-qr/', livePacked);
check('embed hash survives a round trip',
  JSON.stringify(decodeConfig(liveSnippet.match(/#c=([A-Za-z0-9\-_]+)/)[1])) === JSON.stringify(liveConfig));
check('embed hash needs no url escaping', /^[A-Za-z0-9\-_]+$/.test(livePacked), livePacked);

check('embed sizes are numbers',
  embedSnippet('x/', 'y', { width: 400, height: 440 }).includes('width="400" height="440"'));

for (const weather of WEATHER_IDS) {
  const spec = WEATHER[weather];
  check(`${weather} has a name`, typeof spec.name === 'string' && spec.name.length > 0);
  check(`${weather} lighting is sane`, spec.key >= 0 && spec.key <= 2 && spec.ambient > 0 && spec.ambient <= 1.1,
    `${spec.key}/${spec.ambient}`);
  check(`${weather} shadow strength is a fraction`, spec.shadow >= 0 && spec.shadow <= 1.3, `${spec.shadow}`);
  check(`${weather} fog is a fraction`, spec.fog >= 0 && spec.fog < 1, `${spec.fog}`);
  check(`${weather} key colour is hex`, /^#[0-9a-f]{6}$/i.test(spec.keyColor), spec.keyColor);
  if (spec.particles) {
    check(`${weather} particle count is bounded`, spec.particles.count > 0 && spec.particles.count <= 500,
      `${spec.particles.count}`);
    check(`${weather} particle kind is known`, ['rain', 'snow'].includes(spec.particles.kind));
  }
  const withWeather = sanitize({ ...DEFAULT_CONFIG, weather });
  check(`${weather} survives a config round trip`,
    decodeConfig(encodeConfig(withWeather)).weather === weather);
}

check('unknown weather falls back', sanitize({ ...DEFAULT_CONFIG, weather: 'hail' }).weather === 'clear');

const angled = sanitize({ ...DEFAULT_CONFIG, azimuth: 2.345, elevation: 0.678 });
const angledBack = decodeConfig(encodeConfig(angled));
check('view angle survives a round trip',
  angledBack.azimuth === 2.345 && angledBack.elevation === 0.678,
  `${angledBack.azimuth}/${angledBack.elevation}`);
check('bad view angle is dropped',
  sanitize({ ...DEFAULT_CONFIG, azimuth: 'left', elevation: NaN }).azimuth === null);

let weatherRolled = new Set();
let rngW = 11;
const randW = () => {
  rngW = (rngW * 1103515245 + 12345) & 0x7fffffff;
  return rngW / 0x7fffffff;
};
for (let i = 0; i < 200; i++) weatherRolled.add(roll(DEFAULT_CONFIG, randW).weather);
check('dice reaches every weather', weatherRolled.size === WEATHER_IDS.length,
  [...weatherRolled].join(','));

check('a note is squashed to one line of whitespace', cleanNote('  a\n\nb   c ') === 'a b c');
check('a note is capped', cleanNote('x'.repeat(400)).length === NOTE_LIMIT);
check('an empty note wraps to nothing', wrapNote('', 30).length === 0);
check('a short note is one line', wrapNote('Scan me', 30).length === 1);
check('a long note wraps on words', (() => {
  const lines = wrapNote('Scan this for the wedding photo album and the full timetable', 24);
  return lines.length > 1 && lines.every((line) => line.length <= 24);
})(), wrapNote('Scan this for the wedding photo album and the full timetable', 24).join('|'));
check('an unbroken word is split rather than overflowing',
  wrapNote('y'.repeat(70), 20).every((line) => line.length <= 20));
check('wrapping keeps every word', (() => {
  const text = 'one two three four five six seven eight nine ten eleven twelve';
  return wrapNote(text, 18).join(' ') === text;
})());

const emptyLayout = noteLayout('', { tile: 33 });
check('no note leaves the square alone', emptyLayout.totalHeight === 33 && emptyLayout.codeY === 0);
check('no note means no lines', emptyLayout.lines.length === 0 && emptyLayout.blockHeight === 0);

for (const position of ['above', 'below']) {
  const layout = noteLayout('Scan for the album and the timetable', { tile: 33, position });
  check(`a ${position} note makes the image taller`, layout.totalHeight > 33, `${layout.totalHeight}`);
  check(`a ${position} note reserves a block`, layout.blockHeight > 0);
  check(`a ${position} note puts the code in the right place`,
    position === 'above' ? layout.codeY === layout.blockHeight : layout.codeY === 0,
    `${layout.codeY}`);
  check(`a ${position} note baseline sits inside its block`,
    position === 'above'
      ? layout.firstBaseline > 0 && layout.firstBaseline < layout.blockHeight
      : layout.firstBaseline > 33 && layout.firstBaseline < layout.totalHeight,
    `${layout.firstBaseline}`);
}

const noteCode = encode('https://example.com', 'M');
const plain = svgString(noteCode, { ink: '#39453a', ground: '#ffffff' });
const noted = svgString(noteCode, {
  ink: '#39453a', ground: '#ffffff', note: 'Scan for the album', notePosition: 'below',
});
check('a plain svg has no text', !plain.includes('<text'));
check('a noted svg carries the text', noted.includes('>Scan for the album<'));
check('a noted svg is taller than square', /width="1024" height="1(0[89]|1\d\d)/.test(noted)
  || Number(noted.match(/height="(\d+)"/)[1]) > 1024, noted.match(/height="(\d+)"/)[1]);
check('a noted svg still has one code path', (noted.match(/<path/g) || []).length === 1);
check('an above note shifts the code group',
  svgString(noteCode, { ink: '#1', ground: '#2', note: 'Hi', notePosition: 'above' })
    .includes('<g transform="translate(0 '));
check('note text is xml escaped',
  svgString(noteCode, { ink: '#1', ground: '#2', note: 'Fish & Chips <now>' })
    .includes('Fish &amp; Chips &lt;now&gt;'));
check('note keeps the code scannable by staying outside the quiet zone', (() => {
  const layout = noteLayout('a long note that wraps over at least two lines here', { tile: 33 });
  return layout.codeY === 0 && layout.firstBaseline > 33;
})());

const noteConfig = sanitize({ ...DEFAULT_CONFIG, note: 'Scan for the album', notePosition: 'above' });
const noteBack = decodeConfig(encodeConfig(noteConfig));
check('the note survives a share link', noteBack.note === 'Scan for the album');
check('the note position survives a share link', noteBack.notePosition === 'above');
check('a bad note position falls back',
  sanitize({ ...DEFAULT_CONFIG, notePosition: 'sideways' }).notePosition === 'below');

console.log(failures === 0 ? 'app: all checks passed' : `app: ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
