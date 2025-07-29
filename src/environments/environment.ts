import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753769023,
    buildDate: '2025-07-29T06:03:43.324Z',
    gitHash: '966baf1',
    gitBranch: 'post-game-refactor',
    displayVersion: '0.9.0.1753769023 (dev)'
  }
};
