import {
  encode, formatInfo, versionInfo, blockLayout, dataCapacityBytes, TOTAL_CODEWORDS,
  MAX_VERSION, maskBit, remainder,
} from '../src/qr/encoder.js';

let failures = 0;
function check(name, ok, detail = '') {
  if (!ok) {
    failures++;
    console.log(`FAIL  ${name} ${detail}`);
  }
}

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function syndromesZero(codeword, ecCount) {
  for (let i = 0; i < ecCount; i++) {
    let acc = 0;
    for (const byte of codeword) acc = mul(acc, EXP[i]) ^ byte;
    if (acc !== 0) return false;
  }
  return true;
}

const REMAINDER_BITS = [0, 7, 7, 7, 7, 7, 0, 0, 0, 0];

function functionMap(version) {
  const size = version * 4 + 17;
  const used = Array.from({ length: size }, () => new Array(size).fill(false));
  const mark = (r, c) => {
    if (r >= 0 && c >= 0 && r < size && c < size) used[r][c] = true;
  };
  for (const [row, col] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) mark(row + r, col + c);
  }
  for (let i = 0; i < size; i++) {
    mark(6, i);
    mark(i, 6);
  }
  const centers = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]][version - 1];
  const last = centers[centers.length - 1];
  let alignments = 0;
  for (const cy of centers) {
    for (const cx of centers) {
      if ((cy === 6 && cx === 6) || (cy === 6 && cx === last) || (cy === last && cx === 6)) continue;
      alignments++;
      for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) mark(cy + r, cx + c);
    }
  }
  used.alignments = alignments;
  for (let i = 0; i < 9; i++) {
    mark(8, i);
    mark(i, 8);
  }
  for (let i = 0; i < 8; i++) {
    mark(8, size - 1 - i);
    mark(size - 1 - i, 8);
  }
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      mark(Math.floor(i / 3), (i % 3) + size - 11);
      mark((i % 3) + size - 11, Math.floor(i / 3));
    }
  }
  return used;
}

function readStream(grid, version, mask) {
  const size = grid.length;
  const used = functionMap(version);
  const bits = [];
  let inc = -1;
  let row = size - 1;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (;;) {
      for (let c = 0; c < 2; c++) {
        if (!used[row][col - c]) {
          let on = grid[row][col - c] === true;
          if (maskBit(mask, row, col - c)) on = !on;
          bits.push(on ? 1 : 0);
        }
      }
      row += inc;
      if (row < 0 || row >= size) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
  }
  return bits;
}

function readFormat(grid) {
  const size = grid.length;
  let raw = 0;
  for (let i = 0; i < 15; i++) {
    let cell;
    if (i < 6) cell = grid[i][8];
    else if (i < 8) cell = grid[i + 1][8];
    else cell = grid[size - 15 + i][8];
    if (cell) raw |= 1 << i;
  }
  for (const level of ['L', 'M', 'Q', 'H']) {
    for (let mask = 0; mask < 8; mask++) {
      if (formatInfo(level, mask) === raw) return { level, mask };
    }
  }
  return null;
}

const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

