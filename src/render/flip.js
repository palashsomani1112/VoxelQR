const EASE = {
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  out: (t) => 1 - (1 - t) ** 2,
  backIn: (t) => t * t * (2.4 * t - 1.4),
};

const TRACKS = [
  { key: 'decor', start: 0, end: 0.3, ease: 'backIn' },
  { key: 'camera', start: 0.08, end: 0.95, ease: 'inOut' },
  { key: 'flatten', start: 0.12, end: 0.86, ease: 'inOut' },
  { key: 'ink', start: 0.18, end: 0.82, ease: 'inOut' },
  { key: 'light', start: 0.18, end: 0.82, ease: 'inOut' },
  { key: 'overlay', start: 0.88, end: 1, ease: 'out' },
];

const DURATION = 0.95;

export function createFlip(state, onUpdate, { reducedMotion = false } = {}) {
  const gsap = typeof window !== 'undefined' ? window.gsap : null;

  function applyProgress(progress) {
    for (const track of TRACKS) {
      const span = track.end - track.start;
      const local = span <= 0 ? 1 : (progress - track.start) / span;
      state[track.key] = EASE[track.ease](local < 0 ? 0 : local > 1 ? 1 : local);
    }
    state.progress = progress;
    onUpdate();
  }

  if (reducedMotion) {
    let open = false;
    return {
      open() {
        open = true;
        applyProgress(1);
      },
      close() {
        open = false;
        applyProgress(0);
      },
      toggle() {
        return open ? this.close() : this.open();
      },
      get isOpen() {
        return open;
      },
      jump: applyProgress,
    };
  }

  if (gsap) {
    const driver = { progress: 0 };
    const tween = gsap.to(driver, {
      progress: 1,
      duration: DURATION,
      ease: 'none',
      paused: true,
      onUpdate: () => applyProgress(driver.progress),
    });
    return {
      open: () => tween.play(),
      close: () => tween.reverse(),
      toggle() {
        return tween.progress() > 0.5 ? tween.reverse() : tween.play();
      },
      get isOpen() {
        return tween.progress() > 0.5;
      },
      jump(progress) {
        tween.progress(progress);
      },
    };
  }

  let progress = 0;
  let direction = 0;
  let last = 0;
  let frame = null;

  function step(now) {
    const delta = Math.min(0.05, (now - last) / 1000);
    last = now;
    progress = Math.max(0, Math.min(1, progress + direction * (delta / DURATION)));
    applyProgress(progress);
    if ((direction > 0 && progress < 1) || (direction < 0 && progress > 0)) {
      frame = requestAnimationFrame(step);
    } else {
      frame = null;
    }
  }

  function run(next) {
    direction = next;
    if (frame === null) {
      last = performance.now();
      frame = requestAnimationFrame(step);
    }
  }

  return {
    open: () => run(1),
    close: () => run(-1),
    toggle() {
      return progress > 0.5 ? run(-1) : run(1);
    },
    get isOpen() {
      return progress > 0.5;
    },
    jump(next) {
      progress = next;
      applyProgress(next);
    },
  };
}
