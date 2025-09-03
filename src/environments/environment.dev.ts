import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.12.1',
    buildNumber: 1756938265,
    buildDate: '2025-09-03T22:24:25.858Z',
    gitHash: '37d0115',
    gitBranch: 'state-based-refactor',
    displayVersion: '0.12.1.1756938265 (dev)'
  }
};
