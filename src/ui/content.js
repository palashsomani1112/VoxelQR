import { CONTENT_TYPES, typeFor } from './schema.js';
import { NOTE_LIMIT, NOTE_POSITIONS } from '../export/note.js';
import { nextId, element } from './dom.js';
import { icon } from './icons.js';

function buildControl(field, value, onInput) {
  const id = nextId('c');
  let control;

  if (field.type === 'select') {
    control = document.createElement('select');
    for (const [optionValue, optionLabel] of field.options) {
      const option = element('option', null, optionLabel);
      option.value = optionValue;
      control.appendChild(option);
    }
    control.value = value || field.options[0][0];
  } else if (field.type === 'textarea') {
    control = document.createElement('textarea');
    control.rows = field.rows || 3;
    control.value = value || '';
  } else if (field.type === 'checkbox') {
    control = document.createElement('input');
    control.type = 'checkbox';
    control.checked = value === true || value === 'true';
  } else {
    control = document.createElement('input');
    control.type = field.type === 'password' ? 'password' : field.type;
    control.value = value || '';
    if (field.inputmode) control.inputMode = field.inputmode;
    if (field.spellcheck === false) control.spellcheck = false;
    if (field.type === 'password') control.autocapitalize = 'none';
  }

  control.id = id;
  if (field.placeholder && field.type !== 'checkbox' && field.type !== 'select') {
    control.placeholder = field.placeholder;
  }
  if (field.autocomplete) control.autocomplete = field.autocomplete;

  const read = () => (field.type === 'checkbox' ? control.checked : control.value);
  control.addEventListener('input', () => onInput(read()));
  control.addEventListener('change', () => onInput(read()));

  return { id, control };
}

function buildField(field, value, onInput) {
  const { id, control } = buildControl(field, value, onInput);
  const wrap = element('div', `field field-${field.width || 'full'}`);

  if (field.type === 'checkbox') {
    wrap.classList.add('field-check');
    const label = element('label', 'check-label');
    label.htmlFor = id;
    label.textContent = field.label;
    wrap.append(control, label);
    return wrap;
  }

  const label = element('label', 'field-label', field.label);
  label.htmlFor = id;
  wrap.append(label, control);

  if (field.hint) {
    const hint = element('p', 'field-hint', field.hint);
    hint.id = `${id}-hint`;
    control.setAttribute('aria-describedby', hint.id);
    wrap.appendChild(hint);
  }
  return wrap;
}

