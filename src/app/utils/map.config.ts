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
export const BUBBLE_RADIUS = 0.05;

// === CONFIG ===
export const LAT_RANGE = { min: 20, max: 60 }; // example: only allow between 20°N and 30°N
export const LNG_RANGE = { min: 20, max: 60 }; // optional: restrict longitude as well

export const MAP_BOUNDS = {
  minLat: 20,   // southern edge
  maxLat: 32,   // northern edge
  minLng: 34,   // western edge
  maxLng: 56    // eastern edge
};

export const tilesArray = [
  { color: [0, 100, 0, 0.9], label: 'B1-B2' },
  { color: [255, 0, 0, 0.9], label: 'B1-B123' },
  { color: [0, 0, 255, 0.9], label: 'B123-134' },
  { color: [255, 165, 0, 0.9], label: 'B123-145' },
];

//convert to a Map for fast retrieval
export const tilesMap = new Map<string, {color: number[]; label: string}>(
  tilesArray.map((tile) => [tile.label, tile])
);
