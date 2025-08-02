import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.1',
    buildNumber: 1754118665,
    buildDate: '2025-08-02T07:11:05.578Z',
    gitHash: '1eb6fda',
    gitBranch: 'game-cleanup',
    displayVersion: '0.10.1.1754118665 (dev)'
  }
};
