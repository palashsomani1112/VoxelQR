const ICONS = {
  object: '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z"/><path d="M4 7.5 12 12l8-4.5"/><path d="M12 12v9"/>',
  ground: '<path d="M12 9 3 14l9 5 9-5-9-5Z"/><path d="M6.5 11.2V8"/><path d="M9.5 9.6V6.2"/><path d="M14.5 9.6V6.2"/><path d="M17.5 11.2V8"/>',
  colours: '<circle cx="9" cy="9.5" r="5"/><circle cx="15" cy="9.5" r="5"/><circle cx="12" cy="15" r="5"/>',
  backdrop: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 15.5 9 11l4 3.2 3.2-2.4 4.3 3.2"/>',
  weather: '<circle cx="9" cy="9" r="3.4"/><path d="M9 2.6v1.6M9 13.8v1.6M2.6 9h1.6M13.8 9h1.6M4.5 4.5l1.1 1.1M12.4 12.4l1.1 1.1M13.5 4.5l-1.1 1.1M5.6 12.4l-1.1 1.1"/><path d="M11 20.5h7.5a2.6 2.6 0 0 0 0-5.2 3.8 3.8 0 0 0-7.2-1 2.6 2.6 0 0 0-.3 6.2Z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  share: '<path d="M12 15V3.5"/><path d="M8 7.2 12 3.2l4 4"/><path d="M5 13.5v5A2 2 0 0 0 7 20.5h10a2 2 0 0 0 2-2v-5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4 4.5V9h4.5"/>',
};

export const ICON_NAMES = Object.keys(ICONS);

export function icon(name, { size = 22 } = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('icon');
  svg.innerHTML = ICONS[name] || ICONS.object;
  return svg;
}
