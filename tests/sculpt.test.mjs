import { encode } from '../src/qr/encoder.js';
import { buildScene, footprint, MIN_COLUMN } from '../src/sculpt/build.js';
import { TEMPLATE_IDS } from '../src/sculpt/templates.js';
import { buildPayload, PAYLOAD_TYPES } from '../src/qr/payloads.js';
import { PALETTES, GROUNDS, SLOTS, contrastRatio, scanInk, SCAN_GROUND } from '../src/palettes.js';

let failures = 0;
function check(name, ok, detail = '') {
  if (!ok) {
    failures++;
    console.log(`FAIL  ${name} ${detail}`);
  }
}

const payloads = [
  'https://example.com',
  'https://example.github.io/voxel-qr/',
  'BEGIN:VCARD\r\nVERSION:3.0\r\nN:Doe;Jane;;;\r\nFN:Jane Doe\r\nORG:Example Company\r\nTEL;TYPE=CELL:+15550100\r\nEMAIL;TYPE=INTERNET:jane@example.com\r\nEND:VCARD',
  'x'.repeat(240),
];

for (const text of payloads) {
  const code = encode(text, 'M');
  const dark = new Set();
  for (let y = 0; y < code.size; y++) {
    for (let x = 0; x < code.size; x++) if (code.modules[y][x]) dark.add(`${x},${y}`);
  }

  for (const templateId of TEMPLATE_IDS) {
    for (const seed of [1, 77, 9001]) {
      const scene = buildScene({ code, template: templateId, seed });
      const prints = footprint(scene);

      check(`footprint equals dark set v${code.version} ${templateId} ${seed}`,
        prints.size === dark.size && [...prints].every((k) => dark.has(k)),
        `${prints.size} vs ${dark.size}`);

      const grounded = new Map();
      for (const column of scene.columns) {
        const key = `${column.x},${column.y}`;
        grounded.set(key, Math.min(grounded.get(key) ?? Infinity, column.base));
      }
      const floating = [...grounded.entries()].filter(([, base]) => base >= MIN_COLUMN);
      check(`every module reaches the ground ${templateId} ${seed}`, floating.length === 0,
        `${floating.length} floating`);

      const thin = scene.columns.filter((c) => c.top - c.base < MIN_COLUMN - 1e-9);
      check(`no sliver columns ${templateId} ${seed}`, thin.length === 0, `${thin.length}`);

      const outside = scene.columns.filter((c) => c.x < 0 || c.y < 0 || c.x >= code.size || c.y >= code.size);
      check(`quiet zone stays clear ${templateId} ${seed}`, outside.length === 0, `${outside.length}`);

      const decorOnDark = scene.decor.filter((d) => dark.has(`${d.x},${d.y}`));
      check(`decor only on light modules ${templateId} ${seed}`, decorOnDark.length === 0,
        `${decorOnDark.length}`);

      const slotsUsed = new Set(scene.columns.map((c) => c.slot));
      check(`slots are known ${templateId}`, [...slotsUsed].every((s) => SLOTS.includes(s)),
        [...slotsUsed].join(','));
    }
  }
}

const tallEnough = TEMPLATE_IDS.filter((id) => {
  const code = encode('https://example.com', 'M');
  const scene = buildScene({ code, template: id, seed: 3 });
  return scene.peak >= 4;
});
check('every template builds something tall', tallEnough.length === TEMPLATE_IDS.length,
  `${tallEnough.length}/${TEMPLATE_IDS.length}`);

const objectCounts = TEMPLATE_IDS.map((id) => {
  const code = encode('https://example.com', 'M');
  const scene = buildScene({ code, template: id, seed: 3 });
  return scene.columns.filter((c) => c.kind === 'object').length;
});
check('every template claims modules', objectCounts.every((n) => n > 20), objectCounts.join(','));

const cases = {
  url: { url: 'example.com' },
  text: { text: 'hello' },
  wifi: { ssid: 'Kitchen; Net', password: 'hunter2', security: 'WPA' },
  vcard: { first: 'Jane', last: 'Doe', org: 'Example, Company', phone: '+1 555 0100', email: 'jane@example.com' },
  mecard: { first: 'Jane', last: 'Doe', phone: '+15550100' },
  email: { to: 'a@b.com', subject: 'Hi there' },
  phone: { number: '+1 (555) 0100' },
  sms: { number: '+15550100', message: 'yo' },
  geo: { lat: '51.5074', lon: '-0.1278' },
};

check('every payload type is covered', PAYLOAD_TYPES.every((t) => t in cases), PAYLOAD_TYPES.join(','));

check('url gets a scheme', buildPayload('url', cases.url) === 'https://example.com');
check('wifi escapes separators', buildPayload('wifi', cases.wifi) === 'WIFI:T:WPA;S:Kitchen\\; Net;P:hunter2;;',
  buildPayload('wifi', cases.wifi));
check('vcard escapes commas', buildPayload('vcard', cases.vcard).includes('ORG:Example\\, Company'));
check('vcard uses crlf', buildPayload('vcard', cases.vcard).split('\r\n').length === 8,
  String(buildPayload('vcard', cases.vcard).split('\r\n').length));
check('vcard fn line', buildPayload('vcard', cases.vcard).includes('FN:Jane Doe'));
check('mecard is shorter than vcard',
  buildPayload('mecard', cases.mecard).length < buildPayload('vcard', cases.vcard).length);
check('phone strips punctuation', buildPayload('phone', cases.phone) === 'tel:+15550100',
  buildPayload('phone', cases.phone));
check('geo formats numbers', buildPayload('geo', cases.geo) === 'geo:51.5074,-0.1278');
check('empty fields yield empty payload', buildPayload('wifi', {}) === '');

for (const [type, fields] of Object.entries(cases)) {
  const text = buildPayload(type, fields);
  check(`${type} payload encodes`, text.length > 0 && encode(text, 'M').size > 0);
}

for (const [id, palette] of Object.entries(PALETTES)) {
  check(`${id} ink scans on the pale tile`, contrastRatio(palette.ink, SCAN_GROUND) >= 7,
    contrastRatio(palette.ink, SCAN_GROUND).toFixed(2));
  for (const slot of SLOTS) {
    check(`${id} defines ${slot}`, /^#[0-9a-f]{6}$/i.test(palette.slots[slot] || ''), palette.slots[slot]);
    const ink = scanInk(palette.slots[slot], SCAN_GROUND);
    check(`${id} ${slot} reaches scan contrast`, contrastRatio(ink, SCAN_GROUND) >= 5,
      contrastRatio(ink, SCAN_GROUND).toFixed(2));
  }
}

for (const [id, ground] of Object.entries(GROUNDS)) {
  check(`${id} ground tint`, /^#[0-9a-f]{6}$/i.test(ground.tint), ground.tint);
  check(`${id} ground has a name`, typeof ground.name === 'string' && ground.name.length > 0);
}

console.log(failures === 0 ? 'sculpt: all checks passed' : `sculpt: ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
