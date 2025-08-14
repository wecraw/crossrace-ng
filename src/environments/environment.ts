import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1755142325,
    buildDate: '2025-08-14T03:32:05.331Z',
    gitHash: '90166ea',
    gitBranch: 'force-name',
    displayVersion: '0.10.2.1755142325 (dev)'
  }
};
