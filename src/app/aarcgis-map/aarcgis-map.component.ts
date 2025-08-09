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

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private http: HttpClient) {}

  async ngOnInit(){
    if (!isPlatformBrowser(this.platformId)) return;
    
    this.http.get<any[]>('assets/rigs.json').subscribe(data => {
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
    return new Graphic({
      geometry: point,
      symbol: new TextSymbol({
        text: `${rig.rigId}\n${rig.location}`, // Two-line format
        color: [0, 0, 0], // Black text
        haloColor: [255, 255, 255, 0.9], // Solid white background
        haloSize: 4, // Tight halo for small text
        font: {
          size: 6, // Very compact size
          weight: 'normal',
          family: 'Arial', // Prefer clean sans-serif
        },
        yoffset: 18, // Closer to point for small text
        xoffset: 0,
        horizontalAlignment: 'center',
        verticalAlignment: 'bottom',
        lineHeight: 1.0, // Minimal line spacing
      }),
    });
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
        popupTemplate: {
          title: '{RigId}',
          content: `
            <b>Location:</b> {Location} <br/>
            <b>Classification:</b> {Classification} <br/>
            <b>Status:</b> Active
          `,
        },
      });
      // Update this line to pass the entire rig object
      rigLayer.add(this.createLabelGraphic(point, rig));

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
