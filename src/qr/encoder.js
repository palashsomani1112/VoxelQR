const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

function gmul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function generatorPoly(degree) {
  let poly = [1];
  for (let d = 0; d < degree; d++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let i = 0; i < poly.length; i++) {
      next[i] ^= poly[i];
      next[i + 1] ^= gmul(poly[i], EXP[d]);
    }
    poly = next;
  }
  return poly;
}

export function remainder(data, degree) {
  const gen = generatorPoly(degree);
  const out = new Array(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ out[0];
    out.shift();
    out.push(0);
    if (factor !== 0) {
      for (let i = 0; i < degree; i++) out[i] ^= gmul(gen[i + 1], factor);
    }
  }
  return out;
}

export const TOTAL_CODEWORDS = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346];

export const MAX_VERSION = TOTAL_CODEWORDS.length;

const ALIGN_CENTERS = [
  [], [6, 18], [6, 22], [6, 26], [6, 30],
  [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
];

const EC_LEVELS = { L: 1, M: 0, Q: 3, H: 2 };

// [ecPerBlock, blocksInGroup1, dataPerBlockGroup1, blocksInGroup2, dataPerBlockGroup2]
const EC_BLOCKS = {
  L: [
    [7, 1, 19, 0, 0], [10, 1, 34, 0, 0], [15, 1, 55, 0, 0], [20, 1, 80, 0, 0], [26, 1, 108, 0, 0],
    [18, 2, 68, 0, 0], [20, 2, 78, 0, 0], [24, 2, 97, 0, 0], [30, 2, 116, 0, 0], [18, 2, 68, 2, 69],
  ],
  M: [
    [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
    [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44],
  ],
  Q: [
    [13, 1, 13, 0, 0], [22, 1, 22, 0, 0], [18, 2, 17, 0, 0], [26, 2, 24, 0, 0], [18, 2, 15, 2, 16],
    [24, 4, 19, 0, 0], [18, 2, 14, 4, 15], [22, 4, 18, 2, 19], [20, 4, 16, 4, 17], [24, 6, 19, 2, 20],
  ],
  H: [
    [17, 1, 9, 0, 0], [28, 1, 16, 0, 0], [22, 2, 13, 0, 0], [16, 4, 9, 0, 0], [22, 2, 11, 2, 12],
    [28, 4, 15, 0, 0], [26, 4, 13, 1, 14], [26, 4, 14, 2, 15], [24, 4, 12, 4, 13], [28, 6, 15, 2, 16],
  ],
};

export function blockLayout(version, level) {
  const [ec, n1, d1, n2, d2] = EC_BLOCKS[level][version - 1];
  const blocks = [];
  for (let i = 0; i < n1; i++) blocks.push({ data: d1, ec });
  for (let i = 0; i < n2; i++) blocks.push({ data: d2, ec });
  return blocks;
}

export function dataCapacityBytes(version, level) {
  return blockLayout(version, level).reduce((sum, b) => sum + b.data, 0);
}

const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

export function pickMode(text) {
  if (/^[0-9]*$/.test(text)) return 'numeric';
  let alnum = true;
  for (const ch of text) if (ALNUM.indexOf(ch) < 0) alnum = false;
  return alnum ? 'alnum' : 'byte';
}

const MODE_BITS = { numeric: 1, alnum: 2, byte: 4 };
const COUNT_BITS = { numeric: [10, 12], alnum: [9, 11], byte: [8, 16] };

function countBits(mode, version) {
  return COUNT_BITS[mode][version <= 9 ? 0 : 1];
}

class Bits {
  constructor() {
    this.bytes = [];
    this.length = 0;
  }
  put(value, width) {
    for (let i = width - 1; i >= 0; i--) this.putBit(((value >>> i) & 1) === 1);
  }
  putBit(on) {
    const index = this.length >>> 3;
    if (this.bytes.length <= index) this.bytes.push(0);
    if (on) this.bytes[index] |= 0x80 >>> (this.length & 7);
    this.length++;
  }
}

function utf8(text) {
  return Array.from(new TextEncoder().encode(text));
}

function encodeSegment(bits, text, mode, version) {
  bits.put(MODE_BITS[mode], 4);
  if (mode === 'byte') {
    const bytes = utf8(text);
    bits.put(bytes.length, countBits(mode, version));
    for (const b of bytes) bits.put(b, 8);
    return;
  }
  bits.put(text.length, countBits(mode, version));
  if (mode === 'numeric') {
    for (let i = 0; i < text.length; i += 3) {
      const chunk = text.slice(i, i + 3);
      bits.put(parseInt(chunk, 10), chunk.length * 3 + 1);
    }
    return;
  }
  for (let i = 0; i < text.length; i += 2) {
    if (i + 1 < text.length) {
      bits.put(ALNUM.indexOf(text[i]) * 45 + ALNUM.indexOf(text[i + 1]), 11);
    } else {
      bits.put(ALNUM.indexOf(text[i]), 6);
    }
  }
}

function payloadBitLength(text, mode, version) {
  const header = 4 + countBits(mode, version);
  if (mode === 'byte') return header + utf8(text).length * 8;
  if (mode === 'numeric') {
    const full = Math.floor(text.length / 3);
    const rest = text.length % 3;
    return header + full * 10 + (rest === 0 ? 0 : rest * 3 + 1);
  }
  return header + Math.floor(text.length / 2) * 11 + (text.length % 2) * 6;
}

export function smallestVersion(text, level, mode = pickMode(text)) {
  for (let v = 1; v <= MAX_VERSION; v++) {
    if (payloadBitLength(text, mode, v) <= dataCapacityBytes(v, level) * 8) return v;
  }
  return null;
}

export function fit(text, level) {
  const mode = pickMode(text);
  const order = ['H', 'Q', 'M', 'L'];
  const start = order.indexOf(level);
  for (let i = start; i < order.length; i++) {
    const version = smallestVersion(text, order[i], mode);
    if (version) return { version, level: order[i], mode, relaxed: i !== start };
  }
  return null;
}

function codewords(text, version, level, mode) {
  const capacity = dataCapacityBytes(version, level);
  const bits = new Bits();
  encodeSegment(bits, text, mode, version);
  const limit = capacity * 8;
  for (let i = 0; i < 4 && bits.length < limit; i++) bits.putBit(false);
  while (bits.length % 8 !== 0) bits.putBit(false);
  const data = bits.bytes.slice();
  const pad = [0xec, 0x11];
  for (let i = 0; data.length < capacity; i++) data.push(pad[i % 2]);

  const layout = blockLayout(version, level);
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (const block of layout) {
    const chunk = data.slice(offset, offset + block.data);
    offset += block.data;
    dataBlocks.push(chunk);
    ecBlocks.push(remainder(chunk, block.ec));
  }

  const out = [];
  const widestData = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < widestData; i++) {
    for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
  }
  const widestEc = Math.max(...ecBlocks.map((b) => b.length));
  for (let i = 0; i < widestEc; i++) {
    for (const block of ecBlocks) if (i < block.length) out.push(block[i]);
  }
  return out;
}

const G15 = 0b10100110111;
const G18 = 0b1111100100101;
const G15_MASK = 0b101010000010010;

function bchDigits(value) {
  let digits = 0;
  while (value !== 0) {
    digits++;
    value >>>= 1;
  }
  return digits;
}

export function formatInfo(level, mask) {
  const value = (EC_LEVELS[level] << 3) | mask;
  let d = value << 10;
  while (bchDigits(d) - bchDigits(G15) >= 0) d ^= G15 << (bchDigits(d) - bchDigits(G15));
  return ((value << 10) | d) ^ G15_MASK;
}

export function versionInfo(version) {
  let d = version << 12;
  while (bchDigits(d) - bchDigits(G18) >= 0) d ^= G18 << (bchDigits(d) - bchDigits(G18));
  return (version << 12) | d;
}

export function maskBit(mask, row, col) {
  switch (mask) {
    case 0: return (row + col) % 2 === 0;
    case 1: return row % 2 === 0;
    case 2: return col % 3 === 0;
    case 3: return (row + col) % 3 === 0;
    case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default: return (((row * col) % 3) + ((row + col) % 2)) % 2 === 0;
  }
}

function blank(size) {
  return Array.from({ length: size }, () => new Array(size).fill(null));
}

function placeFinder(grid, row, col) {
  const size = grid.length;
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
      grid[rr][cc] = ring === 0 || ring === 1 || ring === 3;
    }
  }
}

