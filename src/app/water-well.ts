import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import Polyline from '@arcgis/core/geometry/Polyline';

export interface WaterWell {
  rigId: string;
  location: string;
  classification: string; // e.g., "green", "red"
  lat: number; // Original latitude
  lng: number; // Original longitude
  latPos: number; // Offset latitude (-5 to 5)
  lngPos: number;
}

// === TYPES ===
export interface Rig {
  rigId: string;
  lat: number;
  lng: number;
  location: string;
  classification: string;
}
export interface RigGraphics {
  rigId: string;
  polyline: Polyline;
  bubble: Point;
  radius: number;
}
export interface RigResult {
  stickGraphic: Graphic;
  bubbleGraphic: Graphic;
}
