import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Rig } from '../water-well';
import { ArcgisMapComponent } from './aarcgis-map.component';

describe('AarcgisMapComponent', () => {
  let component: ArcgisMapComponent;
  let fixture: ComponentFixture<ArcgisMapComponent>;
  let httpMock: HttpTestingController;

  const mockRigs: Rig[] = [
    { rigId: 'R1', lat: 24.5, lng: 48.2, location: 'Loc1', classification: 'A' },
    { rigId: 'R2', lat: 24.6, lng: 48.3, location: 'Loc2', classification: 'B' },
  ];

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ArcgisMapComponent, HttpClientTestingModule],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ArcgisMapComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(()=> {
    httpMock.verify();
  })

  it('should create the component.. ', ()=> {
    expect(component).toBeTruthy();
  });


});
