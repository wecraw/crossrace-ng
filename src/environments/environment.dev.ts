import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.1',
    buildNumber: 1753902540,
    buildDate: '2025-07-30T19:09:00.646Z',
    gitHash: '62d1592',
    gitBranch: 'dev',
    displayVersion: '0.10.1.1753902540 (dev)'
  }
};
