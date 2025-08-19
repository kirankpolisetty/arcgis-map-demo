import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  Inject,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';

// ArcGIS core
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import Polyline from '@arcgis/core/geometry/Polyline';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import TextSymbol from '@arcgis/core/symbols/TextSymbol';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';

import { WaterWell } from '../water-well';

// === TYPES ===
interface Rig {
  rigId: string;
  lat: number;
  lng: number;
  location: string;
  classification: string;
}
interface RigGraphics {
  rigId: string;
  polyline: Polyline;
  bubble: Point;
  radius: number;
}
interface RigResult {
  stickGraphic: Graphic;
  bubbleGraphic: Graphic;
}

// === GLOBAL STATE ===
const existing: RigGraphics[] = [];

// === CONFIG ===
const MAP_CONFIG = {
  center: [48.1383, 24.2886] as [number, number],
  zoom: 6,
};
const STYLE = {
  markerIcon: 'assets/oil-rig.svg',
  markerSize: '28px',
  bubbleSize: 20,
  squareSize: 40,
  stickColor: [10, 40, 0],
  bubbleColor: [0, 255, 0, 0.9],
  textFont: { size: 12, weight: 'bold', family: 'Arial' },
};

@Component({
  selector: 'app-arcgis-map',
  imports: [HttpClientModule],
  templateUrl: './aarcgis-map.component.html',
  styleUrls: ['./aarcgis-map.component.css'],
  standalone: true,
})
export class ArcgisMapComponent implements OnInit {
  @ViewChild('mapViewNode', { static: true }) private mapViewEl?: ElementRef;
  private mapView?: __esri.MapView;
  rigs: Rig[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.http.get<Rig[]>('assets/rigs.json').subscribe((data) => {
      this.rigs = data || [];
      this.initMap();
    });
  }

  private async initMap(): Promise<void> {
    const [
      { default: Map },
      { default: MapView },
      { default: GraphicsLayer },
      { default: Point },
      { default: PictureMarkerSymbol },
    ] = await Promise.all([
      import('@arcgis/core/Map'),
      import('@arcgis/core/views/MapView'),
      import('@arcgis/core/layers/GraphicsLayer'),
      import('@arcgis/core/geometry/Point'),
      import('@arcgis/core/symbols/PictureMarkerSymbol'),
    ]);

    const map = new Map({ basemap: 'topo-vector' });
    this.mapView = new MapView({
      container: this.mapViewEl?.nativeElement,
      map,
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      constraints: { minZoom: MAP_CONFIG.zoom, maxZoom: MAP_CONFIG.zoom },
    });

    const rigLayer = new GraphicsLayer();
    map.add(rigLayer);

    // Place rigs
    this.mapView.when(() => {
      for (const rig of this.rigs) {
        const result = placeRigSquare(rig, existing, 2, 3.5);
        if (result) this.addRigGraphic(rigLayer, rig, result);
        else console.warn(`❌ Could not place bubble for ${rig.rigId}`);
      }
    });

    this.rigs.forEach((rig) => 
      { const point = new Point({ latitude: rig.lat, longitude: rig.lng, }     
      );
      const symbol = new PictureMarkerSymbol({ url: STYLE.markerIcon, width: STYLE.bubbleSize, height: STYLE.markerSize, });
      const graphic = new Graphic({ geometry: point, symbol, attributes: { RigId: rig.rigId, Location: rig.location, Classification: rig.classification, }, });
      rigLayer.add(graphic); //Adding thge points to the graph. });
    });

    

    await this.mapView.when();
    console.log('✅ Map initialized with rigs');
  }

  private addRigGraphic(
    layer: GraphicsLayer,
    rig: Rig,
    result: RigResult
  ) {
    const { stickGraphic, bubbleGraphic } = result;
    layer.addMany([stickGraphic, bubbleGraphic]);

    const textSymbol = new TextSymbol({
      text: `${rig.rigId}\n${rig.location}`,
      color: STYLE.stickColor,
      haloColor: [255, 255, 255, 255],
      haloSize: 2,
      font: { size: 12, weight: 'bold', family: 'Arial' },
    });

    layer.add(new Graphic({ geometry: bubbleGraphic.geometry!, symbol: textSymbol }));
  }
  
  async saveMapImage() { if (!this.mapView) return alert('Map is not ready yet!'); try { const screenshot = await this.mapView.takeScreenshot({ format: 'png', quality: 1, }); const a = document.createElement('a'); a.href = screenshot.dataUrl; a.download = 'active-rigs-map.png'; a.click(); } catch (error) { console.error('Error taking screenshot:', error); } }
}

// === HELPERS ===
function isValidPlacement(
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


function generateSquarePositions(lat: number, lng: number, radius: number, steps: number): Point[] {
  const positions: Point[] = [];
  for (let r = 1; r <= steps; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (dx || dy) {
          positions.push(new Point({
            latitude: lat + dx * radius,
            longitude: lng + dy * radius,
            spatialReference: { wkid: 4326 },
          }));
        }
      }
    }
  }
  return positions;
}

function placeRigSquare(
  rig: Rig,
  existing: RigGraphics[],
  bubbleRadius = 0.0003,
  steps = 4
): RigResult | null {
  for (const bubblePoint of generateSquarePositions(rig.lat, rig.lng, bubbleRadius, steps)) {
    if (isValidPlacement(bubblePoint, existing, bubbleRadius)) {
      const stickLine = new Polyline({
        paths: [[[rig.lng, rig.lat], [ bubblePoint.longitude! , bubblePoint.latitude!]]],
        spatialReference: { wkid: 4326 },
      });

      existing.push({ rigId: rig.rigId, polyline: stickLine, bubble: bubblePoint, radius: bubbleRadius });

      return {
        stickGraphic: new Graphic({
          geometry: stickLine,
          symbol: new SimpleLineSymbol({ color: [0, 0, 0], width: 2 }),
        }),
        bubbleGraphic: new Graphic({
          geometry: bubblePoint,
          symbol: new SimpleMarkerSymbol({
            style: 'square',
            color: STYLE.bubbleColor,
            size: STYLE.squareSize,
            outline: { color: [0, 0, 0], width: 1 },
          }),
        }),
      };
    }
  }
  return null;
}
