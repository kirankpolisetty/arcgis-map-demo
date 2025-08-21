import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import {
  Component,
  ElementRef,
  Inject,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
// ArcGIS core
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import TextSymbol from '@arcgis/core/symbols/TextSymbol';
import { placeRigSquare } from '../utils/rig-placement.utils';
import { Rig, RigGraphics, RigResult } from '../water-well';

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
  textFont: { size: 10, weight: 'bold', family: 'Arial' },
};
const NO_OF_ATTEMPTS = 2;
const BUBBLE_RADIUS = 2;

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

    let missToPlotArray: Rig[] = [];

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
        const result = placeRigSquare(rig, existing, 2, 3);
        if (result) {
          this.addRigGraphic(rigLayer, rig, result);
        } else {
          console.warn(`❌ Could not place bubble for >>> ${rig.rigId}`);
          missToPlotArray.push(rig);
        }
      }

      console.log('missToPlotArray size is ..... ' + missToPlotArray.length);

      // Retry with higher step count
      if (missToPlotArray.length > 0) {
        const retrySteps = NO_OF_ATTEMPTS * 2;
        console.log('Retrying missed rigs with steps:', retrySteps);

        missToPlotArray.forEach((rig) => {
          const result = placeRigSquare(
            rig,
            existing,
            BUBBLE_RADIUS * 1,
            retrySteps
          );
          if (!result) {
            console.error(`❌ Still could not place bubble for ${rig.rigId}`);
          } else {
            this.addRigGraphic(rigLayer, rig, result);
            missToPlotArray.pop();
          }
        });
      }
    });

    this.rigs.forEach((rig) => {
      const point = new Point({ latitude: rig.lat, longitude: rig.lng });
      const symbol = new PictureMarkerSymbol({
        url: STYLE.markerIcon,
        width: STYLE.bubbleSize,
        height: STYLE.markerSize,
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
      rigLayer.add(graphic); //Adding thge points to the graph. });
    });

    await this.mapView.when();
    console.log('✅ Map initialized with rigs');
  }

  private addRigGraphic(layer: GraphicsLayer, rig: Rig, result: RigResult) {
    const { stickGraphic, bubbleGraphic } = result;
    layer.addMany([stickGraphic, bubbleGraphic]);

    const textSymbol = new TextSymbol({
      text: `${rig.rigId}\n${rig.location}`,
      color: STYLE.stickColor,
      haloColor: [255, 255, 255, 255],
      haloSize: 2,
      font: { size: 12, weight: 'bold', family: 'Arial' },
    });

    layer.add(
      new Graphic({ geometry: bubbleGraphic.geometry!, symbol: textSymbol })
    );
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
}

