import { PALETTES, GROUNDS, BACKDROPS, SLOTS, SLOT_LABELS, paletteFor, backdropFor } from '../palettes.js';
import { TEMPLATES, TEMPLATE_IDS } from '../sculpt/templates.js';
import { colorsFor } from '../config.js';
import { nextId, element } from './dom.js';


function chipRow(colors) {
  const wrap = element('span', 'chips');
  wrap.setAttribute('aria-hidden', 'true');
  for (const color of colors) {
    const chip = element('span', 'chip');
    if (color) chip.style.background = color;
    else chip.classList.add('chip-none');
    wrap.appendChild(chip);
  }
  return wrap;
}

function choiceGroup(legendText, items, activeId, onPick) {
  const set = document.createElement('fieldset');
  set.className = 'choice';
  set.appendChild(element('legend', null, legendText));
  const row = element('div', 'choice-row');
  set.setAttribute('role', 'radiogroup');

  items.forEach((item) => {
    const button = element('button', 'choice-item');
    button.type = 'button';
    button.setAttribute('role', 'radio');
    const on = item.id === activeId;
    button.setAttribute('aria-checked', String(on));
    button.tabIndex = on ? 0 : -1;
    if (on) button.classList.add('is-on');
    button.appendChild(chipRow(item.colors));
    button.appendChild(element('span', 'choice-label', item.label));
    button.addEventListener('click', () => onPick(item.id));
    button.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      const index = items.findIndex((entry) => entry.id === activeId);
      onPick(items[(index + step + items.length) % items.length].id);
      const target = row.querySelector('[aria-checked="true"]');
      if (target) target.focus();
    });
    row.appendChild(button);
  });

  set.appendChild(row);
  return set;
}

