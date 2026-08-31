import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastRatio, BACKDROPS, onColor, GROUNDS, PALETTES, groundTintFor, mixHex } from '../src/palettes.js';
import { CONTENT_TYPES } from '../src/ui/schema.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const css = read('assets/styles.css');
const html = read('index.html');
const embed = read('embed.html');
const contentJs = read('src/ui/content.js');
const styleJs = read('src/ui/style.js');

let failures = 0;
function check(name, ok, detail = '') {
  if (!ok) {
    failures++;
    console.log(`FAIL  ${name} ${detail}`);
  }
}

const TRAY = '#f6f4ee';
const WHITE = '#ffffff';
const INK = '#232c28';
const INK_SOFT = '#55615b';
const TRAY_EDGE = '#dcd8cd';
const FOCUS = '#1d5c8a';

const textPairs = [
  ['body text on tray', INK, TRAY, 4.5],
  ['body text on white field', INK, WHITE, 4.5],
  ['supporting text on tray', INK_SOFT, TRAY, 4.5],
  ['supporting text on white', INK_SOFT, WHITE, 4.5],
  ['tray text on selected tab', '#f7f5ef', INK, 4.5],
  ['warning text on tray', '#8a4f16', TRAY, 4.5],
];

for (const [name, fg, bg, target] of textPairs) {
  const ratio = contrastRatio(fg, bg);
  check(`contrast, ${name}`, ratio >= target, `${ratio.toFixed(2)}:1 needs ${target}`);
}

const uiPairs = [
  ['focus ring against tray', FOCUS, TRAY, 3],
  ['focus ring against white', FOCUS, WHITE, 3],
  ['field border against tray', TRAY_EDGE, TRAY, 1.2],
];
for (const [name, fg, bg, target] of uiPairs) {
  const ratio = contrastRatio(fg, bg);
  check(`contrast, ${name}`, ratio >= target, `${ratio.toFixed(2)}:1 needs ${target}`);
}

for (const [id, backdrop] of Object.entries(BACKDROPS)) {
  if (!backdrop.color) continue;
  const on = onColor(backdrop.color);
  const ratio = contrastRatio(on, backdrop.color);
  check(`backdrop ${id} carries its heading text`, ratio >= 4.5, `${ratio.toFixed(2)}:1`);
  const soft = on === '#26302C' ? '#5c6862' : '#b7c1ba';
  const softRatio = contrastRatio(soft, backdrop.color);
  check(`backdrop ${id} carries its supporting text`, softRatio >= 4.5, `${softRatio.toFixed(2)}:1`);
}

for (const [id, ground] of Object.entries(GROUNDS)) {
  for (const [paletteId, palette] of Object.entries(PALETTES)) {
    const tint = groundTintFor(palette, ground);
    const ratio = contrastRatio(palette.slots.primary, tint);
    check(`object separates from ground, ${paletteId} on ${id}`, ratio >= 1.2, `${ratio.toFixed(2)}:1`);
    const shadow = mixHex(tint, '#2f3a2c', 0.34);
    const shadowRatio = contrastRatio(shadow, tint);
    check(`shadow separates from ground, ${paletteId} on ${id}`, shadowRatio >= 1.35,
      `${shadowRatio.toFixed(2)}:1`);
  }
}

check('skip link exists', html.includes('class="skip"') && html.includes('href="#viewer"'));
check('skip link target exists', html.includes('id="viewer"'));
check('page declares a language', /<html lang="[a-z]{2}"/.test(html));
check('viewport allows zoom',
  html.includes('width=device-width, initial-scale=1') && !html.includes('user-scalable=no'));
check('embed declares a language', /<html lang="[a-z]{2}"/.test(embed));
check('live region present', html.includes('aria-live="polite"'));
check('feedback is visible, not screen reader only',
  html.includes('id="toast" class="toast"') && !/id="toast"[^>]*sr-only/.test(html));
check('toast is a live region', /id="toast"[^>]*role="status"[^>]*aria-live="polite"/.test(html));
check('toast is styled as visible', /\.toast \{[^}]*position: fixed/s.test(css));
check('empty toast is hidden', css.includes('.toast:empty'));
check('share box textarea has a label', styleJs.includes('shareLabel.htmlFor = shareId'));
check('share box is readonly', styleJs.includes('shareText.readOnly = true'));
check('share box can be dismissed', styleJs.includes("element('button', 'action share-close'"));
check('collapsibles use native details',
  (html.match(/<details/g) || []).length >= 2 && !html.includes('aria-expanded'));
check('drawers have accessible titles',
  (html.match(/class="drawer-title"/g) || []).length === 2);
check('toggle button reports state', html.includes('id="toggle"') && html.includes('aria-pressed="false"'));
check('decorative canvas hidden from AT', html.includes('id="overlay"') && html.includes('aria-hidden="true"'));
check('marker chips hidden from AT', styleJs.includes("wrap.setAttribute('aria-hidden', 'true')"));

check('every control gets an id', contentJs.includes('control.id = id'));
check('labels are tied by htmlFor',
  (contentJs.match(/label\.htmlFor/g) || []).length >= 2 && styleJs.includes('label.htmlFor'));
check('hints are tied by aria-describedby', contentJs.includes("setAttribute('aria-describedby'"));
check('hex inputs carry their own label', styleJs.includes("hex.setAttribute('aria-label'"));
check('choice groups announce as radios',
  styleJs.includes("role', 'radiogroup'") && styleJs.includes("role', 'radio'"));
