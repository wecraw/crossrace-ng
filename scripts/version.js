const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Read package.json for version
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

// Get git information (if available)
let gitHash = "unknown";
let gitBranch = "unknown";
try {
  gitHash = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  gitBranch = execSync("git rev-parse --abbrev-ref HEAD", {
    encoding: "utf8",
  }).trim();
} catch (e) {
  console.log("Git not available, using fallback values");
}

// Generate build number (you could also read from a file and increment)
const buildNumber = Math.floor(Date.now() / 1000); // Unix timestamp as build number
const buildDate = new Date().toISOString();

// Create version object
const versionInfo = {
  version: packageJson.version,
  buildNumber: buildNumber,
  buildDate: buildDate,
  gitHash: gitHash,
  gitBranch: gitBranch,
  production: process.argv.includes("--prod"),
};

// Update environment files
const environments = [
  { file: "src/environments/environment.ts", production: false },
  { file: "src/environments/environment.prod.ts", production: true },
  { file: "src/environments/environment.dev.ts", production: false },
];

environments.forEach((env) => {
  const envPath = path.join(__dirname, "..", env.file);
  let envContent = fs.readFileSync(envPath, "utf8");

  // More robust parsing - remove existing version if it exists
  const hasExistingVersion = envContent.includes("version:");

  // Extract base properties (production and serverUrl)
  const productionMatch = envContent.match(/production:\s*(true|false)/);
  const serverUrlMatch = envContent.match(/serverUrl:\s*['"`]([^'"`]+)['"`]/);

  const production = productionMatch
    ? productionMatch[1]
    : env.production
      ? "true"
      : "false";
  const serverUrl = serverUrlMatch
    ? serverUrlMatch[1]
    : "http://localhost:8080";

  // Create new environment with version info
  const newEnvContent = `import { Environment } from './environment.interface';

export const environment: Environment = {
  production: ${production},
  serverUrl: '${serverUrl}',

  version: {
    number: '${versionInfo.version}',
    buildNumber: ${versionInfo.buildNumber},
    buildDate: '${versionInfo.buildDate}',
    gitHash: '${versionInfo.gitHash}',
    gitBranch: '${versionInfo.gitBranch}',
    displayVersion: '${versionInfo.version}.${versionInfo.buildNumber}${env.production ? "" : " (dev)"}'
  }
};
`;

  fs.writeFileSync(envPath, newEnvContent);
  console.log(`Updated ${env.file} with version info`);
});

console.log("Version info generated:", versionInfo);
