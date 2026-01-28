#!/usr/bin/env node
/**
 * Verify Environment Configuration
 *
 * This script checks that all required environment variables are set
 * and validates the configuration.
 *
 * Usage:
 *   node scripts/verify-env.js
 */

const fs = require("fs");
const path = require("path");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

// Required environment variables
const requiredVars = [
  "R2_ENDPOINT",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_STAGING",
  "R2_BUCKET_PRODUCTION",
  "CF_API_TOKEN",
  "CF_ACCOUNT_ID",
];

// Optional but recommended variables
const optionalVars = [
  "CF_PAGES_PROJECT_STAGING",
  "CF_PAGES_PROJECT_PRODUCTION",
  "NEXT_PUBLIC_CDN_URL",
  "NEXT_PUBLIC_RPC_URL",
  "NEXT_PUBLIC_NETWORK",
];

/**
 * Print a colored message
 */
function print(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Print section header
 */
function printHeader(title) {
  console.log("");
  print(colors.bright + colors.blue, `\u2500\u2500\u2500 ${title} \u2500\u2500\u2500`);
}

/**
 * Check if a value is set
 */
function isSet(value) {
  return value && value !== "" && value !== "your_" && !value.includes("your-");
}

/**
 * Validate R2 endpoint format
 */
function validateR2Endpoint(endpoint) {
  if (!endpoint) return false;
  return endpoint.includes(".r2.cloudflarestorage.com");
}

/**
 * Validate account ID format
 */
function validateAccountId(accountId) {
  if (!accountId) return false;
  return accountId.length === 32 && /^[a-f0-9]+$/i.test(accountId);
}

/**
 * Validate API token format
 */
function validateApiToken(token) {
  if (!token) return false;
  return token.length > 20;
}

/**
 * Load and check .env file
 */
function checkEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    print(colors.yellow, `  \u2753 File not found: ${path.basename(filePath)}`);
    return null;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const envVars = {};

  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").trim();
      if (key && value) {
        envVars[key] = value;
      }
    }
  });

  return envVars;
}

/**
 * Verify environment configuration
 */
function verifyConfiguration() {
  print(colors.bright + colors.blue, "Environment Configuration Verification");
  print(colors.blue, "=".repeat(50));

  let hasErrors = false;
  let hasWarnings = false;

  // Check .env file
  printHeader("Checking .env file");
  const envVars = checkEnvFile(path.join(__dirname, "../.env"));

  if (!envVars) {
    print(colors.red, "  \u2717 .env file not found");
    print(colors.yellow, "  \u2192 Copy .env.example to .env and configure it");
    hasErrors = true;
  } else {
    print(colors.green, "  \u2713 .env file found");

    // Check required variables
    printHeader("Required Environment Variables");
    requiredVars.forEach((varName) => {
      const value = envVars[varName];
      const displayName = varName.padEnd(30);

      if (!isSet(value)) {
        print(colors.red, `  \u2717 ${displayName} NOT SET or using placeholder`);
        hasErrors = true;
      } else {
        // Additional validation
        let isValid = true;
        let note = "";

        if (varName === "R2_ENDPOINT" && !validateR2Endpoint(value)) {
          isValid = false;
          note = " (invalid format)";
        } else if (varName === "CF_ACCOUNT_ID" && !validateAccountId(value)) {
          isValid = false;
          note = " (invalid format)";
        } else if (varName === "CF_API_TOKEN" && !validateApiToken(value)) {
          isValid = false;
          note = " (invalid format)";
        }

        if (isValid) {
          print(colors.green, `  \u2713 ${displayName} SET`);
        } else {
          print(colors.red, `  \u2717 ${displayName} SET${note}`);
          hasErrors = true;
        }
      }
    });

    // Check optional variables
    printHeader("Optional Environment Variables");
    optionalVars.forEach((varName) => {
      const value = envVars[varName];
      const displayName = varName.padEnd(30);

      if (!isSet(value)) {
        print(colors.yellow, `  \u2753 ${displayName} NOT SET (optional)`);
        hasWarnings = true;
      } else {
        print(colors.green, `  \u2713 ${displayName} SET`);
      }
    });
  }

  // Check .env.local file
  printHeader("Checking .env.local file");
  const localEnvVars = checkEnvFile(path.join(__dirname, "../.env.local"));

  if (!localEnvVars) {
    print(colors.yellow, "  \u2753 .env.local not found (recommended for local development)");
    hasWarnings = true;
  } else {
    print(colors.green, "  \u2713 .env.local found");

    // Check for local-specific variables
    const localVars = ["DEV_BASE_URL", "DEV_PUBLIC_PATH", "BUILD_SOURCEMAP"];
    localVars.forEach((varName) => {
      if (localEnvVars[varName]) {
        print(colors.green, `  \u2713 ${varName.padEnd(30)} SET`);
      }
    });
  }

  // Check .gitignore
  printHeader("Checking .gitignore");
  const gitignorePath = path.join(__dirname, "../.gitignore");
  const gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf-8") : "";

  // Check for .env or .env.* pattern
  const envIgnored = gitignore.split("\n").some((line) => {
    const trimmed = line.trim();
    return trimmed === ".env" || trimmed === ".env.*" || trimmed === ".env.local";
  });

  if (envIgnored) {
    print(colors.green, "  \u2713 .env files are in .gitignore");
  } else {
    print(colors.red, "  \u2717 .env files are NOT in .gitignore");
    print(colors.yellow, "  \u2192 Add .env and .env.local to .gitignore");
    hasErrors = true;
  }

  // Check environment config files
  printHeader("Checking Environment Config Files");
  const environmentsDir = path.join(__dirname, "../config/environments");

  if (!fs.existsSync(environmentsDir)) {
    print(colors.red, "  \u2717 config/environments directory not found");
    hasErrors = true;
  } else {
    const envFiles = ["development.json", "staging.json", "production.json"];
    envFiles.forEach((file) => {
      const filePath = path.join(environmentsDir, file);
      if (fs.existsSync(filePath)) {
        print(colors.green, `  \u2713 ${file}`);
      } else {
        print(colors.red, `  \u2717 ${file} not found`);
        hasErrors = true;
      }
    });
  }

  // Summary
  printHeader("Summary");
  if (hasErrors) {
    print(colors.red, "  \u2717 Errors found - please fix the issues above");
    print(colors.yellow, "  \u2192 See docs/ENVIRONMENT_SETUP.md for help");
    process.exit(1);
  } else if (hasWarnings) {
    print(colors.yellow, "  \u2753 Warnings - consider fixing the issues above");
    print(colors.green, "  \u2713 Configuration is usable but can be improved");
  } else {
    print(colors.green, "  \u2713 All checks passed! Configuration is valid.");
  }

  // Print next steps
  printHeader("Next Steps");
  if (hasErrors || hasWarnings) {
    print(colors.blue, "  1. Fix the issues listed above");
    print(colors.blue, "  2. Run this script again to verify");
    print(colors.blue, "  3. See docs/ENVIRONMENT_SETUP.md for detailed instructions");
  } else {
    print(colors.blue, "  1. Build all apps: pnpm build:all");
    print(colors.blue, "  2. Deploy to staging: pnpm deploy:staging");
    print(colors.blue, "  3. Deploy to production: pnpm deploy:prod");
    print(colors.blue, "  4. See DEPLOYMENT_WORKFLOW.md for more information");
  }

  console.log("");
}

// Run verification
if (require.main === module) {
  verifyConfiguration();
}

module.exports = { verifyConfiguration };
