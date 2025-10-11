jest.mock('@arcgis/core/Graphic');
jest.mock('@arcgis/core/geometry/Point', () => ({
  default: class Point {
    x: number;
    y: number;
    latitude: number;
    longitude: number;
    constructor(options?: any) {
      this.x = 100;
      this.y = 200;
      this.latitude = options?.latitude;
      this.longitude = options?.longitude;
      Object.assign(this, options);
    }
  },
}));

jest.mock('@arcgis/core/geometry/Polyline');
jest.mock('@arcgis/core/layers/GraphicsLayer');
jest.mock('@arcgis/core/symbols/SimpleFillSymbol', () => ({
  default: jest.fn().mockImplementation(() => ({ color: [0, 0, 0, 0.5] })),
}));
jest.mock('@arcgis/core/symbols/TextSymbol', () => ({
  default: jest.fn().mockImplementation(() => ({ color: [0, 0, 0, 1] })),
}));
jest.mock('@arcgis/core/Map');
jest.mock('@arcgis/core/views/MapView');
jest.mock('@arcgis/core/symbols/PictureMarkerSymbol', () => ({
  default: class PictureMarkerSymbol {
    width: number;
    height: number;
    url: string;
    constructor(options?: any) {
      this.width = 24;
      this.height = 24;
      this.url = options?.url;
      Object.assign(this, options);
    }
  },
  
}));
(global as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flush,
  tick,
} from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card';
import { of, throwError } from 'rxjs';
import { MorningreportService } from '../services/morningreport.service';
import { ArcgisMapComponent } from './aarcgis-map.component';
import { PLATFORM_ID } from '@angular/core';
import { runInInjectionContext } from '@angular/core';

// Mock ArcGIS modules
jest.mock('@arcgis/core/Graphic');

jest.mock('@arcgis/core/geometry/Polyline');
jest.mock('@arcgis/core/layers/GraphicsLayer');
jest.mock('@arcgis/core/symbols/SimpleFillSymbol', () => {
  return {
    default: class SimpleFillSymbolMock {
      constructor(options?: any) {
        Object.assign(this, options);
      }
    },
  };
});
jest.mock('@arcgis/core/symbols/TextSymbol', () => ({
  default: jest.fn().mockImplementation(() => ({ color: [0, 0, 0, 1] })),
}));
jest.mock('@arcgis/core/symbols/SimpleFillSymbol', () => ({
  default: jest.fn().mockImplementation(() => ({ color: [0, 0, 0, 0.5] })),
}));
jest.mock('@arcgis/core/Map');
jest.mock('@arcgis/core/views/MapView');

