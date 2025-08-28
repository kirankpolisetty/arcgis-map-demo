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
import { getBubbleRadius, placeRigSquare } from '../utils/rig-placement.utils';
import { Rig, RigGraphics, RigResult } from '../water-well';
import { MAP_BOUNDS, NO_OF_ATTEMPTS } from '../utils/map.config';
import Polyline from '@arcgis/core/geometry/Polyline';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
// === GLOBAL STATE ===
const existing: RigGraphics[] = [];

// === CONFIG ===
const MAP_CONFIG = {
  center: [48.1383, 24.2886] as [number, number],
  minZoom: 6,
  maxZoom: 7,
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

    this.http.get<Rig[]>('assets/rigs_sample4.json').subscribe((data) => {
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
      zoom: MAP_CONFIG.minZoom,
      constraints: { minZoom: MAP_CONFIG.minZoom, maxZoom: MAP_CONFIG.maxZoom },
    });

    const BUBBLE_RADIUS = getBubbleRadius(this.mapView);

    const rigLayer = new GraphicsLayer();
    map.add(rigLayer);

    // Place rigs
    this.mapView.when(() => {
      for (const rig of this.rigs) {
        const result = placeRigSquare(rig, existing, this.mapView, 2, 3);
        if (result) {
          this.addRigGraphic(rigLayer, rig, result);
        } else {
          console.warn(`❌ Could not place bubble for >>> ${rig.rigId}`);
          missToPlotArray.push(rig);
        }
      }
      // Retry with higher step count
      if (missToPlotArray.length > 0) {
        const retrySteps = NO_OF_ATTEMPTS * 2;
        console.log('Retrying missed rigs with steps:', retrySteps);

        missToPlotArray.forEach((rig) => {
          const result = placeRigSquare(
            rig,
            existing,
            this.mapView,
            BUBBLE_RADIUS * 2,
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

  private clampToBounds(
    lat: number,
    lng: number
  ): { lat: number; lng: number } {
    const clampedLat = Math.min(
      Math.max(lat, MAP_BOUNDS.minLat),
      MAP_BOUNDS.maxLat
    );
    const clampedLng = Math.min(
      Math.max(lng, MAP_BOUNDS.minLng),
      MAP_BOUNDS.maxLng
    );
    // console.log("<--[CLAMPEDLAT]--->", clampedLat+"ORIGINAL LAT IS:--->"+lat);
    return { lat: clampedLat, lng: clampedLng };
  }

  private addRigGraphic(layer: GraphicsLayer, rig: Rig, result: RigResult) {
    const { stickGraphic, bubbleGraphic } = result;

    // original rig base
    const baseLat = rig.lat;
    const baseLng = rig.lng;

    // bubble coordinates (clamped)
    let { latitude, longitude } = bubbleGraphic.geometry as __esri.Point;
    const clamped = this.clampToBounds(latitude!, longitude!);
    latitude = clamped.lat;
    longitude = clamped.lng;

    // update bubble
    const clampedBubble = bubbleGraphic.clone();
    clampedBubble.geometry = {
      type: 'point',
      latitude,
      longitude,
    } as __esri.Point;

    // create a new stick (line) from base → clamped bubble
    const stickLine = new Graphic({
      geometry: new Polyline({
        paths: [
          [
            [baseLng, baseLat],
            [longitude, latitude],
          ],
        ],
        spatialReference: { wkid: 4326 },
      }),
      symbol: new SimpleLineSymbol({
        color: STYLE.stickColor,
        width: 2,
      }),
    });

    // add stick + clamped bubble
    layer.addMany([stickLine, clampedBubble]);

    // add text at bubble
    const textSymbol = new TextSymbol({
      text: `${rig.rigId}\n${rig.location}`,
      color: STYLE.stickColor,
      haloColor: [255, 255, 255, 255],
      haloSize: 2,
      font: { size: 12, weight: 'bold', family: 'Arial' },
    });
    layer.add(
      new Graphic({ geometry: clampedBubble.geometry!, symbol: textSymbol })
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
