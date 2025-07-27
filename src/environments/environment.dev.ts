import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753573555,
    buildDate: '2025-07-26T23:45:55.541Z',
    gitHash: '8337926',
    gitBranch: 'reconnection-timeout',
    displayVersion: '0.9.0.1753573555 (dev)'
  }
};
