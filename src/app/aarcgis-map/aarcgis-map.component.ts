import {
  Component,
  OnInit,
  Inject,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-arcgis-map',
  templateUrl: './aarcgis-map.component.html',
  styleUrls: ['./aarcgis-map.component.css'],
  standalone: true,
})
export class ArcgisMapComponent implements OnInit {
  @ViewChild('mapViewNode', { static: true }) private mapViewEl?: ElementRef;
  private view: __esri.MapView | undefined;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const [
        { default: Map },
        { default: MapView },
        { default: Graphic },
        { default: GraphicsLayer },
        { default: Point },
        { default: SimpleMarkerSymbol },
        { default: Polygon },
        { default: SimpleFillSymbol },
      ] = await Promise.all([
        import('@arcgis/core/Map'),
        import('@arcgis/core/views/MapView'),
        import('@arcgis/core/Graphic'),
        import('@arcgis/core/layers/GraphicsLayer'),
        import('@arcgis/core/geometry/Point'),
        import('@arcgis/core/symbols/SimpleMarkerSymbol'),
        import('@arcgis/core/geometry/Polygon'),
        import('@arcgis/core/symbols/SimpleFillSymbol'),
      ]);

      const map = new Map({
        basemap: 'topo-vector', // 🗺️ Topographic view for exploration context
      });

      this.view = new MapView({
        container: this.mapViewEl?.nativeElement,
        map,
        center: [50.1383, 26.2886], // 📍 Dhahran, KSA
        zoom: 12,
      });

      // const point = new Point({
      //   longitude: 50.1383,
      //   latitude: 26.2886,
      // });

      // 1️⃣ Define Polygon Geometry (rough square around Dhahran)
      const polygon = new Polygon({
        rings: [
          [
            [50.1325, 26.294],
            [50.139, 26.2955],
            [50.142, 26.29],
            [50.14, 26.285],
            [50.136, 26.282],
            [50.131, 26.2835],
            [50.13, 26.287],
            [50.1325, 26.294], // closing point same as first
          ],
        ],
        spatialReference: { wkid: 4326 },
      });

      // 2️⃣ Define Fill Symbol
      const fillSymbol = new SimpleFillSymbol({
        color: [255, 165, 0, 0.3], // orange fill w/ transparency
        outline: {
          color: [255, 85, 0, 1],
          width: 2,
        },
      });

      const markerSymbol = new SimpleMarkerSymbol({
        color: 'orange',
        size: 10,
        outline: {
          color: 'black',
          width: 1.5,
        },
      });

      // 3️⃣ Create Graphic from Polygon
      const polygonGraphic = new Graphic({
        geometry: polygon,
        symbol: fillSymbol,
        attributes: {
          Name: 'Exploration Zone Alpha',
        },
        popupTemplate: {
          title: '{Name}',
          content:
            'Polygon marking a potential exploration block near Dhahran.',
        },
      });

      const graphicsLayer = new GraphicsLayer();
      graphicsLayer.add(polygonGraphic);
      map.add(graphicsLayer);

      //Red Zone
      // Red Zone (irregular shape)
      const polygonRed = new Polygon({
        rings: [
          [
            [50.13, 26.295],
            [50.133, 26.299],
            [50.138, 26.296],
            [50.136, 26.291],
            [50.131, 26.288],
            [50.13, 26.295], // close loop
          ],
        ],
        spatialReference: { wkid: 4326 },
      });

      const redSymbol = new SimpleFillSymbol({
        color: [255, 0, 0, 0.4],
        outline: { color: [255, 0, 0, 1], width: 2 },
      });

      graphicsLayer.add(
        new Graphic({
          geometry: polygonRed,
          symbol: redSymbol,
          attributes: { Name: 'Zone Red' },
          popupTemplate: {
            title: '{Name}',
            content: 'High risk exploration zone',
          },
        })
      );

      // Zone Yellow (moderate risk)
      const polygonYellow = new Polygon({
        rings: [
          [
            [50.134, 26.29],
            [50.137, 26.293],
            [50.14, 26.289],
            [50.138, 26.285],
            [50.134, 26.286],
            [50.134, 26.29], // close loop
          ],
        ],
        spatialReference: { wkid: 4326 },
      });
      const yellowSymbol = new SimpleFillSymbol({
        color: [255, 255, 0, 0.4],
        outline: { color: [255, 255, 0, 1], width: 2 },
      });

