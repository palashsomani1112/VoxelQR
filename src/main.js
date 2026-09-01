import { encode } from './qr/encoder.js';
import { buildPayload } from './qr/payloads.js';
import {
  DEFAULT_CONFIG, sanitize, encodeConfig, decodeConfig, roll, backdropColor,
} from './config.js';
import { paletteFor, onColor } from './palettes.js';
import { drawFlat, svgString, densityNote } from './export/flat.js';
import {
  shareBase, viewLink, embedSnippet, writeClipboard, composeWithNote,
} from './export/share.js';
import { createContentPanel } from './ui/content.js';
import { createLookPanel } from './ui/look.js';
import { createSharePanel } from './ui/share.js';
import { icon } from './ui/icons.js';

const stageHost = document.querySelector('#stage');
const overlay = document.querySelector('#overlay');
const hint = document.querySelector('#hint');
const toast = document.querySelector('#toast');
const toggle = document.querySelector('#toggle');
const noteBox = document.querySelector('#note');

const dialogs = {
  content: document.querySelector('#content-dialog'),
  look: document.querySelector('#look-dialog'),
  share: document.querySelector('#share-dialog'),
};

const openers = {
  content: document.querySelector('#content-open'),
  look: document.querySelector('#look-open'),
  share: document.querySelector('#share-open'),
};

const scratch = document.createElement('canvas');

let config = readConfigFromLocation();
let code = null;
let diorama = null;
let content = null;
let look = null;
let share = null;
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

function encodeCurrent() {
  const text = buildPayload(config.type, config.fields) || 'https://github.com';
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
  const shown = color || '#f1efe9';
  const on = onColor(shown);
  root.setProperty('--backdrop', shown);
  root.setProperty('--on-backdrop', on);
  root.setProperty('--on-backdrop-soft', on === '#26302C' ? '#5c6862' : '#b7c1ba');
}

let hashTimer = 0;
function writeHash(packed) {
  window.clearTimeout(hashTimer);
  hashTimer = window.setTimeout(() => {
    window.history.replaceState(null, '', `#c=${packed}`);
  }, 350);
}

function paintNote() {
  noteBox.textContent = config.note;
  noteBox.hidden = !config.note;
  noteBox.dataset.position = config.notePosition;
  hint.hidden = Boolean(config.note);
}

function refresh() {
  const result = encodeCurrent();
  code = result.code;
  paintBackdrop();
  paintNote();
  if (diorama) diorama.build(config, code);
  if (flatFallback) refreshFlatFallback(flatFallback);
  if (content) content.showPayload(result.text || '(nothing yet)');

  const note = densityNote(code);
  const warnings = [];
  if (code.relaxed) warnings.push(`Error correction eased to ${code.level} to fit.`);
  if (result.trimmed) warnings.push('That is too long for one code. Shorten it, or link out instead.');
  else if (note.crowded) warnings.push('Blocks are getting small. A shorter payload keeps them chunky.');
  if (share) share.renderMeter(note.label, warnings.join(' '));

  const packed = encodeConfig(config);
  writeHash(packed);
  return packed;
}

function apply(next, options) {
  config = sanitize({ ...next, azimuth: config.azimuth, elevation: config.elevation });
  if (content) content.setState(config, options);
  if (look) look.setState(config);
  refresh();
}

function storeView(view) {
  config = { ...config, azimuth: Number(view.azimuth.toFixed(3)), elevation: Number(view.elevation.toFixed(3)) };
  writeHash(encodeConfig(config));
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
  share.showShare(label, text, async (again) => {
    const retried = await writeClipboard(again);
    announce(retried ? `${label} copied to the clipboard.` : 'Copying is blocked here. Select the text and copy it.');
  });
}

function handleShareAction(action) {
  const packed = encodeConfig(config);
  const palette = paletteFor(config.palette);

  if (action === 'qr-png') {
    drawFlat(scratch, code, {
      ink: palette.ink,
      ground: '#ffffff',
      pixels: 1024,
      note: config.note,
      notePosition: config.notePosition,
    });
    download('voxel-qr-code.png', scratch.toDataURL('image/png'));
    announce('Saved the flat code as PNG.');
    return;
  }
  if (action === 'qr-svg') {
    const svg = svgString(code, {
      ink: palette.ink,
      ground: '#ffffff',
      note: config.note,
      notePosition: config.notePosition,
    });
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
    const background = backdropColor(config) || '#f1efe9';
    composeWithNote(data, {
      note: config.note,
      position: config.notePosition,
      background,
      font: { color: onColor(background), family: "Karla, Helvetica, Arial, sans-serif" },
    }).then((composited) => {
      download('voxel-qr-scene.png', composited);
      announce('Saved the diorama as PNG.');
    }).catch(() => {
      download('voxel-qr-scene.png', data);
      announce('Saved the diorama as PNG, without the note.');
    });
    return;
  }
  if (action === 'link') {
    copy(viewLink(shareBase(window.location), packed), 'Link');
    return;
  }
  if (action === 'embed') {
    copy(embedSnippet(shareBase(window.location), packed), 'Embed code');
    return;
  }
  if (action === 'present') {
    dialogs.share.close();
    present();
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

function openDialog(name) {
  const dialog = dialogs[name];
  if (!dialog || dialog.open) return;
  if (name === 'look' && look) look.openAt(null);
  dialog.showModal();
}

for (const [name, button] of Object.entries(openers)) {
  button.prepend(icon(name === 'content' ? 'menu' : name === 'look' ? 'colours' : 'share'));
  button.addEventListener('click', () => openDialog(name));
}

for (const [name, dialog] of Object.entries(dialogs)) {
  dialog.addEventListener('close', () => {
    openers[name].focus();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

content = createContentPanel(dialogs.content, {
  config,
  onChange: (next) => apply(next),
  onClose: () => dialogs.content.close(),
});

look = createLookPanel(dialogs.look, {
  config,
  onChange: (next) => apply(next),
  onRoll: () => apply(roll(config)),
  onResetView: () => diorama && diorama.resetView(),
});

share = createSharePanel(dialogs.share, {
  onAction: handleShareAction,
});

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
        toggle.setAttribute('aria-pressed', String(open));
        toggle.textContent = open ? 'Show the scene' : 'Show the code';
        hint.textContent = open ? 'Point a camera at it.' : 'Tap the scene for the code. Drag to turn it.';
      },
      onView: storeView,
    });
    stageHost.tabIndex = 0;
    stageHost.setAttribute('role', 'button');
    stageHost.setAttribute('aria-label', 'Voxel scene. Activate to flip to the code, or use the arrow keys to turn it.');
    toggle.addEventListener('click', () => diorama.flip.toggle());
  } catch {
    stageHost.classList.add('is-flat');
    const flat = document.createElement('canvas');
    flat.className = 'flat-fallback';
    stageHost.appendChild(flat);
    hint.textContent = 'The 3D view could not load, so here is the flat code.';
    toggle.hidden = true;
    flatFallback = flat;
    refreshFlatFallback(flat);
  }
  refresh();
}

refresh();
boot();
