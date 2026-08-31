import {
  PALETTES, GROUNDS, BACKDROPS, SLOTS, SLOT_LABELS, paletteFor, backdropFor,
} from '../palettes.js';
import { TEMPLATES, TEMPLATE_IDS } from '../sculpt/templates.js';
import { WEATHER } from '../weather.js';
import { colorsFor } from '../config.js';
import { nextId, element } from './dom.js';
import { icon } from './icons.js';

const SECTIONS = [
  { id: 'object', label: 'Object', glyph: 'object' },
  { id: 'ground', label: 'Ground', glyph: 'ground' },
  { id: 'colours', label: 'Colours', glyph: 'colours' },
  { id: 'backdrop', label: 'Background', glyph: 'backdrop' },
  { id: 'weather', label: 'Weather', glyph: 'weather' },
];

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

function choiceList(legendText, items, activeId, onPick) {
  const set = document.createElement('fieldset');
  set.className = 'choice';
  set.setAttribute('role', 'radiogroup');
  set.appendChild(element('legend', null, legendText));
  const row = element('div', 'choice-row');

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
  const id = nextId('g');
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
  hex.maxLength = 7;
  hex.setAttribute('aria-label', `${labelText}, hex value`);

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

export function createLookPanel(dialog, { config, onChange, onRoll, onResetView }) {
  let state = config;
  let section = null;

  const head = element('div', 'glass-head');
  const back = element('button', 'glass-back');
  back.type = 'button';
  back.appendChild(icon('back'));
  back.appendChild(element('span', null, 'All settings'));
  back.addEventListener('click', () => {
    section = null;
    render();
  });

  const title = element('h2', 'glass-title', 'Look');
  const close = element('button', 'glass-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close the look panel');
  close.appendChild(icon('close'));
  close.addEventListener('click', () => dialog.close());

  head.append(back, title, close);

  const body = element('div', 'glass-body');
  const foot = element('div', 'glass-foot');

  const dice = element('button', 'dice', 'Roll a new scene');
  dice.type = 'button';
  dice.addEventListener('click', onRoll);

  const recentre = element('button', 'action');
  recentre.type = 'button';
  recentre.appendChild(icon('reset'));
  recentre.appendChild(element('span', null, 'Reset the angle'));
  recentre.addEventListener('click', onResetView);

  foot.append(dice, recentre);
  dialog.append(head, body, foot);

  function commit(patch) {
    state = { ...state, ...patch };
    onChange(state);
  }

  function renderTiles() {
    const grid = element('div', 'tiles');
    for (const entry of SECTIONS) {
      const tile = element('button', 'tile');
      tile.type = 'button';
      tile.appendChild(icon(entry.glyph, { size: 26 }));
      tile.appendChild(element('span', 'tile-label', entry.label));
      tile.appendChild(element('span', 'tile-value', currentValue(entry.id)));
      tile.addEventListener('click', () => {
        section = entry.id;
        render();
      });
      grid.appendChild(tile);
    }
    body.appendChild(grid);
  }

  function currentValue(id) {
    if (id === 'object') return TEMPLATES[state.object].name;
    if (id === 'ground') return GROUNDS[state.ground].name;
    if (id === 'backdrop') return state.backdropTint ? 'Custom' : BACKDROPS[state.backdrop].name;
    if (id === 'weather') return WEATHER[state.weather].name;
    return Object.keys(state.zones).length ? 'Edited' : PALETTES[state.palette].name;
  }

  function renderSection() {
    const palette = paletteFor(state.palette);

    if (section === 'object') {
      body.appendChild(choiceList(
        'Object',
        TEMPLATE_IDS.map((id) => ({
          id,
          label: TEMPLATES[id].name,
          colors: [palette.slots.primary, palette.slots.secondary],
        })),
        state.object,
        (id) => commit({ object: id }),
      ));
      return;
    }

    if (section === 'ground') {
      body.appendChild(choiceList(
        'Ground',
        Object.entries(GROUNDS).map(([id, entry]) => ({
          id,
          label: entry.name,
          colors: [entry.tint, entry.detailColor],
        })),
        state.ground,
        (id) => commit({ ground: id, tint: null }),
      ));
      const wells = element('div', 'well-row');
      wells.appendChild(colorWell('Ground colour', state.tint || GROUNDS[state.ground].tint,
        (value) => commit({ tint: value })));
      body.appendChild(wells);
      return;
    }

    if (section === 'colours') {
      body.appendChild(choiceList(
        'Palette',
        Object.entries(PALETTES).map(([id, entry]) => ({
          id,
          label: entry.name,
          colors: [entry.slots.primary, entry.slots.accent, entry.slots.secondary],
        })),
        state.palette,
        (id) => commit({ palette: id, zones: {} }),
      ));
      const colors = colorsFor(state);
      const wells = element('div', 'well-row');
      for (const slot of SLOTS) {
        wells.appendChild(colorWell(SLOT_LABELS[slot], colors[slot], (value) => {
          commit({ zones: { ...state.zones, [slot]: value } });
        }));
      }
      body.appendChild(wells);
      return;
    }

    if (section === 'backdrop') {
      body.appendChild(choiceList(
        'Background',
        Object.entries(BACKDROPS).map(([id, entry]) => ({
          id,
          label: entry.name,
          colors: [entry.color],
        })),
        state.backdropTint ? '' : state.backdrop,
        (id) => commit({ backdrop: id, backdropTint: null }),
      ));
      const wells = element('div', 'well-row');
      wells.appendChild(colorWell(
        'Background colour',
        state.backdropTint || backdropFor(state.backdrop).color || '#2F3A36',
        (value) => commit({ backdropTint: value }),
      ));
      body.appendChild(wells);
      return;
    }

    body.appendChild(choiceList(
      'Weather',
      Object.entries(WEATHER).map(([id, entry]) => ({
        id,
        label: entry.name,
        colors: [entry.keyColor, entry.tint || entry.keyColor],
      })),
      state.weather,
      (id) => commit({ weather: id }),
    ));
  }

  function render() {
    const entry = SECTIONS.find((item) => item.id === section);
    title.textContent = entry ? entry.label : 'Look';
    back.hidden = !entry;
    body.textContent = '';
    if (entry) renderSection();
    else renderTiles();
  }

  render();

  return {
    setState(next) {
      const active = document.activeElement;
      const editing = active && dialog.contains(active) && active.type === 'color';
      state = next;
      if (!editing) render();
    },
    openAt(target) {
      section = target || null;
      render();
    },
  };
}
