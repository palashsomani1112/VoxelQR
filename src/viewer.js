import { encode } from './qr/encoder.js';
import { buildPayload } from './qr/payloads.js';
import { DEFAULT_CONFIG, sanitize, decodeConfig, backdropColor } from './config.js';
import { paletteFor, onColor } from './palettes.js';
import { drawFlat } from './export/flat.js';

const stageHost = document.querySelector('#stage');
const overlay = document.querySelector('#overlay');

function readConfig() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const packed = params.get('c');
  if (!packed) return sanitize(DEFAULT_CONFIG);
  try {
    return decodeConfig(packed);
  } catch {
    return sanitize(DEFAULT_CONFIG);
  }
}

const config = readConfig();
const text = buildPayload(config.type, config.fields) || 'https://github.com';

let code;
try {
  code = encode(text, config.ecc);
} catch {
  code = encode(text.slice(0, 260), 'L');
}

const backdrop = backdropColor(config);
if (backdrop) {
  document.documentElement.style.setProperty('--backdrop', backdrop);
  document.documentElement.style.setProperty('--on-backdrop', onColor(backdrop));
  document.body.style.background = backdrop;
}

const toggle = document.querySelector('#toggle');
const hint = document.querySelector('#hint');

async function boot() {
  try {
    const { createDiorama } = await import('./render/diorama.js');
    const diorama = createDiorama(stageHost, {
      overlay,
      onState: (state) => {
        if (!toggle) return;
        const open = state.overlay > 0.5;
        toggle.setAttribute('aria-pressed', String(open));
        toggle.textContent = open ? 'Show the scene' : 'Show the code';
        if (hint) hint.textContent = open ? 'Point a camera at it.' : 'Tap the scene for the code. Drag to turn it.';
      },
    });
    diorama.build(config, code);
    stageHost.tabIndex = 0;
    stageHost.setAttribute('role', 'button');
    stageHost.setAttribute('aria-label', 'Voxel scene. Activate to flip to the scannable code.');
    if (toggle) toggle.addEventListener('click', () => diorama.flip.toggle());
  } catch {
    const flat = document.createElement('canvas');
    flat.className = 'flat-fallback';
    stageHost.appendChild(flat);
    drawFlat(flat, code, { ink: paletteFor(config.palette).ink, ground: '#ffffff', pixels: 720 });
    if (toggle) toggle.hidden = true;
  }
}

boot();