function placeFunctionPatterns(grid, version) {
  const size = grid.length;
  placeFinder(grid, 0, 0);
  placeFinder(grid, 0, size - 7);
  placeFinder(grid, size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    const on = i % 2 === 0;
    grid[6][i] = on;
    grid[i][6] = on;
  }

  const centers = ALIGN_CENTERS[version - 1];
  const last = centers[centers.length - 1];
  for (const cy of centers) {
    for (const cx of centers) {
      const onFinder = (cy === 6 && cx === 6) || (cy === 6 && cx === last) || (cy === last && cx === 6);
      if (onFinder) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          grid[cy + r][cx + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
        }
      }
    }
  }

  for (let i = 0; i < 9; i++) {
    if (grid[8][i] === null) grid[8][i] = false;
    if (grid[i][8] === null) grid[i][8] = false;
  }
  for (let i = 0; i < 8; i++) {
    grid[8][size - 1 - i] = false;
    grid[size - 1 - i][8] = false;
  }
  grid[size - 8][8] = true;

  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      grid[Math.floor(i / 3)][(i % 3) + size - 11] = false;
      grid[(i % 3) + size - 11][Math.floor(i / 3)] = false;
    }
  }
}

function placeTypeInfo(grid, level, mask, version) {
  const size = grid.length;
  const bits = formatInfo(level, mask);
  for (let i = 0; i < 15; i++) {
    const on = ((bits >> i) & 1) === 1;
    if (i < 6) grid[i][8] = on;
    else if (i < 8) grid[i + 1][8] = on;
    else grid[size - 15 + i][8] = on;

    if (i < 8) grid[8][size - i - 1] = on;
    else if (i < 9) grid[8][15 - i] = on;
    else grid[8][14 - i] = on;
  }
  grid[size - 8][8] = true;

  if (version >= 7) {
    const vbits = versionInfo(version);
    for (let i = 0; i < 18; i++) {
      const on = ((vbits >> i) & 1) === 1;
      grid[Math.floor(i / 3)][(i % 3) + size - 11] = on;
      grid[(i % 3) + size - 11][Math.floor(i / 3)] = on;
    }
  }
}

