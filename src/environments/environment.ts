import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1755227212,
    buildDate: '2025-08-15T03:06:52.052Z',
    gitHash: 'fe320f0',
    gitBranch: 'avatars',
    displayVersion: '0.10.2.1755227212 (dev)'
  }
};
