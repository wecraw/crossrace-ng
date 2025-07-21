import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Environment } from '../../../environments/environment.interface';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly env: Environment = environment;

  get isProduction(): boolean {
    return this.env.production;
  }

  get serverUrl(): string {
    return this.env.serverUrl;
  }

  get version() {
    return this.env.version;
  }

  get displayVersion(): string {
    return this.env.version?.displayVersion || '<version info not found>';
  }

  // You can add computed properties or additional configuration logic here
  get isDevelopment(): boolean {
    return !this.env.production;
  }

  // Helper method for debug features
  get enableDebugFeatures(): boolean {
    return !this.env.production;
  }
}
