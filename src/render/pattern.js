import { makeRng } from '../sculpt/build.js';

const SIZE = 768;

export function groundPattern(scene, ground, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const rng = makeRng(seed + 991);
  const tile = scene.tile;
  const unit = SIZE / tile;
  const toPixel = (value) => (value + scene.quiet) * unit;

  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = ground.tint;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = ground.detailColor;
  ctx.strokeStyle = ground.detailColor;

  if (ground.detail === 'check') {
    const step = unit * 4;
    for (let y = 0; y < SIZE; y += step) {
      for (let x = 0; x < SIZE; x += step) {
        if (((x / step) + (y / step)) % 2 < 1) ctx.fillRect(x, y, step, step);
      }
    }
  }

  if (ground.detail === 'planks') {
    ctx.lineWidth = Math.max(1, unit * 0.12);
    for (let y = unit * 2.5; y < SIZE; y += unit * 2.5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SIZE, y);
      ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
      const x = rng() * SIZE;
      const y = Math.floor((rng() * SIZE) / (unit * 2.5)) * unit * 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + unit * 2.5);
      ctx.stroke();
    }
  }

  if (ground.detail === 'ripples') {
    ctx.lineWidth = Math.max(1, unit * 0.18);
    for (let i = 0; i < 90; i++) {
      const x = rng() * SIZE;
      const y = rng() * SIZE;
      const width = unit * (1.2 + rng() * 2.4);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + width / 2, y - unit * 0.5, x + width, y);
      ctx.stroke();
    }
  }

  if (ground.detail === 'speckle') {
    for (let i = 0; i < 900; i++) {
      const radius = unit * (0.06 + rng() * 0.16);
      ctx.beginPath();
      ctx.arc(rng() * SIZE, rng() * SIZE, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (ground.detail === 'tufts') {
    for (const tuft of scene.tufts) {
      const x = toPixel(tuft.x);
      const y = toPixel(tuft.y);
      ctx.lineWidth = Math.max(1, unit * 0.16);
      for (const lean of [-0.35, 0, 0.35]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + lean * unit, y - unit * 0.8);
        ctx.stroke();
      }
    }
    for (let i = 0; i < 260; i++) {
      ctx.beginPath();
      ctx.arc(rng() * SIZE, rng() * SIZE, unit * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return canvas;
}
