import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1754789861,
    buildDate: '2025-08-10T01:37:41.173Z',
    gitHash: '9bb2bf0',
    gitBranch: 'not-enough-players-refactor',
    displayVersion: '0.10.2.1754789861 (dev)'
  }
};
