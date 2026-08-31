import { encode } from './qr/encoder.js';
import { buildPayload } from './qr/payloads.js';
import {
  DEFAULT_CONFIG, sanitize, encodeConfig, decodeConfig, roll, backdropColor,
} from './config.js';
import { paletteFor, onColor } from './palettes.js';
import { drawFlat, svgString, densityNote } from './export/flat.js';
import { shareBase, shareLink, embedSnippet, writeClipboard } from './export/share.js';
import { createContentPanel } from './ui/content.js';
import { createStylePanel } from './ui/style.js';

const shell = document.querySelector('#shell');
const stageHost = document.querySelector('#stage');
const overlay = document.querySelector('#overlay');
const hint = document.querySelector('#hint');
const toast = document.querySelector('#toast');
const toggle = document.querySelector('#toggle');
const contentDrawer = document.querySelector('#content-drawer');
const styleDrawer = document.querySelector('#style-drawer');
const scratch = document.createElement('canvas');

let config = readConfigFromLocation();
let code = null;
let diorama = null;
let content = null;
let style = null;
let flatFallback = null;

function readConfigFromLocation() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const packed = params.get('c');
  if (!packed) {
    return sanitize({
      ...DEFAULT_CONFIG,
      fields: { url: `${window.location.origin}${window.location.pathname}` },
    });
  }
  try {
    return decodeConfig(packed);
  } catch {
    return sanitize(DEFAULT_CONFIG);
  }
}

function payloadText() {
  return buildPayload(config.type, config.fields);
}

function encodeCurrent() {
  const text = payloadText() || 'https://github.com';
  try {
    return { code: encode(text, config.ecc), text, trimmed: false };
  } catch {
    let kept = text;
    while (kept.length > 8) {
      kept = kept.slice(0, Math.floor(kept.length * 0.9));
      try {
        return { code: encode(kept, 'L'), text: kept, trimmed: true };
      } catch {
        continue;
      }
    }
    return { code: encode('https://github.com', 'L'), text: '', trimmed: true };
  }
}

function paintBackdrop() {
  const color = backdropColor(config);
  const root = document.documentElement.style;
  if (color) {
    root.setProperty('--backdrop', color);
    const on = onColor(color);
    root.setProperty('--on-backdrop', on);
    root.setProperty('--on-backdrop-soft', on === '#26302C' ? '#5c6862' : '#b7c1ba');
  } else {
    root.setProperty('--backdrop', '#f1efe9');
    root.setProperty('--on-backdrop', '#26302C');
    root.setProperty('--on-backdrop-soft', '#5c6862');
  }
}

let hashTimer = 0;
function writeHash(packed) {
  window.clearTimeout(hashTimer);
  hashTimer = window.setTimeout(() => {
    window.history.replaceState(null, '', `#c=${packed}`);
  }, 350);
}

function refresh() {
  const result = encodeCurrent();
  code = result.code;
  paintBackdrop();
  if (diorama) diorama.build(config, code);
  if (flatFallback) refreshFlatFallback(flatFallback);
  if (content) content.showPayload(result.text || '(nothing yet)');

  const note = densityNote(code);
  const warnings = [];
  if (code.relaxed) warnings.push(`Error correction eased to ${code.level} to fit.`);
  if (result.trimmed) warnings.push('That is too long for one code. Shorten it, or link out instead.');
  else if (note.crowded) warnings.push('Blocks are getting small. A shorter payload keeps them chunky.');
  if (style) style.renderMeter(note.label, warnings.join(' '));

  const packed = encodeConfig(config);
  writeHash(packed);
  return packed;
}

function apply(next, options) {
  config = sanitize(next);
  if (content) content.setState(config, options);
  if (style) style.setState(config);
  refresh();
}

