# @neo/config

Centralized configuration package for the Neo MiniApp platform.

## Contents

- **ESLint configuration** - Shared linting rules for TypeScript and Vue
- **Prettier configuration** - Consistent code formatting
- **TypeScript configurations** - Base and Vue-specific tsconfigs

## Usage

### ESLint

```javascript
// eslint.config.js
import config from "@neo/config/eslint";
export default config;
```

### Prettier

```javascript
// prettier.config.js
import config from "@neo/config/prettier";
export default config;
```

### TypeScript

```json
// tsconfig.json
{
  "extends": "@neo/config/tsconfig/vue",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue"]
}
```

## Available Configurations

| Export | Description |
|--------|-------------|
| `@neo/config/eslint` | ESLint flat config for TS + Vue |
| `@neo/config/prettier` | Prettier formatting config |
| `@neo/config/tsconfig/base` | Base TypeScript config |
| `@neo/config/tsconfig/vue` | Vue + UniApp TypeScript config |
