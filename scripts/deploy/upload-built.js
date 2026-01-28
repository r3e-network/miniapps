#!/usr/bin/env node
/**
 * Upload already-built miniapps to R2
 */

const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

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

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".webp": "image/webp",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

function getCacheControl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "public, max-age=0, must-revalidate";
  if ([".js", ".css", ".woff", ".woff2"].includes(ext)) return "public, max-age=31536000, immutable";
  if ([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"].includes(ext)) return "public, max-age=86400";
  return "public, max-age=3600";
}

function shouldUpload(filePath) {
  const basename = path.basename(filePath);
  return !basename.startsWith(".") && !basename.endsWith(".map");
}

async function uploadFile(localPath, remoteKey) {
  const fileContent = fs.createReadStream(localPath);
  const command = new PutObjectCommand({
    Bucket: CONFIG.r2.bucket,
    Key: remoteKey,
    Body: fileContent,
    ContentType: getContentType(remoteKey),
    CacheControl: getCacheControl(remoteKey),
  });
  await s3Client.send(command);
}

async function uploadDirectory(localDir, remotePrefix = "") {
  let uploadedCount = 0;
  let skippedCount = 0;
  const errors = [];

  const walkDirectory = (dir, prefix = "") => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(prefix, entry.name);
      const remoteKey = relativePath.replace(/\\/g, "/");

      if (entry.isDirectory()) {
        walkDirectory(fullPath, relativePath);
      } else if (entry.isFile()) {
        if (!shouldUpload(fullPath)) {
          skippedCount++;
          continue;
        }

        try {
          process.stdout.write(`\r📤 ${remoteKey.padEnd(60)} ${uploadedCount + 1}`);
          uploadFile(fullPath, remoteKey);
          uploadedCount++;
        } catch (error) {
          errors.push({ file: remoteKey, error: error.message });
        }
      }
    }
  };

  walkDirectory(localDir, remotePrefix);
  console.log();

  return { uploadedCount, skippedCount, errors };
}

async function upload() {
  console.log("📤 Uploading to Cloudflare R2");
  console.log(`   Environment: ${ENVIRONMENT}`);
  console.log(`   Bucket: ${CONFIG.r2.bucket}`);
  console.log("");

  // Upload miniapps
  const miniappsDir = path.join(PUBLIC_DIR, "miniapps");
  const miniappsResult = await uploadDirectory(miniappsDir, "miniapps/");

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

upload().catch((error) => {
  console.error("\n❌ Upload failed:", error.message);
  process.exit(1);
});
