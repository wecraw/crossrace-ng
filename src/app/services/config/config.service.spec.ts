import { TestBed } from '@angular/core/testing';
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should provide server URL', () => {
    expect(service.serverUrl).toBeDefined();
    expect(typeof service.serverUrl).toBe('string');
  });

  it('should provide production status', () => {
    expect(typeof service.isProduction).toBe('boolean');
  });

  it('should provide development status opposite to production', () => {
    expect(service.isDevelopment).toBe(!service.isProduction);
  });

  it('should provide version information', () => {
    expect(service.displayVersion).toBeDefined();
    expect(typeof service.displayVersion).toBe('string');
  });

  it('should enable debug features in non-production', () => {
    expect(service.enableDebugFeatures).toBe(service.isDevelopment);
  });
});
