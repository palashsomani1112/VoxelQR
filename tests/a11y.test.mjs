import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contrastRatio, BACKDROPS, onColor, GROUNDS, PALETTES, groundTintFor, sceneGround, objectTintFor, mixHex,
} from '../src/palettes.js';
import { CONTENT_TYPES } from '../src/ui/schema.js';
import { shareBase, viewLink } from '../src/export/share.js';
import { WEATHER } from '../src/weather.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const css = read('assets/styles.css');
const html = read('index.html');
const embed = read('embed.html');
const view = read('view.html');
const contentJs = read('src/ui/content.js');
const lookJs = read('src/ui/look.js');
const shareJs = read('src/ui/share.js');
const iconsJs = read('src/ui/icons.js');
const dioramaJs = read('src/render/diorama.js');
const styleJs = lookJs + shareJs;

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

check('skip link exists', html.includes('class="skip"') && html.includes('href="#stage"'));
check('skip link target exists', html.includes('id="stage"'));
check('page declares a language', /<html lang="[a-z]{2}"/.test(html));
check('viewport allows zoom',
  html.includes('width=device-width, initial-scale=1') && !html.includes('user-scalable=no'));
check('embed declares a language', /<html lang="[a-z]{2}"/.test(embed));
check('viewer declares a language', /<html lang="[a-z]{2}"/.test(view));
check('viewer carries no editing controls',
  !view.includes('<dialog') && !view.includes('content-open') && !view.includes('look-open')
  && !view.includes('share-open'));
check('embed carries no editing controls',
  !embed.includes('<dialog') && !embed.includes('bar-button'));
check('viewer keeps the accessible toggle', view.includes('id="toggle"') && view.includes('aria-pressed'));
check('viewer is not indexed', view.includes('name="robots"'));
check('live region present', html.includes('aria-live="polite"'));
check('feedback is visible, not screen reader only',
  html.includes('id="toast" class="toast"') && !/id="toast"[^>]*sr-only/.test(html));
check('toast is a live region', /id="toast"[^>]*role="status"[^>]*aria-live="polite"/.test(html));
check('toast is styled as visible', /\.toast \{[^}]*position: fixed/s.test(css));
check('empty toast is hidden', css.includes('.toast:empty'));
check('share box textarea has a label', styleJs.includes('shareLabel.htmlFor = shareId'));
check('share box is readonly', styleJs.includes('shareText.readOnly = true'));
check('share box can be dismissed', styleJs.includes("element('button', 'action share-close'"));
check('dialogs are native', (html.match(/<dialog/g) || []).length === 3);
check('dialogs are labelled', (html.match(/aria-labelledby=/g) || []).length === 3);
check('openers declare their popup', (html.match(/aria-haspopup="dialog"/g) || []).length === 3);
check('every dialog has a close button',
  contentJs.includes("aria-label', 'Close the content panel")
  && lookJs.includes("aria-label', 'Close the look panel")
  && shareJs.includes("aria-label', 'Close the share panel"));
check('focus returns to the opener on close', read('src/main.js').includes("openers[name].focus()"));
check('clicking the backdrop closes', read('src/main.js').includes('if (event.target === dialog) dialog.close()'));
check('toggle button reports state', html.includes('id="toggle"') && html.includes('aria-pressed="false"'));
check('decorative canvas hidden from AT', html.includes('id="overlay"') && html.includes('aria-hidden="true"'));
check('marker chips hidden from AT', lookJs.includes("wrap.setAttribute('aria-hidden', 'true')"));
check('icons are hidden from AT',
  iconsJs.includes("setAttribute('aria-hidden', 'true')") && iconsJs.includes("setAttribute('focusable', 'false')"));
check('no emoji anywhere in the interface',
  !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(html + contentJs + lookJs + shareJs + iconsJs));
check('bar buttons carry a visible text label', html.includes('class="bar-label"'));
check('bar labels are never hidden', !/\.bar-label \{[^}]*clip-path/s.test(css));
check('bar can wrap rather than crush its labels', /\.bar \{[^}]*flex-wrap: wrap/s.test(css));
check('narrow screens give the actions their own row',
  /@media \(max-width: 440px\)[\s\S]*\.bar-actions \{[^}]*flex: 1 0 100%/.test(css));

