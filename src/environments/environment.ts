import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1754248931,
    buildDate: '2025-08-03T19:22:11.464Z',
    gitHash: '9356f2f',
    gitBranch: 'ready-up-refactor',
    displayVersion: '0.10.2.1754248931 (dev)'
  }
};
