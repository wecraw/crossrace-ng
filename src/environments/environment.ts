import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753666180,
    buildDate: '2025-07-28T01:29:40.295Z',
    gitHash: '1839a44',
    gitBranch: 'delayed-reconnect-alert',
    displayVersion: '0.9.0.1753666180 (dev)'
  }
};
