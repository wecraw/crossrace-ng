import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.1',
    buildNumber: 1754111868,
    buildDate: '2025-08-02T05:17:48.018Z',
    gitHash: 'ad81f1d',
    gitBranch: 'game-cleanup',
    displayVersion: '0.10.1.1754111868 (dev)'
  }
};
