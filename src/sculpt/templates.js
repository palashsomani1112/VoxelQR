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
  reach: 0.3,
  fill: 0.65,
  sample(nx, ny) {
    const d = ring(nx, ny);
    const out = [];
    if (Math.abs(nx) < 0.26 && Math.abs(ny) < 0.26) {
      out.push({ base: 0, top: 0.52, slot: 'secondary', keep: true });
    }
    if (d <= 1) {
      out.push({ base: 0.46, top: 0.5 + 0.34 * dome(d), slot: 'primary' });
    }
    return out;
  },
  decor(nx, ny) {
    const d = ring(nx, ny);
    if (Math.abs(nx) < 0.26 && Math.abs(ny) < 0.26) {
      return [{ base: 0, top: 0.5, slot: 'secondary', keep: true }];
    }
    if (d > 0.96) return [];
    const top = 0.5 + 0.34 * dome(d);
    if (d < 0.72) return [{ base: top, top: top + 0.07, slot: 'accent' }];
    return [{ base: 0.46, top, slot: 'primary', keep: true }];
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

const cake = {
  id: 'cake',
  name: 'Cake',
  reach: 0.28,
  fill: 0.8,
  sample(nx, ny) {
    const d = ring(nx, ny);
    const out = [];
    if (d > 1) return out;
    out.push({ base: 0, top: 0.44, slot: 'primary' });
    if (d < 0.98) out.push({ base: 0.44, top: 0.54, slot: 'accent' });
    if (d < 0.6) out.push({ base: 0.54, top: 0.74, slot: 'primary' });
    if (d < 0.6) out.push({ base: 0.74, top: 0.82, slot: 'accent' });
    if (Math.abs(nx) < 0.14 && Math.abs(ny) < 0.14) {
      out.push({ base: 0.82, top: 1.04, slot: 'secondary' });
    }
    return out;
  },
  decor(nx, ny) {
    const d = ring(nx, ny);
    if (Math.abs(nx) < 0.14 && Math.abs(ny) < 0.14) {
      return [
        { base: 0.82, top: 1.04, slot: 'secondary', keep: true },
        { base: 1.04, top: 1.16, slot: 'accent', keep: true },
      ];
    }
    if (d < 0.6) return [{ base: 0.74, top: 0.82, slot: 'accent', keep: true }];
    if (d <= 1) return [{ base: 0.44, top: 0.54, slot: 'accent', keep: true }];
    return [];
  },
};

const camera = {
  id: 'camera',
  name: 'Camera',
  reach: 0.3,
  fill: 0.85,
  sample(nx, ny) {
    const out = [];
    if (Math.abs(nx) > 0.98 || Math.abs(ny) > 0.66) return out;
    out.push({ base: 0, top: 0.44, slot: 'primary' });
    const lens = Math.hypot(nx, ny);
    if (lens < 0.44) {
      out.push({ base: 0.44, top: 0.62, slot: 'secondary' });
      if (lens < 0.2) out.push({ base: 0.62, top: 0.68, slot: 'accent' });
    }
    if (nx < -0.5 && ny < -0.3) out.push({ base: 0.44, top: 0.56, slot: 'accent' });
    return out;
  },
  decor(nx, ny) {
    if (Math.abs(nx) > 0.98 || Math.abs(ny) > 0.66) return [];
    const lens = Math.hypot(nx, ny);
    if (lens < 0.44) {
      return [{ base: 0.44, top: lens < 0.2 ? 0.68 : 0.62, slot: 'secondary', keep: true }];
    }
    if (nx < -0.5 && ny < -0.3) return [{ base: 0.44, top: 0.56, slot: 'accent', keep: true }];
    if (nx > 0.62 && Math.abs(ny) < 0.24) return [{ base: 0.44, top: 0.52, slot: 'accent' }];
    return [{ base: 0.3, top: 0.44, slot: 'primary' }];
  },
};

const signal = {
  id: 'signal',
  name: 'Wi-Fi mark',
  reach: 0.42,
  fill: 0.95,
  sample(nx, ny) {
    const out = [];
    const d = ring(nx, ny);
    if (d < 0.22) {
      out.push({ base: 0, top: 0.54, slot: 'accent' });
      return out;
    }
    const fan = Math.atan2(-ny, nx);
    if (fan < 0.3 || fan > Math.PI - 0.3) return out;
    for (const band of [[0.4, 0.62, 0.38], [0.78, 1, 0.24]]) {
      if (d >= band[0] && d <= band[1]) out.push({ base: 0, top: band[2], slot: 'primary' });
    }
    return out;
  },
  decor(nx, ny) {
    return signal.sample(nx, ny).map((part) => ({ ...part, keep: true }));
  },
};

const play = {
  id: 'play',
  name: 'Play',
  reach: 0.3,
  fill: 0.9,
  sample(nx, ny) {
    const out = [];
    const d = ring(nx, ny);
    if (d > 1.04) return out;
    if (d > 0.74) {
      out.push({ base: 0, top: 0.38, slot: 'primary' });
      return out;
    }
    if (nx >= -0.42 && Math.abs(ny) <= 0.56 * ((0.6 - nx) / 1.02)) {
      out.push({ base: 0, top: 0.56, slot: 'accent' });
    }
    return out;
  },
  decor(nx, ny) {
    return play.sample(nx, ny).map((part) => ({ ...part, keep: true }));
  },
};

const shop = {
  id: 'shop',
  name: 'Shop',
  reach: 0.3,
  fill: 0.8,
  sample(nx, ny) {
    const out = [];
    if (Math.abs(nx) > 0.92 || Math.abs(ny) > 0.8) return out;
    out.push({ base: 0, top: 0.5, slot: 'primary' });
    if (ny > 0.36) out.push({ base: 0.5, top: 0.62, slot: 'accent' });
    else out.push({ base: 0.5, top: 0.72, slot: 'secondary' });
    return out;
  },
  decor(nx, ny) {
    if (Math.abs(nx) > 0.92 || Math.abs(ny) > 0.8) return [];
    if (Math.abs(nx) < 0.24 && ny > 0.5) return [{ base: 0, top: 0.32, slot: 'accent', keep: true }];
    if (ny > 0.36) return [{ base: 0.5, top: 0.62, slot: 'accent', keep: true }];
    return [{ base: 0.5, top: 0.72, slot: 'secondary', keep: true }];
  },
};

const pin = {
  id: 'pin',
  name: 'Location pin',
  reach: 0.26,
  fill: 0.92,
  sample(nx, ny) {
    const out = [];
    const d = ring(nx, ny);
    if (d < 0.24) out.push({ base: 0, top: 0.92, slot: 'secondary' });
    if (d <= 0.96) {
      const head = 0.88 + 0.6 * dome(d / 0.96);
      out.push({ base: 0.86, top: head, slot: 'primary' });
      if (d < 0.26) out.push({ base: head, top: head + 0.12, slot: 'accent' });
    }
    return out;
  },
  decor(nx, ny) {
    const d = ring(nx, ny);
    if (d < 0.24) return [{ base: 0, top: 0.9, slot: 'secondary', keep: true }];
    if (d > 0.94) return [];
    const head = 0.88 + 0.6 * dome(d / 0.96);
    return [{ base: 0.86, top: head, slot: 'primary', keep: true }];
  },
};

const sparkle = {
  id: 'sparkle',
  name: 'Sparkle',
  reach: 0.34,
  fill: 0.9,
  sample(nx, ny) {
    const out = [];
    const star = (px, py, scale) => (
      (Math.abs(px) / scale) ** 0.4 + (Math.abs(py) / scale) ** 0.4 <= 1
    );
    if (star(nx, ny, 1)) {
      const reach = Math.hypot(nx, ny);
      out.push({ base: 0, top: 0.26 + 0.4 * Math.max(0, 1 - reach * 1.6), slot: 'accent' });
    }
    if (star(nx - 0.66, ny + 0.6, 0.36)) out.push({ base: 0, top: 0.34, slot: 'primary' });
    if (star(nx + 0.7, ny + 0.5, 0.26)) out.push({ base: 0, top: 0.26, slot: 'primary' });
    return out;
  },
  decor(nx, ny) {
    return sparkle.sample(nx, ny).map((part) => ({ ...part, keep: true }));
  },
};

const plane = {
  id: 'plane',
  name: 'Plane',
  reach: 0.38,
  fill: 0.92,
  sample(nx, ny) {
    const out = [];
    const taper = Math.max(0, -ny - 0.55) * 0.5;
    if (Math.abs(nx) < 0.3 - taper && ny > -0.96 && ny < 0.92) {
      out.push({ base: 0, top: 0.5, slot: 'primary' });
    }
    if (Math.abs(nx) <= 0.98 && Math.abs(ny) < 0.28 - Math.max(0, Math.abs(nx) - 0.45) * 0.2) {
      out.push({ base: 0, top: 0.28, slot: 'primary' });
    }
    if (Math.abs(nx) < 0.62 && ny > 0.62 && ny < 0.92) {
      out.push({ base: 0, top: 0.26, slot: 'primary' });
    }
    if (Math.abs(nx) < 0.22 && ny > 0.56) out.push({ base: 0.5, top: 0.86, slot: 'accent' });
    return out;
  },
  decor(nx, ny) {
    return plane.sample(nx, ny).map((part) => ({ ...part, keep: true }));
  },
};

const car = {
  id: 'car',
  name: 'Car',
  reach: 0.3,
  fill: 0.85,
  sample(nx, ny) {
    const out = [];
    if (Math.abs(nx) > 0.62 || Math.abs(ny) > 0.98) return out;
    out.push({ base: 0.12, top: 0.4, slot: 'primary' });
    if (Math.abs(nx) < 0.5 && ny > -0.46 && ny < 0.42) {
      out.push({ base: 0.4, top: 0.66, slot: 'accent' });
    }
    return out;
  },
  decor(nx, ny) {
    const wheel = Math.abs(nx) > 0.5 && Math.abs(nx) < 0.9
      && Math.abs(Math.abs(ny) - 0.6) < 0.24;
    if (wheel) return [{ base: 0, top: 0.24, slot: 'secondary', keep: true }];
    if (Math.abs(nx) > 0.62 || Math.abs(ny) > 0.98) return [];
    if (Math.abs(nx) < 0.5 && ny > -0.46 && ny < 0.42) {
      return [{ base: 0.4, top: 0.66, slot: 'accent', keep: true }];
    }
    return [{ base: 0.12, top: 0.4, slot: 'primary', keep: true }];
  },
};

const smiley = {
  id: 'smiley',
  name: 'Smiley',
  reach: 0.3,
  fill: 0.85,
  sample(nx, ny) {
    const out = [];
    const d = ring(nx, ny);
    if (d > 1) return out;
    const top = 0.36 + 0.42 * dome(d);
    out.push({ base: 0, top, slot: 'primary' });
    const eye = Math.hypot(Math.abs(nx) - 0.38, ny + 0.3) < 0.2;
    const mouth = d > 0.4 && d < 0.7 && ny > 0.24;
    if (eye || mouth) out.push({ base: top, top: top + 0.1, slot: 'accent' });
    return out;
  },
  decor(nx, ny) {
    return smiley.sample(nx, ny).map((part) => ({ ...part, keep: true }));
  },
};

export const TEMPLATES = {
  tree, pine, flower, mushroom,
  house, shop, tower,
  cake, camera, car, plane,
  pin, signal, play, sparkle,
  person, smiley,
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES);

export function templateFor(id) {
  return TEMPLATES[id] || TEMPLATES.tree;
}
