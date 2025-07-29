import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753813208,
    buildDate: '2025-07-29T18:20:08.632Z',
    gitHash: '140f488',
    gitBranch: 'post-game-refactor',
    displayVersion: '0.9.0.1753813208 (dev)'
  }
};