export function createContentPanel(root, { config, onChange, onClose }) {
  let state = config;

  const head = element('div', 'sheet-head');
  head.appendChild(element('h2', 'sheet-title', 'Content'));
  const close = element('button', 'glass-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close the content panel');
  close.appendChild(icon('close'));
  close.addEventListener('click', onClose);
  head.appendChild(close);

  const tabRow = element('div', 'tabs');
  tabRow.setAttribute('role', 'tablist');
  tabRow.setAttribute('aria-label', 'What the code carries');

  const lead = element('p', 'lead');
  const form = element('div', 'form');

  const noteBox = document.createElement('fieldset');
  noteBox.className = 'subgroup subgroup-open note-box';
  noteBox.appendChild(element('legend', null, 'Note, optional'));
  const noteRows = element('div', 'rows');

  const noteId = nextId('c');
  const noteField = element('div', 'field field-full');
  const noteLabel = element('label', 'field-label', 'What is this code for?');
  noteLabel.htmlFor = noteId;
  const noteInput = document.createElement('textarea');
  noteInput.id = noteId;
  noteInput.rows = 2;
  noteInput.maxLength = NOTE_LIMIT;
  noteInput.placeholder = 'Shown beside the code when you share or export it';
  const noteHint = element('p', 'field-hint');
  noteHint.id = `${noteId}-hint`;
  noteInput.setAttribute('aria-describedby', noteHint.id);
  noteField.append(noteLabel, noteInput, noteHint);

  const posId = nextId('c');
  const posField = element('div', 'field field-full');
  const posLabel = element('label', 'field-label', 'Where it sits');
  posLabel.htmlFor = posId;
  const posInput = document.createElement('select');
  posInput.id = posId;
  for (const value of NOTE_POSITIONS) {
    const option = element('option', null, value === 'above' ? 'Above the code' : 'Below the code');
    option.value = value;
    posInput.appendChild(option);
  }
  posField.append(posLabel, posInput);

  noteRows.append(noteField, posField);
  noteBox.appendChild(noteRows);

  function paintNoteHint() {
    const left = NOTE_LIMIT - noteInput.value.length;
    noteHint.textContent = noteInput.value
      ? `${left} characters left.`
      : 'Leave it empty and the code travels on its own.';
  }

  noteInput.addEventListener('input', () => {
    paintNoteHint();
    commit({ note: noteInput.value });
  });
  posInput.addEventListener('change', () => commit({ notePosition: posInput.value }));

  const reveal = document.createElement('details');
  reveal.className = 'reveal';
  const revealSummary = element('summary', null, 'What this encodes');
  const revealText = element('pre', 'reveal-text');
  reveal.append(revealSummary, revealText);

  const body = element('div', 'sheet-body');
  body.append(tabRow, lead, form, noteBox, reveal);
  root.append(head, body);

  function commit(patch) {
    state = { ...state, ...patch };
    onChange(state);
  }

  function renderTabs() {
    tabRow.textContent = '';
    for (const type of CONTENT_TYPES) {
      const button = element('button', 'tab', type.label);
      button.type = 'button';
      button.setAttribute('role', 'tab');
      const selected = type.id === state.type;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected) button.classList.add('is-on');
      button.addEventListener('click', () => commit({ type: type.id }));
      button.addEventListener('keydown', (event) => {
        const keys = { ArrowRight: 1, ArrowLeft: -1 };
        if (!(event.key in keys)) return;
        event.preventDefault();
        const index = CONTENT_TYPES.findIndex((t) => t.id === state.type);
        const next = CONTENT_TYPES[(index + keys[event.key] + CONTENT_TYPES.length) % CONTENT_TYPES.length];
        commit({ type: next.id });
        const target = tabRow.querySelector('[aria-selected="true"]');
        if (target) target.focus();
      });
      tabRow.appendChild(button);
    }
  }

  function shapeOf(config) {
    const type = typeFor(config.type);
    const keys = [];
    for (const group of type.groups) {
      for (const field of group.fields) {
        if (field.when && !field.when(config.fields)) continue;
        keys.push(field.key);
      }
    }
    return `${type.id}:${keys.join(',')}`;
  }

  let shape = '';

  function renderForm() {
    const type = typeFor(state.type);
    shape = shapeOf(state);
    lead.textContent = type.lead;
    form.textContent = '';

    for (const group of type.groups) {
      const fields = group.fields.filter((field) => !field.when || field.when(state.fields));
      if (!fields.length) continue;

      const rows = element('div', 'rows');
      for (const field of fields) {
        rows.appendChild(buildField(field, state.fields[field.key], (value) => {
          commit({ fields: { ...state.fields, [field.key]: value } });
        }));
      }

      if (!group.legend) {
        form.appendChild(rows);
        continue;
      }

      if (group.collapsed) {
        const box = document.createElement('details');
        box.className = 'subgroup';
        box.open = fields.some((field) => state.fields[field.key]);
        box.appendChild(element('summary', null, group.legend));
        box.appendChild(rows);
        form.appendChild(box);
        continue;
      }

      const set = document.createElement('fieldset');
      set.className = 'subgroup subgroup-open';
      set.appendChild(element('legend', null, group.legend));
      set.appendChild(rows);
      form.appendChild(set);
    }
  }

  function syncNote() {
    if (document.activeElement !== noteInput) noteInput.value = state.note || '';
    posInput.value = state.notePosition;
    posField.hidden = !state.note;
    paintNoteHint();
  }

  renderTabs();
  renderForm();
  syncNote();

  return {
    setState(next, { force = false } = {}) {
      const nextShape = shapeOf(next);
      const structural = force || nextShape !== shape;
      state = next;
      renderTabs();
      if (structural) renderForm();
      else lead.textContent = typeFor(state.type).lead;
      syncNote();
    },
    showPayload(text) {
      revealText.textContent = text;
    },
  };
}
