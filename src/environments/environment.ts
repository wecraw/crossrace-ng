import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  serverUrl: 'http://localhost:8080',

  version: {
    number: '0.9.0',
    buildNumber: 1753847541,
    buildDate: '2025-07-30T03:52:21.108Z',
    gitHash: 'e19ad54',
    gitBranch: 'dev',
    displayVersion: '0.9.0.1753847541 (dev)'
  }
};
