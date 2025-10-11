import Point from '@arcgis/core/geometry/Point';
import Polygon from '@arcgis/core/geometry/Polygon';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import TextSymbol from '@arcgis/core/symbols/TextSymbol';
import {
  ArcGISPoint,
  BubblePOint,
  MAP_BOUNDS,
  tilesArray,
  tilesMap,
  WWellGraphics,
} from './map.config';

// === HELPERS ===
export function isValidPlacement(
  bubblePoint: Point | null | undefined,
  existing: WWellGraphics[],
  bubbleRadius: number
): boolean {
  if (!bubblePoint) return false;

  return !existing.some((e) => {
    if (!e?.bubble) return false;

    const dx = bubblePoint.longitude! - e.bubble.longitude!;
    const dy = bubblePoint.latitude! - e.bubble.latitude!;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < bubbleRadius * 2;
  });
}

export function generateSquarePositions(
  lat: number,
  lng: number,
  radius: number,
  steps: number
): Point[] {
  const totalPOints = steps * (2 * steps + 1);
  const positions = new Array<Point>(totalPOints);
  let i = 0;
  for (let dx = 1; dx <= steps; dx++) {
    const lon = lng + dx * radius;
    for (let dy = -steps; dy <= steps; dy++) {
      const latOffset = lat + dy * radius;
      positions[i++] = new Point({
        latitude: latOffset,
        longitude: lon,
      });
    }
  }
  return positions;
}

export function getBubbleRadius(mapView: __esri.MapView): number {
  const zoom = mapView.zoom;
  return zoom >= 10 ? 0.01 : zoom >= 8 ? 0.05 : 0.1;
}
export function toArcGis(p: BubblePOint): ArcGISPoint {
  return new ArcGISPoint(p);
}
export function findNonOverlappingPosition(
  x: number,
  y: number,
  placedBubbles: { x: number; y: number; radius: number }[],
  radius: number
): ArcGISPoint {
  const maxAttempt = 60;
  const baseStep = radius * 1.5;
  const safety = 2;

  let angle = 0;
  let attempt = 0;
  let newX = x;
  let newY = y;

  const candidate: BubblePOint = { latitude: 0, longitude: 0 };
  while (attempt < maxAttempt) {
    candidate.latitude = newY;
    candidate.longitude = newX;

    //Linear scan of already place dbubbles
    const collisions = placedBubbles.some((b) => {
      const existing: BubblePOint & { readius: number } = {
        latitude: b.y,
        longitude: b.x,
        readius: b.radius,
      };
      //squaredd-staince test - no math.hypot
      const dx = existing.longitude - candidate.longitude;
      const dy = existing.latitude - candidate.latitude;
      const minDist = existing.readius + radius + safety;
      return dx * dx + dy * dy < minDist * minDist;
    });
    if (!collisions) {
      return toArcGis(candidate);
    }
    //Move to the next point on the 30 degree sptial
    angle += Math.PI / 6;
    const distiance = baseStep * (1 + attempt / 6);
    newX = x + Math.cos(angle) * distiance;
    newY = y + Math.sin(angle) * distiance;
    ++attempt;
  }
  //if exhausted all attempted wee fall back to riginal center.
  return new ArcGISPoint({ latitude: y, longitude: x });
}
// Minimum separation (~0.05 deg ≈ 5km)
const BUBBLE_SEPARATION = 0.05;

export function placeBubble(
  rig: { rigId: string; lat: number; lng: number },
  placed: { lat: number; lng: number }[]
): { lat: number; lng: number } {
  let lat = Math.max(MAP_BOUNDS.minLat, Math.min(rig.lat, MAP_BOUNDS.maxLat));
  let lng = Math.max(MAP_BOUNDS.minLng, Math.min(rig.lng, MAP_BOUNDS.maxLng));

  let angle = 0;
  let radius = 0;

  for (let i = 0; i < 50; i++) {
    const conflict = placed.some(
      (p) => Math.hypot(p.lat - lat, p.lng - lng) < BUBBLE_SEPARATION
    );
    if (!conflict) break;

    angle += Math.PI / 6;
    radius += 0.02;
    lat = Math.max(
      MAP_BOUNDS.minLat,
      Math.min(rig.lat + radius * Math.sin(angle), MAP_BOUNDS.maxLat)
    );
    lng = Math.max(
      MAP_BOUNDS.minLng,
      Math.min(rig.lng + radius * Math.cos(angle), MAP_BOUNDS.maxLng)
    );
  }
  return { lat, lng };
}

