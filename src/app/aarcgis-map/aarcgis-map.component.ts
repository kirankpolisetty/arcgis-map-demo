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
import TextSymbol from '@arcgis/core/symbols/TextSymbol';
import { catchError, of } from 'rxjs';
import {
  MAP_BOUNDS,
  lineSymbol,
  tilesMap,
  topPolygonTemplate,
  wwellIdTextSymbol,
  locationTextSymbol,
  bottomPolygonTemplate,
  STYLE,
  MAP_CONFIG,
} from '../utils/map.config';
import {
  createLegendLayer,
  findNonOverlappingPosition,
  rigUtils,
  translatePolygon,
} from '../utils/rig-placement.utils';
import { Rig } from '../water-well';
import Point from '@arcgis/core/geometry/Point';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import { MatCard, MatCardTitle } from '@angular/material/card';

@Component({
  selector: 'app-arcgis-map',
  imports: [HttpClientModule, MatCardTitle, MatCard],
  templateUrl: './aarcgis-map.component.html',
  styleUrls: ['./aarcgis-map.component.css'],
  standalone: true,
})
export class ArcgisMapComponent implements OnInit {
  @ViewChild('mapViewNode', { static: true }) private mapViewEl?: ElementRef;
  mapView?: __esri.MapView;
  legendLayer: GraphicsLayer | undefined;
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
      .get<Rig[]>('assets/rigs.json')
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
      this.legendLayer = createLegendLayer(this.mapView);
      this.mapView?.map?.add(this.legendLayer);
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

  //

   layoutBubbles(layer: GraphicsLayer) {
    if (!this.mapView) return;
    layer.removeAll();
    this.placedBubbles = [];
    const view = this.mapView;
    const viewW = view.width;
    const viewH = view.height;

    const bubblePixelRadius = Math.max(STYLE.squareSize / 2, 20) + 8;
    const iconRadius = STYLE.markerSize / 2;
    const graphics: Graphic[] = [];
    const anchorPt = new Point({
      latitude: 0,
      longitude: 0,
      spatialReference: { wkid: 4326 },
    });
    for (const wwell of this.rigs) {
      anchorPt.latitude = wwell.lat;
      anchorPt.longitude = wwell.lng;
      const sp = view.toScreen(anchorPt);
      if (!sp) continue;

      sp.x = Math.max(8, Math.min(viewW - 8, sp.x));
      sp.y = Math.max(8, Math.min(viewH - 8, sp.y));

      const obstaces = [
        ...this.placedBubbles,
        { x: sp.x, y: sp.y, radius: iconRadius + 4 },
      ];

      const finalScreen = findNonOverlappingPosition(
        sp.x,
        sp.y,
        obstaces,
        bubblePixelRadius
      );

      this.placedBubbles.push({
        x: finalScreen.x,
        y: finalScreen.y,
        radius: bubblePixelRadius,
      });

      let finalMapPoint = view.toMap(finalScreen as any) as __esri.Point | null;
      if (!finalMapPoint) finalMapPoint = anchorPt.clone();

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

      const stick = new Graphic({
        geometry: new Polyline({
          paths: [
            [
              [wwell.lng, wwell.lat],
              [finalMapPoint.longitude!, finalMapPoint.latitude!],
            ],
          ],
          spatialReference: { wkid: 4326 },
        }),
        symbol: lineSymbol(tilesMap.get(wwell.label)!.color),
      });

      const topPoly = translatePolygon(
        topPolygonTemplate,
        finalMapPoint.longitude!,
        finalMapPoint.latitude!
      );

      const bubbleTop = new Graphic({
        geometry: topPoly,
        symbol: new SimpleFillSymbol({
          color: tilesMap.get(wwell.label)!.color,
          outline: { color: [0, 0, 0], width: 1 },
        }),
      });

      const botomPoly = translatePolygon(
        bottomPolygonTemplate,
        finalMapPoint.longitude!,
        finalMapPoint.latitude
      );

      const bubbleBUttom = new Graphic({
        geometry: botomPoly,
        symbol: new SimpleFillSymbol({
          color: [0, 191, 255, 0.0],
          outline: { color: [0, 0, 0], width: 1 },
        }),
      });

      const wwellIdLabel = new Graphic({
        geometry: finalMapPoint,
        symbol: wwellIdTextSymbol(STYLE.textFont as any),
      });
      (wwellIdLabel.symbol as TextSymbol).text = `${wwell.rigId}`;

      const locationLabel = new Graphic({
        geometry: finalMapPoint,
        symbol: locationTextSymbol(STYLE.textFont as any),
      });
      (locationLabel.symbol as TextSymbol).text = `${wwell.location}`;

      graphics.push(
        stick,
        bubbleTop,
        bubbleBUttom,
        wwellIdLabel,
        locationLabel
      );
    }
    layer.addMany(graphics);
  }

  async saveMapImage(): Promise<void> {
    try {
      const base64 = await this.getScreenshotBase64();
      this.downloadBase64(base64, 'water-wells-map.png');
    } catch (err) {
      console.error('Error taking screenshot...', err);
    }
  }

  /* Return the current map view as a Base-64 string (without the data.url prefix). */
  async captureMapRedBase64(): Promise<string> {
    return this.getScreenshotBase64(); // any error will propagate to the caller
  }

  private async getScreenshotBase64(): Promise<string> {
    if (!this.mapView) {
      throw new Error('Map view is not defined');
    }

    const screenshot = await this.mapView.takeScreenshot({
      format: 'png',
      quality: 1,
    });

    this.legendLayer!.visible = true;
    await new Promise((r) => setTimeout(r, 300));
    const [, rawBase64] = screenshot.dataUrl.split(',');
    this.legendLayer!.visible = false;
    return rawBase64;
  }

  private downloadBase64(base64: string, fileName: string): void {
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // async saveMapImage() {
  //   if (!this.mapView) return alert('Map is not ready yet!');

  //   try {
  //     this.legendLayer!.visible = true;
  //     await new Promise((r) => setTimeout(r, 300));
  //     const screenshot = await this.mapView.takeScreenshot({
  //       format: 'png',
  //       quality: 1,
  //     });
  //     // Hide it again
  //     this.legendLayer!.visible = false;
  //     const a = document.createElement('a');
  //     a.href = screenshot.dataUrl;
  //     a.download = 'water-wells-map.png';
  //     a.click();
  //   } catch (error) {
  //     console.error('Error taking screenshot:', error);
  //   }
  // }
}
