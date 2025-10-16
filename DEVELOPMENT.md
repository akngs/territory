# Development Guide

## Code Quality Tools

This project uses ESLint and Prettier to maintain code quality and consistency.

### Setup

All tools are installed as dev dependencies. Run:

```bash
npm install
```

### Available Scripts

#### Linting and Formatting

- **`npm run check:eslint`** - Check for ESLint errors
- **`npm run check:format`** - Check if code matches Prettier format
- **`npm run check:duplication`** - Check for code duplication with jscpd
- **`npm run format`** - Auto-format all code with Prettier
- **`npm run lint`** - Auto-fix ESLint issues

#### Type Checking and Testing

- **`npm run check:ts`** - TypeScript type checking
- **`npm test`** - Run all tests
- **`npm run test:watch`** - Run tests in watch mode
- **`npm run test:coverage`** - Run tests with coverage report

#### Complete Check

- **`npm run check:all`** - Run all checks (TypeScript, ESLint, Prettier, Duplication, and tests)

This is the recommended command before committing code.

### ESLint Configuration

ESLint is configured with:
- **Base rules**: `@eslint/js` recommended
- **TypeScript**: `typescript-eslint` with type-aware rules
- **Prettier integration**: `eslint-plugin-prettier` and `eslint-config-prettier`

Key rules:
- Enforces Prettier formatting as errors
- Requires unused variables to be prefixed with `_`
- Enforces strict TypeScript rules
- Allows `console` for CLI output

Configuration: `eslint.config.js`

### Prettier Configuration

Prettier is configured with:
- Single quotes
- 2-space indentation
- Semicolons
- 100 character line width
- Trailing commas (ES5)

Configuration: `.prettierrc.json`

### jscpd (Code Duplication Detection)

jscpd analyzes code to find duplicated blocks:
- Minimum 5 lines or 50 tokens to be considered duplication
- Ignores test files
- Generates HTML report in `.jscpd/html/`
- Creates a badge showing duplication percentage

Configuration: `.jscpd.json`

Current status: **0% duplication** ✅

### VS Code Integration

The `.vscode/settings.json` file configures:
- Format on save with Prettier
- Auto-fix ESLint issues on save
- TypeScript validation

### Git Workflow

Before committing:

```bash
npm run check:all
```

This ensures:
1. ✅ TypeScript compiles without errors
2. ✅ Code passes ESLint rules
3. ✅ Code is formatted with Prettier
4. ✅ No code duplication detected
5. ✅ All tests pass

### Common Issues

#### Unused Variable
```typescript
// ❌ Error
function example(arg1: string, arg2: number) {
  console.log(arg1);
}

// ✅ Fix - prefix with underscore
function example(arg1: string, _arg2: number) {
  console.log(arg1);
}
```

#### Formatting Issues
```bash
# Check what needs formatting
npm run check:format

# Auto-fix formatting
npm run format
```

#### ESLint Errors
```bash
# Check for issues
npm run check:eslint

# Auto-fix issues
npm run lint
```

## Project Structure

```
src/
├── cli.ts                 # CLI entry point
├── types.ts               # TypeScript types
├── utils.ts               # Utility functions
├── grid-utils.ts          # Grid operations
├── resolve.ts             # Round resolution orchestration
├── commands/              # CLI command handlers
│   ├── init.ts
│   ├── discuss.ts
│   ├── cmds.ts
│   ├── state.ts
│   └── help.ts
└── game-logic/            # Core game logic modules
    ├── movement.ts        # Movement operations
    ├── combat.ts          # Combat resolution
    ├── production.ts      # Production & unit counting
    └── win-conditions.ts  # Win condition checking
```

## Testing

Tests are organized by module:
- `*.test.ts` - Unit and integration tests
- `e2e.test.ts` - End-to-end tests
- Test files are co-located with source files

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# With UI
npm run test:ui

# With coverage
npm run test:coverage
```

## Architecture Principles

1. **Separation of Concerns**: CLI, commands, game logic are separate
2. **Immutability**: Grid operations return new grids
3. **Type Safety**: Strict TypeScript, no `any` types
4. **Pure Functions**: Business logic has no side effects
5. **Error Handling**: Functions throw errors, CLI handles them
6. **Testability**: All logic is unit-testable

## Code Style

- Use TypeScript's strict mode
- Prefer `const` over `let`
- Use functional programming patterns
- Document public APIs with JSDoc
- Keep functions small and focused
- Write descriptive variable names
- Add comments for complex logic