check('choice groups are arrow navigable', styleJs.includes('ArrowRight') && styleJs.includes('ArrowUp'));
check('tabs are arrow navigable', contentJs.includes('ArrowRight') && contentJs.includes('ArrowLeft'));
check('tabs use roving tabindex', contentJs.includes('button.tabIndex = selected ? 0 : -1'));
check('choices use roving tabindex', styleJs.includes('button.tabIndex = on ? 0 : -1'));

check('tap target token defined', css.includes('--tap: 44px'));
check('inputs meet the tap target', /input\[type="text"\][^{]*\{[^}]*min-height: var\(--tap\)/s.test(css));
check('actions meet the tap target', /\.action \{[^}]*min-height: var\(--tap\)/s.test(css));
check('dice meets the tap target', /\.dice \{[^}]*min-height: var\(--tap\)/s.test(css));
check('toggle meets the tap target', /\.toggle \{[^}]*min-height: var\(--tap\)/s.test(css));
check('drawer tab meets the tap target', /\.drawer-tab \{[^}]*min-height: var\(--tap\)/s.test(css));
check('coarse pointers get bigger small controls', css.includes('@media (pointer: coarse)'));
check('checkboxes are at least 22px', /input\[type="checkbox"\] \{[^}]*width: 22px/s.test(css));

check('focus visible styles exist', css.includes(':focus-visible'));
check('focus outline is at least 3px', /outline: 3px solid var\(--focus\)/.test(css));
check('focus outline is offset', css.includes('outline-offset: 2px'));
check('clipped drawer draws its focus ring inside',
  /\.drawer-tab:focus-visible \{[^}]*outline-offset: -3px/s.test(css));
check('collapsed rail stretches its summary',
  /\.shell\.content-closed \.drawer-content \{[^}]*grid-template-rows: minmax\(0, 1fr\)/s.test(css));
check('only one scrollbar gutter is reserved',
  (css.match(/scrollbar-gutter: stable/g) || []).length === 1);
check('no outline is removed outright', !/outline:\s*(none|0)\s*;/.test(css));

check('reduced motion honoured', css.includes('@media (prefers-reduced-motion: reduce)'));
check('increased contrast honoured', css.includes('@media (prefers-contrast: more)'));
check('text can be zoomed', css.includes('-webkit-text-size-adjust: 100%'));
check('inputs are 16px so mobile does not zoom',
  /input\[type="text"\][^{]*\{[^}]*font: 400 16px/s.test(css));

const breakpoints = [...css.matchAll(/@media \(max-width: (\d+)px\)/g)].map((m) => Number(m[1]));
check('has a tablet and a phone breakpoint', breakpoints.includes(1000) && breakpoints.includes(560),
  breakpoints.join(','));
check('phone layout drops to one column', /@media \(max-width: 560px\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)/.test(css));
check('side drawer moves below on narrow screens',
  /@media \(max-width: 1000px\)[\s\S]*grid-template-areas: "viewer" "content" "style"/.test(css));
check('shell columns are clamped against overflow',
  /\.shell \{[\s\S]*?grid-template-columns: 350px minmax\(0, 1fr\)/.test(css));
check('grid children can shrink below their content',
  /\.choice \{[^}]*min-width: 0/s.test(css) && /\.viewer \{[^}]*min-width: 0/s.test(css));
check('auto-fit tracks name a floor', !/repeat\(auto-fit, 1fr\)/.test(css));
check('scrolling panes contain overscroll', css.includes('overscroll-behavior: contain'));
check('content drawer scrolls via details-content',
  /\.drawer-content::details-content \{[^}]*overflow-y: auto/s.test(css));
check('details-content height is definite',
  /\.drawer-content::details-content \{[^}]*height: 100%/s.test(css));
check('content drawer body also scrolls on its own',
  /\.drawer-body \{[^}]*overflow-y: auto/s.test(css) && /\.drawer-body \{[^}]*min-height: 0/s.test(css));
check('content drawer clips its overflow', /\.drawer-content \{[^}]*overflow: hidden/s.test(css));
check('drawer heights use dynamic viewport units', css.includes('dvh') && !/max-height: \d+vh/.test(css));
check('narrow screens release the drawer height caps',
  /@media \(max-width: 1000px\)[\s\S]*\.drawer-content, \.drawer-content::details-content \{[^}]*overflow: visible/.test(css));
check('touch action set on the stage', /\.stage \{[^}]*touch-action: manipulation/s.test(css));

for (const type of CONTENT_TYPES) {
  check(`${type.id} has a lead line`, typeof type.lead === 'string' && type.lead.length > 10);
  for (const group of type.groups) {
    for (const field of group.fields) {
      check(`${type.id}.${field.key} has a label`, Boolean(field.label));
      const needsMode = ['tel', 'email', 'url'].includes(field.type);
      check(`${type.id}.${field.key} sets a keyboard`, !needsMode || Boolean(field.inputmode),
        field.type);
      const personal = ['first', 'last', 'org', 'title', 'phone', 'email', 'url', 'street', 'city', 'region', 'postal', 'country'];
      check(`${type.id}.${field.key} sets autocomplete`,
        !personal.includes(field.key) || Boolean(field.autocomplete), field.key);
      check(`${type.id}.${field.key} never autofills a password`,
        field.type !== 'password' || field.autocomplete === 'off');
    }
  }
}

const conditional = CONTENT_TYPES.flatMap((type) => type.groups.flatMap((g) => g.fields))
  .filter((field) => field.when);
check('conditional fields hide rather than disable', conditional.length >= 2, `${conditional.length}`);
check('nothing is disabled in the panels',
  !contentJs.includes('.disabled = true') && !styleJs.includes('.disabled = true'));

console.log(failures === 0 ? 'a11y: all checks passed' : `a11y: ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
