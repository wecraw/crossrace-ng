import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.12.1',
    buildNumber: 1757621731,
    buildDate: '2025-09-11T20:15:31.999Z',
    gitHash: '7380aec',
    gitBranch: 'state-based-refactor',
    displayVersion: '0.12.1.1757621731 (dev)'
  }
};
