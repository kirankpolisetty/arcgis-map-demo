import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArcgisMapComponent } from './aarcgis-map.component';

// Mock all ArcGIS imports at the top level
jest.mock('@arcgis/core/Graphic');
jest.mock('@arcgis/core/geometry/Polyline');
jest.mock('@arcgis/core/layers/GraphicsLayer');
jest.mock('@arcgis/core/symbols/SimpleLineSymbol');
jest.mock('@arcgis/core/Map');
jest.mock('@arcgis/core/MapView');

describe('AarcgisMapComponent', () => {
  let component: ArcgisMapComponent;
  let fixture: ComponentFixture<ArcgisMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArcgisMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ArcgisMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});