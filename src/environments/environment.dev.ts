import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1754782547,
    buildDate: '2025-08-09T23:35:47.071Z',
    gitHash: '27b1f88',
    gitBranch: 'dev',
    displayVersion: '0.10.2.1754782547 (dev)'
  }
};
