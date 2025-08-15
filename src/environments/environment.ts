import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1755295852,
    buildDate: '2025-08-15T22:10:52.803Z',
    gitHash: 'cf5f992',
    gitBranch: 'dev',
    displayVersion: '0.10.2.1755295852 (dev)'
  }
};
