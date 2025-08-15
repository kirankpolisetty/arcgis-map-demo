import {
  Component,
  OnInit,
  Inject,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
// Add to your existing imports
import TextSymbol from '@arcgis/core/symbols/TextSymbol';
import LabelClass from '@arcgis/core/layers/support/LabelClass';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import Polyline from '@arcgis/core/geometry/Polyline';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import PointSymbol3D from '@arcgis/core/symbols/PointSymbol3D';
import TextSymbol3DLayer from '@arcgis/core/symbols/TextSymbol3DLayer';
import IconSymbol3DLayer from '@arcgis/core/symbols/IconSymbol3DLayer';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
// First, add the import at the top of your file
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';

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
  private zoomWatcher: IHandle | null = null;
  rigs: any[] = [];

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

  private createLabelGraphic(
    point: Point,
    rig: { rigId: string; location: string }
  ): Graphic {
    const symbol = new PointSymbol3D({
      symbolLayers: [
        new IconSymbol3DLayer({
          resource: { primitive: 'circle' }, // Built-in circle
          material: { color: [255, 255, 0, 0.8] }, // yellow with opacity
          size: 30, // diameter in points
        }),
        new TextSymbol3DLayer({
          text: 'R1',
          material: { color: 'black' },
          font: { size: 12, weight: 'bold' },
          verticalAlignment: 'middle',
          horizontalAlignment: 'center',
        }),
      ],
    });
    return new Graphic({ geometry: point, symbol });

    // return new Graphic({
    //   geometry: point,
    //   symbol: new TextSymbol({
    //     text: `${rig.rigId}\n${rig.location}`, // Two-line format
    // //     color: [20, 10, 0], // Black text
    // //     haloColor: [250, 255, 225, 255], // Solid white background
    // //     haloSize: 0, // Tight halo for small text
    // //     font: {
    // //       size: 16, // Very compact size
    // //       weight: 'bold',
    // //       family: 'Arial', // Prefer clean sans-serif
    // //     },
    // //     // yoffset: 18, // Closer to point for small text
    // //     // // xoffset: 0,
    // //     // horizontalAlignment: 'center',
    // //     // verticalAlignment: 'bottom',
    // //     // lineHeight: 0, // Minimal line spacing
    //   }),
    // });
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
      projection,
      coordinateFormatter,
    ] = await Promise.all([
      import('@arcgis/core/Map'),
      import('@arcgis/core/views/MapView'),
      import('@arcgis/core/Graphic'),
      import('@arcgis/core/layers/GraphicsLayer'),
      import('@arcgis/core/geometry/Point'),
      import('@arcgis/core/symbols/PictureMarkerSymbol'),
      import('@arcgis/core/geometry/projection'),
      import('@arcgis/core/geometry/coordinateFormatter'),
    ]);

    // Create the map and view
    const map = new Map({ basemap: 'topo-vector' });
    // First, ensure your MapView initialization includes proper popup configuration:
    this.mapView = new MapView({
      container: this.mapViewEl?.nativeElement,
      map,
      center: [49.1383, 22.2886],
      zoom: 6,
      constraints: {
        minZoom: 6,
        maxZoom: 6,
      },
      popup: {
        dockEnabled: true,
        dockOptions: {
          buttonEnabled: false,
          breakpoint: false,
        },
      },
    });
    // Create the graphics layer first
    const rigLayer = new GraphicsLayer();

    const fieldLayer = new GraphicsLayer();
    map.addMany([rigLayer, fieldLayer]);

    // Bubble text

    // Loop through rigs array to create markers
    this.rigs.forEach((rig) => {
      const point = new Point({
        latitude: rig.lat,
        longitude: rig.lng,
      });

      const symbol = new PictureMarkerSymbol({
        url: 'assets/oil-rig.svg',
        width: '28px',
        height: '28px',
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
      console.log(rig.lat + ' lng position' + rig.lng);

      //START rig.lat
      // Stick from point to bubble
      const stick = new Polyline({
        paths: [
          [
            [rig.lng, rig.lat], // base
            [2 + rig.lng, 2 + rig.lat], // bubble position
          ],
        ],
      });

      // [50.1383, 26.2886], // base
      // [52.14, 26.29], // bubble position

      const stickGraphic = new Graphic({
        geometry: stick,
        symbol: new SimpleLineSymbol({
          color: 'black',
          width: 2,
        }),
      });
      //END

      const textGraphic = new Graphic({
        geometry: new Point({
          longitude: 55.14,
          latitude: 26.29,
        }),
        symbol: new TextSymbol({
          text: 'RIG001\nActive',
          color: 'red',
          haloColor: 'black',
          haloSize: '1px',
          font: { size: 12, weight: 'bold' },
        }),
      });

      //START

      // Step 1: Circle background
      const circleSymbol = new SimpleMarkerSymbol({
        style: 'circle',
        color: [255, 255, 0, 0.8], // Yellow with some transparency
        size: 40, // Circle diameter in pixels
        outline: {
          color: [0, 0, 0, 255],
          width: 1,
        },
      });

      // 1️⃣ Circle background
      const circleSymbol_2 = new SimpleMarkerSymbol({
        style: 'square',
        color: [255, 255, 255, 255], // Yellow with opacity
        size: 80, // Circle diameter
        outline: {
          color: [0, 0, 0, 255], // Black border
          width: 2,
        },
      });

      // Step 2: Text overlay
      const textSymbol = new TextSymbol({
        text: `${rig.rigId}\n${rig.location}`,
        color: 'black',
        font: {
          size: 12,
          weight: 'bold',
          family: 'Arial',
        },
        yoffset: -2, // Slight adjust so text is perfectly centered
      });

      // change sstart here.......
      const point1 = new Point({
        longitude: rig.lng + 3,
        latitude: rig.lat + 3,
      });
      // Step 3: Same geometry for both
      const circleGraphic = new Graphic({
        geometry: point1,
        symbol: circleSymbol_2,
      });

      const textGraphic_2 = new Graphic({
        geometry: point1,
        symbol: textSymbol,
      });

      // Step 4: Add both graphics to the same layer
      rigLayer.addMany([circleGraphic, textGraphic_2]);
      //END to HERE

      rigLayer.addMany([
        stickGraphic,
        this.createLabelGraphic(
          new Point({ longitude: rig.lng + 3, latitude: rig.lat + 3 }),
          rig
        ),
      ]);
      //chages end here....#2

      // Update this line to pass the entire rig object
      //   rigLayer.add(this.createLabelGraphic(point, rig));

      rigLayer.add(graphic);

      // Update the zoom watcher to handle multi-line labels better
      this.zoomWatcher = reactiveUtils.watch(
        () => this.mapView?.zoom,
        (zoom) => {
          if (zoom) {
            const baseSize = Math.min(14, Math.max(10, 22 - zoom)); // Slightly smaller base size
            rigLayer.graphics.forEach((g) => {
              if (g.symbol instanceof TextSymbol) {
                g.symbol.font.size = baseSize;
                g.symbol.haloSize = baseSize / 12;
                g.symbol.yoffset = 30 * (zoom / 7); // Dynamic offset based on zoom
              }
            });
          }
        },
        { initial: true }
      );
    });

    await this.mapView.when();
    console.log('Map initialized with rigs ✅');
  }
}