function placeData(grid, bytes, mask) {
  const size = grid.length;
  let inc = -1;
  let row = size - 1;
  let bitIndex = 7;
  let byteIndex = 0;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (;;) {
      for (let c = 0; c < 2; c++) {
        if (grid[row][col - c] !== null) continue;
        let on = false;
        if (byteIndex < bytes.length) on = ((bytes[byteIndex] >>> bitIndex) & 1) === 1;
        if (maskBit(mask, row, col - c)) on = !on;
        grid[row][col - c] = on;
        bitIndex--;
        if (bitIndex === -1) {
          byteIndex++;
          bitIndex = 7;
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
}

function runPenalty(line) {
  let score = 0;
  let run = 1;
  for (let i = 1; i < line.length; i++) {
    if (line[i] === line[i - 1]) {
      run++;
    } else {
      if (run >= 5) score += 3 + (run - 5);
      run = 1;
    }
  }
  if (run >= 5) score += 3 + (run - 5);
  return score;
}

const FINDER_RUN = [true, false, true, true, true, false, true];

function hasFinderRun(line, at) {
  for (let i = 0; i < 7; i++) if (line[at + i] !== FINDER_RUN[i]) return false;
  const before = line.slice(Math.max(0, at - 4), at);
  const after = line.slice(at + 7, at + 11);
  const quietBefore = before.length === 4 && before.every((v) => !v);
  const quietAfter = after.length === 4 && after.every((v) => !v);
  return quietBefore || quietAfter;
}

export function penalty(grid) {
  const size = grid.length;
  let score = 0;
  let dark = 0;

  for (let i = 0; i < size; i++) {
    const row = grid[i];
    const col = grid.map((r) => r[i]);
    score += runPenalty(row) + runPenalty(col);
    for (let j = 0; j <= size - 7; j++) {
      if (hasFinderRun(row, j)) score += 40;
      if (hasFinderRun(col, j)) score += 40;
    }
    for (const cell of row) if (cell) dark++;
  }

  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = grid[r][c];
      if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) score += 3;
    }
  }

  const ratio = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10;
  return score;
}

export function encode(text, requestedLevel = 'M') {
  const chosen = fit(text, requestedLevel);
  if (!chosen) {
    const cap = dataCapacityBytes(MAX_VERSION, 'L');
    throw new RangeError(`Payload needs more than version ${MAX_VERSION} (max ${cap} bytes at level L)`);
  }
  const { version, level, mode, relaxed } = chosen;
  const size = version * 4 + 17;
  const bytes = codewords(text, version, level, mode);

  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const grid = blank(size);
    placeFunctionPatterns(grid, version);
    placeData(grid, bytes, mask);
    placeTypeInfo(grid, level, mask, version);
    const score = penalty(grid);
    if (!best || score < best.score) best = { grid, score, mask };
  }

  return {
    size,
    version,
    level,
    mode,
    mask: best.mask,
    relaxed,
    modules: best.grid,
    isDark: (row, col) => best.grid[row][col] === true,
  };
}
