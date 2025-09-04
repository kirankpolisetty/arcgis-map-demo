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
import Polyline from '@arcgis/core/geometry/Polyline';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import TextSymbol from '@arcgis/core/symbols/TextSymbol';
import { MAP_BOUNDS, tilesMap } from '../utils/map.config';
import Polygon from '@arcgis/core/geometry/Polygon';
import {
  createLegendLayer,
  findNonOverlappingPosition,
} from '../utils/rig-placement.utils';
import { Rig } from '../water-well';
import { catchError, of } from 'rxjs';
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
  errorMessage: string | null = '';
  private placedBubbles: { x: number; y: number; radius: number }[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.http
      .get<Rig[]>('assets/rigs_sample4.json')
      .pipe(
        catchError((err) => {
          console.error('***Error loading rigs:***', err);
          this.errorMessage =
            'Failed to load rig data. Please check the file path';
          return of([]);
        })
      )
      .subscribe((data) => {
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

  // private async layoutBubbles(layer: GraphicsLayer) {
  //   if (!this.mapView) return;

  //   layer.removeAll();
  //   this.placedBubbles = [];

  //   const view = this.mapView;
  //   const viewW = view.width;
  //   const viewH = view.height;

  //   const bubblePixelRadius = Math.max(STYLE.squareSize / 2, 20) + 8;

  //   const { default: Point } = await import('@arcgis/core/geometry/Point');

  //   for (const rig of this.rigs) {
  //     const anchorPt = new Point({
  //       longitude: rig.lng,
  //       latitude: rig.lat,
  //       spatialReference: { wkid: 4326 },
  //     });

  //     let sp = view.toScreen(anchorPt);
  //     if (!sp) continue;

  //     sp.x = Math.max(8, Math.min(viewW - 8, sp.x));
  //     sp.y = Math.max(8, Math.min(viewH - 8, sp.y));

  //     const iconRadius = STYLE.markerSize / 2;

  //     const obstacles = [
  //       ...this.placedBubbles,
  //       { x: sp.x, y: sp.y, radius: iconRadius + 4 },
  //     ];

  //     const finalScreen = findNonOverlappingPosition(
  //       sp.x,
  //       sp.y,
  //       obstacles,
  //       bubblePixelRadius
  //     );

  //     this.placedBubbles.push({
  //       x: finalScreen.x,
  //       y: finalScreen.y,
  //       radius: bubblePixelRadius,
  //     });

  //     let finalMapPoint = view.toMap(finalScreen as any) as __esri.Point | null;
  //     if (!finalMapPoint) {
  //       finalMapPoint = anchorPt.clone();
  //     }

  //     // ✅ Offset the bubble so it never sits directly on the oil rig
  //     const offsetLat = 3; // tweak these numbers if bubbles feel too close/far
  //     const offsetLng = 4;
  //     finalMapPoint.latitude = Math.min(
  //       Math.max(finalMapPoint.latitude! + offsetLat, MAP_BOUNDS.minLat),
  //       MAP_BOUNDS.maxLat
  //     );
  //     finalMapPoint.longitude = Math.min(
  //       Math.max(finalMapPoint.longitude! + offsetLng, MAP_BOUNDS.minLng),
  //       MAP_BOUNDS.maxLng
  //     );

  //     const bubble = new Graphic({
  //       geometry: finalMapPoint,
  //       symbol: new SimpleMarkerSymbol({
  //         style: 'square',
  //         color: tilesMap.get(rig.label)!.color,
  //         size: STYLE.squareSize,
  //         outline: { color: [0, 0, 0], width: 1 },
  //       }),
  //     });

  //     console.log("tilesMap.get(rig.label)!.color--->",rig.label, tilesMap.get(rig.label)!.color);
  //     const stick = new Graphic({
  //       geometry: new Polyline({
  //         paths: [
  //           [
  //             [rig.lng, rig.lat], // rig location
  //             [finalMapPoint.longitude!, finalMapPoint.latitude!], // bubble location
  //           ],
  //         ],
  //         spatialReference: { wkid: 4326 },
  //       }),

  //       symbol: new SimpleLineSymbol({
  //         //color:  [255, 0, 0, 0.9], // always black
  //         color: tilesMap.get(rig.label)!.color,
  //         width: 2,
  //       }),
  //     });

  //     const label = new Graphic({
  //       geometry: finalMapPoint,
  //       symbol: new TextSymbol({
  //         text: `${rig.rigId}\n──────\n${rig.location}`,
  //         color: [0, 0, 0], // text color (black)
  //         haloColor: [255, 255, 255, 255], // optional halo for readability
  //         haloSize: 2,
  //         font: STYLE.textFont as any,
  //         horizontalAlignment: 'center',
  //         verticalAlignment: 'middle', // this makes text centered inside the bubble
  //         yoffset: 0, // remove the old offset
  //       }),
  //     });

  //     layer.addMany([stick, bubble, label]);
  //   }
  // }

  // --- Text inside rectangles

  private async layoutBubbles(layer: GraphicsLayer) {
    if (!this.mapView) return;

    layer.removeAll();
    this.placedBubbles = [];

    const view = this.mapView;
    const viewW = view.width;
    const viewH = view.height;

    const bubblePixelRadius = Math.max(STYLE.squareSize / 2, 20) + 8;

    const { default: Point } = await import('@arcgis/core/geometry/Point');
    const { default: Polygon } = await import('@arcgis/core/geometry/Polygon');

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
      const offsetLat = 4;
      const offsetLng = 4;
      finalMapPoint.latitude = Math.min(
        Math.max(finalMapPoint.latitude! + offsetLat, MAP_BOUNDS.minLat),
        MAP_BOUNDS.maxLat
      );
      finalMapPoint.longitude = Math.min(
        Math.max(finalMapPoint.longitude! + offsetLng, MAP_BOUNDS.minLng),
        MAP_BOUNDS.maxLng
      );

      // --- TOP RECTANGLE (main bubble) ---
      const bubbleTop = new Graphic({
        geometry: new Polygon({
          rings: [
            [
              [finalMapPoint.longitude! - 0.9, finalMapPoint.latitude! + 0.3], // top-left
              [finalMapPoint.longitude! + 0.9, finalMapPoint.latitude! + 0.3], // top-right
              [finalMapPoint.longitude! + 0.9, finalMapPoint.latitude!], // bottom-right
              [finalMapPoint.longitude! - 0.9, finalMapPoint.latitude!], // bottom-left
              [finalMapPoint.longitude! - 0.9, finalMapPoint.latitude! + 0.3], // close ring
            ],
          ],
          spatialReference: { wkid: 4326 },
        }),
        symbol: {
          type: 'simple-fill',
          color: tilesMap.get(rig.label)!.color,
          outline: { color: [0, 0, 0], width: 1 },
        },
      });

      const recWidth=1.0;
      const rectHeight=0;
      const latOffset=0.3

      // --- SMALLER RECTANGLE BELOW (aquatic blue) ---
      const bubbleBottom = new Graphic({
        geometry: new Polygon({
          rings: [
            [
              [finalMapPoint.longitude! - recWidth/2, finalMapPoint.latitude!+rectHeight], // top-left
              [finalMapPoint.longitude! + recWidth/2, finalMapPoint.latitude!+rectHeight], // top-right
              [finalMapPoint.longitude! + recWidth/2, finalMapPoint.latitude! - latOffset], // bottom-right
              [finalMapPoint.longitude! - recWidth/2, finalMapPoint.latitude! - latOffset], // bottom-left
              [finalMapPoint.longitude! - recWidth/2, finalMapPoint.latitude!+rectHeight], // close ring
            ],
          ],
          spatialReference: { wkid: 4326 },
        }),
        symbol: {
          type: 'simple-fill',
          color: [0, 191, 255, 0.9], // aquatic blue
          outline: { color: [0, 0, 0], width: 1 },
        },
      });

      const stick = new Graphic({
        geometry: new Polyline({
          paths: [
            [
              [rig.lng, rig.lat],
              [finalMapPoint.longitude!, finalMapPoint.latitude!],
            ],
          ],
          spatialReference: { wkid: 4326 },
        }),
        symbol: new SimpleLineSymbol({
          color: tilesMap.get(rig.label)!.color,
          width: 2,
        }),
      });

      const label = new Graphic({
        geometry: finalMapPoint,
        symbol: new TextSymbol({
          text: `${rig.rigId}\n${rig.location}`,
          color: [0, 0, 0],
          font: STYLE.textFont as any,
          horizontalAlignment: 'center',
          verticalAlignment: 'middle',
          yoffset: 0,
        }),
      });

      // Add both rectangles instead of a single square
      layer.addMany([stick, bubbleTop, bubbleBottom, label]);
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
      a.download = 'water-wells-map.png';
      a.click();
    } catch (error) {
      console.error('Error taking screenshot:', error);
    }
  }
}
