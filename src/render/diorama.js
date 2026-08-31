import * as THREE from 'three';
import { createStage, createGround, createClouds, DEFAULT_VIEW } from './stage.js';
import { createField, createShadowField, contentBounds } from './blocks.js';
import { createFlip } from './flip.js';
import { createWeatherField } from './weather.js';
import { composeScene } from './compose.js';
import { groundPattern } from './pattern.js';
import { SCAN_GROUND } from '../palettes.js';
import { drawFlat } from '../export/flat.js';

const BOB = 0.09;

export function createDiorama(container, { overlay, onState, onView, interactive = true } = {}) {
  const stage = createStage(container);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = { decor: 0, camera: 0, flatten: 0, ink: 0, light: 0, overlay: 0, progress: 0 };
  const corner = new THREE.Vector3();

  let current = null;
  let running = true;
  let dirty = true;
  let start = performance.now();

  const flip = createFlip(state, () => {
    dirty = true;
    if (onState) onState(state);
  }, { reducedMotion });

  function clear() {
    if (!current) return;
    current.columns.dispose();
    current.decor.dispose();
    current.shadows.dispose();
    current.ground.dispose();
    current.clouds.dispose();
    current.weatherField.dispose();
    current = null;
  }

  function build(config, code) {
    clear();
    const composed = composeScene(config, code);
    const { scene, palette, weather, ground, colors, mask, cells, shade, backdrop } = composed;
    const shared = {
      colors,
      ink: palette.ink,
      tile: scene.tile,
      quiet: scene.quiet,
      shadowMask: mask,
      shade: composed.shadeInk,
      weather,
    };

    const groundParts = createGround(stage.world, { tile: scene.tile });
    groundParts.setPatternCanvas(groundPattern(scene, ground, config.seed));

    current = {
      config,
      code,
      scene,
      palette,
      backdrop,
      colors,
      groundTheme: ground,
      ground: groundParts,
      columns: createField(stage.world, scene.columns, { ...shared, kind: 'columns' }),
      decor: createField(stage.world, scene.decor, { ...shared, kind: 'decor' }),
      shadows: createShadowField(stage.world, cells, {
        tile: scene.tile,
        quiet: scene.quiet,
        color: shade,
      }),
      clouds: createClouds(stage.world, { tile: scene.tile }),
      weather,
      weatherField: createWeatherField(stage.world, weather, { tile: scene.tile, seed: config.seed }),
    };
    stage.setBackdrop(backdrop);
    stage.setView(composed.view);
    stage.setWeather(weather, { fogColor: backdrop || '#DCE2DE' });

    stage.setBounds(contentBounds(scene.tile, scene.peak), new THREE.Vector3(0, scene.peak * 0.22, 0));
    setRippleOrigin(scene.size / 2, scene.size / 2);

    if (overlay) {
      drawFlat(overlay, code, { ink: palette.ink, ground: SCAN_GROUND, pixels: 720, margin: false });
      overlay.style.opacity = '0';
    }

    dirty = true;
    return scene;
  }

  function setRippleOrigin(x, y) {
    if (!current) return;
    current.columns.setRipple(x, y);
    current.decor.setRipple(x, y);
  }

  function positionOverlay() {
    if (!overlay || !current) return;
    const { scene } = current;
    const half = scene.tile / 2;
    const edge = half - scene.quiet;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, z] of [[-edge, -edge], [edge, -edge], [edge, edge], [-edge, edge]]) {
      corner.set(x, 0, z);
      const projected = stage.projectPoint(corner);
      const px = (projected.x * 0.5 + 0.5) * container.clientWidth;
      const py = (-projected.y * 0.5 + 0.5) * container.clientHeight;
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
    overlay.style.left = `${minX}px`;
    overlay.style.top = `${minY}px`;
    overlay.style.width = `${maxX - minX}px`;
    overlay.style.height = `${maxY - minY}px`;
  }

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!current) return;

    const time = (performance.now() - start) / 1000;
    const idle = state.progress < 0.001;
    if (!dirty && !idle) return;

    const bob = idle && !reducedMotion ? BOB : 0;
    current.columns.writeMatrices({ flip: state.flatten, gap: 0.05, bob, time });
    current.decor.writeExit({ progress: state.decor, gap: 0.06, time });
    current.shadows.write(Math.min(1, state.flatten * 1.5));
    current.columns.applyColors(state.ink);
    current.decor.applyColors(0);
    current.ground.setColors(current.groundTheme.tint, current.groundTheme.edge, state.ink);
    current.clouds.update(time, Math.max(state.decor, current.weather.fog));
    current.weatherField.update(time, state.flatten);
    stage.setWeather(current.weather, {
      fogColor: current.backdrop || '#DCE2DE',
      flip: state.flatten,
    });
    stage.setLighting(state.light);
    stage.placeCamera(state.camera);
    stage.render();

    if (overlay) {
      const showing = current.config.overlay !== false && state.overlay > 0.01;
      overlay.style.opacity = showing ? String(state.overlay) : '0';
      if (showing) positionOverlay();
    }

    dirty = idle ? true : state.progress > 0.001 && state.progress < 0.999;
  }

  function resize() {
    stage.resize();
    dirty = true;
  }

  window.addEventListener('resize', resize);
  const visibility = () => {
    running = !document.hidden;
    if (running) {
      start = performance.now();
      requestAnimationFrame(frame);
    }
  };
  document.addEventListener('visibilitychange', visibility);

  const DRAG_SLOP = 8;
  const TURN_PER_PIXEL = 0.0085;
  const TILT_PER_PIXEL = 0.005;

  function originFromPoint(clientX, clientY) {
    if (!current) return;
    const rect = stage.renderer.domElement.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((clientY - rect.top) / rect.height) * 2 - 1;
    const size = current.scene.size;
    setRippleOrigin((nx * 0.5 + 0.5) * size, (ny * 0.5 + 0.5) * size);
  }

  if (interactive) {
    let pointer = null;

    container.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary) return;
      pointer = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        dragging: false,
      };
      container.setPointerCapture(event.pointerId);
    });

    container.addEventListener('pointermove', (event) => {
      if (!pointer || event.pointerId !== pointer.id) return;
      const totalX = event.clientX - pointer.startX;
      const totalY = event.clientY - pointer.startY;
      if (!pointer.dragging && Math.hypot(totalX, totalY) < DRAG_SLOP) return;

      if (!pointer.dragging) {
        pointer.dragging = true;
        container.classList.add('is-turning');
      }
      const stepX = event.clientX - pointer.lastX;
      const stepY = event.clientY - pointer.lastY;
      pointer.lastX = event.clientX;
      pointer.lastY = event.clientY;

      const next = stage.orbit(-stepX * TURN_PER_PIXEL, stepY * TILT_PER_PIXEL);
      dirty = true;
      if (onView) onView(next);
    });

    const release = (event) => {
      if (!pointer || event.pointerId !== pointer.id) return;
      const wasDragging = pointer.dragging;
      const { startX, startY } = pointer;
      pointer = null;
      container.classList.remove('is-turning');
      if (container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }
      if (wasDragging || event.type === 'pointercancel') return;
      originFromPoint(startX, startY);
      flip.toggle();
    };

    container.addEventListener('pointerup', release);
    container.addEventListener('pointercancel', release);

    container.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        flip.toggle();
        return;
      }
      const turn = { ArrowLeft: 1, ArrowRight: -1 }[event.key];
      const tilt = { ArrowUp: -1, ArrowDown: 1 }[event.key];
      if (!turn && !tilt) return;
      event.preventDefault();
      const next = stage.orbit((turn || 0) * 0.12, (tilt || 0) * 0.08);
      dirty = true;
      if (onView) onView(next);
    });
  }

  resize();
  requestAnimationFrame(frame);

  return {
    build,
    flip,
    state,
    resize,
    get scene() {
      return current ? current.scene : null;
    },
    resetView() {
      stage.setView(DEFAULT_VIEW);
      dirty = true;
      if (onView) onView(stage.view);
    },
    lockOpen() {
      flip.open();
    },
    unlock() {
      flip.close();
    },
    captureScene(scale = 2) {
      if (!current) return null;
      const element = stage.renderer.domElement;
      const previous = stage.renderer.getPixelRatio();
      stage.renderer.setPixelRatio(Math.min(4, previous * scale));
      stage.resize();
      stage.placeCamera(state.camera);
      stage.render();
      const data = element.toDataURL('image/png');
      stage.renderer.setPixelRatio(previous);
      stage.resize();
      dirty = true;
      return data;
    },
    destroy() {
      running = false;
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
      clear();
      stage.dispose();
    },
  };
}