export function createLegendLayer(mapView?: __esri.MapView): GraphicsLayer {
  const legendLayer = new GraphicsLayer({ title: 'Legend', visible: false });

  if (!mapView) return legendLayer;

  const offsetX = 60.18;
  const offsetY = 31.35;
  const baseLng = offsetX;
  const baseLat = offsetY;

  const rect = new Graphic({
    geometry: {
      type: 'extent',
      xmin: baseLng,
      ymin: baseLat - 3.1,
      xmax: baseLng + 3.3,
      ymax: baseLat,
      spatialReference: { wkid: 4326 },
    },
    symbol: new SimpleFillSymbol({
      color: [255, 255, 255, 0.8],
      outline: { color: [0, 0, 0], width: 1 },
    }),
  });
  legendLayer.add(rect);

  const title = new Graphic({
    geometry: new Point({
      longitude: baseLng + 1.6,
      latitude: baseLat - 0.3,
      spatialReference: { wkid: 4326 },
    }),
    symbol: new TextSymbol({
      text: 'Well Ownership',
      font: { size: 12, weight: 'bold', family: 'Arial' },
      color: [0, 0, 0],
    }),
  });
  legendLayer.add(title);

  tilesArray.forEach((tile, i: number) => {
    const row = Math.floor(i / 2);
    const col = i % 2;

    const tileWidth = 1.4;
    const tileHeight = 0.6;

    const tileX = baseLng + 0.2 + col * 1.6;
    const tileY = baseLat - 0.7 - row * 0.8;

    const tileRect = new Graphic({
      geometry: {
        type: 'extent',
        xmin: tileX,
        ymin: tileY - tileHeight,
        xmax: tileX + tileWidth,
        ymax: tileY,
        spatialReference: { wkid: 4326 },
      },
      symbol: new SimpleFillSymbol({
        color: tile.color,
        outline: tilesMap.get(tile.label)
          ? { color: [0, 0, 0], width: 1 }
          : null,
      }),
    });
    legendLayer.add(tileRect);

    const label = new Graphic({
      geometry: new Point({
        longitude: tileX + tileWidth / 2,
        latitude: tileY - tileHeight / 2,
        spatialReference: { wkid: 4326 },
      }),
      symbol: new TextSymbol({
        text: tile.label,
        font: { size: 9, family: 'Arial', weight: 'bold' },
        color: [0, 0, 0],
        horizontalAlignment: 'center',
        verticalAlignment: 'middle',
      }),
    });
    legendLayer.add(label);
  });

  // Target Aquifer
  const aquiferTileWidth = 3;
  const aquiferTileHeight = 0.6;
  const aquiferX = baseLng + 0.2;
  const aquiferY = baseLat - 2.4;

  const aquiferRect = new Graphic({
    geometry: {
      type: 'extent',
      xmin: aquiferX,
      ymin: aquiferY - aquiferTileHeight,
      xmax: aquiferX + aquiferTileWidth,
      ymax: aquiferY,
      spatialReference: { wkid: 4326 },
    },
    symbol: new SimpleFillSymbol({
      color: [200, 200, 255, 0.8],
      outline: { color: [0, 0, 0], width: 1 },
    }),
  });
  legendLayer.add(aquiferRect);

  const aquiferLabel = new Graphic({
    geometry: new Point({
      longitude: aquiferX + aquiferTileWidth / 2,
      latitude: aquiferY - aquiferTileHeight / 2,
      spatialReference: { wkid: 4326 },
    }),
    symbol: new TextSymbol({
      text: 'Target Aquifer',
      font: { size: 10, family: 'Arial', weight: 'bold' },
      color: [0, 0, 0],
      horizontalAlignment: 'center',
      verticalAlignment: 'middle',
    }),
  });
  legendLayer.add(aquiferLabel);

  return legendLayer;
}

// === WRAPPED OBJECT FOR TESTING ===
export let rigUtils = {
  findNonOverlappingPosition,
};

export function toArcGIS(p: BubblePOint): ArcGISPoint {
    return new ArcGISPoint();
}

export function translatePolygon(
  template: Polygon,
  lng: number,
  lat: number
): Polygon {
  const poly = template.clone() as Polygon;
  const rings = poly.rings as number[][][];
  for (const ring of rings) {
    for (const pt of ring) {
      pt[0] += lng;
      pt[1] += lat;
    }
  }
  return poly;
}