function decodeBits(bits, version) {
  let at = 0;
  const take = (n) => {
    let v = 0;
    for (let i = 0; i < n; i++) v = (v << 1) | bits[at++];
    return v;
  };
  const mode = take(4);
  const tier = version <= 9 ? 0 : 1;
  if (mode === 4) {
    const len = take([8, 16][tier]);
    const bytes = [];
    for (let i = 0; i < len; i++) bytes.push(take(8));
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
  if (mode === 1) {
    const len = take([10, 12][tier]);
    let out = '';
    let left = len;
    while (left >= 3) {
      out += String(take(10)).padStart(3, '0');
      left -= 3;
    }
    if (left === 2) out += String(take(7)).padStart(2, '0');
    if (left === 1) out += String(take(4));
    return out;
  }
  if (mode === 2) {
    const len = take([9, 11][tier]);
    let out = '';
    let left = len;
    while (left >= 2) {
      const pair = take(11);
      out += ALNUM[Math.floor(pair / 45)] + ALNUM[pair % 45];
      left -= 2;
    }
    if (left === 1) out += ALNUM[take(6)];
    return out;
  }
  throw new Error(`unexpected mode ${mode}`);
}

function decode(result) {
  const fmt = readFormat(result.modules);
  if (!fmt) throw new Error('format info unreadable');
  const bits = readStream(result.modules, result.version, fmt.mask);
  const expectedBits = TOTAL_CODEWORDS[result.version - 1] * 8 + REMAINDER_BITS[result.version - 1];
  if (bits.length !== expectedBits) {
    throw new Error(`free modules ${bits.length}, expected ${expectedBits}`);
  }
  const stream = [];
  for (let i = 0; i + 8 <= TOTAL_CODEWORDS[result.version - 1] * 8; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i + b];
    stream.push(byte);
  }

  const layout = blockLayout(result.version, fmt.level);
  const dataBlocks = layout.map(() => []);
  const ecBlocks = layout.map(() => []);
  let at = 0;
  const widestData = Math.max(...layout.map((b) => b.data));
  for (let i = 0; i < widestData; i++) {
    layout.forEach((block, bi) => {
      if (i < block.data) dataBlocks[bi].push(stream[at++]);
    });
  }
  const widestEc = Math.max(...layout.map((b) => b.ec));
  for (let i = 0; i < widestEc; i++) {
    layout.forEach((block, bi) => {
      if (i < block.ec) ecBlocks[bi].push(stream[at++]);
    });
  }

  layout.forEach((block, bi) => {
    const full = dataBlocks[bi].concat(ecBlocks[bi]);
    if (!syndromesZero(full, block.ec)) throw new Error(`block ${bi} fails RS syndrome check`);
  });

  const flat = [];
  for (const block of dataBlocks) flat.push(...block);
  const dataBits = [];
  for (const byte of flat) for (let b = 7; b >= 0; b--) dataBits.push((byte >> b) & 1);
  return { text: decodeBits(dataBits, result.version), level: fmt.level, mask: fmt.mask };
}

for (let v = 1; v <= MAX_VERSION; v++) {
  for (const level of ['L', 'M', 'Q', 'H']) {
    const layout = blockLayout(v, level);
    const total = layout.reduce((s, b) => s + b.data + b.ec, 0);
    check(`codeword total v${v}${level}`, total === TOTAL_CODEWORDS[v - 1],
      `got ${total}, want ${TOTAL_CODEWORDS[v - 1]}`);
    const spread = layout.map((b) => b.data);
    check(`block spread v${v}${level}`, Math.max(...spread) - Math.min(...spread) <= 1,
      `${spread.join(',')}`);
  }
}

check('format info L mask 0', formatInfo('L', 0) === 0b111011111000100, formatInfo('L', 0).toString(2));
check('format info M mask 0', formatInfo('M', 0) === 0b101010000010010, formatInfo('M', 0).toString(2));
check('format info Q mask 7', formatInfo('Q', 7) === 0b010101111101101, formatInfo('Q', 7).toString(2));
check('format info H mask 5', formatInfo('H', 5) === 0b000001001010101, formatInfo('H', 5).toString(2));
check('format info Q mask 4', formatInfo('Q', 4) === 0b010010010110100, formatInfo('Q', 4).toString(2));
check('version info 7', versionInfo(7) === 0b000111110010010100, versionInfo(7).toString(2));
check('version info 10', versionInfo(10) === 0b001010010011010011, versionInfo(10).toString(2));

const distinct = new Set();
for (const level of ['L', 'M', 'Q', 'H']) for (let m = 0; m < 8; m++) distinct.add(formatInfo(level, m));
const EXPECTED_ALIGNMENTS = [0, 1, 1, 1, 1, 1, 6, 6, 6, 6];
for (let v = 1; v <= MAX_VERSION; v++) {
  const map = functionMap(v);
  check(`alignment count v${v}`, map.alignments === EXPECTED_ALIGNMENTS[v - 1], `${map.alignments}`);
  let free = 0;
  for (const row of map) for (const cell of row) if (!cell) free++;
  const want = TOTAL_CODEWORDS[v - 1] * 8 + REMAINDER_BITS[v - 1];
  check(`free module count v${v}`, free === want, `got ${free}, want ${want}`);
}

