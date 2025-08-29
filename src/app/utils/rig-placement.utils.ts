import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import TextSymbol from '@arcgis/core/symbols/TextSymbol';
import { RigGraphics } from '../water-well';
import { MAP_BOUNDS, tilesArray, tilesMap } from './map.config';

// === HELPERS ===
export function isValidPlacement(
  bubblePoint: Point | null | undefined,
  existing: RigGraphics[],
  bubbleRadius: number
): boolean {
  if (!bubblePoint) return false; // invalid point can't be placed

  return !existing.some((e) => {
    if (!e?.bubble) return false; // skip invalid existing bubbles

    const dx = bubblePoint.longitude! - e.bubble.longitude!;
    const dy = bubblePoint.latitude! - e.bubble.latitude!;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < bubbleRadius * 2; // simple overlap check
  });
}

export function generateSquarePositions(
  lat: number,
  lng: number,
  radius: number,
  steps: number
): Point[] {
  const positions: Point[] = [];
  for (let r = 1; r <= steps; r++) {
    for (let dx = 1; dx <= r; dx++) {
      // ✅ start from dx=1 so always offset east first
      for (let dy = -r; dy <= r; dy++) {
        positions.push(
          new Point({
            latitude: lat + dy * radius,
            longitude: lng + dx * radius,
            spatialReference: { wkid: 4326 },
          })
        );
      }
    }
  }
  return positions;
}

export function getBubbleRadius(mapView: __esri.MapView): number {
  const zoom = mapView.zoom;
  return zoom >= 10 ? 0.01 : zoom >= 8 ? 0.05 : 0.1;
}

// Use explicit MAP_BOUNDS (avoid spatialRef conversions)
export function isWithinBounds(
  point: Point,
  mapView?: __esri.MapView
): boolean {
  if (!point) return false;
  return (
    point.latitude! >= MAP_BOUNDS.minLat &&
    point.latitude! <= MAP_BOUNDS.maxLat &&
    point.longitude! >= MAP_BOUNDS.minLng &&
    point.longitude! <= MAP_BOUNDS.maxLng
  );
}

// export function placeRigSquare(
//   rig: Rig,
//   existing: RigGraphics[], // read-only here: contains already-finalized bubbles
//   mapView?: __esri.MapView,
//   bubbleRadius = 0.0003,
//   steps = 4
// ): RigResult | null {
//   for (const bubblePoint of generateSquarePositions(
//     rig.lat,
//     rig.lng,
//     bubbleRadius,
//     steps
//   )) {
//     // clamp candidate to MAP_BOUNDS (final geographic candidate)
//     bubblePoint.latitude = Math.min(
//       Math.max(bubblePoint.latitude!, MAP_BOUNDS.minLat),
//       MAP_BOUNDS.maxLat
//     );
//     bubblePoint.longitude = Math.min(
//       Math.max(bubblePoint.longitude!, MAP_BOUNDS.minLng),
//       MAP_BOUNDS.maxLng
//     );

//     // quick bounds check
//     if (!isWithinBounds(bubblePoint)) continue;

//     // check overlap against already-finalized existing bubbles
//     if (isValidPlacement(bubblePoint, existing, bubbleRadius)) {

//       const stickLine = new Polyline({
//         paths: [
//           [
//             [rig.lng, rig.lat],
//             [bubblePoint.longitude!, bubblePoint.latitude!],
//           ],
//         ],
//         spatialReference: { wkid: 4326 },
//       });

//       // RETURN the graphics (do NOT mutate existing here)
//       return {
//         stickGraphic: new Graphic({
//           geometry: stickLine,
//           symbol: new SimpleLineSymbol({ color: [0, 0, 0], width: 2 }),
//         }),
//         bubbleGraphic: new Graphic({
//           geometry: bubblePoint,
//           symbol: new SimpleMarkerSymbol({
//             style: 'square',
//             color: [0, 255, 0, 0.9],
//             size: MAP_STYLE.squareSize,
//             outline: { color: [0, 0, 0], width: 1 },
//           }),
//         }),
//       };
//     }
//   }
//   return null;
// }

