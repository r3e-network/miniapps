/**
 * ESLint Rules for Miniapp Framework
 *
 * This configuration enforces framework standards and prevents code duplication.
 *
 * To use in a miniapp, add to .eslintrc.js:
 * ```js
 * module.exports = {
 *   extends: ["./.eslintrc.framework.js"],
 *   // ... app-specific rules
 * };
 * ```
 */

module.exports = {
  plugins: ["no-restricted-syntax"],

  rules: {
    // ============================================
    // Chain Validation Enforcement
    // ============================================

    // Disallow manual chain validation in template
    "no-restricted-syntax": [
      "error",
      {
        selector:
          'VElement[matches=/^view$/] > VExpressionContainer[expression.object.name="chainType"][expression.property.name="==="][expression.value.value="evm"]',
        message:
          "Use ChainWarning component instead of manual chain validation. " +
          "Import from @shared/components and use: <ChainWarning :title=\"t('wrongChain')\" :message=\"t('wrongChainMessage')\" :button-text=\"t('switchToNeo')\" />",
      },
    ],

    // Disallow manual switchToAppChain calls in template
    "no-restricted-syntax": [
      "error",
      {
        selector:
          'VElement[matches=/^view$/] > VExpressionContainer[expression.type="ArrowFunctionExpression"][expression.body.callee.name="switchToAppChain"]',
        message:
          "Chain switching is handled by ChainWarning component. Remove manual switchToAppChain calls from template.",
      },
    ],

    // ============================================
    // Import Enforcement
    // ============================================

    // Enforce using ChainWarning from shared components
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["**/chain"],
            importNames: ["requireNeoChain"],
            message:
              "Use ChainWarning component or useChainValidation composable from @shared instead. " +
              "For programmatic checks, import from @shared/composables/useChainValidation.",
          },
        ],
      },
    ],

    // ============================================
    // TypeScript Best Practices
    // ============================================

    // Disallow `as any` assertions for wallet
    "@typescript-eslint/no-explicit-any": [
      "error",
      {
        fixToUnknown: true,
        allowRestPattern: false,
      },
    ],

    // Prefer proper types from @neo/types
    "no-restricted-syntax": [
      "warn",
      {
        selector: "TSAsExpression[expression.type.name==='any']",
        message:
          "Prefer proper types from @neo/types instead of 'as any'. " +
          "Available types: WalletSDK, InvokeResult, AppEvent, etc.",
      },
    ],

    // ============================================
    // i18n Best Practices
    // ============================================

    // Require useI18n for translations
    "no-restricted-syntax": [
      "warn",
      {
        selector: "Identifier[name=/^(t|formatMessage|translate)$/]:not([declaration.type])",
        message: "Use useI18n composable from @shared/composables/useI18n for translations.",
      },
    ],

    // ============================================
    // Error Handling Best Practices
    // ============================================

    // Encourage using error handling utilities
    "no-restricted-syntax": [
      "warn",
      {
        selector: "TryStatement > CatchClause[param.name=/^(e|err|error)$/]",
        message:
          "Consider using error handling utilities from @shared/utils/errorHandling. " +
          "Available: handleAsync, handleContractOperation, retryAsync, etc.",
      },
    ],

    // ============================================
    // Constants Best Practices
    // ============================================

    // Disallow magic numbers
    "no-magic-numbers": [
      "warn",
      {
        ignore: [
          // Allow common small values
          -1, 0, 1, 2,
          // Allow common time values (seconds)
          60, 1000, 60000,
          // Allow common percentages
          100,
        ],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        ignoreEnums: true,
      },
    ],

    // ============================================
    // Component Best Practices
    // ============================================

    // Prefer shared components over custom implementations
    "no-restricted-syntax": [
      "warn",
      {
        selector:
          'VElement[matches=/^(NeoCard|NeoButton|NeoInput|NeoDoc)$/]:not(:has(ImportDeclaration[source.value="@shared/components"]))',
        message:
          "Ensure Neo components are imported from @shared/components. " +
          "Available: AppLayout, NeoCard, NeoButton, NeoInput, NeoDoc, ChainWarning, MiniAppLayout, etc.",
      },
    ],

    // ============================================
    // Style Best Practices
    // ============================================

    // Prefer theme variables over hardcoded colors
    "no-restricted-syntax": [
      "warn",
      {
        selector: "Literal[regex=/^#[0-9a-fA-F]{3,8}$/]",
        message:
          "Prefer theme CSS variables over hardcoded colors. " +
          "Use: var(--bg-primary), var(--text-primary), var(--accent-primary), etc.",
      },
    ],
  },

  overrides: [
    // Specific rules for Vue components
    {
      files: ["**/*.vue"],
      rules: {
        // Enforce component naming
        "vue/component-definition-name-casing": ["error", "PascalCase"],

        // Require prop types
        "vue/require-prop-types": "error",

        // Require default prop values
        "vue/require-default-prop": "warn",

        // Enforce v-bind directive style
        "vue/v-bind-style": ["error", "shorthand"],

        // Enforce v-on directive style
        "vue/v-on-style": ["error", "shorthand"],
      },
    },

    // Specific rules for TypeScript files
    {
      files: ["**/*.ts"],
      rules: {
        // Require return types on functions
        "@typescript-eslint/explicit-function-return-type": "warn",

        // Require explicit types for object properties
        "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      },
    },
  ],

  // Settings for better auto-fixing
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: "./tsconfig.json",
      },
    },
  },
};
