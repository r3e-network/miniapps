#!/usr/bin/env node
/**
 * Upload already-built miniapps to R2
 */

const fs = require("fs");
const path = require("path");
const { S3Client } = require("@aws-sdk/client-s3");
const { createUploadFile, uploadDirectory } = require("./upload-built-lib");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const ENVIRONMENT = process.argv[2] || "production";
const PUBLIC_DIR = path.join(__dirname, "../../public");
const CONFIG = loadConfig();

const s3Client = new S3Client({
  region: process.env.CLOUDFLARE_R2_REGION || "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

function loadConfig() {
  const configPath = path.join(__dirname, `../../config/environments/${ENVIRONMENT}.json`);
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

async function upload() {
  console.log("📤 Uploading to Cloudflare R2");
  console.log(`   Environment: ${ENVIRONMENT}`);
  console.log(`   Bucket: ${CONFIG.r2.bucket}`);
  console.log("");

  const uploadFile = createUploadFile({ s3Client, bucket: CONFIG.r2.bucket });

  // Upload miniapps
  const miniappsDir = path.join(PUBLIC_DIR, "miniapps");
  const miniappsResult = await uploadDirectory(miniappsDir, "miniapps/", {
    uploadFile,
    onProgress: (remoteKey, index) => {
      process.stdout.write(`\r📤 ${remoteKey.padEnd(60)} ${index}`);
    },
  });

  console.log(`\n✅ Uploaded ${miniappsResult.uploadedCount} files`);
  if (miniappsResult.skippedCount > 0) {
    console.log(`⊘ Skipped ${miniappsResult.skippedCount} files`);
  }
  if (miniappsResult.errors.length > 0) {
    console.log(`⚠️  ${miniappsResult.errors.length} errors`);
  }

  // Upload registry
  const registryPath = path.join(PUBLIC_DIR, "data", "miniapps.json");
  if (fs.existsSync(registryPath)) {
    await uploadFile(registryPath, "data/miniapps.json");
    console.log("✅ Registry uploaded");
  }

  console.log("\n" + "=".repeat(60));
  console.log(`🎉 Deployment complete!`);
  console.log(`   URL: ${CONFIG.baseURL}/miniapps/[app-name]/index.html`);
  console.log("=".repeat(60));
}

if (require.main === module) {
  upload().catch((error) => {
    console.error("\n❌ Upload failed:", error.message);
    process.exit(1);
  });
}
