const dome = (d) => Math.sqrt(Math.max(0, 1 - d * d));

function ring(nx, ny) {
  return Math.hypot(nx, ny);
}

const tree = {
  id: 'tree',
  name: 'Tree',
  reach: 0.32,
  fill: 0.55,
  sample(nx, ny) {
    const d = ring(nx, ny);
    const out = [];
    if (Math.abs(nx) < 0.2 && Math.abs(ny) < 0.2) out.push({ base: 0, top: 0.5, slot: 'secondary', keep: true });
    if (d <= 0.98) {
      const top = 0.42 + 0.5 * dome(d);
      out.push({ base: 0.4, top, slot: 'primary' });
    }
    return out;
  },
  decor(nx, ny) {
    const d = ring(nx, ny);
    if (Math.abs(nx) < 0.2 && Math.abs(ny) < 0.2) return [{ base: 0, top: 0.48, slot: 'secondary', keep: true }];
    if (d > 0.92) return [];
    const top = 0.42 + 0.5 * dome(d);
    if (d > 0.3 && d < 0.72) return [{ base: top, top: top + 0.1, slot: 'accent' }];
    return [{ base: top - 0.14, top, slot: 'primary' }];
  },
};

const pine = {
  id: 'pine',
  name: 'Pine',
  reach: 0.3,
  fill: 0.6,
  sample(nx, ny) {
    const d = ring(nx, ny);
    const out = [];
    if (Math.abs(nx) < 0.22 && Math.abs(ny) < 0.22) out.push({ base: 0, top: 0.24, slot: 'secondary', keep: true });
    const tiers = [
      { limit: 1.0, base: 0.2, top: 0.46 },
      { limit: 0.64, base: 0.46, top: 0.76 },
      { limit: 0.3, base: 0.76, top: 1.04 },
    ];
    for (const tier of tiers) {
      if (d <= tier.limit) out.push({ base: tier.base, top: tier.top, slot: 'primary' });
    }
    return out;
  },
  decor(nx, ny) {
    const d = ring(nx, ny);
    if (d < 0.14) return [{ base: 1.04, top: 1.16, slot: 'accent', keep: true }];
    if (d < 0.3) return [{ base: 0.76, top: 0.9, slot: 'primary' }];
    if (d < 0.64) return [{ base: 0.46, top: 0.6, slot: 'primary' }];
    return [{ base: 0.2, top: 0.32, slot: 'primary' }];
  },
};

const flower = {
  id: 'flower',
  name: 'Flower',
  reach: 0.3,
  fill: 0.8,
  sample(nx, ny) {
    const d = ring(nx, ny);
    const out = [];
    if (Math.abs(nx) < 0.22 && Math.abs(ny) < 0.22) {
      out.push({ base: 0, top: 0.72, slot: 'secondary', keep: true });
      out.push({ base: 0.72, top: 0.86, slot: 'accent', keep: true });
      return out;
    }
    const petal = 0.52 + 0.46 * Math.abs(Math.cos(Math.atan2(ny, nx) * 2.5));
    if (d < petal) out.push({ base: 0.62, top: 0.78, slot: 'primary' });
    else if (d < 0.85 && Math.abs(nx) < 0.34) out.push({ base: 0.14, top: 0.3, slot: 'primary' });
    return out;
  },
  decor(nx, ny) {
    const d = ring(nx, ny);
    if (Math.abs(nx) < 0.22 && Math.abs(ny) < 0.22) {
      return [{ base: 0, top: 0.7, slot: 'secondary', keep: true }];
    }
    const petal = 0.52 + 0.46 * Math.abs(Math.cos(Math.atan2(ny, nx) * 2.5));
    if (d < petal) return [{ base: 0.62, top: 0.78, slot: 'primary', keep: true }];
    if (d < 0.9 && Math.abs(nx) < 0.34 && ny > 0.2) return [{ base: 0.14, top: 0.3, slot: 'primary' }];
    return [];
  },
};

