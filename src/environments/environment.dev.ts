import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.12.1',
    buildNumber: 1756943039,
    buildDate: '2025-09-03T23:43:59.461Z',
    gitHash: '341d280',
    gitBranch: 'state-based-refactor',
    displayVersion: '0.12.1.1756943039 (dev)'
  }
};
