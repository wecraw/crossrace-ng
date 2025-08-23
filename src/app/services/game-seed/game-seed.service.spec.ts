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

  it('should return a number', () => {
    expect(typeof service.getDailySeed()).toBe('number');
  });
});
