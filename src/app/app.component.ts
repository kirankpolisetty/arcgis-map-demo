import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { ArcgisMapComponent } from './aarcgis-map/aarcgis-map.component'; 


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  template: `<router-outlet></router-outlet>`,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'arcgis-map-demo';
}
