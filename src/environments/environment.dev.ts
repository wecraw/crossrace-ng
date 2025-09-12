import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.12.1',
    buildNumber: 1757655434,
    buildDate: '2025-09-12T05:37:14.517Z',
    gitHash: '9ecba6e',
    gitBranch: 'state-based-refactor',
    displayVersion: '0.12.1.1757655434 (dev)'
  }
};
