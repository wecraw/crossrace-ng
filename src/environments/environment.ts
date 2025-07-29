import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753824900,
    buildDate: '2025-07-29T21:35:00.469Z',
    gitHash: '0ba84a8',
    gitBranch: 'post-game-refactor',
    displayVersion: '0.9.0.1753824900 (dev)'
  }
};
