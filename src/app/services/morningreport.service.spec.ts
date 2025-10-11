import { TestBed } from '@angular/core/testing';

import { MorningreportService } from './morningreport.service';

describe('MorningreportService', () => {
  let service: MorningreportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MorningreportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