      graphicsLayer.add(
        new Graphic({
          geometry: polygonYellow,
          symbol: yellowSymbol,
          attributes: { Name: 'Zone Yellow' },
          popupTemplate: {
            title: '{Name}',
            content: 'Moderate risk exploration zone',
          },
        })
      );

      //Green
      const polygonGreen = new Polygon({
        rings: [
          [
            [50.139, 26.288],
            [50.143, 26.29],
            [50.144, 26.287],
            [50.141, 26.283],
            [50.139, 26.284],
            [50.139, 26.288], // close loop
          ],
        ],
        spatialReference: { wkid: 4326 },
      });
      const greenSymbol = new SimpleFillSymbol({
        color: [0, 255, 0, 0.4],
        outline: { color: [0, 255, 0, 1], width: 2 },
      });
      graphicsLayer.add(
        new Graphic({
          geometry: polygonGreen,
          symbol: greenSymbol,
          attributes: { Name: 'Zone Green' },
          popupTemplate: {
            title: '{Name}',
            content: 'Low risk exploration zone',
          },
        })
      );

      // Create layers
      const surfaceLayer = new GraphicsLayer({ title: 'Surface Layer' });
      const reservoirLayer = new GraphicsLayer({ title: 'Reservoir Layer' });
      const faultZoneLayer = new GraphicsLayer({ title: 'Fault Zone Layer' });

      map.addMany([surfaceLayer, reservoirLayer, faultZoneLayer]);

      // Surface Layer (green, irregular)
      const surfacePoly = new Polygon({
        rings: [
          [
            [50.13, 26.295],
            [50.134, 26.299],
            [50.137, 26.295],
            [50.135, 26.29],
            [50.131, 26.288],
            [50.13, 26.295], // close loop
          ],
        ],
        spatialReference: { wkid: 4326 },
      });
      const surfaceSymbol = new SimpleFillSymbol({
        color: [0, 255, 0, 0.3],
        outline: { color: [0, 128, 0, 0.7], width: 2 },
      });
      surfaceLayer.add(
        new Graphic({
          geometry: surfacePoly,
          symbol: surfaceSymbol,
          attributes: { Name: 'Surface' },
        })
      );

      // Reservoir Layer (yellow, irregular)
      const reservoirPoly = new Polygon({
        rings: [
          [
            [50.132, 26.291],
            [50.136, 26.293],
            [50.139, 26.289],
            [50.137, 26.285],
            [50.134, 26.286],
            [50.132, 26.291], // close loop
          ],
        ],
        spatialReference: { wkid: 4326 },
      });
      const reservoirSymbol = new SimpleFillSymbol({
        color: [255, 255, 0, 0.5],
        outline: { color: [255, 215, 0, 0.8], width: 2 },
      });
      reservoirLayer.add(
        new Graphic({
          geometry: reservoirPoly,
          symbol: reservoirSymbol,
          attributes: { Name: 'Reservoir' },
        })
      );

      // Fault Zone Layer (red, irregular)
      const faultZonePoly = new Polygon({
        rings: [
          [
            [50.134, 26.289],
            [50.138, 26.291],
            [50.139, 26.287],
            [50.137, 26.283],
            [50.134, 26.284],
            [50.134, 26.289], // close loop
          ],
        ],
        spatialReference: { wkid: 4326 },
      });
      const faultZoneSymbol = new SimpleFillSymbol({
        color: [255, 0, 0, 0.6],
        outline: { color: [139, 0, 0, 1], width: 2 },
      });
      faultZoneLayer.add(
        new Graphic({
          geometry: faultZonePoly,
          symbol: faultZoneSymbol,
          attributes: { Name: 'Fault Zone' },
        })
      );

      await this.view.when();
      
      console.log('🗺️ Map initialized with Exploration Marker at Dhahran.');
    }
  }

  async saveMapImage() {
    if (!this.view) return alert('Map is not ready yet!');

    try {
      const screenshot = await this.view.takeScreenshot({
        format: 'png',
        quality: 1,
      });

      // screenshot.dataUrl is a base64 image string
      const a = document.createElement('a');
      a.href = screenshot.dataUrl;
      a.download = 'exploration-map.png';
      a.click();
    } catch (error) {
      console.error('Error taking screenshot:', error);
    }
  }
}
