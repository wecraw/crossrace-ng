import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753820432,
    buildDate: '2025-07-29T20:20:32.746Z',
    gitHash: '4efe11d',
    gitBranch: 'post-game-refactor',
    displayVersion: '0.9.0.1753820432 (dev)'
  }
};
