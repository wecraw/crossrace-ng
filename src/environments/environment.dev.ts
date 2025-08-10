import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1754789708,
    buildDate: '2025-08-10T01:35:08.508Z',
    gitHash: 'e213d79',
    gitBranch: 'not-enough-players-refactor',
    displayVersion: '0.10.2.1754789708 (dev)'
  }
};
