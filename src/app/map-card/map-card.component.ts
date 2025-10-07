import { Component, ElementRef, OnInit, ViewChild, viewChild } from '@angular/core';
import {MatCardModule} from '@angular/material/card';
@Component({
  selector: 'app-map-card',
  imports: [MatCardModule],
  templateUrl: './map-card.component.html',
  styleUrl: './map-card.component.css'
})
export class MapCardComponent implements OnInit {
  @ViewChild('mapViewNode',{static:true}) private mapViewEl?: ElementRef;
  mapView?: __esri.MapView;
   

  ngOnInit(): void {
        
  }

  private initializeMap(): void {

  }

}
