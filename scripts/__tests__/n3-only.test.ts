import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const ALLOWED_CHAINS = new Set(["neo-n3-mainnet", "neo-n3-testnet"]);
const FORBIDDEN_ENDPOINT = "https://neo.coz.io/mainnet";

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".vue", ".py", ".sh", ".md"]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "sdk",
  ".worktrees",
  "dist",
  "build",
  "coverage",
  "shims",
  "plans",
]);
const SELF_SUFFIX = path.join("scripts", "__tests__", "n3-only.test.ts");

function walkFiles(rootDir: string, predicate: (filePath: string) => boolean): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      results.push(...walkFiles(fullPath, predicate));
      continue;
    }
    if (entry.isFile() && predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function collectManifestPaths(): string[] {
  const roots = [
    path.join(REPO_ROOT, "apps"),
    path.join(REPO_ROOT, "public", "miniapps"),
  ];
  const manifests: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    manifests.push(
      ...walkFiles(root, (filePath) =>
        filePath.endsWith("neo-manifest.json") || filePath.endsWith("chain-manifest.json")
      )
    );
  }
  return manifests;
}

function parseJson(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

describe("Neo N3-only repo checks", () => {
  it("ensures manifests only reference N3 networks and endpoints", () => {
    const manifests = collectManifestPaths();
    expect(manifests.length).toBeGreaterThan(0);

    const errors: string[] = [];
    for (const manifestPath of manifests) {
      const data = parseJson(manifestPath) as {
        contracts?: Record<string, unknown>;
        supported_networks?: string[];
        supported_chains?: string[];
        default_network?: string;
        stateSource?: { endpoints?: string[] };
      };

      if (data.contracts) {
        for (const chainId of Object.keys(data.contracts)) {
          if (!ALLOWED_CHAINS.has(chainId)) {
            errors.push(`${manifestPath}: contracts includes ${chainId}`);
          }
        }
      }

      if (Array.isArray(data.supported_networks)) {
        for (const chainId of data.supported_networks) {
          if (!ALLOWED_CHAINS.has(chainId)) {
            errors.push(`${manifestPath}: supported_networks includes ${chainId}`);
          }
        }
      }

      if (Array.isArray(data.supported_chains)) {
        for (const chainId of data.supported_chains) {
          if (!ALLOWED_CHAINS.has(chainId)) {
            errors.push(`${manifestPath}: supported_chains includes ${chainId}`);
          }
        }
      }

      if (data.default_network && !ALLOWED_CHAINS.has(data.default_network)) {
        errors.push(`${manifestPath}: default_network is ${data.default_network}`);
      }

      if (data.stateSource?.endpoints?.some((endpoint) => endpoint.includes("neoxrpc1.blackholelabs.io"))) {
        errors.push(`${manifestPath}: stateSource has NeoX endpoint`);
      }
    }

    expect(errors, errors.join("\n")).toEqual([]);
  });

  it("removes EVM/Ethereum mentions from code and docs", () => {
    const files = walkFiles(REPO_ROOT, (filePath) => {
      if (filePath.endsWith(SELF_SUFFIX)) return false;
      const ext = path.extname(filePath);
      return CODE_EXTENSIONS.has(ext);
    });

    const forbidden = [
      { label: "evm", pattern: /\bevm\b/i },
      { label: "ethereum", pattern: /\bethereum\b/i },
      { label: "neoxrpc1.blackholelabs.io", pattern: /neoxrpc1\.blackholelabs\.io/i },
    ];

    const errors: string[] = [];
    for (const filePath of files) {
      const contents = fs.readFileSync(filePath, "utf-8");
      for (const { label, pattern } of forbidden) {
        if (pattern.test(contents)) {
          errors.push(`${filePath}: contains ${label}`);
        }
      }
    }

    expect(errors, errors.join("\n")).toEqual([]);
  });
});
