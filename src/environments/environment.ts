import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753681101,
    buildDate: '2025-07-28T05:38:21.746Z',
    gitHash: '85318a2',
    gitBranch: 'dev',
    displayVersion: '0.9.0.1753681101 (dev)'
  }
};
