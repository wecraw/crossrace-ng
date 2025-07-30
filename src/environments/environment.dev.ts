import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753842240,
    buildDate: '2025-07-30T02:24:00.281Z',
    gitHash: 'df35bf8',
    gitBranch: 'dev',
    displayVersion: '0.9.0.1753842240 (dev)'
  }
};
