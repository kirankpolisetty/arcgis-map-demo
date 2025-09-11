import { HttpClientModule } from '@angular/common/http';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ArcgisMapComponent } from './aarcgis-map.component';
import { PLATFORM_ID } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Rig } from '../water-well';
import { findNonOverlappingPosition, rigUtils } from '../utils/rig-placement.utils';

describe('ArcgisMapComponent (real HTTP)', () => {
  let component: ArcgisMapComponent;
  let fixture: ComponentFixture<ArcgisMapComponent>;
    // Increase default timeout to 20 seconds
   jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;


  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [ArcgisMapComponent, HttpClientTestingModule], // use real HttpClient
      providers: [{provide: PLATFORM_ID, useValue: 'browser'}]
    }).compileComponents();

    fixture = TestBed.createComponent(ArcgisMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

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

  
  describe('saveMapImage', () => {
    let mockMapView: any;
    let createElementSpy: jasmine.Spy;

    beforeEach(() => {
      // Mock mapView with takeScreenshot
      mockMapView = {
        takeScreenshot: jasmine.createSpy('takeScreenshot').and.returnValue(
          Promise.resolve({ dataUrl: 'data:image/png;base64,FAKE' })
        ),
      };
      component['mapView'] = mockMapView;

      // Spy on document.createElement
      createElementSpy = spyOn(document, 'createElement').and.callFake(
        (tag: string) => {
          if (tag === 'a') {
            return {
              href: '',
              download: '',
              click: jasmine.createSpy('click'),
            } as any;
          }
          return document.createElement(tag);
        }
      );
    });

    it('should call takeScreenshot and trigger download', async () => {
      await component.saveMapImage();
  
      expect(mockMapView.takeScreenshot).toHaveBeenCalledWith({
        format: 'png',
        quality: 1,
      });
  
      const aTag = createElementSpy.calls.mostRecent().returnValue;
      expect(aTag.href).toBe('data:image/png;base64,FAKE');
      expect(aTag.download).toBe('water-wells-map.png');
      expect(aTag.click).toHaveBeenCalled();
    });

    it('should catch errors during screenshot', async () => {
      const consoleSpy = spyOn(console, 'error');
      mockMapView.takeScreenshot.and.returnValue(Promise.reject('Boom'));
      await component.saveMapImage();
      expect(consoleSpy).toHaveBeenCalledWith('Error taking screenshot:', 'Boom');
    });

  });

  describe('ArcgisMapComponent layoutBubbles', () => {
    let component: ArcgisMapComponent;
    let mockLayer: any;
  
    const fakeRigs: Rig[] = Array.from({ length: 10 }).map((_, i) => ({
      rigId: `R${i + 1}`,
      lat: 24.5 + Math.random() * 0.5,
      lng: 50.0 + Math.random() * 0.5,
      location: `East${i + 1}`,
      classification: 'A',
      label: 'Oil', // must match tilesMap key
    }));
  
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [ArcgisMapComponent, HttpClientTestingModule],
        providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
      }).compileComponents();
  
      const fixture = TestBed.createComponent(ArcgisMapComponent);
      component = fixture.componentInstance;
      component.rigs = fakeRigs;
  
      component.mapView = {
        width: 800,
        height: 600,
        toScreen: jasmine.createSpy('toScreen').and.callFake(pt => ({ x: 100, y: 100 })),
        toMap: jasmine.createSpy('toMap').and.callFake(scr => ({ latitude: 24.5, longitude: 50, clone: function() { return this; } })),
        watch: jasmine.createSpy('watch').and.callFake(() => {}),
        takeScreenshot: jasmine.createSpy('takeScreenshot').and.returnValue(Promise.resolve({ dataUrl: 'fake.png' })),
      } as any;
  
      mockLayer = { removeAll: jasmine.createSpy(), addMany: jasmine.createSpy() };
  
      //spyOn(rigUtils, 'findNonOverlappingPosition').and.callFake((x, y, placed, radius) => ({x}));
      
    });
  
    it('should clear and add graphics', async () => {
     // await component.layoutBubbles(mockLayer);
      expect(mockLayer.removeAll).toHaveBeenCalled();
      expect(mockLayer.addMany).toHaveBeenCalled();
    });

  
  
  });
  
  
});