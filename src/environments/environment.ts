import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1755373412,
    buildDate: '2025-08-16T19:43:32.474Z',
    gitHash: 'dc2629c',
    gitBranch: 'timer-sync-bug',
    displayVersion: '0.10.2.1755373412 (dev)'
  }
};
