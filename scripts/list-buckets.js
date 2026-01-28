#!/usr/bin/env node
/**
 * List R2 buckets
 */

const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

async function listBuckets() {
  try {
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);

    console.log("📦 Available R2 Buckets:");
    console.log("");

    if (response.Buckets && response.Buckets.length > 0) {
      for (const bucket of response.Buckets) {
        console.log(`  - ${bucket.Name}`);
        if (bucket.CreationDate) {
          console.log(`    Created: ${bucket.CreationDate.toISOString()}`);
        }
      }
    } else {
      console.log("  No buckets found.");
    }

    console.log("");
    console.log("Total buckets:", response.Buckets?.length || 0);
  } catch (error) {
    console.error("❌ Error listing buckets:", error.message);
    if (error.Code) {
      console.error("   Code:", error.Code);
    }
  }
}

listBuckets();
