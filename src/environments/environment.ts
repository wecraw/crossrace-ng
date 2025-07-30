import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.0',
    buildNumber: 1753850342,
    buildDate: '2025-07-30T04:39:02.988Z',
    gitHash: '219c139',
    gitBranch: 'dev',
    displayVersion: '0.10.0.1753850342 (dev)'
  }
};