const mushroom = {
  id: 'mushroom',
  name: 'Mushroom',
  reach: 0.29,
  fill: 0.55,
  sample(nx, ny) {
    const d = ring(nx, ny);
    const out = [];
    if (d < 0.3) out.push({ base: 0, top: 0.36, slot: 'secondary' });
    if (d <= 1) {
      const top = 0.36 + 0.22 * dome(d);
      out.push({ base: Math.max(0.3, top - 0.16), top, slot: 'primary' });
    }
    return out;
  },
  decor(nx, ny) {
    const d = ring(nx, ny);
    if (d < 0.3) return [{ base: 0, top: 0.34, slot: 'secondary' }];
    if (d > 0.95) return [];
    const top = 0.36 + 0.22 * dome(d);
    if (d < 0.8) return [{ base: top, top: top + 0.07, slot: 'accent' }];
    return [{ base: top - 0.14, top, slot: 'primary' }];
  },
};

const house = {
  id: 'house',
  name: 'House',
  reach: 0.28,
  fill: 0.7,
  sample(nx, ny) {
    if (Math.abs(nx) > 0.86 || Math.abs(ny) > 0.86) return [];
    const wall = 0.42;
    const roof = wall + 0.3 * (1 - Math.abs(nx) / 0.86);
    const door = Math.abs(nx) < 0.2 && ny > 0.6;
    return [
      { base: 0, top: wall, slot: door ? 'accent' : 'primary' },
      { base: wall, top: roof, slot: 'secondary' },
    ];
  },
  decor(nx, ny) {
    if (Math.abs(nx) > 0.86 || Math.abs(ny) > 0.86) return [];
    const wall = 0.42;
    const roof = wall + 0.3 * (1 - Math.abs(nx) / 0.86);
    const window = Math.abs(ny) > 0.7 && Math.abs(nx) > 0.3 && Math.abs(nx) < 0.62;
    if (window) return [{ base: 0.16, top: 0.3, slot: 'accent', keep: true }];
    return [{ base: wall, top: roof, slot: 'secondary' }];
  },
};

const tower = {
  id: 'tower',
  name: 'Tower',
  reach: 0.26,
  fill: 0.7,
  sample(nx, ny) {
    const d = ring(nx, ny);
    const out = [];
    if (d > 1) return out;
    const height = 1.05 - 0.35 * d;
    const floors = 4;
    for (let f = 0; f < floors; f++) {
      const base = (height * f) / floors;
      const top = (height * (f + 1)) / floors;
      const inset = 0.95 - f * 0.14;
      if (d <= inset) out.push({ base, top: top - 0.03, slot: f === 2 ? 'accent' : 'primary' });
    }
    return out;
  },
  decor(nx, ny) {
    const d = ring(nx, ny);
    if (d > 0.9) return [];
    const height = 1.05 - 0.35 * d;
    if (d < 0.2) return [{ base: height, top: height + 0.14, slot: 'secondary', keep: true }];
    return [{ base: height - 0.08, top: height, slot: 'primary' }];
  },
};

const cat = {
  id: 'cat',
  name: 'Cat',
  reach: 0.3,
  fill: 0.6,
  sample(nx, ny) {
    const out = [];
    const body = Math.hypot(nx / 0.95, (ny - 0.28) / 0.62);
    if (body <= 1) out.push({ base: 0, top: 0.16 + 0.28 * dome(body), slot: 'primary' });
    const head = Math.hypot(nx / 0.5, (ny + 0.62) / 0.42);
    if (head <= 1) out.push({ base: 0, top: 0.4 + 0.24 * dome(head), slot: 'primary' });
    const tail = Math.abs(nx) > 0.7 && ny > 0.5;
    if (tail) out.push({ base: 0.1, top: 0.34, slot: 'secondary' });
    return out;
  },
  decor(nx, ny) {
    const head = Math.hypot(nx / 0.5, (ny + 0.62) / 0.42);
    if (head <= 1) {
      const top = 0.4 + 0.24 * dome(head);
      const ear = Math.abs(Math.abs(nx) - 0.34) < 0.14 && ny < -0.72;
      if (ear) return [{ base: top, top: top + 0.16, slot: 'secondary', keep: true }];
      const eye = Math.abs(Math.abs(nx) - 0.22) < 0.1 && Math.abs(ny + 0.62) < 0.14;
      if (eye) return [{ base: top, top: top + 0.06, slot: 'accent', keep: true }];
      return [{ base: top - 0.12, top, slot: 'primary' }];
    }
    const body = Math.hypot(nx / 0.95, (ny - 0.28) / 0.62);
    if (body <= 0.9) {
      const top = 0.16 + 0.28 * dome(body);
      return [{ base: top - 0.1, top, slot: 'primary' }];
    }
    return [];
  },
};

