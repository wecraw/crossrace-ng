import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753825961,
    buildDate: '2025-07-29T21:52:41.722Z',
    gitHash: 'e2e1479',
    gitBranch: 'post-game-refactor',
    displayVersion: '0.9.0.1753825961 (dev)'
  }
};
