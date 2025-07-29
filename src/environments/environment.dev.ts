import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753827108,
    buildDate: '2025-07-29T22:11:48.801Z',
    gitHash: '915dc53',
    gitBranch: 'post-game-refactor',
    displayVersion: '0.9.0.1753827108 (dev)'
  }
};
