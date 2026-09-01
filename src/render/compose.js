import { buildScene } from '../sculpt/build.js';
import { shadowMask, shadowCells } from './shadows.js';
import { paletteFor, groundFor, sceneGround, shadeFor, SHADE_INK } from '../palettes.js';
import { weatherFor } from '../weather.js';
import { colorsFor, backdropColor } from '../config.js';

export function composeScene(config, code) {
  const scene = buildScene({ code, template: config.object, seed: config.seed });
  const palette = paletteFor(config.palette);
  const weather = weatherFor(config.weather);
  const ground = sceneGround(palette, groundFor(config.ground), config.tint, weather);
  const colors = colorsFor(config);
  const mask = shadowMask(scene);

  return {
    scene,
    palette,
    weather,
    ground,
    colors,
    mask,
    cells: shadowCells(scene),
    shade: shadeFor(ground.tint, weather.shadow),
    shadeInk: SHADE_INK,
    backdrop: backdropColor(config),
    view: { azimuth: config.azimuth, elevation: config.elevation },
  };
}
