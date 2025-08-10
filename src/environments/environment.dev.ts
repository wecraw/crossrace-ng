import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1754783672,
    buildDate: '2025-08-09T23:54:32.394Z',
    gitHash: 'b381bc3',
    gitBranch: 'not-enough-players-refactor',
    displayVersion: '0.10.2.1754783672 (dev)'
  }
};