describe('ArcgisMapComponent', () => {
  let component: ArcgisMapComponent;
  let fixture: ComponentFixture<ArcgisMapComponent>;
  let httpTestingController: HttpTestingController;
  let mockMorningReportService: jest.Mocked<MorningreportService>;

  const mockRigs = [
    {
      rigId: 'B1-001',
      lat: 34.0522,
      lng: -118.2437,
      location: 'Los Angeles',
      classification: 'Active',
      label: 'Rig B1-001',
    },
    {
      rigId: 'B2-001',
      lat: 40.7128,
      lng: -74.006,
      location: 'New York',
      classification: 'Inactive',
      label: 'Rig B2-001',
    },
  ];

  // Mock DOM elements
  const mockMapViewElement = document.createElement('div');
  mockMapViewElement.id = 'mapViewNode';
  document.body.appendChild(mockMapViewElement);

  beforeEach(async () => {
    // Create mock service
    mockMorningReportService = {
      getMorningReport: jest.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [ArcgisMapComponent, HttpClientTestingModule, MatCardModule],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: MorningreportService, useValue: mockMorningReportService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArcgisMapComponent);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);

    // Mock the view child element
    component['mapViewEl'] = { nativeElement: mockMapViewElement } as any;
    
  });

  afterEach(() => {
    httpTestingController.verify();
    jest.clearAllMocks();
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize and fetch morning report data on init', fakeAsync(() => {
    mockMorningReportService.getMorningReport.mockReturnValue(of(mockRigs));
    const initMapSpy = jest
      .spyOn(component as any, 'initMap')
      .mockResolvedValue(undefined);
    fixture.detectChanges();
    tick();
    expect(mockMorningReportService.getMorningReport).toHaveBeenCalled();
    expect(component['rigs']).toEqual(mockRigs);
    expect(initMapSpy).toHaveBeenCalled();
    flush();
  }));

  it('should handle error when fetching morning report fails', fakeAsync(() => {
    const errorMessage = 'Failed to load data';
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockMorningReportService.getMorningReport.mockReturnValue(
      throwError(() => new Error(errorMessage))
    );
    fixture.detectChanges();
    tick();
    expect(component.errorMessage()).toBe('Unable to load the well data!!');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    flush();
  }));


  // it('should initialize map with correct configuration', async () => {
  //   component['rigs'] = mockRigs;
  //   await component['initMap']();
  //   expect(component.mapView).toBeDefined();
  // });

  // it('should draw rig icons on the map', async () => {
  //   component['rigs'] = mockRigs;
  //   const mockLayer = {
  //     removeAll: jest.fn(),
  //     add: jest.fn(),
  //   };

  //   await component['drawRigIcons'](mockLayer as any);

  //   expect(mockLayer.removeAll).toHaveBeenCalled();
  //   expect(mockLayer.add).toHaveBeenCalledTimes(mockRigs.length);
  // });

  it('should handle screenshot functionality', async () => {
    const mockBase64 = 'test-base64';
    const getScreenshotSpy = jest
      .spyOn(component as any, 'getScreenshotBase64')
      .mockResolvedValue(mockBase64);
    const downloadSpy = jest.spyOn(component as any, 'downloadBase64');
    await component.saveMapImage();
    expect(getScreenshotSpy).toHaveBeenCalled();
    expect(downloadSpy).toHaveBeenCalledWith(mockBase64, 'water-wells-map.png');
  });

  it('should handle screenshot error gracefully', async () => {
    const errorMessage = 'Screenshot failed';
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    jest
      .spyOn(component as any, 'getScreenshotBase64')
      .mockRejectedValue(new Error(errorMessage));
    await component.saveMapImage();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error taking screenshot...',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('should clean up resources on destroy', () => {
    const mockDestroy$ = { next: jest.fn(), complete: jest.fn() } as any;
    const mockWatchHandle = { remove: jest.fn() };
    Object.defineProperty(component, 'destory$', {
      value: mockDestroy$,
      writable: false,
      configurable: true,
    });
    component['stationaryWatchHandle'] = mockWatchHandle as any;
    component.ngOnDestroy();
    expect(mockDestroy$.next).toHaveBeenCalled();
    expect(mockDestroy$.complete).toHaveBeenCalled();
    expect(mockWatchHandle.remove).toHaveBeenCalled();
  });

  it('should call buildWWellSignal with correct data', () => {
    const buildWWellSignalSpy = jest.spyOn(
      component as any,
      'buildWWellSignal'
    );
    component['rigs'] = mockRigs;
    (component as any).buildWWellSignal(mockRigs);
    expect(buildWWellSignalSpy).toHaveBeenCalledWith(mockRigs);
  });

  it('should call buildWellSignal and set wwells signal', () => {
    const testData = [
      { rigId: 'A1', lat: '10', lng: '20', location: 'Loc', label: 'Label' },
    ];
    component['buildWellSignal'](testData as any);
    expect(component.wwells().length).toBe(1);
    expect(component.wwells()[0].label).toBe('Label');
  });

  // it('should not initialize map if not browser platform', () => {
  //   const platformComponent = new ArcgisMapComponent(
  //     'server',
  //     mockMorningReportService
  //   );
  //   const fetchSpy = jest.spyOn(platformComponent as any, 'fetchMorningReport');
  //   platformComponent.ngOnInit();
  //   expect(fetchSpy).not.toHaveBeenCalled();
  // });

  it('should get layers by id', () => {
    const mockLayer = { id: 'test-layer' };
    component.mapView = {
      map: { layers: [mockLayer] },
    } as any;
    const result = (component as any).getlayersById('test-layer');
    expect(result).toBe(mockLayer);
  });

  it('should download base64 image', () => {
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const removeSpy = jest.spyOn(document.body, 'removeChild');
    (component as any).downloadBase64('abc', 'file.png');
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('should throw error if getScreenshotBase64 called without mapView', async () => {
    component.mapView = undefined;
    await expect((component as any).getScreenshotBase64()).rejects.toThrow(
      'Map view is not defined'
    );
  });
});

// We recommend installing an extension to run jest tests.
