import {
  Component,
  OnInit,
  Inject,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import TextSymbol from '@arcgis/core/symbols/TextSymbol';
import PictureMarkerSymbol from '@arcgis/core/symbols/PictureMarkerSymbol';

@Component({
  selector: 'app-arcgis-map',
  templateUrl: './aarcgis-map.component.html',
  styleUrls: ['./aarcgis-map.component.css'],
  standalone: true,
})
export class ArcgisMapComponent implements OnInit {
  @ViewChild('mapViewNode', { static: true }) private mapViewEl?: ElementRef;
  private mapView: __esri.MapView | undefined;

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
      { default: PictureMarkerSymbol},
    ] = await Promise.all([
      import('@arcgis/core/Map'),
      import('@arcgis/core/views/MapView'),
      import('@arcgis/core/Graphic'),
      import('@arcgis/core/layers/GraphicsLayer'),
      import('@arcgis/core/geometry/Point'),
      import('@arcgis/core/geometry/Polygon'),
      import('@arcgis/core/symbols/SimpleFillSymbol'),
      import ('@arcgis/core/symbols/PictureMarkerSymbol')
    ]);

    const map = new Map({ basemap: 'topo-vector' });

    this.mapView = new MapView({
      container: this.mapViewEl?.nativeElement,
      map,
      center: [50.1383, 26.2886],
      zoom: 7,
    });

    // Layer for rigs/wells (points)
    const rigLayer = new GraphicsLayer();
    map.add(rigLayer);

    // Layer for oil and gas fields (polygons)
    const fieldLayer = new GraphicsLayer();
    map.add(fieldLayer);

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
    ];

    const classificationColors: Record<string, string> = {
      red: '#ff4c4c',
      green: '#4caf50',
      yellow: '#ffeb3b',
      orange: '#ff9800',
      black: '#000000',
    };

    rigs.forEach((rig) => {
      const point = new Point({
        latitude: rig.lat,
        longitude: rig.lng,
      });

      const markerSymbol = new PictureMarkerSymbol({
        url: 'assets/oil-rig.svg',
        width: '28px',
        height: '28px'
      });

      const markerGraphic = new Graphic({
        geometry: point,
        symbol: markerSymbol,
        attributes: {
          RigId: rig.rigId,
          Location: rig.location,
        },
        popupTemplate: {
          title: '{RigId}',
          content: '<b>Location:</b> {Location}<br><b>Status:</b> Active',
        },
      });

      rigLayer.add(markerGraphic);
    });

    // --- Polygons: Oil and Gas Fields ---
    const oilFields = [
      {
        id: 'OilField-1',
        name: 'Al Fahd Oil Field',
        color: 'green',
        rings: [
          [
            [50.10, 26.25],
            [50.15, 26.30],
            [50.20, 26.28],
            [50.18, 26.22],
            [50.10, 26.25],
          ],
        ],
      },
      {
        id: 'OilField-2',
        name: 'Al Basra Oil Field',
        color: 'green',
        rings: [
          [
            [50.05, 26.20],
            [50.07, 26.24],
            [50.12, 26.23],
            [50.10, 26.18],
            [50.05, 26.20],
          ],
        ],
      },
    ];

    const gasFields = [
      {
        id: 'GasField-1',
        name: 'Gulf Gas Formation',
        color: 'red',
        rings: [
          [
            [49.95, 26.30],
            [50.00, 26.32],
            [50.05, 26.29],
            [50.03, 26.26],
            [49.95, 26.30],
          ],
        ],
      },
    ];

    // Helper function to add polygon graphics
    function addFieldPolygon(field: {
      id: string;
      name: string;
      color: string;
      rings: number[][][];
    }) {
      const polygon = new Polygon({
        rings: field.rings,
      });

      const fillSymbol = new SimpleFillSymbol({
        color:
          field.color === 'green'
            ? 'rgba(76, 175, 80, 0.4)' // green transparent
            : 'rgba(255, 76, 76, 0.4)', // red transparent
        outline: {
          color: field.color === 'green' ? '#4caf50' : '#ff4c4c',
          width: 2,
        },
      });

      const polygonGraphic = new Graphic({
        geometry: polygon,
        symbol: fillSymbol,
        attributes: {
          FieldId: field.id,
          Name: field.name,
        },
        popupTemplate: {
          title: '{Name}',
          content: `Type: ${
            field.color === 'green' ? 'Oil Field' : 'Gas Field'
          }`,
        },
      });

      fieldLayer.add(polygonGraphic);
    }

    [...oilFields, ...gasFields].forEach(addFieldPolygon);

    await this.mapView.when();
    console.log('🛢️ Map loaded with rigs and fields!');
  }

  // You can keep your SVG generator and other methods here...

  // ... rest of your methods

  ngAfterViewInit() {}
  //create RIG SVG file for
  generateBubbleSvg(rigId: string, location: string): string {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="160" height="70">
        <rect x="0" y="0" rx="10" ry="10" width="160" height="50" fill="white" stroke="black" stroke-width="2"/>
        <polygon points="30,50 40,65 50,50" fill="white" stroke="black" stroke-width="2"/>
        <text x="10" y="20" fill="black" font-size="14" font-family="Arial" font-weight="bold">
          ${rigId}
        </text>
        <text x="10" y="40" fill="black" font-size="12" font-family="Arial">
          ${location}
        </text>
      </svg>
    `;
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  getColor(classification: string): string {
    switch (classification.toLowerCase()) {
      case 'red':
        return '#ff4c4c';
      case 'green':
        return '#4caf50';
      case 'orange':
        return '#ff9800';
      case 'yellow':
        return '#ffeb3b';
      default:
        return '#ccc';
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
