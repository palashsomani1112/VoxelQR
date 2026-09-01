import { encode } from '../src/qr/encoder.js';
import { composeScene } from '../src/render/compose.js';
import { DEFAULT_CONFIG, sanitize, roll } from '../src/config.js';
import { TEMPLATE_IDS } from '../src/sculpt/templates.js';
import { PALETTES, GROUNDS, BACKDROPS, SLOTS, contrastRatio, shadeFor } from '../src/palettes.js';
import { WEATHER_IDS } from '../src/weather.js';
import { MIN_CASTER } from '../src/render/shadows.js';

let failures = 0;
function check(name, ok, detail = '') {
  if (!ok) {
    failures++;
    console.log(`FAIL  ${name} ${detail}`);
  }
}

const code = encode('https://example.com', 'M');

function expectComposed(config, label) {
  let composed;
  try {
    composed = composeScene(sanitize(config), code);
  } catch (error) {
    check(`compose runs for ${label}`, false, error.message);
    return null;
  }

  check(`${label} returns a scene`, composed.scene && composed.scene.columns.length > 0);
  check(`${label} returns a palette ink`, /^#[0-9a-f]{6}$/i.test(composed.palette.ink));
  check(`${label} returns a ground tint`, /^#[0-9a-f]{6}$/i.test(composed.ground.tint), composed.ground.tint);
  check(`${label} returns a ground edge`, /^#[0-9a-f]{6}$/i.test(composed.ground.edge), composed.ground.edge);
  check(`${label} returns a ground detail`, /^#[0-9a-f]{6}$/i.test(composed.ground.detailColor));
  check(`${label} returns a shade`, /^#[0-9a-f]{6}$/i.test(composed.shade), composed.shade);
  check(`${label} covers every colour slot`,
    SLOTS.every((slot) => /^#[0-9a-f]{6}$/i.test(composed.colors[slot])));
  check(`${label} returns a weather preset`, typeof composed.weather.name === 'string');
  check(`${label} returns a shadow mask`, composed.mask instanceof Set);
  check(`${label} returns shadow cells`, Array.isArray(composed.cells));
  const shadeRatio = contrastRatio(composed.shade, composed.ground.tint);
  if (composed.weather.shadow >= 0.3) {
    check(`${label} shade separates from the ground`, shadeRatio >= 1.2, shadeRatio.toFixed(2));
  } else {
    check(`${label} shade is faint on purpose`, shadeRatio < 1.2, shadeRatio.toFixed(2));
  }
  return composed;
}

expectComposed(DEFAULT_CONFIG, 'the default config');

for (const object of TEMPLATE_IDS) expectComposed({ ...DEFAULT_CONFIG, object }, `object ${object}`);
for (const palette of Object.keys(PALETTES)) expectComposed({ ...DEFAULT_CONFIG, palette }, `palette ${palette}`);
for (const ground of Object.keys(GROUNDS)) expectComposed({ ...DEFAULT_CONFIG, ground }, `ground ${ground}`);
for (const weather of WEATHER_IDS) expectComposed({ ...DEFAULT_CONFIG, weather }, `weather ${weather}`);

for (const backdrop of Object.keys(BACKDROPS)) {
  const composed = expectComposed({ ...DEFAULT_CONFIG, backdrop }, `backdrop ${backdrop}`);
  if (!composed) continue;
  const expected = BACKDROPS[backdrop].color;
  check(`backdrop ${backdrop} passes its colour through`, composed.backdrop === expected,
    `${composed.backdrop} vs ${expected}`);
}

const custom = expectComposed({
  ...DEFAULT_CONFIG,
  tint: '#123456',
  backdropTint: '#abcdef',
  zones: { primary: '#ff00aa' },
}, 'custom colours');
if (custom) {
  check('a custom backdrop wins', custom.backdrop === '#abcdef', custom.backdrop);
  check('a custom slot wins', custom.colors.primary === '#ff00aa', custom.colors.primary);
}

let rngState = 3;
const rand = () => {
  rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
  return rngState / 0x7fffffff;
};
for (let i = 0; i < 120; i++) {
  const rolled = roll(DEFAULT_CONFIG, rand);
  if (!expectComposed(rolled, `roll ${rolled.object}/${rolled.palette}/${rolled.ground}/${rolled.weather}`)) break;
}

for (const payload of ['https://example.com', 'y'.repeat(240), '8675309']) {
  const codeFor = encode(payload, 'M');
  const composed = composeScene(sanitize(DEFAULT_CONFIG), codeFor);
  check(`shadow cells stay on the tile for a ${codeFor.size} module code`,
    composed.cells.every((cell) => (
      cell.x >= -composed.scene.quiet && cell.y >= -composed.scene.quiet
      && cell.x <= composed.scene.size + composed.scene.quiet
      && cell.y <= composed.scene.size + composed.scene.quiet
    )));
  check(`shadow cells are unique for a ${codeFor.size} module code`,
    new Set(composed.cells.map((cell) => `${cell.x},${cell.y}`)).size === composed.cells.length);
  check(`paving does not cast a shadow at ${codeFor.size} modules`,
    [...composed.mask].length > 0 && composed.scene.columns.some((column) => column.top >= MIN_CASTER));
  const shaded = composed.scene.columns.filter((column) => (
    column.top < MIN_CASTER && composed.mask.has(`${column.x},${column.y}`)
  ));
  check(`something stands in shade at ${codeFor.size} modules`, shaded.length > 0, `${shaded.length}`);
}

const angled = composeScene(sanitize({ ...DEFAULT_CONFIG, azimuth: 1.25, elevation: 0.4 }), code);
check('the saved angle is passed through', angled.view.azimuth === 1.25 && angled.view.elevation === 0.4);
const unangled = composeScene(sanitize(DEFAULT_CONFIG), code);
check('a missing angle stays null', unangled.view.azimuth === null);

for (const tint of ['#FFFFFF', '#123456', '#000000', '#C8E6A6', '#2F3A36', '#7f7f7f']) {
  const shade = shadeFor(tint, 1);
  check(`a shadow shows on ${tint}`,
    tint === '#000000' || contrastRatio(shade, tint) >= 1.2,
    contrastRatio(shade, tint).toFixed(2));
  check(`the shade for ${tint} is a real colour`, /^#[0-9a-f]{6}$/i.test(shade), shade);
}
check('a faint weather keeps a faint shadow', contrastRatio(shadeFor('#C8E6A6', 0.2), '#C8E6A6') < 1.2);

console.log(failures === 0 ? 'compose: all checks passed' : `compose: ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
