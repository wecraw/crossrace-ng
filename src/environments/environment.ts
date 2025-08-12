import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.10.2',
    buildNumber: 1754974001,
    buildDate: '2025-08-12T04:46:41.524Z',
    gitHash: '1c2c0e3',
    gitBranch: 'main-menu-transition',
    displayVersion: '0.10.2.1754974001 (dev)'
  }
};
