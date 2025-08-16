import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1755374861,
    buildDate: '2025-08-16T20:07:41.117Z',
    gitHash: '018ab8e',
    gitBranch: 'dev',
    displayVersion: '0.10.2.1755374861 (dev)'
  }
};