export function findNonOverlappingPosition(
  x: number,
  y: number,
  placedBubbles: { x: number; y: number; radius: number }[],
  radius: number
): { x: number; y: number } {
  const maxAttempts = 60;
  const baseStep = radius * 1.5;
  let angle = 0;
  let attempt = 0;

  let newX = x;
  let newY = y;

  while (attempt < maxAttempts) {
    const overlapping = placedBubbles.some(
      (b) => Math.hypot(b.x - newX, b.y - newY) < b.radius + radius + 2
    );
    if (!overlapping) return { x: newX, y: newY };

    angle += Math.PI / 6;
    const distance = baseStep * (1 + attempt / 6);
    newX = x + Math.cos(angle) * distance;
    newY = y + Math.sin(angle) * distance;
    attempt++;
  }

  // fallback: return original screen coords (we will still draw)
  return { x, y };
}

// Minimum separation between bubbles in degrees (~0.05 = ~5km)
const BUBBLE_SEPARATION = 0.05;

export function placeBubble(
  rig: { rigId: string; lat: number; lng: number },
  placed: { lat: number; lng: number }[]
): { lat: number; lng: number } {
  let lat = Math.max(MAP_BOUNDS.minLat, Math.min(rig.lat, MAP_BOUNDS.maxLat));
  let lng = Math.max(MAP_BOUNDS.minLng, Math.min(rig.lng, MAP_BOUNDS.maxLng));

  let angle = 0;
  let radius = 0;
  let foundSpot = false;

  // Try up to 50 nudges to avoid collisions
  for (let i = 0; i < 50; i++) {
    const conflict = placed.some(
      (p) => Math.hypot(p.lat - lat, p.lng - lng) < BUBBLE_SEPARATION
    );

    if (!conflict) {
      foundSpot = true;
      break;
    }

    // Nudge in a spiral around original point
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
  const legendLayer = new GraphicsLayer({ title: 'Legend' });

  if (!mapView) return legendLayer;

  const offsetX = 60.18; // tweak to fit top-right
  const offsetY = 31.35;
  const baseLng = offsetX; // top-left longitude
  const baseLat = offsetY;

  // rectangle container
  const rect = new Graphic({
    geometry: {
      type: 'extent',
      xmin: baseLng,
      ymin: baseLat - 3.1, // height of rectangle
      xmax: baseLng + 3.3, // width of rectangle
      ymax: baseLat,
      spatialReference: { wkid: 4326 },
    },
    symbol: new SimpleFillSymbol({
      color: [255, 255, 255, 0.8],
      outline: { color: [0, 0, 0], width: 1 },
    }),
  });
  legendLayer.add(rect);

  // title
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

  // tile definitions

  tilesArray.forEach((tile,  i: number) => {
    const row = Math.floor(i / 2);
    const col = i % 2;

    const tileWidth = 1.4; // slightly wider
    const tileHeight = 0.6; // slightly taller

    const tileX = baseLng + 0.2 + col * 1.6; // horizontal spacing
    const tileY = baseLat - 0.7 - row * 0.8; // vertical spacing

    // Tile rectangle
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
        outline: tilesMap.get(tile.label) ? { color: [0, 0, 0], width: 1 } : null,
      }),
    });
    legendLayer.add(tileRect);

    // Text inside tile (centered)
    const label = new Graphic({
      geometry: new Point({
        longitude: tileX + tileWidth / 2,
        latitude: tileY - tileHeight / 2,
        spatialReference: { wkid: 4326 },
      }),
      symbol: new TextSymbol({
        text: tile.label,
        font: { size: 9, family: 'Arial', weight: 'bold' }, // slightly smaller
        color: [0, 0, 0],
        horizontalAlignment: 'center',
        verticalAlignment: 'middle',
        yoffset: 0,
        xoffset: 0,
      }),
    });
    legendLayer.add(label);
  });

  // Fifth tile: Target Aquifer
  const aquiferTileWidth = 3; // wider to fit text
  const aquiferTileHeight = 0.6;
  const aquiferX = baseLng + 0.2;
  const aquiferY = baseLat - 2.4; // below the 2 rows of main tiles

  // Tile rectangle
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
      color: [200, 200, 255, 0.8], // light blue
      outline: { color: [0, 0, 0], width: 1 },
    }),
  });
  legendLayer.add(aquiferRect);

  // Text inside the aquifer tile
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
