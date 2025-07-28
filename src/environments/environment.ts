import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753655581,
    buildDate: '2025-07-27T22:33:01.481Z',
    gitHash: '5c9322c',
    gitBranch: 'delayed-reconnect-alert',
    displayVersion: '0.9.0.1753655581 (dev)'
  }
};
