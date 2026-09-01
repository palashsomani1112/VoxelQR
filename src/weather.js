export const WEATHER = {
  clear: {
    name: 'Clear',
    key: 1.2,
    ambient: 0.6,
    keyColor: '#FFFFFF',
    tint: null,
    tintAmount: 0,
    groundAmount: 0,
    shadow: 1,
    fog: 0,
    particles: null,
  },
  sunny: {
    name: 'Sunny',
    key: 1.5,
    ambient: 0.52,
    keyColor: '#FFF0CC',
    tint: '#FFD97A',
    tintAmount: 0.14,
    groundAmount: 0.2,
    shadow: 1.2,
    fog: 0,
    particles: null,
  },
  rain: {
    name: 'Rain',
    key: 1.0,
    ambient: 0.66,
    keyColor: '#DDEDFF',
    tint: '#3F86D6',
    tintAmount: 0.2,
    groundAmount: 0.3,
    shadow: 0.62,
    fog: 0,
    particles: { kind: 'rain', count: 320, color: '#BFDDFA' },
  },
  snow: {
    name: 'Snow',
    key: 0.9,
    ambient: 0.88,
    keyColor: '#EFF6FF',
    tint: '#F4FAFF',
    tintAmount: 0.14,
    groundAmount: 0.62,
    shadow: 0.46,
    fog: 0.3,
    particles: { kind: 'snow', count: 220, color: '#FDFEFF' },
  },
  fog: {
    name: 'Fog',
    key: 0.5,
    ambient: 0.98,
    keyColor: '#E8ECEA',
    tint: '#B9C2BD',
    tintAmount: 0.3,
    groundAmount: 0.3,
    shadow: 0.2,
    fog: 0.85,
    particles: null,
  },
};

export const WEATHER_IDS = Object.keys(WEATHER);

export function weatherFor(id) {
  return WEATHER[id] || WEATHER.clear;
}
