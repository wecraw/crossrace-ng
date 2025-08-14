import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1755144269,
    buildDate: '2025-08-14T04:04:29.202Z',
    gitHash: '97e7214',
    gitBranch: 'force-name',
    displayVersion: '0.10.2.1755144269 (dev)'
  }
};
