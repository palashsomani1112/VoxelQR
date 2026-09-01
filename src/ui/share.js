import { element, nextId } from './dom.js';
import { icon } from './icons.js';

const ACTIONS = [
  { id: 'qr-png', label: 'Download the code, PNG', note: 'Flat and print ready.' },
  { id: 'qr-svg', label: 'Download the code, SVG', note: 'Vector, for a designer.' },
  { id: 'scene-png', label: 'Download the scene, PNG', note: 'The diorama at double size.' },
  { id: 'link', label: 'Copy a link to share', note: 'Opens as a scene only, with no controls.' },
  { id: 'embed', label: 'Copy the embed code', note: 'An iframe for your own page.' },
  { id: 'present', label: 'Present full screen', note: 'Hold it up to someone else\'s camera.' },
];

export function createSharePanel(dialog, { onAction }) {
  const head = element('div', 'sheet-head');
  const title = element('h2', 'sheet-title', 'Share and save');
  const close = element('button', 'glass-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close the share panel');
  close.appendChild(icon('close'));
  close.addEventListener('click', () => dialog.close());
  head.append(title, close);

  const meter = element('p', 'meter');
  meter.setAttribute('role', 'status');

  const list = element('div', 'exports');
  for (const action of ACTIONS) {
    const button = element('button', 'action action-stacked');
    button.type = 'button';
    button.appendChild(element('span', 'action-label', action.label));
    button.appendChild(element('span', 'action-note', action.note));
    button.addEventListener('click', () => onAction(action.id));
    list.appendChild(button);
  }

  const shareId = nextId('h');
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
  const shareHide = element('button', 'action share-close', 'Hide');
  shareHide.type = 'button';
  shareHide.addEventListener('click', () => {
    share.hidden = true;
  });
  const shareRow = element('div', 'share-row');
  shareRow.append(shareCopy, shareHide);
  share.append(shareLabel, shareText, shareRow);

  dialog.append(head, meter, list, share);

  return {
    showShare(label, text, onCopyAgain) {
      shareLabel.textContent = label;
      shareText.value = text;
      share.hidden = false;
      shareCopy.onclick = () => onCopyAgain(text);
      shareText.focus();
      shareText.select();
    },
    renderMeter(note, warning) {
      meter.textContent = note;
      meter.classList.toggle('is-warning', Boolean(warning));
      if (warning) meter.appendChild(element('span', 'meter-note', warning));
    },
  };
}
