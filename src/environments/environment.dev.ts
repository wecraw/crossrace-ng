import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1754248653,
    buildDate: '2025-08-03T19:17:33.810Z',
    gitHash: '27ea1b4',
    gitBranch: 'dev',
    displayVersion: '0.10.2.1754248653 (dev)'
  }
};
