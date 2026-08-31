import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const LOCAL_IMPORT = /^import\s+(?:[\s\S]*?)\s+from\s+['"](\.[^'"]+)['"];?\s*$/gm;
const BARE_IMPORT = /^import\s+([\s\S]*?)\s+from\s+['"]([^.'"][^'"]*)['"];?\s*$/gm;
const DECLARATION = /^(?:export\s+)?(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm;
const DYNAMIC_IMPORT = /import\(\s*['"](\.[^'"]+)['"]\s*\)/g;
const EXPORTED = /^export\s+(?:async\s+)?(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm;

function readModule(path) {
  return readFileSync(path, 'utf8');
}

function collect(entry, seen = new Map(), order = [], bare = new Map()) {
  const path = resolve(entry);
  if (seen.has(path)) return { order, bare };
  seen.set(path, true);
  const source = readModule(path);

  for (const match of source.matchAll(BARE_IMPORT)) {
    const [, clause, specifier] = match;
    bare.set(`${specifier}::${clause.trim()}`, `import ${clause.trim()} from '${specifier}';`);
  }

  for (const match of source.matchAll(LOCAL_IMPORT)) {
    collect(resolve(dirname(path), match[1]), seen, order, bare);
  }

  for (const match of source.matchAll(DYNAMIC_IMPORT)) {
    collect(resolve(dirname(path), match[1]), seen, order, bare);
  }

  order.push({ path, source });
  return { order, bare };
}

function inlineDynamicImports(source, path) {
  return source.replace(DYNAMIC_IMPORT, (whole, specifier) => {
    const target = resolve(dirname(path), specifier);
    const names = [...readModule(target).matchAll(EXPORTED)].map((match) => match[1]);
    if (!names.length) {
      throw new Error(`${specifier} has no top-level exports, so it cannot be inlined`);
    }
    return `Promise.resolve({ ${names.join(', ')} })`;
  });
}

function strip(source) {
  return source
    .replace(LOCAL_IMPORT, '')
    .replace(BARE_IMPORT, '')
    .replace(/^export\s+(?=(?:const|let|function|class|async))/gm, '')
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function assertUniqueDeclarations(modules) {
  const owners = new Map();
  const clashes = [];
  for (const module of modules) {
    const local = relative(root, module.path);
    for (const match of module.source.matchAll(DECLARATION)) {
      const name = match[1];
      if (owners.has(name)) clashes.push(`${name}: ${owners.get(name)} and ${local}`);
      else owners.set(name, local);
    }
  }
  if (clashes.length) {
    throw new Error(`Top-level names collide, so the bundle would break:\n  ${clashes.join('\n  ')}`);
  }
}

function bundle(entry) {
  const { order, bare } = collect(entry);
  assertUniqueDeclarations(order);
  const head = [...bare.values()].join('\n');
  const body = order
    .map((module) => strip(inlineDynamicImports(module.source, module.path)))
    .filter(Boolean)
    .join('\n\n');
  const output = `${head}\n\n${body}\n`;
  const leftover = output.match(DYNAMIC_IMPORT);
  if (leftover) throw new Error(`unresolved dynamic import in bundle: ${leftover[0]}`);
  return output;
}

const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const css = readFileSync(resolve(root, 'assets/styles.css'), 'utf8');
const script = bundle(resolve(root, 'src/main.js'));

const single = html
  .replace('<link rel="stylesheet" href="./assets/styles.css">', `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="./src/main.js"></script>', `<script type="module">\n${script}\n</script>`)
  .replace('<title>Voxel QR</title>', '<title>Voxel QR, single file</title>');

mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/voxel-qr.html'), single);

const embedScript = bundle(resolve(root, 'src/embed.js'));
const embedHtml = readFileSync(resolve(root, 'embed.html'), 'utf8')
  .replace('<link rel="stylesheet" href="./assets/styles.css">', `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="./src/embed.js"></script>', `<script type="module">\n${embedScript}\n</script>`);
writeFileSync(resolve(root, 'dist/voxel-qr-embed.html'), embedHtml);

console.log(`dist/voxel-qr.html ${(single.length / 1024).toFixed(1)} kB`);
console.log(`dist/voxel-qr-embed.html ${(embedHtml.length / 1024).toFixed(1)} kB`);
