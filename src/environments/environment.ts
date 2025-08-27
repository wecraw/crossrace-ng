import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.11.0',
    buildNumber: 1756311030,
    buildDate: '2025-08-27T16:10:30.875Z',
    gitHash: 'fd68879',
    gitBranch: 'dev',
    displayVersion: '0.11.0.1756311030 (dev)'
  }
};
