import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ArcgisMapComponent } from './aarcgis-map/aarcgis-map.component'; 


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ArcgisMapComponent],
  template: `<app-arcgis-map></app-arcgis-map>`,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'arcgis-map-demo';
}
