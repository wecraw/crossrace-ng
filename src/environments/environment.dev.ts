import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1754775105,
    buildDate: '2025-08-09T21:31:45.497Z',
    gitHash: '65e8197',
    gitBranch: 'loading-service-refactor',
    displayVersion: '0.10.2.1754775105 (dev)'
  }
};
