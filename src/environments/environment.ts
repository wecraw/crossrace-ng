import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753342744,
    buildDate: '2025-07-24T07:39:04.677Z',
    gitHash: '376788f',
    gitBranch: 'dev',
    displayVersion: '0.9.0.1753342744 (dev)'
  }
};
