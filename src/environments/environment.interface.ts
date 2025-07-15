export interface Environment {
  production: boolean;
  serverUrl: string;
  version?: {
    number: string;
    buildNumber: number;
    buildDate: string;
    gitHash: string;
    gitBranch: string;
    displayVersion: string;
  };
}
