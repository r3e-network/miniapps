/**
 * TypeScript and Vite config templates
 */

// Generate vite.config.ts
function genViteConfig(app) {
  return `import { createAppConfig } from "../../vite.shared";

export default createAppConfig(__dirname);
`;
}

// Generate tsconfig.json
function genTsConfig() {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        jsx: "preserve",
        resolveJsonModule: true,
        isolatedModules: true,
        esModuleInterop: true,
        lib: ["ESNext", "DOM"],
        skipLibCheck: true,
        noEmit: true,
        paths: {
          "@/*": ["./src/*"],
          "@shared/*": ["../../shared/*"],
        },
        types: ["@dcloudio/types"],
      },
      include: ["src/**/*.ts", "src/**/*.vue"],
      exclude: ["node_modules", "dist"],
    },
    null,
    2,
  );
}

module.exports = { genViteConfig, genTsConfig };
