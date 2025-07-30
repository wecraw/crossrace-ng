import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.0',
    buildNumber: 1753889963,
    buildDate: '2025-07-30T15:39:23.745Z',
    gitHash: '0556a1f',
    gitBranch: 'dev',
    displayVersion: '0.10.0.1753889963 (dev)'
  }
};
