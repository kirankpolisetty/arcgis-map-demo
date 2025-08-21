import Point from "@arcgis/core/geometry/Point";
import { Rig, RigGraphics, RigResult } from "../water-well";
import Polyline from "@arcgis/core/geometry/Polyline";
import Graphic from "@arcgis/core/Graphic";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import { MAP_STYLE } from "./map.config";

export function isValidPlacement(bubblePoint: Point | null | undefined , 
    existing: RigGraphics[],
    bubbleRadius: number
): boolean {
    if(!bubblePoint) { return false };
    return !existing.some((e)=> {
        if(!e.bubble) return false;
        const dx = bubblePoint.longitude! - e.bubble.longitude!;
        const dy = bubblePoint.latitude! - e.bubble.latitude!;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < bubbleRadius;
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
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (dx || dy) {
          positions.push(
            new Point({
              latitude: lat + dx * radius,
              longitude: lng + dy * radius,
              spatialReference: { wkid: 4326 },
            })
          );
        }
      }
    }
  }
  return positions;
}


export function placeRigSquare(
  rig: Rig,
  existing: RigGraphics[],
  bubbleRadius = 0.0003,
  steps = 4
): RigResult | null {
  for (const bubblePoint of generateSquarePositions(
    rig.lat,
    rig.lng,
    bubbleRadius,
    steps
  )) {
    if (isValidPlacement(bubblePoint, existing, bubbleRadius)) {
      const stickLine = new Polyline({
        paths: [
          [
            [rig.lng, rig.lat],
            [bubblePoint.longitude!, bubblePoint.latitude!],
          ],
        ],
        spatialReference: { wkid: 4326 },
      });

      existing.push({
        rigId: rig.rigId,
        polyline: stickLine,
        bubble: bubblePoint,
        radius: bubbleRadius,
      });

      return {
        stickGraphic: new Graphic({
          geometry: stickLine,
          symbol: new SimpleLineSymbol({ color: [0, 0, 0], width: 2 }),
        }),
        bubbleGraphic: new Graphic({
          geometry: bubblePoint,
          symbol: new SimpleMarkerSymbol({
            style: 'square',
            color: MAP_STYLE.bubbleColor,
            size: MAP_STYLE.squareSize,
            outline: { color: [0, 0, 0], width: 1 },
          }),
        }),
      };
    }
  }
  return null;
}

