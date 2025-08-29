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
import { createLegendLayer, findNonOverlappingPosition } from '../utils/rig-placement.utils';
import { Rig } from '../water-well';
import { MAP_BOUNDS } from '../utils/map.config';
import Polyline from '@arcgis/core/geometry/Polyline';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import Point from '@arcgis/core/geometry/Point';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';

const MAP_CONFIG = {
  center: [48.1383, 24.2886] as [number, number],
  minZoom: 6,
  maxZoom: 7,
};

const STYLE = {
  markerIcon: 'assets/oil-rig.svg',
  markerSize: 28, // number, not "28px"
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
  private placedBubbles: { x: number; y: number; radius: number }[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.http.get<Rig[]>('assets/rig_data_sample2.json').subscribe((data) => {
      this.rigs = data || [];
      this.initMap();
    });
  }

  private async initMap(): Promise<void> {
    const [{ default: Map }, { default: MapView }, { default: GraphicsLayer }] =
      await Promise.all([
        import('@arcgis/core/Map'),
        import('@arcgis/core/views/MapView'),
        import('@arcgis/core/layers/GraphicsLayer'),
      ]);

    const map = new Map({ basemap: 'topo-vector' });
    this.mapView = new MapView({
      container: this.mapViewEl?.nativeElement,
      map,
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.minZoom,
      constraints: { minZoom: MAP_CONFIG.minZoom, maxZoom: MAP_CONFIG.maxZoom },
    });

    const rigLayer = new GraphicsLayer({ id: 'rig-icons' });
    const bubbleLayer = new GraphicsLayer({ id: 'rig-bubbles' });
    map.addMany([rigLayer, bubbleLayer]);

    await this.mapView.when(() => {
      this.mapView?.map?.add(createLegendLayer(this.mapView));
      //this.mapView?.ui.add("legend-container", "top-right");
    });

    // 1) draw rig icons (oil rig SVG)
    this.drawRigIcons(rigLayer);

    // 2) layout bubbles
    this.layoutBubbles(bubbleLayer);
    // 3) re-layout when user pans
    this.mapView.watch('stationary', (isStationary) => {
      if (isStationary) this.layoutBubbles(bubbleLayer);
    });

    console.log('✅ Map initialized with rigs');
  }

  private async drawRigIcons(layer: GraphicsLayer) {
    layer.removeAll();
    const { default: Point } = await import('@arcgis/core/geometry/Point');
    const { default: PictureMarkerSymbol } = await import(
      '@arcgis/core/symbols/PictureMarkerSymbol'
    );

    for (const rig of this.rigs) {
      const point = new Point({ latitude: rig.lat, longitude: rig.lng });

      const symbol = new PictureMarkerSymbol({
        url: STYLE.markerIcon,
        width: STYLE.markerSize,
        height: STYLE.markerSize,
      });

      layer.add(
        new Graphic({
          geometry: point,
          symbol,
          attributes: {
            RigId: rig.rigId,
            Location: rig.location,
            Classification: rig.classification,
          },
        })
      );
    }
  }

  private async layoutBubbles(layer: GraphicsLayer) {
    if (!this.mapView) return;

    layer.removeAll();
    this.placedBubbles = [];

    const view = this.mapView;
    const viewW = view.width;
    const viewH = view.height;

    const bubblePixelRadius = Math.max(STYLE.squareSize / 2, 20) + 8;

    const { default: Point } = await import('@arcgis/core/geometry/Point');

    for (const rig of this.rigs) {
      const anchorPt = new Point({
        longitude: rig.lng,
        latitude: rig.lat,
        spatialReference: { wkid: 4326 },
      });

      let sp = view.toScreen(anchorPt);
      if (!sp) continue;

      sp.x = Math.max(8, Math.min(viewW - 8, sp.x));
      sp.y = Math.max(8, Math.min(viewH - 8, sp.y));

      const iconRadius = STYLE.markerSize / 2;

      const obstacles = [
        ...this.placedBubbles,
        { x: sp.x, y: sp.y, radius: iconRadius + 4 },
      ];

      const finalScreen = findNonOverlappingPosition(
        sp.x,
        sp.y,
        obstacles,
        bubblePixelRadius
      );

      this.placedBubbles.push({
        x: finalScreen.x,
        y: finalScreen.y,
        radius: bubblePixelRadius,
      });

      let finalMapPoint = view.toMap(finalScreen as any) as __esri.Point | null;
      if (!finalMapPoint) {
        finalMapPoint = anchorPt.clone();
      }

      // ✅ Offset the bubble so it never sits directly on the oil rig
      const offsetLat = 3; // tweak these numbers if bubbles feel too close/far
      const offsetLng = 2;
      finalMapPoint.latitude = Math.min(
        Math.max(finalMapPoint.latitude! + offsetLat, MAP_BOUNDS.minLat),
        MAP_BOUNDS.maxLat
      );
      finalMapPoint.longitude = Math.min(
        Math.max(finalMapPoint.longitude! + offsetLng, MAP_BOUNDS.minLng),
        MAP_BOUNDS.maxLng
      );

      const bubble = new Graphic({
        geometry: finalMapPoint,
        symbol: new SimpleMarkerSymbol({
          style: 'square',
          color: STYLE.bubbleColor,
          size: STYLE.squareSize,
          outline: { color: [0, 0, 0], width: 1 },
        }),
      });

      const stick = new Graphic({
        geometry: new Polyline({
          paths: [
            [
              [rig.lng, rig.lat], // rig location
              [finalMapPoint.longitude!, finalMapPoint.latitude!], // bubble location
            ],
          ],
          spatialReference: { wkid: 4326 },
        }),
        symbol: new SimpleLineSymbol({ color: STYLE.stickColor, width: 2 }),
      });

      const label = new Graphic({
        geometry: finalMapPoint,
        symbol: new TextSymbol({
          text: `${rig.rigId}\n──────\n${rig.location}`,
          color: [0, 0, 0], // text color (black)
          haloColor: [255, 255, 255, 255], // optional halo for readability
          haloSize: 2,
          font: STYLE.textFont as any,
          horizontalAlignment: 'center',
          verticalAlignment: 'middle', // this makes text centered inside the bubble
          yoffset: 0, // remove the old offset
        }),
      });

      layer.addMany([stick, bubble, label]);
    }
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