function download(name, href) {
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function announce(message) {
  toast.textContent = message;
  toast.classList.add('is-on');
  window.clearTimeout(announce.timer);
  announce.timer = window.setTimeout(() => {
    toast.classList.remove('is-on');
    toast.textContent = '';
  }, 5000);
}

async function copy(text, label) {
  const copied = await writeClipboard(text);
  announce(copied ? `${label} copied to the clipboard.` : `Copying was blocked. ${label} is selected below.`);
  style.showShare(label, text, async (again) => {
    const retried = await writeClipboard(again);
    announce(retried ? `${label} copied to the clipboard.` : 'Copying is blocked here. Select the text and copy it.');
  });
}

function handleExport(action) {
  const packed = encodeConfig(config);
  const palette = paletteFor(config.palette);
  if (action === 'qr-png') {
    drawFlat(scratch, code, { ink: palette.ink, ground: '#ffffff', pixels: 1024 });
    download('voxel-qr-code.png', scratch.toDataURL('image/png'));
    announce('Saved the flat code as PNG.');
    return;
  }
  if (action === 'qr-svg') {
    const svg = svgString(code, { ink: palette.ink, ground: '#ffffff' });
    download('voxel-qr-code.svg', `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    announce('Saved the flat code as SVG.');
    return;
  }
  if (action === 'scene-png') {
    const data = diorama && diorama.captureScene(2);
    if (!data) {
      announce('The 3D view is not available, so the scene cannot be saved.');
      return;
    }
    download('voxel-qr-scene.png', data);
    announce('Saved the diorama as PNG.');
    return;
  }
  if (action === 'embed') {
    copy(embedSnippet(shareBase(window.location), packed), 'Embed code');
    return;
  }
  if (action === 'link') {
    copy(shareLink(window.location, packed), 'Link');
  }
}

function present() {
  if (!diorama) return;
  document.body.classList.add('is-presenting');
  diorama.resize();
  diorama.lockOpen();
  const wakeLock = navigator.wakeLock ? navigator.wakeLock.request('screen').catch(() => null) : null;
  const exit = (event) => {
    if (event.type === 'keydown' && event.key !== 'Escape') return;
    document.body.classList.remove('is-presenting');
    diorama.unlock();
    diorama.resize();
    window.removeEventListener('keydown', exit);
    window.removeEventListener('click', exit);
    if (wakeLock) wakeLock.then((lock) => lock && lock.release()).catch(() => {});
    toggle.focus();
  };
  window.addEventListener('keydown', exit);
  window.setTimeout(() => window.addEventListener('click', exit, { once: true }), 400);
}

content = createContentPanel(document.querySelector('#content-panel'), {
  config,
  onChange: (next) => apply(next),
});

style = createStylePanel(document.querySelector('#style-panel'), {
  config,
  onChange: (next) => apply(next),
  onRoll: () => apply(roll(config)),
  onExport: handleExport,
  onPresent: present,
});

function syncDrawers() {
  shell.classList.toggle('content-closed', !contentDrawer.open);
  if (diorama) diorama.resize();
}

contentDrawer.addEventListener('toggle', syncDrawers);
styleDrawer.addEventListener('toggle', () => {
  if (diorama) diorama.resize();
});

if (window.matchMedia('(max-width: 1000px)').matches) styleDrawer.open = false;
syncDrawers();

function refreshFlatFallback(canvas) {
  drawFlat(canvas, code, { ink: paletteFor(config.palette).ink, ground: '#ffffff', pixels: 720 });
}

async function boot() {
  try {
    const { createDiorama } = await import('./render/diorama.js');
    diorama = createDiorama(stageHost, {
      overlay,
      onState: (state) => {
        const open = state.overlay > 0.5;
        hint.classList.toggle('is-on', open);
        toggle.setAttribute('aria-pressed', String(open));
        toggle.textContent = open ? 'Show the scene' : 'Show the code';
      },
    });
    stageHost.tabIndex = 0;
    stageHost.setAttribute('role', 'button');
    stageHost.setAttribute('aria-label', 'Voxel scene. Activate to flip to the scannable code.');
    toggle.addEventListener('click', () => diorama.flip.toggle());
  } catch {
    stageHost.classList.add('is-flat');
    const flat = document.createElement('canvas');
    flat.className = 'flat-fallback';
    stageHost.appendChild(flat);
    hint.textContent = 'The 3D view could not load, so here is the flat code.';
    hint.classList.add('is-on');
    toggle.hidden = true;
    flatFallback = flat;
    refreshFlatFallback(flat);
  }
  refresh();
}

refresh();
boot();
