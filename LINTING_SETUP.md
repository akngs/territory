# ESLint and Prettier Setup

## Overview

This document describes the ESLint and Prettier setup for the Territory game project.

## Installed Packages

### Dev Dependencies
- `eslint` (^9.37.0) - Core linting engine
- `@eslint/js` (^9.37.0) - Base JavaScript rules
- `typescript-eslint` (^8.46.1) - TypeScript support
- `prettier` (^3.6.2) - Code formatter
- `eslint-config-prettier` (^10.1.8) - Disables ESLint formatting rules
- `eslint-plugin-prettier` (^5.5.4) - Runs Prettier as an ESLint rule
- `jscpd` (^4.0.5) - Code duplication detector
- `@jscpd/badge-reporter` (^4.0.1) - Badge generator for jscpd

## Configuration Files

### `eslint.config.js`
Modern flat config format with:
- Base JavaScript recommended rules
- TypeScript type-aware linting
- Prettier integration
- Custom rules for unused variables
- Ignores for node_modules, dist, gamedata

### `.prettierrc.json`
Formatting rules:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### `.prettierignore`
Excludes:
- node_modules
- dist
- gamedata
- JSON files (except config files)

### `.jscpd.json`
Code duplication detection:
```json
{
  "threshold": 0,
  "reporters": ["html", "console", "badge"],
  "minLines": 5,
  "minTokens": 50,
  "ignore": ["**/*.test.ts", "node_modules/**"]
}
```

### `.vscode/settings.json`
VS Code integration:
- Format on save
- Auto-fix ESLint on save
- Use Prettier as default formatter

## NPM Scripts

### Quality Checks
- `npm run check:all` - **Run all checks** (TypeScript + ESLint + Prettier + Duplication + Tests)
- `npm run check:ts` - TypeScript type checking only
- `npm run check:eslint` - ESLint check only
- `npm run check:format` - Prettier format check only
- `npm run check:duplication` - Code duplication check only

### Auto-fix
- `npm run format` - **Auto-format all files** with Prettier
- `npm run lint` - Auto-fix ESLint issues

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Watch mode
- `npm run test:ui` - UI mode
- `npm run test:coverage` - With coverage

## Usage

### Before Committing
```bash
npm run check:all
```

This ensures:
1. ✅ TypeScript compiles
2. ✅ ESLint passes
3. ✅ Code is formatted
4. ✅ No code duplication
5. ✅ All tests pass

### Quick Fixes
```bash
# Fix formatting
npm run format

# Fix linting
npm run lint
```

## ESLint Rules

### Key Rules
- **Prettier as error**: `prettier/prettier: 'error'`
- **Unused variables**: Must be prefixed with `_`
- **No explicit any**: Enforced (we use `unknown`)
- **Prefer const**: Enforced
- **Console allowed**: CLI app needs console

### TypeScript Rules
- Type-aware linting enabled
- Requires `tsconfig.json`
- Strict mode enforced

## Results

After setup:
- ✅ 76 tests passing
- ✅ 0 TypeScript errors
- ✅ 0 ESLint errors
- ✅ All files formatted
- ✅ 0% code duplication
- ✅ CI-ready

## Benefits

1. **Consistency**: All code follows same style
2. **Quality**: Type-safe with strict linting
3. **Automation**: Format/lint on save in VS Code
4. **CI/CD Ready**: Single command for all checks
5. **Developer Experience**: Fast feedback on issues

## Migration Notes

### Changes Made
1. Added ESLint and Prettier dependencies
2. Created configuration files
3. Formatted entire codebase
4. Fixed unused imports
5. Added VS Code settings
6. Updated npm scripts
7. Created documentation

### Breaking Changes
None - all existing tests pass

### Files Modified
- `package.json` - Added scripts and dependencies
- All `*.ts` files - Formatted with Prettier
- Various files - Removed unused imports

### Files Created
- `eslint.config.js` - ESLint configuration
- `.prettierrc.json` - Prettier configuration
- `.prettierignore` - Prettier ignore patterns
- `.jscpd.json` - jscpd configuration
- `.vscode/settings.json` - VS Code settings
- `DEVELOPMENT.md` - Development guide
- `LINTING_SETUP.md` - This file
- `JSCPD_SETUP.md` - jscpd documentation

## Future Enhancements

Consider adding:
- Pre-commit hooks with Husky
- Lint-staged for faster pre-commit checks
- GitHub Actions workflow
- Commit message linting
- Import sorting plugin
