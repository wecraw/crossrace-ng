import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1754784941,
    buildDate: '2025-08-10T00:15:41.345Z',
    gitHash: '522fc2d',
    gitBranch: 'not-enough-players-refactor',
    displayVersion: '0.10.2.1754784941 (dev)'
  }
};
