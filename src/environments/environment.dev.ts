import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753817585,
    buildDate: '2025-07-29T19:33:05.954Z',
    gitHash: 'cd14caa',
    gitBranch: 'post-game-refactor',
    displayVersion: '0.9.0.1753817585 (dev)'
  }
};
