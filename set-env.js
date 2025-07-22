// set-env.js

const fs = require("fs");
const path = require("path");

// Get the server URL from the environment variables.
// AWS Amplify sets these variables during the build process.
const serverUrl = process.env.SERVER_URL;

// The path to your environment.prod.ts file
const environmentFilePath = path.join(
  __dirname,
  "src/environments/environment.prod.ts",
);

console.log(`Starting environment configuration...`);
console.log(`Target file: ${environmentFilePath}`);

if (!serverUrl) {
  console.error("Error: SERVER_URL environment variable is not set.");
  // Exit with an error code to fail the build
  process.exit(1);
}

console.log(`Using Server URL: ${serverUrl}`);

// Read the file's content
fs.readFile(environmentFilePath, "utf8", (err, data) => {
  if (err) {
    console.error("Error reading environment file:", err);
    return process.exit(1);
  }

  // Replace the placeholder with the actual server URL
  const result = data.replace(/__SERVER_URL__/g, serverUrl);

  // Write the new content back to the file
  fs.writeFile(environmentFilePath, result, "utf8", (err) => {
    if (err) {
      console.error("Error writing to environment file:", err);
      return process.exit(1);
    }
    console.log(`Successfully configured ${environmentFilePath}`);
  });
});
