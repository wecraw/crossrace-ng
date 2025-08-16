import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1755372891,
    buildDate: '2025-08-16T19:34:51.349Z',
    gitHash: 'a25b543',
    gitBranch: 'timer-sync-bug',
    displayVersion: '0.10.2.1755372891 (dev)'
  }
};