check('closed dialogs are hidden', /dialog:not\(\[open\]\) \{[^}]*display: none/s.test(css));
check('dialog display is scoped to the open state',
  /\.sheet-right\[open\] \{[^}]*display: grid/s.test(css) && /\.glass\[open\] \{[^}]*display: grid/s.test(css));
check('no dialog class sets display unconditionally', (() => {
  for (const cls of ['sheet-right', 'sheet-center', 'glass']) {
    const rule = css.match(new RegExp(`\\.${cls} \\{([^}]*)\\}`, 's'));
    if (rule && /display:/.test(rule[1])) return false;
  }
  return true;
})());
check('dialogs start closed in the markup', !/<dialog[^>]*\sopen/.test(html));
check('layout does not hard code the bar height', !/calc\(100dvh - \d+px\)/.test(css));
check('editor body owns the row sizing',
  /body\.is-editor \{[^}]*grid-template-rows: auto minmax\(0, 1fr\)/s.test(css));

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

check('glass panel stays legible over any backdrop', (() => {
  const panel = [246, 244, 238];
  const alpha = 0.82;
  for (const backdrop of ['#232B28', '#FFFFFF', '#2F3A36', '#F9F0D7']) {
    const b = [1, 3, 5].map((i) => parseInt(backdrop.slice(i, i + 2), 16));
    const composite = mixHex(
      `#${panel.map((v) => v.toString(16).padStart(2, '0')).join('')}`,
      backdrop,
      1 - alpha,
    );
    if (contrastRatio('#232c28', composite) < 4.5) return false;
    if (b.length !== 3) return false;
  }
  return true;
})());
check('glass has an opaque fallback', css.includes('@supports not (backdrop-filter'));
check('glass drops the blur under increased contrast',
  /@media \(prefers-contrast: more\)[\s\S]*backdrop-filter: none/.test(css));

