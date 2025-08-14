import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1755143311,
    buildDate: '2025-08-14T03:48:31.238Z',
    gitHash: '08a8f2a',
    gitBranch: 'force-name',
    displayVersion: '0.10.2.1755143311 (dev)'
  }
};
