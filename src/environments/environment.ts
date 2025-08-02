import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.1',
    buildNumber: 1754114703,
    buildDate: '2025-08-02T06:05:03.318Z',
    gitHash: '9203d4e',
    gitBranch: 'game-cleanup',
    displayVersion: '0.10.1.1754114703 (dev)'
  }
};
