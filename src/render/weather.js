import * as THREE from 'three';
import { makeRng } from '../sculpt/build.js';

const flake = new THREE.Object3D();

export function createWeatherField(scene, weather, { tile, seed }) {
  const spec = weather.particles;
  if (!spec) {
    return {
      update() {},
      dispose() {},
    };
  }

  const rain = spec.kind === 'rain';
  const count = spec.count;
  const ceiling = tile * 0.95;
  const rng = makeRng(seed + 4507);

  const geometry = rain
    ? new THREE.BoxGeometry(0.09, 1.1, 0.09)
    : new THREE.BoxGeometry(0.26, 0.26, 0.26);
  const material = new THREE.MeshBasicMaterial({
    color: spec.color,
    transparent: true,
    opacity: rain ? 0.55 : 0.9,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const baseX = new Float32Array(count);
  const baseZ = new Float32Array(count);
  const drop = new Float32Array(count);
  const speed = new Float32Array(count);
  const phase = new Float32Array(count);
  const size = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    baseX[i] = (rng() - 0.5) * tile * 1.05;
    baseZ[i] = (rng() - 0.5) * tile * 1.05;
    drop[i] = rng() * ceiling;
    speed[i] = rain ? 26 + rng() * 16 : 2.2 + rng() * 1.8;
    phase[i] = rng() * Math.PI * 2;
    size[i] = 0.7 + rng() * 0.6;
  }

  const slant = rain ? 0.16 : 0;
  const sway = rain ? 0.25 : 1.5;
  const baseOpacity = material.opacity;

  function update(time, fade) {
    material.opacity = baseOpacity * Math.max(0, 1 - fade * 1.6);
    mesh.visible = material.opacity > 0.02;
    if (!mesh.visible) return;

    for (let i = 0; i < count; i++) {
      const fall = (drop[i] + time * speed[i]) % ceiling;
      const y = ceiling - fall;
      const wobble = Math.sin(time * (rain ? 3 : 0.7) + phase[i]) * sway;
      flake.position.set(
        baseX[i] + wobble + (ceiling - y) * slant,
        y,
        baseZ[i] + Math.cos(time * 0.6 + phase[i]) * sway * 0.6,
      );
      flake.rotation.set(0, rain ? 0 : phase[i] + time * 0.4, rain ? -0.14 : phase[i]);
      flake.scale.setScalar(size[i]);
      flake.updateMatrix();
      mesh.setMatrixAt(i, flake.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  update(0, 0);

  return {
    mesh,
    update,
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
      scene.remove(mesh);
    },
  };
}
