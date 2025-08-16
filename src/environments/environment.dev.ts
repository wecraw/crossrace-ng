import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1755374090,
    buildDate: '2025-08-16T19:54:50.519Z',
    gitHash: 'a99c088',
    gitBranch: 'timer-sync-bug',
    displayVersion: '0.10.2.1755374090 (dev)'
  }
};
