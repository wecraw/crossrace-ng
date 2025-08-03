import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.1',
    buildNumber: 1754248026,
    buildDate: '2025-08-03T19:07:06.214Z',
    gitHash: '4f21b07',
    gitBranch: 'daily-fix',
    displayVersion: '0.10.1.1754248026 (dev)'
  }
};