const duck = {
  id: 'duck',
  name: 'Duck',
  reach: 0.29,
  fill: 0.6,
  sample(nx, ny) {
    const out = [];
    const body = Math.hypot(nx / 0.92, (ny - 0.24) / 0.66);
    if (body <= 1) out.push({ base: 0, top: 0.18 + 0.3 * dome(body), slot: 'primary' });
    const head = Math.hypot(nx / 0.4, (ny + 0.66) / 0.36);
    if (head <= 1) out.push({ base: 0, top: 0.52 + 0.2 * dome(head), slot: 'primary' });
    return out;
  },
  decor(nx, ny) {
    const head = Math.hypot(nx / 0.4, (ny + 0.66) / 0.36);
    if (head <= 1) {
      const top = 0.52 + 0.2 * dome(head);
      if (ny < -0.9) return [{ base: top - 0.1, top: top - 0.02, slot: 'accent', keep: true }];
      return [{ base: top - 0.1, top, slot: 'primary' }];
    }
    const body = Math.hypot(nx / 0.92, (ny - 0.24) / 0.66);
    if (body <= 0.85) {
      const top = 0.18 + 0.3 * dome(body);
      if (ny > 0.55) return [{ base: top, top: top + 0.14, slot: 'secondary', keep: true }];
      return [{ base: top - 0.1, top, slot: 'primary' }];
    }
    return [];
  },
};

const person = {
  id: 'person',
  name: 'Figure',
  reach: 0.24,
  fill: 0.9,
  sample(nx, ny) {
    const out = [];
    if (Math.abs(nx) > 0.95) return out;
    const legs = Math.abs(nx) < 0.42 && ny > 0.2;
    if (legs) out.push({ base: 0, top: 0.52, slot: 'secondary' });
    const torso = Math.abs(nx) < 0.5 && ny > -0.34 && ny <= 0.34;
    if (torso) out.push({ base: 0.48, top: 1.02, slot: 'primary' });
    const arms = Math.abs(nx) >= 0.5 && Math.abs(nx) < 0.95 && Math.abs(ny) < 0.24;
    if (arms) out.push({ base: 0.62, top: 0.94, slot: 'primary' });
    const head = Math.abs(nx) < 0.32 && ny > -0.22 && ny <= 0.16;
    if (head) out.push({ base: 1.02, top: 1.36, slot: 'accent' });
    return out;
  },
  decor(nx, ny) {
    if (Math.abs(nx) < 0.32 && ny > -0.22 && ny <= 0.16) {
      return [{ base: 1.02, top: 1.34, slot: 'accent', keep: true }];
    }
    if (Math.abs(nx) < 0.5 && ny > -0.34 && ny <= 0.34) {
      return [{ base: 0.48, top: 1.0, slot: 'primary', keep: true }];
    }
    if (Math.abs(nx) < 0.42 && ny > 0.2) return [{ base: 0, top: 0.5, slot: 'secondary', keep: true }];
    if (Math.abs(nx) >= 0.5 && Math.abs(nx) < 0.95 && Math.abs(ny) < 0.24) {
      return [{ base: 0.62, top: 0.92, slot: 'primary' }];
    }
    return [];
  },
};

export const TEMPLATES = { tree, pine, flower, mushroom, house, tower, cat, duck, person };

export const TEMPLATE_IDS = Object.keys(TEMPLATES);

export function templateFor(id) {
  return TEMPLATES[id] || TEMPLATES.tree;
}
