import * as THREE from 'three';
import { SCAN_GROUND } from '../palettes.js';

const ISO_DIR = new THREE.Vector3(1, 0.86, 1).normalize();
const TOP_DIR = new THREE.Vector3(0, 1, 0.0001).normalize();
const ISO_UP = new THREE.Vector3(0, 1, 0);
const TOP_UP = new THREE.Vector3(0, 0, -1);

export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.copy(new THREE.Vector3(0.6, 1, 0.4).normalize());
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(key, ambient);

  const world = new THREE.Group();
  scene.add(world);

  const target = new THREE.Vector3();
  const bounds = new THREE.Box3();
  const corner = new THREE.Vector3();
  const eye = new THREE.Vector3();
  const up = new THREE.Vector3();

  function placeCamera(flip) {
    const distance = Math.max(bounds.max.x - bounds.min.x, 40) * 3;
    eye.copy(ISO_DIR).lerp(TOP_DIR, flip).normalize().multiplyScalar(distance).add(target);
    up.copy(ISO_UP).lerp(TOP_UP, flip).normalize();
    camera.position.copy(eye);
    camera.up.copy(up);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < 8; i++) {
      corner.set(
        i & 1 ? bounds.max.x : bounds.min.x,
        i & 2 ? bounds.max.y : bounds.min.y,
        i & 4 ? bounds.max.z : bounds.min.z,
      ).applyMatrix4(camera.matrixWorldInverse);
      minX = Math.min(minX, corner.x);
      maxX = Math.max(maxX, corner.x);
      minY = Math.min(minY, corner.y);
      maxY = Math.max(maxY, corner.y);
      minZ = Math.min(minZ, corner.z);
      maxZ = Math.max(maxZ, corner.z);
    }

    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    const aspect = width / height;
    const pad = 1.06;
    let halfW = ((maxX - minX) / 2) * pad;
    let halfH = ((maxY - minY) / 2) * pad;
    if (halfW / halfH > aspect) halfH = halfW / aspect;
    else halfW = halfH * aspect;

    const cx = (maxX + minX) / 2;
    const cy = (maxY + minY) / 2;
    camera.left = cx - halfW;
    camera.right = cx + halfW;
    camera.top = cy + halfH;
    camera.bottom = cy - halfH;
    camera.near = Math.max(0.1, -maxZ - 10);
    camera.far = -minZ + 10;
    camera.updateProjectionMatrix();
  }

  function setBounds(box, focus) {
    bounds.copy(box);
    target.copy(focus);
  }

  function resize() {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    renderer.setSize(width, height, false);
  }

  function setLighting(flip) {
    key.intensity = 1.2 - 1.02 * flip;
    ambient.intensity = 0.6 + 0.42 * flip;
  }

  function setBackdrop(color) {
    if (color) renderer.setClearColor(new THREE.Color(color), 1);
    else renderer.setClearAlpha(0);
  }

  return {
    renderer,
    scene,
    camera,
    world,
    setBounds,
    placeCamera,
    setLighting,
    setBackdrop,
    resize,
    render: () => renderer.render(scene, camera),
    projectPoint: (point) => point.clone().project(camera),
    dispose() {
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export function createGround(scene, { tile, depth = 1.6 }) {
  const top = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const side = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const under = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const box = new THREE.BoxGeometry(tile, depth, tile);
  const slab = new THREE.Mesh(box, [side, side, top, under, side, side]);
  slab.position.set(0, -depth / 2, 0);
  scene.add(slab);

  const patternTexture = new THREE.CanvasTexture(document.createElement('canvas'));
  patternTexture.colorSpace = THREE.SRGBColorSpace;
  const patternMaterial = new THREE.MeshBasicMaterial({
    map: patternTexture,
    transparent: true,
    depthWrite: false,
  });
  const pattern = new THREE.Mesh(new THREE.PlaneGeometry(tile, tile), patternMaterial);
  pattern.rotation.x = -Math.PI / 2;
  pattern.position.y = 0.02;
  scene.add(pattern);

  return {
    slab,
    pattern,
    setPatternCanvas(canvas) {
      patternTexture.image = canvas;
      patternTexture.needsUpdate = true;
    },
    setColors(tint, edge, flip) {
      top.color.set(tint).lerp(new THREE.Color(SCAN_GROUND), flip);
      side.color.set(edge).lerp(new THREE.Color(SCAN_GROUND), flip * 0.4);
      under.color.set(edge).lerp(new THREE.Color(SCAN_GROUND), flip * 0.4);
      patternMaterial.opacity = Math.max(0, 1 - flip * 2.2);
      pattern.visible = patternMaterial.opacity > 0.01;
    },
    dispose() {
      box.dispose();
      pattern.geometry.dispose();
      [top, side, under, patternMaterial].forEach((m) => m.dispose());
      patternTexture.dispose();
      scene.remove(slab, pattern);
    },
  };
}

export function createClouds(scene, { tile }) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0xfdfdfb, transparent: true, opacity: 0.9 });
  const puffs = [
    { x: -tile * 0.34, y: tile * 0.42, z: -tile * 0.3, scale: tile * 0.15 },
    { x: tile * 0.36, y: tile * 0.5, z: tile * 0.24, scale: tile * 0.11 },
  ];
  for (const puff of puffs) {
    const cloud = new THREE.Group();
    for (const [dx, dy, dz, s] of [[0, 0, 0, 1], [0.7, -0.18, 0.1, 0.7], [-0.65, -0.12, -0.1, 0.6]]) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.2), material);
      block.position.set(dx * puff.scale, dy * puff.scale, dz * puff.scale);
      block.scale.setScalar(s * puff.scale);
      cloud.add(block);
    }
    cloud.position.set(puff.x, puff.y, puff.z);
    cloud.userData.drift = puff.x;
    group.add(cloud);
  }
  scene.add(group);

  return {
    group,
    update(time, flip) {
      material.opacity = Math.max(0, 0.9 - flip * 2);
      group.visible = material.opacity > 0.02;
      group.children.forEach((cloud, index) => {
        cloud.position.x = cloud.userData.drift + Math.sin(time * 0.12 + index * 2.1) * tile * 0.06;
      });
    },
    dispose() {
      group.children.forEach((cloud) => cloud.children.forEach((b) => b.geometry.dispose()));
      material.dispose();
      scene.remove(group);
    },
  };
}
