import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753812323,
    buildDate: '2025-07-29T18:05:23.898Z',
    gitHash: '605f837',
    gitBranch: 'post-game-refactor',
    displayVersion: '0.9.0.1753812323 (dev)'
  }
};