check('tap target token defined', css.includes('--tap: 44px'));
check('inputs meet the tap target', /input\[type="text"\][^{]*\{[^}]*min-height: var\(--tap\)/s.test(css));
check('actions meet the tap target', /\.action \{[^}]*min-height: var\(--tap\)/s.test(css));
check('bar buttons meet the tap target', /\.bar-button \{[^}]*min-height: var\(--tap\)/s.test(css));
check('dialog close buttons meet the tap target',
  /\.glass-close \{[^}]*width: var\(--tap\)/s.test(css) && /\.glass-close \{[^}]*height: var\(--tap\)/s.test(css));
check('look tiles are large enough', /\.tile \{[^}]*min-height: 92px/s.test(css));
check('dice meets the tap target', /\.dice \{[^}]*min-height: var\(--tap\)/s.test(css));
check('toggle meets the tap target', /\.toggle \{[^}]*min-height: var\(--tap\)/s.test(css));
check('coarse pointers get bigger small controls', css.includes('@media (pointer: coarse)'));
check('checkboxes are at least 22px', /input\[type="checkbox"\] \{[^}]*width: 22px/s.test(css));

check('focus visible styles exist', css.includes(':focus-visible'));
check('focus outline is at least 3px', /outline: 3px solid var\(--focus\)/.test(css));
check('focus outline is offset', css.includes('outline-offset: 2px'));
check('no outline is removed outright', !/outline:\s*(none|0)\s*;/.test(css));

check('reduced motion honoured', css.includes('@media (prefers-reduced-motion: reduce)'));
check('increased contrast honoured', css.includes('@media (prefers-contrast: more)'));
check('text can be zoomed', css.includes('-webkit-text-size-adjust: 100%'));
check('inputs are 16px so mobile does not zoom',
  /input\[type="text"\][^{]*\{[^}]*font: 400 16px/s.test(css));

const breakpoints = [...css.matchAll(/@media \(max-width: (\d+)px\)/g)].map((m) => Number(m[1]));
check('has a tablet and a phone breakpoint', breakpoints.includes(700) && breakpoints.includes(560),
  breakpoints.join(','));
check('phone layout drops to one column', /@media \(max-width: 560px\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)/.test(css));
check('grid children can shrink below their content',
  /\.choice \{[^}]*min-width: 0/s.test(css) && /\.viewer \{[^}]*min-width: 0/s.test(css));
check('auto-fit tracks name a floor', !/repeat\(auto-fit, 1fr\)/.test(css));
check('scrolling panes contain overscroll', css.includes('overscroll-behavior: contain'));
check('right sheet is a two row grid so its body can scroll',
  /\.sheet-right \{[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\)/.test(css));
check('right sheet body scrolls', /\.sheet-body \{[^}]*overflow-y: auto/s.test(css));
check('right sheet body can shrink', /\.sheet-body \{[^}]*min-height: 0/s.test(css));
check('content panel wraps its body in one scroll box', contentJs.includes("element('div', 'sheet-body')"));
check('dialogs override the centring margin', /^dialog \{[^}]*margin: 0/ms.test(css));
check('glass body scrolls', /\.glass-body \{[^}]*overflow-y: auto/s.test(css));
check('glass body can shrink', /\.glass-body \{[^}]*min-height: 0/s.test(css));
check('centre sheet scrolls', /\.sheet-center \{[^}]*overflow-y: auto/s.test(css));
check('sheet heights use dynamic viewport units', css.includes('dvh') && !/max-height: \d+vh/.test(css));
check('mobile takes the content sheet full screen',
  /@media \(max-width: 700px\)[\s\S]*\.sheet-right \{[^}]*width: 100vw/.test(css));
check('mobile turns the glass into a bottom sheet',
  /@media \(max-width: 700px\)[\s\S]*\.glass \{[^}]*inset: auto 0 0 0/.test(css));

check('stage owns its gestures for rotation', /\.stage \{[^}]*touch-action: none/s.test(css));
check('flip happens on tap, never on hover',
  !dioramaJs.includes('pointerenter') && !dioramaJs.includes('pointerleave'));
check('drag is told apart from tap', dioramaJs.includes('DRAG_SLOP') && dioramaJs.includes('pointer.dragging'));
check('drag uses pointer capture', dioramaJs.includes('setPointerCapture') && dioramaJs.includes('releasePointerCapture'));
check('a cancelled pointer does not flip', dioramaJs.includes("event.type === 'pointercancel'"));
check('rotation is reachable by keyboard',
  dioramaJs.includes('ArrowLeft') && dioramaJs.includes('ArrowUp') && dioramaJs.includes('stage.orbit'));
check('the scene explains both gestures', html.includes('Drag to turn it'));
check('grab cursor signals rotation', /\.stage \{[^}]*cursor: grab/s.test(css) && css.includes('.stage.is-turning'));

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

for (const [id, spec] of Object.entries(WEATHER)) {
  check(`weather ${id} is named for the picker`, typeof spec.name === 'string' && spec.name.length > 1);
}
for (const [weatherId, spec] of Object.entries(WEATHER)) {
  for (const [paletteId, palette] of Object.entries(PALETTES)) {
    for (const [groundId, ground] of Object.entries(GROUNDS)) {
      const theme = sceneGround(palette, ground, null, spec);
      const ratio = contrastRatio(objectTintFor(palette, spec), theme.tint);
      check(`object still separates in ${weatherId}, ${paletteId} on ${groundId}`, ratio >= 1.16,
        `${ratio.toFixed(2)}:1`);
    }
  }
}

check('weather is a look section', lookJs.includes("id: 'weather'"));
check('every look tile has an icon', (lookJs.match(/glyph: '/g) || []).length === 5);
check('every look tile shows its current value', lookJs.includes('tile-value'));
check('share actions carry a description', shareJs.includes('action-note'));

const viewerCss = ['.is-viewer', '.is-embed'];
for (const selector of viewerCss) {
  check(`stylesheet covers ${selector}`, css.includes(selector));
}
check('shared link goes to the viewer, not the editor',
  viewLink(shareBase({ origin: 'https://x.io', pathname: '/q/' }), 'P') === 'https://x.io/q/view.html#c=P');
check('viewer page loads the viewer entry', view.includes('src="./src/viewer.js"'));
check('embed page loads the viewer entry', embed.includes('src="./src/viewer.js"'));
check('editor page loads the editor entry', html.includes('src="./src/main.js"'));

console.log(failures === 0 ? 'a11y: all checks passed' : `a11y: ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