function colorWell(labelText, value, onPick) {
  const id = nextId('s');
  const wrap = element('div', 'well');
  const label = element('label', 'well-label', labelText);
  label.htmlFor = id;

  const picker = document.createElement('input');
  picker.type = 'color';
  picker.id = id;
  picker.value = value;

  const hex = document.createElement('input');
  hex.type = 'text';
  hex.className = 'well-hex';
  hex.value = value;
  hex.spellcheck = false;
  hex.setAttribute('aria-label', `${labelText}, hex value`);
  hex.inputMode = 'text';
  hex.maxLength = 7;

  picker.addEventListener('input', () => {
    hex.value = picker.value;
    onPick(picker.value);
  });
  hex.addEventListener('change', () => {
    const text = hex.value.trim().replace(/^#?/, '#');
    if (!/^#[0-9a-f]{6}$/i.test(text)) {
      hex.value = picker.value;
      return;
    }
    picker.value = text;
    onPick(text);
  });

  wrap.append(label, picker, hex);
  return wrap;
}

export function createStylePanel(root, { config, onChange, onRoll, onExport, onPresent }) {
  let state = config;

  const shelf = element('div', 'shelf');
  const meter = element('p', 'meter');
  meter.setAttribute('role', 'status');
  const exportRow = element('div', 'exports');

  const shareId = nextId('s');
  const share = element('div', 'share');
  share.hidden = true;
  const shareLabel = element('label', 'field-label', 'Copy this');
  shareLabel.htmlFor = shareId;
  const shareText = document.createElement('textarea');
  shareText.id = shareId;
  shareText.className = 'share-text';
  shareText.readOnly = true;
  shareText.rows = 4;
  shareText.spellcheck = false;
  const shareCopy = element('button', 'action share-copy', 'Copy again');
  shareCopy.type = 'button';
  const shareClose = element('button', 'action share-close', 'Hide');
  shareClose.type = 'button';
  shareClose.addEventListener('click', () => {
    share.hidden = true;
  });
  const shareRow = element('div', 'share-row');
  shareRow.append(shareCopy, shareClose);
  share.append(shareLabel, shareText, shareRow);

  root.append(meter, shelf, exportRow, share);

  function commit(patch) {
    state = { ...state, ...patch };
    onChange(state);
  }

  function renderShelf() {
    shelf.textContent = '';
    const palette = paletteFor(state.palette);

    shelf.appendChild(choiceGroup(
      'Object',
      TEMPLATE_IDS.map((id) => ({
        id,
        label: TEMPLATES[id].name,
        colors: [palette.slots.primary, palette.slots.secondary],
      })),
      state.object,
      (id) => commit({ object: id }),
    ));

    shelf.appendChild(choiceGroup(
      'Palette',
      Object.entries(PALETTES).map(([id, entry]) => ({
        id,
        label: entry.name,
        colors: [entry.slots.primary, entry.slots.accent, entry.slots.secondary],
      })),
      state.palette,
      (id) => commit({ palette: id, zones: {} }),
    ));

    shelf.appendChild(choiceGroup(
      'Ground',
      Object.entries(GROUNDS).map(([id, entry]) => ({
        id,
        label: entry.name,
        colors: [entry.tint, entry.detailColor],
      })),
      state.ground,
      (id) => commit({ ground: id, tint: null }),
    ));

    shelf.appendChild(choiceGroup(
      'Background',
      Object.entries(BACKDROPS).map(([id, entry]) => ({
        id,
        label: entry.name,
        colors: [entry.color],
      })),
      state.backdropTint ? '' : state.backdrop,
      (id) => commit({ backdrop: id, backdropTint: null }),
    ));

    const colors = colorsFor(state);
    const wells = document.createElement('fieldset');
    wells.className = 'choice choice-wells';
    wells.appendChild(element('legend', null, 'Custom colours'));
    const wellRow = element('div', 'well-row');
    for (const slot of SLOTS) {
      wellRow.appendChild(colorWell(SLOT_LABELS[slot], colors[slot], (value) => {
        commit({ zones: { ...state.zones, [slot]: value } });
      }));
    }
    wellRow.appendChild(colorWell('Ground', state.tint || GROUNDS[state.ground].tint, (value) => {
      commit({ tint: value });
    }));
    wellRow.appendChild(colorWell(
      'Background',
      state.backdropTint || backdropFor(state.backdrop).color || '#2F3A36',
      (value) => commit({ backdropTint: value }),
    ));
    wells.appendChild(wellRow);
    shelf.appendChild(wells);

    const code = document.createElement('fieldset');
    code.className = 'choice choice-code';
    code.appendChild(element('legend', null, 'Code'));
    const codeRow = element('div', 'code-row');

    const eccId = nextId('s');
    const eccWrap = element('div', 'field');
    const eccLabel = element('label', 'field-label', 'Error correction');
    eccLabel.htmlFor = eccId;
    const ecc = document.createElement('select');
    ecc.id = eccId;
    for (const [value, label] of [['L', 'L, roomiest'], ['M', 'M, balanced'], ['Q', 'Q, sturdy'], ['H', 'H, toughest']]) {
      const option = element('option', null, label);
      option.value = value;
      ecc.appendChild(option);
    }
    ecc.value = state.ecc;
    ecc.addEventListener('change', () => commit({ ecc: ecc.value }));
    eccWrap.append(eccLabel, ecc);
    codeRow.appendChild(eccWrap);

    const overlayId = nextId('s');
    const overlayWrap = element('div', 'field field-check');
    const overlayInput = document.createElement('input');
    overlayInput.type = 'checkbox';
    overlayInput.id = overlayId;
    overlayInput.checked = state.overlay !== false;
    overlayInput.addEventListener('change', () => commit({ overlay: overlayInput.checked }));
    const overlayLabel = element('label', 'check-label', 'Sharpen the code in scan view');
    overlayLabel.htmlFor = overlayId;
    overlayWrap.append(overlayInput, overlayLabel);
    codeRow.appendChild(overlayWrap);

    const dice = element('button', 'dice', 'Roll a new scene');
    dice.type = 'button';
    dice.addEventListener('click', onRoll);
    codeRow.appendChild(dice);

    code.appendChild(codeRow);
    shelf.appendChild(code);
  }

  function renderExports() {
    exportRow.textContent = '';
    const buttons = [
      ['Download code, PNG', 'qr-png'],
      ['Download code, SVG', 'qr-svg'],
      ['Download scene, PNG', 'scene-png'],
      ['Copy embed code', 'embed'],
      ['Copy link', 'link'],
    ];
    for (const [label, action] of buttons) {
      const button = element('button', 'action', label);
      button.type = 'button';
      button.addEventListener('click', () => onExport(action));
      exportRow.appendChild(button);
    }
    const present = element('button', 'action', 'Present full screen');
    present.type = 'button';
    present.addEventListener('click', onPresent);
    exportRow.appendChild(present);
  }

  renderShelf();
  renderExports();

  return {
    showShare(label, text, onCopyAgain) {
      shareLabel.textContent = label;
      shareText.value = text;
      share.hidden = false;
      shareCopy.onclick = () => onCopyAgain(text);
      shareText.focus();
      shareText.select();
    },
    setState(next) {
      const active = document.activeElement;
      const keepFocus = active && root.contains(active) && active.type === 'color';
      state = next;
      if (!keepFocus) renderShelf();
    },
    renderMeter(note, warning) {
      meter.textContent = note;
      meter.classList.toggle('is-warning', Boolean(warning));
      if (warning) meter.appendChild(element('span', 'meter-note', warning));
    },
  };
}
