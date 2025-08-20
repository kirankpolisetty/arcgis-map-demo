import { HttpClientModule } from '@angular/common/http';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ArcgisMapComponent } from './aarcgis-map.component';

describe('ArcgisMapComponent (real HTTP)', () => {
  let component: ArcgisMapComponent;
  let fixture: ComponentFixture<ArcgisMapComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ArcgisMapComponent, HttpClientModule], // use real HttpClient
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ArcgisMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load rigs from assets/rigs.json', waitForAsync(() => {
    // Wait a bit for ngOnInit to fetch the JSON
    fixture.whenStable().then(() => {
      expect(component.rigs.length).toBeGreaterThan(0);
      console.log('Loaded rigs:', component.rigs);
    });
  }));
});
