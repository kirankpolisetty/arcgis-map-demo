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
// First, add the import at the top of your file
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';

// Configure labels for rigs
@Component({
  selector: 'app-arcgis-map',
  templateUrl: './aarcgis-map.component.html',
  styleUrls: ['./aarcgis-map.component.css'],
  standalone: true,
})
export class ArcgisMapComponent implements OnInit {
  @ViewChild('mapViewNode', { static: true }) private mapViewEl?: ElementRef;
  private mapView: __esri.MapView | undefined;
  private zoomWatcher: IHandle | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const [
      { default: Map },
      { default: MapView },
      { default: Graphic },
      { default: GraphicsLayer },
      { default: Point },
      { default: Polygon },
      { default: SimpleFillSymbol },
      { default: PictureMarkerSymbol },
    ] = await Promise.all([
      import('@arcgis/core/Map'),
      import('@arcgis/core/views/MapView'),
      import('@arcgis/core/Graphic'),
      import('@arcgis/core/layers/GraphicsLayer'),
      import('@arcgis/core/geometry/Point'),
      import('@arcgis/core/geometry/Polygon'),
      import('@arcgis/core/symbols/SimpleFillSymbol'),
      import('@arcgis/core/symbols/PictureMarkerSymbol'),
    ]);

    const map = new Map({ basemap: 'topo-vector' });

    // First, ensure your MapView initialization includes proper popup configuration:
    this.mapView = new MapView({
      container: this.mapViewEl?.nativeElement,
      map,
      center: [50.1383, 26.2886],
      zoom: 7,
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

    // --- Points: Rigs or Wells ---
    const rigs = [
      {
        rigId: 'RIG-001',
        location: 'Eastern Offshore Zone',
        classification: 'green',
        lat: 26.2886,
        lng: 50.1383,
      },
      {
        rigId: 'RIG-002',
        location: 'Southern Basin',
        classification: 'red',
        lat: 25.4321,
        lng: 49.9876,
      },
      {
        rigId: 'RIG-003',
        location: 'Northern Platform',
        classification: 'yellow',
        lat: 27.1234,
        lng: 49.7654,
      },
      // New major Saudi oil rigs/fields:
      {
        rigId: 'Ghawar-Field',
        location: 'Ghawar Field',
        classification: 'green',
        lat: 25.0193,
        lng: 49.5614,
      },
      {
        rigId: 'Safaniya-Field',
        location: 'Safaniya Field',
        classification: 'red',
        lat: 27.4670,
        lng: 48.5200,
      },
      {
        rigId: 'Zuluf-Field',
        location: 'Zuluf Field ',
        classification: 'red',
        lat: 27.28,   // approx
        lng: 49.16,   // approx
      },
      {
        rigId: 'Marjan-Field',
        location: 'Marjan Field ',
        classification: 'red',
        lat: 26.92,   // approx
        lng: 49.53,   // approx
      },
      {
        rigId: 'Berri-Field',
        location: 'Berri Field ',
        classification: 'red',
        lat: 26.59,   // approx
        lng: 49.57,   // approx
      },
      {
        rigId: 'Khurais-Field',
        location: 'Khurais Field',
        classification: 'green',
        lat: 25.0694,
        lng: 48.1950,
      },
      {
        rigId: 'Manifa-Field',
        location: 'Manifa Field',
        classification: 'green',
        lat: 25.0,    // approx - no exact public coords
        lng: 49.0,    // approx
      },
      {
        rigId: 'Shaybah-Field',
        location: 'Shaybah Field ',
        classification: 'green',
        lat: 22.5106,
        lng: 53.9519,
      },
      {
        rigId: 'Abqaiq',
        location: 'Abqaiq Processing Hub',
        classification: 'green',
        lat: 26.11,
        lng: 49.62,
      },
      {
        rigId: 'Qatif-AbuSafah',
        location: 'Qatif / Abu Safah Area',
        classification: 'red',
        lat: 26.48,
        lng: 50.08,
      },
    ];
    

    rigs.forEach((rig) => {
      const point = new Point({
        latitude: rig.lat,
        longitude: rig.lng,
      });

      // Add rig graphic
      rigLayer.add(
        new Graphic({
          geometry: point,
          symbol: new PictureMarkerSymbol({
            url: 'assets/oil-rig.svg',
            width: '28px',
            height: '28px',
          }),
          attributes: {
            RigId: rig.rigId,
            Location: rig.location,
          },
        })
      );
      // Update this line to pass the entire rig object
      rigLayer.add(this.createLabelGraphic(point, rig));

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

  private createLabelGraphic(point: Point, rig: { rigId: string; location: string }): Graphic {
    return new Graphic({
      geometry: point,
      symbol: new TextSymbol({
        text: `${rig.rigId}\n${rig.location}`,  // Two-line format
        color: [0, 0, 0],  // Black text
        haloColor: [255, 255, 255, 0.9],  // Solid white background
        haloSize: 4,  // Tight halo for small text
        font: {
          size: 6,    // Very compact size
          weight: 'normal',
          family: 'Arial'  // Prefer clean sans-serif
        },
        yoffset: 18,  // Closer to point for small text
        xoffset: 0,
        horizontalAlignment: "center",
        verticalAlignment: "bottom",
        lineHeight: 1.0  // Minimal line spacing
      })
    });
  }
}