check('32 distinct format words', distinct.size === 32, `${distinct.size}`);

for (const degree of [7, 10, 13, 16, 17, 18, 20, 22, 24, 26, 28, 30]) {
  const data = Array.from({ length: 40 }, (_, i) => (i * 37 + degree * 11) & 0xff);
  const parity = remainder(data, degree);
  check(`rs parity width ${degree}`, parity.length === degree);
  check(`rs syndromes ${degree}`, syndromesZero(data.concat(parity), degree));
  const broken = data.slice();
  broken[3] ^= 0x40;
  check(`rs detects corruption ${degree}`, !syndromesZero(broken.concat(parity), degree));
}

const samples = [
  'https://example.com',
  'HELLO WORLD',
  '8675309',
  'https://example.github.io/voxel-qr/#c=abcDEF123',
  'WIFI:T:WPA;S:Kitchen Hotspot;P:hunter2hunter2;;',
  'BEGIN:VCARD\nVERSION:3.0\nN:Doe;Jane\nFN:Jane Doe\nORG:Example Company\nTITLE:Designer\nTEL;TYPE=CELL:+1 555 0100\nEMAIL:jane@example.com\nURL:https://example.com\nADR:;;1 Main Street;Anytown;;00000;Country\nEND:VCARD',
  'grüße aus münchen 🌳',
  'a'.repeat(271),
];

for (const text of samples) {
  for (const level of ['L', 'M', 'Q', 'H']) {
    let result;
    try {
      result = encode(text, level);
    } catch (err) {
      check(`encode ${text.length}b ${level}`, false, err.message);
      continue;
    }
    let round;
    try {
      round = decode(result);
    } catch (err) {
      check(`decode ${text.length}b ${level}`, false, err.message);
      continue;
    }
    check(`round trip ${text.length}b ${level}`, round.text === text,
      `v${result.version}${result.level} mask ${result.mask} got ${round.text.length} chars`);
    check(`level echo ${text.length}b ${level}`, round.level === result.level);
    check(`mask echo ${text.length}b ${level}`, round.mask === result.mask);
  }
}

let rng = 42;
const rand = () => {
  rng = (rng * 1103515245 + 12345) & 0x7fffffff;
  return rng / 0x7fffffff;
};
const pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:/.-_?=&#äöü ';
let fuzzed = 0;
for (let i = 0; i < 400; i++) {
  const len = 1 + Math.floor(rand() * 200);
  let text = '';
  for (let c = 0; c < len; c++) text += pool[Math.floor(rand() * pool.length)];
  const level = ['L', 'M', 'Q', 'H'][Math.floor(rand() * 4)];
  const result = encode(text, level);
  const round = decode(result);
  if (round.text !== text) {
    check(`fuzz ${i}`, false, `v${result.version}${result.level} mask ${result.mask}`);
    break;
  }
  fuzzed++;
}
check('fuzz round trips', fuzzed === 400, `${fuzzed}/400`);

const versionsSeen = new Set();
for (let bytes = 1; bytes <= 271; bytes++) {
  const result = encode('x'.repeat(bytes), 'L');
  versionsSeen.add(result.version);
  const round = decode(result);
  check(`length sweep ${bytes}`, round.text === 'x'.repeat(bytes), `v${result.version}`);
}
check('sweep covers v1-v10', versionsSeen.size === 10, [...versionsSeen].join(','));

const relaxed = encode('y'.repeat(260), 'H');
check('relaxes ecc when needed', relaxed.relaxed && relaxed.level === 'L', `${relaxed.level}`);

let overflowed = false;
try {
  encode('z'.repeat(400), 'L');
} catch (err) {
  overflowed = err instanceof RangeError;
}
check('overflow throws RangeError', overflowed);

console.log(failures === 0 ? 'qr: all checks passed' : `qr: ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
