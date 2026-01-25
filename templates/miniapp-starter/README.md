# Miniapp Starter Template

This is a template for creating new miniapps. It provides a standardized structure with all the necessary files and patterns.

## Using This Template

### Create a New Miniapp

```bash
# Copy the template
cp -r templates/miniapp-starter apps/your-new-app

# Navigate to the new app
cd apps/your-new-app

# Update package.json with your app details
# - Update "name" to "@miniapps/your-new-app"
# - Update "description"
# - Update APP_ID in src/pages/index/index.vue

# Install dependencies
pnpm install

# Start development
pnpm dev
```

### Required Changes

1. **Update package.json**
   - Change `"name"` to your miniapp name
   - Update `"description"`
   - Update version if needed

2. **Update APP_ID**
   - Edit `src/pages/index/index.vue`
   - Change `const APP_ID = "miniapp-template";`
   - Register your app ID in NeoHub

3. **Update Contract Hash**
   - If using a contract, set `CONTRACT_HASH`
   - Otherwise remove contract-related code

4. **Customize Theme**
   - Edit `src/pages/index/template-theme.scss`
   - Set your app's color scheme
   - Follow the naming convention: `--yourapp-*`

5. **Update Translations**
   - Edit `src/locale/messages.ts`
   - Add all user-facing text
   - Include both English and Chinese

6. **Implement Your Logic**
   - Replace the placeholder code in `index.vue`
   - Add your contract operations
   - Implement your UI components

7. **Write Tests**
   - Edit `src/pages/index/index.test.ts`
   - Test your business logic
   - Aim for 70% coverage

### File Structure

```
src/pages/index/
├── index.vue                    # Main page component
├── components/                  # Page-specific components (add as needed)
├── composables/                 # Reusable logic
│   ├── usePageState.ts          # Page state management
│   └── useContractInteraction.ts # Contract interactions
├── index.test.ts                # Tests
└── template-theme.scss          # Theme variables
```

## Standards Compliance

This template follows all standards defined in `/STANDARDS.md`:

- ✅ Standard file structure
- ✅ Composable patterns for state management
- ✅ Type-safe contract interactions
- ✅ Error handling with utilities
- ✅ Theme variable system
- ✅ Test structure ready
- ✅ ESLint compliance
- ✅ i18n pattern

## Development Workflow

1. **Start Development**

   ```bash
   pnpm dev
   ```

2. **Type Check**

   ```bash
   pnpm typecheck
   ```

3. **Run Tests**

   ```bash
   pnpm test
   pnpm test:coverage
   ```

4. **Build**
   ```bash
   pnpm build
   ```

## Resources

- [Development Standards](../../STANDARDS.md)
- [Framework Guide](../../docs/FRAMEWORK_SUMMARY.md)
- [Miniapp Guide](../../docs/MINIAPP_GUIDE.md)
- [Migration Guide](../../docs/MIGRATION_GUIDE.md)

## Support

For questions or issues, refer to the main documentation or create an issue in the repository.
