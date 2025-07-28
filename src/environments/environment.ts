import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753677241,
    buildDate: '2025-07-28T04:34:01.024Z',
    gitHash: 'b76ddaa',
    gitBranch: 'start-game-feedback',
    displayVersion: '0.9.0.1753677241 (dev)'
  }
};
