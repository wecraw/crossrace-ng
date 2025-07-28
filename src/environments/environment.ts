import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753673915,
    buildDate: '2025-07-28T03:38:35.631Z',
    gitHash: 'e74d1f5',
    gitBranch: 'delayed-reconnect-alert',
    displayVersion: '0.9.0.1753673915 (dev)'
  }
};
