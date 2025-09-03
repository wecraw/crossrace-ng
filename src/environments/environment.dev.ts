import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.12.1',
    buildNumber: 1756942781,
    buildDate: '2025-09-03T23:39:41.317Z',
    gitHash: 'f8c77b3',
    gitBranch: 'state-based-refactor',
    displayVersion: '0.12.1.1756942781 (dev)'
  }
};
