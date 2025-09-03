import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.12.0',
    buildNumber: 1756858803,
    buildDate: '2025-09-03T00:20:03.224Z',
    gitHash: 'ca0d375',
    gitBranch: 'dev',
    displayVersion: '0.12.0.1756858803 (dev)'
  }
};
