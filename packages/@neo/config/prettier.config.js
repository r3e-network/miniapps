/**
 * Shared Prettier configuration for all packages and apps.
 *
 * Usage in app/package:
 *   import config from "@neo/config/prettier";
 *   export default config;
 */
export default {
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",
  printWidth: 100,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: "always",
  endOfLine: "lf",
  vueIndentScriptAndStyle: false,
};
