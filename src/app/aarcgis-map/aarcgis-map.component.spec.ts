import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AarcgisMapComponent } from './aarcgis-map.component';

describe('AarcgisMapComponent', () => {
  let component: AarcgisMapComponent;
  let fixture: ComponentFixture<AarcgisMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AarcgisMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AarcgisMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
