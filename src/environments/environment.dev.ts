import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.1',
    buildNumber: 1754029809,
    buildDate: '2025-08-01T06:30:09.983Z',
    gitHash: '3095a6b',
    gitBranch: 'game-cleanup',
    displayVersion: '0.10.1.1754029809 (dev)'
  }
};
