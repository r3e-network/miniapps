const fs = require("fs");
const path = require("path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

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

function createUploadFile({ s3Client, bucket }) {
  if (!s3Client || !bucket) {
    throw new Error("createUploadFile requires s3Client and bucket");
  }

  return async function uploadFile(localPath, remoteKey) {
    const fileContent = fs.createReadStream(localPath);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: remoteKey,
      Body: fileContent,
      ContentType: getContentType(remoteKey),
      CacheControl: getCacheControl(remoteKey),
    });
    await s3Client.send(command);
  };
}

async function uploadDirectory(localDir, remotePrefix = "", options = {}) {
  const uploadFn = options.uploadFile || null;
  const shouldUploadFn = options.shouldUpload || shouldUpload;
  const onProgress = options.onProgress || (() => {});

  if (!uploadFn) {
    throw new Error("uploadDirectory requires options.uploadFile");
  }

  let uploadedCount = 0;
  let skippedCount = 0;
  const errors = [];

  const walkDirectory = async (dir, prefix = "") => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(prefix, entry.name);
      const remoteKey = relativePath.replace(/\\/g, "/");

      if (entry.isDirectory()) {
        await walkDirectory(fullPath, relativePath);
      } else if (entry.isFile()) {
        if (!shouldUploadFn(fullPath)) {
          skippedCount++;
          continue;
        }

        try {
          onProgress(remoteKey, uploadedCount + 1);
          await uploadFn(fullPath, remoteKey);
          uploadedCount++;
        } catch (error) {
          errors.push({ file: remoteKey, error: error.message });
        }
      }
    }
  };

  await walkDirectory(localDir, remotePrefix);
  return { uploadedCount, skippedCount, errors };
}

module.exports = {
  createUploadFile,
  getCacheControl,
  getContentType,
  shouldUpload,
  uploadDirectory,
};
