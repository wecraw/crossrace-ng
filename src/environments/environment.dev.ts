import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1755230725,
    buildDate: '2025-08-15T04:05:25.330Z',
    gitHash: '1228f45',
    gitBranch: 'avatars',
    displayVersion: '0.10.2.1755230725 (dev)'
  }
};
