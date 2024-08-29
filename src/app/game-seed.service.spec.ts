import { TestBed } from '@angular/core/testing';

import { GameSeedService } from './game-seed.service';

describe('GameSeedService', () => {
  let service: GameSeedService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameSeedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return 0 for the epoch date', () => {
    const epochDate = new Date('2024-08-20T00:00:00-04:00');
    expect(service.testDailySeed(epochDate)).toBe(0);
  });

  it('should return the same seed for different times on the same day', () => {
    const date1 = new Date('2024-08-21T00:00:00-04:00');
    const date2 = new Date('2024-08-21T23:59:59-04:00');
    expect(service.testDailySeed(date1)).toBe(service.testDailySeed(date2));
  });

  it('should handle DST changes correctly', () => {
    const beforeDST = new Date('2024-03-09T23:59:59-05:00');
    const afterDST = new Date('2024-03-10T00:00:00-04:00');
    expect(
      service.testDailySeed(afterDST) - service.testDailySeed(beforeDST)
    ).toBe(1);
  });
});
