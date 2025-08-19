

import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  Inject,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
// Add to your existing imports
import { HttpClient, HttpClientModule } from '@angular/common/http';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import Polyline from '@arcgis/core/geometry/Polyline';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import TextSymbol from '@arcgis/core/symbols/TextSymbol';
// First, add the import at the top of your file
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import { WaterWell } from '../water-well';

interface RigGraphics {
  rigId: string | number; 
  polyline: Polyline;
  bubble: Point;
  radius: number; // for bubble diameter
}
  const existing: RigGraphics[] = [];
  

// Configure labels for rigs
@Component({
  selector: 'app-arcgis-map',
  imports: [HttpClientModule],
  templateUrl: './aarcgis-map.component.html',
  styleUrls: ['./aarcgis-map.component.css'],
  standalone: true,
})
export class ArcgisMapComponent implements OnInit {
  @ViewChild('mapViewNode', { static: true }) private mapViewEl?: ElementRef;
  private mapView: __esri.MapView | undefined;
  rigs: any[] = [];
  positionedWells: WaterWell[] = [];

  // === CONSTANTS ===
  private readonly MAP_CENTER: [number, number] = [48.1383, 24.2886];
  private readonly MAP_ZOOM = 6;
  private readonly MARKER_ICON = 'assets/oil-rig.svg';
  private readonly MARKER_SIZE = '28px';
  private readonly BUBBLE_SIZE = 50;
  private readonly STICK_COLOR = [10, 40, 0];
  private readonly BUBBLE_COLOR = [0, 255, 0, 0.9];
  private readonly TEXT_FONT = { size: 12, weight: 'bold', family: 'Arial' };


  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.http.get<any[]>('assets/rigs.json').subscribe((data) => {
      this.rigs = data || [];
      this.initMap();
    });

    // Dynamic popup on hover
    console.log('🛢️ Map loaded with rigs and fields, dynamic popup enabled!');
  }

  async saveMapImage() {
    if (!this.mapView) return alert('Map is not ready yet!');
    try {
      const screenshot = await this.mapView.takeScreenshot({
        format: 'png',
        quality: 1,
      });
      const a = document.createElement('a');
      a.href = screenshot.dataUrl;
      a.download = 'active-rigs-map.png';
      a.click();
    } catch (error) {
      console.error('Error taking screenshot:', error);
    }
  }

  async initMap(): Promise<void> {
    // Import ArcGIS modules dynamically
    const [
      { default: Map },
      { default: MapView },
      { default: Graphic },
      { default: GraphicsLayer },
      { default: Point },
      { default: PictureMarkerSymbol },
    ] = await Promise.all([
      import('@arcgis/core/Map'),
      import('@arcgis/core/views/MapView'),
      import('@arcgis/core/Graphic'),
      import('@arcgis/core/layers/GraphicsLayer'),
      import('@arcgis/core/geometry/Point'),
      import('@arcgis/core/symbols/PictureMarkerSymbol'),
    ]);

    // Create the map and view
    const map = new Map({ basemap: 'topo-vector' });
    this.mapView = new MapView({
      container: this.mapViewEl?.nativeElement,
      map,
      center: this.MAP_CENTER,
      zoom: this.MAP_ZOOM,
      constraints: { minZoom: this.MAP_ZOOM, maxZoom: this.MAP_ZOOM },
      popup: {
        dockEnabled: true,
        dockOptions: { buttonEnabled: false, breakpoint: false },
      },
    });

    // Create the graphics layer first
    const rigLayer = new GraphicsLayer();
    map.add(rigLayer);

    const fieldLayer = new GraphicsLayer();
    map.addMany([rigLayer, fieldLayer]);

    for (let i = 0; i < this.rigs.length; i++) {
      console.log(`RIGS *** #${i}: ${this.rigs[i].lat}, ${this.rigs[i].lng}`);
    }

   
    
    // Bubble text
    this.mapView.when(() => {
      let i = 0;
      this.positionedWells.forEach((rig) => {
        this.addRigGraphic(rigLayer, rig, rig.latPos, rig.lngPos);
        i += 1;
      });
    });

    // // Loop through rigs array to create markers
    this.rigs.forEach((rig) => {

      const result = placeRigSquare(rig, existing, 0.0003, 3);
      console.log("****[result]****"+result);

      const point = new Point({
        latitude: rig.lat,
        longitude: rig.lng,
      });

      const symbol = new PictureMarkerSymbol({
        url: this.MARKER_ICON,
        width: this.MARKER_SIZE,
        height: this.MARKER_SIZE,
      });

      const graphic = new Graphic({
        geometry: point,
        symbol,
        attributes: {
          RigId: rig.rigId,
          Location: rig.location,
          Classification: rig.classification,
        },
      });

      rigLayer.add(graphic); //Adding thge points to the graph.
    });

    await this.mapView.when();
    console.log('Map initialized with rigs ✅');
  }

  private addRigGraphic(
    layer: GraphicsLayer,
    rig: any,
    latPos: number,
    lngPos: number
  ) {
    // Base point (rig location)
    const rigPoint = new Point({ latitude: rig.lat, longitude: rig.lng });
    // Bubble position slightly above/right of the point
    const bubblePoint = new Point({
      latitude: rig.lat + latPos,
      longitude: rig.lng + lngPos,
    });

    // Draw stick line
    const stick = new Polyline({
      paths: [
        [
          [rig.lng, rig.lat],
          [bubblePoint.longitude, bubblePoint.latitude],
        ],
      ],
    });
    const stickGraphic = new Graphic({
      geometry: stick,
      symbol: new SimpleLineSymbol({
        color: [0, 0, 0],
        width: 2,
      }),
    });
    layer.add(stickGraphic);

    // Draw bubble (circle)
    const squareSymbol = new SimpleMarkerSymbol({
      style: 'square',
      color: this.BUBBLE_COLOR,
      size: this.BUBBLE_SIZE,
      outline: { color: this.STICK_COLOR, width: 2 },
    });
    const circleGraphic = new Graphic({
      geometry: bubblePoint,
      symbol: squareSymbol,
    });
    layer.add(circleGraphic);

    // Add text
    const textSymbol = new TextSymbol({
      text: `${rig.rigId}\n${rig.location}`,
      color: this.STICK_COLOR,
      haloColor: [255, 255, 255, 255],
      haloSize: 2,
      font: { size: 12, weight: 'bold', family: 'Arial' },
    });
    const textGraphic = new Graphic({
      geometry: bubblePoint,
      symbol: textSymbol,
    });
    layer.add(textGraphic);
  }
}
// Helper: check overlap
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

