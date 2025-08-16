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

  // === CONSTANTS ===
  private readonly MAP_CENTER: [number, number] = [48.1383, 24.2886];
  private readonly MAP_ZOOM = 6;
  private readonly MARKER_ICON = 'assets/oil-rig.svg';
  private readonly MARKER_SIZE = '28px';
  private readonly BUBBLE_SIZE = 60;
  private readonly STICK_COLOR = [0, 0, 0];
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
      import('@arcgis/core/symbols/PictureMarkerSymbol')
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
      this.rigs.forEach((rig) => {
        this.addRigGraphic(rigLayer, rig, rig.latPos,rig.lngPos);
        i += 1;
      });
    });

    // // Loop through rigs array to create markers
    this.rigs.forEach((rig) => {
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

  private addRigGraphic(layer: GraphicsLayer, rig: any, latPos: number, lngPos: number )  {
    // Base point (rig location)
    const rigPoint = new Point({ latitude: rig.lat, longitude: rig.lng });

    console.log('[LAT]' + rig.lat + '[LNG]' + rig.lng);
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
    const circleSymbol = new SimpleMarkerSymbol({
      style: 'circle',
      color: [255, 255, 255, 0.9],
      size: this.BUBBLE_SIZE,
      outline: { color: this.STICK_COLOR, width: 2 },
    });
    const circleGraphic = new Graphic({
      geometry: bubblePoint,
      symbol: circleSymbol,
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


  private adjustBubbles(
    points: { lat: number; lng: number }[],
    minDelta = 0.1
  ) {
    const adjusted: { lat: number; lng: number }[] = [];

    points.forEach((p) => {
      let candidate = { ...p };
      let collision = true;
      let angle = 0;
      let step = 0.05; // degrees per move

      while (collision) {
        collision = false;
        for (const placed of adjusted) {
          const dLat = candidate.lat - placed.lat;
          const dLng = candidate.lng - placed.lng;
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);

          if (dist < minDelta) {
            collision = true;
            break;
          }
        }
        if (collision) {
          angle += 30;
          candidate.lat = p.lat + Math.sin((angle * Math.PI) / 180) * step;
          candidate.lng = p.lng + Math.cos((angle * Math.PI) / 180) * step;
        }
      }

      adjusted.push(candidate);
    });

    return adjusted;
  }
}

// Avoid bubble overlap (distance in kilometers)
