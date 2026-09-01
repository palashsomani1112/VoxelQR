import * as THREE from 'three';
import { SLAB } from '../sculpt/build.js';
import { SHADOW_HEIGHT, isShaded } from './shadows.js';

const dummy = new THREE.Object3D();
const tint = new THREE.Color();
const inkColor = new THREE.Color();

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function createField(scene, blocks, { colors, ink, tile, quiet, kind, shadowMask, shade, weather }) {
  const count = blocks.length;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshLambertMaterial();
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, count));
  mesh.count = count;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const offset = quiet + 0.5 - tile / 2;
  const base = new Float32Array(count);
  const top = new Float32Array(count);
  const delay = new Float32Array(count);
  const phase = new Float32Array(count);
  const slotIndex = new Array(count);
  const isObject = new Uint8Array(count);

  let maxDelay = 0;
  blocks.forEach((block, i) => {
    base[i] = block.base;
    top[i] = block.top;
    slotIndex[i] = block.slot;
    isObject[i] = kind === 'decor' || block.kind === 'object' ? 1 : 0;
    phase[i] = (block.x * 0.7 + block.y * 1.3) % (Math.PI * 2);
  });

  function setRipple(originX, originY) {
    maxDelay = 0;
    blocks.forEach((block, i) => {
      const distance = Math.hypot(block.x - originX, block.y - originY);
      delay[i] = distance / (tile * 1.7);
      maxDelay = Math.max(maxDelay, delay[i]);
    });
  }
  setRipple(blocks.length ? blocks[0].x : 0, blocks.length ? blocks[0].y : 0);

  const shaded = new Uint8Array(count);
  if (shadowMask) {
    blocks.forEach((block, i) => {
      shaded[i] = kind === 'columns' && isShaded(shadowMask, block) ? 1 : 0;
    });
  }
  const shadeColor = new THREE.Color(shade || '#2f3a2c');
  const shadeStrength = weather ? weather.shadow : 1;
  const weatherTint = weather && weather.tint ? new THREE.Color(weather.tint) : null;
  const weatherAmount = weather ? weather.tintAmount : 0;

  function applyColors(mix) {
    inkColor.set(ink);
    for (let i = 0; i < count; i++) {
      tint.set(colors[slotIndex[i]] || '#cccccc');
      if (weatherTint && weatherAmount > 0) tint.lerp(weatherTint, weatherAmount * (1 - mix));
      if (shaded[i]) tint.lerp(shadeColor, 0.3 * shadeStrength * (1 - mix));
      if (mix > 0) tint.lerp(inkColor, mix);
      mesh.setColorAt(i, tint);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  function writeMatrices({ flip, gap, bob, time }) {
    const spread = 1 + maxDelay;
    for (let i = 0; i < count; i++) {
      const local = clamp01(flip * spread - delay[i]);
      const lift = isObject[i] && bob > 0 ? Math.sin(time * 1.6 + phase[i]) * bob : 0;
      const blockBase = base[i] * (1 - local);
      const blockTop = top[i] + (SLAB - top[i]) * local;
      const height = Math.max(0.02, blockTop - blockBase);
      const inset = gap * (1 - local);
      dummy.position.set(
        blocks[i].x + offset,
        blockBase + height / 2 + lift,
        blocks[i].y + offset,
      );
      dummy.scale.set(1 - inset * 2, height, 1 - inset * 2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function writeExit({ progress, gap, time }) {
    for (let i = 0; i < count; i++) {
      const local = clamp01(progress * (1 + maxDelay) - delay[i]);
      const shrink = 1 - local;
      const height = Math.max(0.001, (top[i] - base[i]) * shrink);
      const hop = Math.sin(local * Math.PI) * 1.6;
      const lift = Math.sin(time * 1.6 + phase[i]) * (shrink * 0.06);
      dummy.position.set(
        blocks[i].x + offset,
        base[i] + height / 2 + hop + lift,
        blocks[i].y + offset,
      );
      dummy.scale.set(Math.max(0.001, (1 - gap * 2) * shrink), height, Math.max(0.001, (1 - gap * 2) * shrink));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = progress < 0.995;
  }

  applyColors(0);

  return {
    mesh,
    count,
    applyColors,
    writeMatrices,
    writeExit,
    setRipple,
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
      scene.remove(mesh);
    },
  };
}

export function createShadowField(scene, cells, { tile, quiet, color }) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, cells.length));
  mesh.count = cells.length;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  scene.add(mesh);

  const offset = quiet + 0.5 - tile / 2;

  function write(fade) {
    const scale = Math.max(0.001, 1 - fade);
    for (let i = 0; i < cells.length; i++) {
      dummy.position.set(cells[i].x + offset, SHADOW_HEIGHT, cells[i].y + offset);
      dummy.scale.set(scale, 1, scale);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = fade < 0.98;
  }

  write(0);

  return {
    mesh,
    write,
    setColor(next) {
      material.color.set(next);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
      scene.remove(mesh);
    },
  };
}

export function contentBounds(tile, peak) {
  const half = tile / 2;
  return new THREE.Box3(
    new THREE.Vector3(-half, -1.6, -half),
    new THREE.Vector3(half, Math.max(peak, tile * 0.3), half),
  );
}
