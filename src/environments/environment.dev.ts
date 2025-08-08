import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1754638552,
    buildDate: '2025-08-08T07:35:52.810Z',
    gitHash: '7728a3f',
    gitBranch: 'ready-up-refactor',
    displayVersion: '0.10.2.1754638552 (dev)'
  }
};
