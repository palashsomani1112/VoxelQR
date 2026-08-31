export const SHADOW_LIGHT = { x: -0.34, z: 0.24 };
export const KEY_DIRECTION = { x: 0.55, y: 1, z: -0.4 };
export const SHADOW_HEIGHT = 0.06;
export const MIN_CASTER = 0.9;

function sweptRect(block, light) {
  const span = block.top - block.base;
  const midway = (block.base + block.top) / 2;
  const width = 1 + light.x * span;
  const depth = 1 + light.z * span;
  return {
    x0: block.x + 0.5 + light.x * midway - width / 2,
    y0: block.y + 0.5 + light.z * midway - depth / 2,
    x1: block.x + 0.5 + light.x * midway + width / 2,
    y1: block.y + 0.5 + light.z * midway + depth / 2,
  };
}

export function shadowMask(scene, { light = SHADOW_LIGHT } = {}) {
  const low = -scene.quiet + 1;
  const high = scene.size + scene.quiet - 2;
  const marked = new Set();

  const cast = (block) => {
    if (block.top < MIN_CASTER) return;
    const rect = sweptRect(block, light);
    for (let y = Math.round(rect.y0); y <= Math.round(rect.y1) - 1; y++) {
      for (let x = Math.round(rect.x0); x <= Math.round(rect.x1) - 1; x++) {
        if (x < low || y < low || x > high || y > high) continue;
        marked.add(`${x},${y}`);
      }
    }
  };

  for (const block of scene.columns) cast(block);
  for (const block of scene.decor) cast(block);
  return marked;
}

export function shadowCells(scene, options) {
  return [...shadowMask(scene, options)].map((key) => {
    const parts = key.split(',');
    return { x: Number(parts[0]), y: Number(parts[1]) };
  });
}

export function isShaded(mask, block) {
  return block.top < MIN_CASTER && mask.has(`${block.x},${block.y}`);
}
