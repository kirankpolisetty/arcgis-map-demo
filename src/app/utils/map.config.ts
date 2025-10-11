import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import Polygon from "@arcgis/core/geometry/Polygon";
import Polyline from "@arcgis/core/geometry/Polyline";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import TextSymbol from "@arcgis/core/symbols/TextSymbol";
import { default as _ArcGISPoint } from "@arcgis/core/geometry/Point";

export const MAP_STYLE = {
  markerIcon: 'assets/oil-rig.svg',
  markerSize: '28px',
  bubbleSize: 20,
  squareSize: 40,
  stickColor: [10, 40, 0],
  bubbleColor: [0, 255, 0, 0.9],
  textFont: { size: 10, weight: 'bold', family: 'Arial' },
};

const baseUr = window.location.origin;
const iconUrl = window.location.origin + "/assets/oil-rig.svg";
// === CONFIG ===
export const MAP_CONFIG = {
  center: [49.1383, 24.7866] as [number, number],
  minZoom: 6,
  maxZoom: 7
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

export { Point as ArcGISPoint};

export const lineSymbol = (color: number[])=>
  new SimpleLineSymbol({color, width:2});

export const wwellIdTextSymbol = (font: any)=>
new TextSymbol({
  color: [0,0,0],
  font,
  horizontalAlignment: "center",
  verticalAlignment: "top",
  xoffset: 0,
  yoffset: 8,
});

export interface WWellResult {
  stickGraphic: Graphic;
  bubbleGraphic: Graphic;
}

export const locationTextSymbol = (font: any) =>
new TextSymbol({
  color: [255,255,20],
  font,
  horizontalAlignment: "center",
  verticalAlignment: "bottom",
  xoffset: 0,
  yoffset: -9,
});


export const STYLE = {
  markerIcon: 'assets/oil-rig.svg',
  markerSize: 28, // number, not "28px"
  bubbleSize: 20,
  squareSize: 40,
  stickColor: [10, 40, 0],
  bubbleColor: [0, 255, 0, 0.9],
  textFont: { size: 10, weight: 'bold', family: 'Arial' },
  legendTextColor: {size: 10, weight: "normal", family:'sans-serif'}
};

export const topPolygonTemplate = new Polygon({
  rings: [
    [
      [-1.1, 0.4],
      [1.1, 0.3],
      [1.1, 0],
      [-1.1, 0],
      [-1.1, 0.4],
    ],
  ],
  spatialReference: {wkid: 4326},
})

export const bottomPolygonTemplate = new Polygon({
  rings: [
    [
      [-0.5, 0],
      [0.5, 0],
      [0.5, -0.3],
      [-0.5, -0.3],
      [-0.5, 0],
    ],
  ],
  spatialReference: {wkid: 4326},
})


export interface WWellGraphics {
   wwellId: number;
   polyline: Polyline;
   bubble: Point;
   radius: number
 }

export interface WWellResult {
  stickGraphic: Graphic,
  bubbleGraphic: Graphic
}

export interface BubblePOint {
  latitude: number;
  longitude: number;
}

export interface WWell {
  
  lng: number;
  location: string;
  label: string;
}












