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
  center: [48.1383, 24.7866] as [number, number],
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
  { color: [132, 224, 63, 0.9], label: 'BI-33' },
  { color: [199,153,240, 0.9], label: 'BI-58' },
  { color: [245, 100, 109, 0.9], label: 'BI-34' },
  { color: [108, 183, 240, 0.9], label: 'BI-60' },
];

//convert to a Map for fast retrieval
export const tilesMap = new Map<string, {color: number[]; label: string}>(
  tilesArray.map((tile) => [tile.label, tile])
);
