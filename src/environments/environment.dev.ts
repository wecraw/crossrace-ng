import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1754777379,
    buildDate: '2025-08-09T22:09:39.319Z',
    gitHash: '1d845e7',
    gitBranch: 'loading-service-refactor',
    displayVersion: '0.10.2.1754777379 (dev)'
  }
};