function generateSquarePositions(
  centerLat: number,
  centerLng: number,
  radius: number,
  steps: number
): Point[] {
  const positions: Point[] = [];

  // Spiral out in a square pattern
  for (let r = 1; r <= steps; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (dx === 0 && dy === 0) continue; // skip center
        positions.push(
          new Point({
            latitude: centerLat + dx * radius,
            longitude: centerLng + dy * radius,
            spatialReference: { wkid: 4326 },
          })
        );
      }
    }
  }

  return positions;
}

export function placeRigSquare(
  rig: any,
  existing: RigGraphics[],
  bubbleRadius = 0.0003,
  steps = 3
): { stickGraphic: Graphic; bubbleGraphic: Graphic } | null {
  const candidatePositions = generateSquarePositions(rig.lat, rig.lng, bubbleRadius, steps);

  for (const bubblePoint of candidatePositions) {
    const stickLine = new Polyline({
      paths: [[[rig.lng, rig.lat], [bubblePoint.longitude, bubblePoint.latitude]]],
      spatialReference: { wkid: 4326 },
    });

    if (isValidPlacement(bubblePoint, existing, bubbleRadius)) {
      existing.push({
        rigId: rig.rigId,
        polyline: stickLine,
        bubble: bubblePoint,
        radius: bubbleRadius,
      });

      const stickGraphic = new Graphic({
        geometry: stickLine,
        symbol: new SimpleLineSymbol({ color: [0, 0, 0], width: 2 }),
      });

      const bubbleGraphic = new Graphic({
        geometry: bubblePoint,
        symbol: new SimpleMarkerSymbol({
          style: "circle",
          color: [0, 255, 0],
          size: 20,
          outline: { color: [0, 0, 0], width: 2 },
        }),
      });

      return { stickGraphic, bubbleGraphic };
    }
  }

  console.warn(`⚠️ Could not place bubble for ${rig.rigId} without overlap`);
  return null;
}



// Avoid bubble overlap (distance in kilometers)
