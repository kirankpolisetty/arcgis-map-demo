import { HttpClientModule } from '@angular/common/http';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ArcgisMapComponent } from './aarcgis-map.component';
import { PLATFORM_ID } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ArcgisMapComponent (real HTTP)', () => {
  let component: ArcgisMapComponent;
  let fixture: ComponentFixture<ArcgisMapComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [ArcgisMapComponent, HttpClientTestingModule], // use real HttpClient
      providers: [{provide: PLATFORM_ID, useValue: 'browser'}]
    }).compileComponents();

    fixture = TestBed.createComponent(ArcgisMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
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

  
  
});
