import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ArcgisMapComponent } from './aarcgis-map.component';
import { MatCardModule } from '@angular/material/card';
import { isPlatformBrowser } from '@angular/common';
//import { isPlatformBrowser } from '@angular/common';


// Mock ArcGIS modules
jest.mock('@arcgis/core/Graphic');
jest.mock('@arcgis/core/geometry/Point');
jest.mock('@arcgis/core/geometry/Polyline');
jest.mock('@arcgis/core/layers/GraphicsLayer');
jest.mock('@arcgis/core/symbols/SimpleLineSymbol');
jest.mock('@arcgis/core/symbols/TextSymbol');
jest.mock('@arcgis/core/symbols/SimpleFillSymbol');
jest.mock('@arcgis/core/Map');
jest.mock('@arcgis/core/MapView');

// Mock the platform ID
const PLATFORM_ID = 'browser';

// jest.mock('@angular/common', () => ({
//   ...jest.requireActual('@angular/common'),
//   isPlatformBrowser: jest.fn(() => true)
// }));

describe('ArcgisMapComponent', () => {
  let component: ArcgisMapComponent;
  let fixture: ComponentFixture<ArcgisMapComponent>;
  let httpTestingController: HttpTestingController;
  let mockMapView: any;
  let mockMap: any;
  let mockGraphicsLayer: any;

  const mockRigs = [
    { rigId: 'B1-001', lat: 34.0522, lng: -118.2437, location: 'Los Angeles', classification: 'Active', label: 'Rig B1-001' },
    { rigId: 'B2-001', lat: 40.7128, lng: -74.0060, location: 'New York', classification: 'Inactive', label: 'Rig B2-001' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ArcgisMapComponent,
        HttpClientTestingModule,
        MatCardModule
      ],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();
  
    fixture = TestBed.createComponent(ArcgisMapComponent);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);

    // Setup mock MapView and Map
    mockMapView = {
      when: jest.fn().mockImplementation((callback) => callback()),
      map: { add: jest.fn(), addMany: jest.fn() },
      width: 800,
      height: 600,
      toScreen: jest.fn().mockReturnValue({ x: 100, y: 100 }),
      toMap: jest.fn().mockReturnValue({ 
        longitude: -118.2437, 
        latitude: 34.0522,
        clone: jest.fn().mockReturnThis()
      }),
      takeScreenshot: jest.fn().mockResolvedValue({
        dataUrl: 'data:image/png;base64,test',
        width: 800,
        height: 600
      }),
      watch: jest.fn(),
      extent: { xmin: -180, ymin: -90, xmax: 180, ymax: 90 }
    };

    mockMap = {
      add: jest.fn(),
      addMany: jest.fn()
    };

    mockGraphicsLayer = {
      removeAll: jest.fn(),
      add: jest.fn(),
      addMany: jest.fn(),
      visible: true
    };

    // Mock the imports
    jest.mock('@arcgis/core/Map', () => {
      return jest.fn().mockImplementation(() => mockMap);
    });

    jest.mock('@arcgis/core/views/MapView', () => {
      return jest.fn().mockImplementation(() => mockMapView);
    });

    jest.mock('@arcgis/core/layers/GraphicsLayer', () => {
      return jest.fn().mockImplementation(() => mockGraphicsLayer);
    });

   // jest.spyOn(component as any, 'isPlatformBrowser').mockReturnValue(false);

  });

  afterEach(() => {
    httpTestingController.verify();
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize map and load rigs on init', () => {
    // Trigger ngOnInit
    fixture.detectChanges();

    // Expect HTTP request to be made
    const req = httpTestingController.expectOne('assets/rigs.json');
    expect(req.request.method).toEqual('GET');
    
    // Respond with mock data
    req.flush(mockRigs);

    // Check if map initialization was triggered
    expect(component.mapView).toBeDefined();
  });

  it('should initialize map and load rigs on init', fakeAsync(() => {
    // Force browser mode
   // (isPlatformBrowser as jest.Mock).mockReturnValue(true);
  
    // Trigger ngOnInit
    fixture.detectChanges();
    tick(200); // wait for async init
  
    // ✅ Use a predicate function instead of raw regex
    const req = httpTestingController.expectOne(
      (r) => r.url.endsWith('assets/rigs.json')
    );
  
    expect(req.request.method).toBe('GET');
  
    // Mock API response
    req.flush(mockRigs);
    tick();
  
    // Verify behavior
    expect(component.mapView).toBeDefined();
  }));
  
  // it('should handle error when loading rigs fails', () => {
  //   const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
  //   // Trigger ngOnInit
  //   fixture.detectChanges();
    
  //   // Simulate HTTP error
  //   const req = httpTestingController.expectOne('assets/rigs.json');
  //   req.flush('Error loading data', { status: 404, statusText: 'Not Found' });
    
  //   expect(component.errorMessage).toContain('Failed to load rig data');
  //   expect(consoleSpy).toHaveBeenCalled();
  //   consoleSpy.mockRestore();
  // });

  // it('should draw rig icons on the map', async () => {
  //   // Set up test data
  //   component.rigs = mockRigs;
    
  //   // Call the method
  //   await component.drawRigIcons(mockGraphicsLayer);
    
  //   // Verify graphics were added
  //   expect(mockGraphicsLayer.removeAll).toHaveBeenCalled();
  //   expect(mockGraphicsLayer.add).toHaveBeenCalledTimes(mockRigs.length);
  // });

  // it('should handle map screenshot functionality', async () => {
  //   // Mock the getScreenshotBase64 method
  //   const getScreenshotSpy = jest.spyOn(component as any, 'getScreenshotBase64')
  //     .mockResolvedValue('test-base64');
    
  //   // Mock the downloadBase64 method
  //   const downloadSpy = jest.spyOn(component as any, 'downloadBase64');
    
  //   // Call the method
  //   await component.saveMapImage();
    
  //   // Verify the methods were called
  //   expect(getScreenshotSpy).toHaveBeenCalled();
  //   expect(downloadSpy).toHaveBeenCalledWith('test-base64', 'water-wells-map.png');
  // });

  // it('should handle screenshot error gracefully', async () => {
  //   // Mock the getScreenshotBase64 to throw an error
  //   const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  //   jest.spyOn(component as any, 'getScreenshotBase64').mockRejectedValue(new Error('Screenshot failed'));
    
  //   // Call the method
  //   await component.saveMapImage();
    
  //   // Verify error was logged
  //   expect(consoleSpy).toHaveBeenCalledWith('Error taking screenshot...', expect(Error));
  //   consoleSpy.mockRestore();
  // });

  // it('should handle layout bubbles functionality', () => {
  //   // Set up test data
  //   component.rigs = mockRigs;
  //   component.mapView = mockMapView;
    
  //   // Mock the findNonOverlappingPosition function
  //   jest.mock('../utils/rig-placement.utils', () => ({
  //     findNonOverlappingPosition: jest.fn().mockReturnValue({ x: 100, y: 100 }),
  //     createLegendLayer: jest.fn().mockReturnValue({ visible: true })
  //   }));
    
  //   // Call the method
  //   component.layoutBubbles(mockGraphicsLayer);
    
  //   // Verify the graphics layer was updated
  //   expect(mockGraphicsLayer.removeAll).toHaveBeenCalled();
  //   expect(mockGraphicsLayer.addMany).toHaveBeenCalled();
  // });

  // it('should not initialize map when not in browser', () => {
  //   // Mock isPlatformBrowser to return false
  //   jest.spyOn(component as any, 'isPlatformBrowser').mockReturnValue(false);
    
  //   // Trigger ngOnInit
  //   fixture.detectChanges();
    
  //   // Verify no HTTP request was made
  //   httpTestingController.expectNone('assets/rigs.json');
  //   expect(component.mapView).toBeUndefined();
  // });
});