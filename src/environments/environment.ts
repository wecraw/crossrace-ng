import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.12.1',
    buildNumber: 1756940298,
    buildDate: '2025-09-03T22:58:18.608Z',
    gitHash: 'd2ecdbd',
    gitBranch: 'state-based-refactor',
    displayVersion: '0.12.1.1756940298 (dev)'
  }
};
