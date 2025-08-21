export const MAP_STYLE = {
  markerIcon: 'assets/oil-rig.svg',
  markerSize: '28px',
  bubbleSize: 20,
  squareSize: 40,
  stickColor: [10, 40, 0],
  bubbleColor: [0, 255, 0, 0.9],
  textFont: { size: 10, weight: 'bold', family: 'Arial' },
};

// === CONFIG ===
export const MAP_CONFIG = {
  center: [48.1383, 24.2886] as [number, number],
  zoom: 6,
};
export const NO_OF_ATTEMPTS = 2;
export const BUBBLE_RADIUS = 2;

// === CONFIG ===
export const LAT_RANGE = { min: 20, max: 100 }; // example: only allow between 20°N and 30°N
export const LNG_RANGE = { min: 20, max: 100 }; // optional: restrict longitude as well