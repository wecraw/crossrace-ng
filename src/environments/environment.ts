import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753821429,
    buildDate: '2025-07-29T20:37:09.119Z',
    gitHash: '11d7a59',
    gitBranch: 'post-game-refactor',
    displayVersion: '0.9.0.1753821429 (dev)'
  }
};
