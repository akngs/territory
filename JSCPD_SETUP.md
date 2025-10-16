# jscpd Setup - Code Duplication Detection

## Overview

jscpd (JavaScript Copy/Paste Detector) is configured to detect duplicate code across the Territory project.

## Installation

```bash
npm install -D jscpd @jscpd/badge-reporter
```

## Configuration

### `.jscpd.json`

```json
{
  "threshold": 0,
  "reporters": ["html", "console", "badge"],
  "ignore": [
    "node_modules/**",
    "dist/**",
    "gamedata/**",
    "**/*.test.ts",
    "**/*.json",
    ".jscpd/**"
  ],
  "absolute": true,
  "gitignore": true,
  "format": ["typescript", "javascript"],
  "minLines": 5,
  "minTokens": 50,
  "maxLines": 500,
  "maxSize": "100kb",
  "output": ".jscpd",
  "blame": false,
  "silent": false,
  "verbose": false
}
```

### Configuration Explanation

- **`threshold: 0`** - Report any duplication found (0% threshold)
- **`reporters`** - Generate HTML report, console output, and badge
- **`ignore`** - Exclude node_modules, dist, gamedata, test files
- **`minLines: 5`** - Minimum 5 lines to be considered duplication
- **`minTokens: 50`** - Minimum 50 tokens to be considered duplication
- **`format`** - Analyze TypeScript and JavaScript files
- **`output: ".jscpd"`** - Save reports to `.jscpd/` directory

## Usage

### Check for Duplication

```bash
npm run check:duplication
```

This will:
1. Scan all TypeScript files in `src/`
2. Generate console report
3. Create HTML report in `.jscpd/html/`
4. Generate badge in `.jscpd/jscpd-badge.svg`

### View HTML Report

After running the check, open the HTML report:

```bash
open .jscpd/html/index.html
```

The report shows:
- Duplicated code blocks
- File locations
- Line numbers
- Side-by-side comparison

## Output

### Console Report

```
┌────────────┬────────────────┬─────────────┬──────────────┬──────────────┬──────────────────┬───────────────────┐
│ Format     │ Files analyzed │ Total lines │ Total tokens │ Clones found │ Duplicated lines │ Duplicated tokens │
├────────────┼────────────────┼─────────────┼──────────────┼──────────────┼──────────────────┼───────────────────┤
│ typescript │ 14             │ 1598        │ 12048        │ 0            │ 0 (0%)           │ 0 (0%)            │
├────────────┼────────────────┼─────────────┼──────────────┼──────────────┼──────────────────┼───────────────────┤
│ Total:     │ 14             │ 1598        │ 12048        │ 0            │ 0 (0%)           │ 0 (0%)            │
└────────────┴────────────────┴─────────────┴──────────────┴──────────────┴──────────────────┴───────────────────┘
```

### Current Status

✅ **0% duplication** - No duplicate code blocks found!

## Integration

### In check:all

jscpd is integrated into the main quality check:

```bash
npm run check:all
```

This runs:
1. TypeScript type checking
2. ESLint
3. Prettier format check
4. **jscpd duplication check** ✨
5. Test suite

### Git Ignore

The `.jscpd/` output directory is added to `.gitignore`:

```
# Code duplication reports
.jscpd/
```

## Why No Duplication?

The Territory project has **0% duplication** because:

1. **Modular Architecture** - Code is split into focused modules
2. **Functional Design** - Utility functions are reused
3. **DRY Principle** - Don't Repeat Yourself is followed
4. **Recent Refactoring** - `resolve.ts` was split into smaller modules:
   - `movement.ts`
   - `combat.ts`
   - `production.ts`
   - `win-conditions.ts`

## What Counts as Duplication?

jscpd detects:
- Identical code blocks (5+ lines)
- Similar token sequences (50+ tokens)
- Copy-pasted functions
- Repeated patterns

jscpd ignores:
- Test files (`**/*.test.ts`)
- Small blocks (< 5 lines)
- Comments and whitespace

## Best Practices

### Avoid Duplication

1. **Extract common functions** to utility modules
2. **Use helper functions** instead of copying code
3. **Create shared types** for repeated patterns
4. **Refactor when duplication appears**

### When Duplication is OK

Sometimes similar code is acceptable:
- Different business logic with similar structure
- Type definitions that look similar
- Test setup code (already excluded)
- Configuration files (already excluded)

## Troubleshooting

### Badge Reporter Warning

If you see:
```
warning: badge not installed
```

Install the badge reporter:
```bash
npm install -D @jscpd/badge-reporter
```

### No Output

If no reports are generated:
- Check `.jscpd.json` configuration
- Verify files match the `format` patterns
- Ensure files aren't in `ignore` list

### False Positives

If legitimate code is flagged:
- Increase `minLines` threshold
- Increase `minTokens` threshold
- Add specific files to `ignore` list

## CI/CD Integration

To fail CI on duplication:

```json
{
  "threshold": 5,
  "exitCode": 1
}
```

This will:
- Fail if duplication exceeds 5%
- Return exit code 1 for CI failure

Current config uses `threshold: 0` for monitoring without blocking.

## Metrics

- **Files Analyzed**: 14 TypeScript files
- **Total Lines**: 1,598 lines of code
- **Total Tokens**: 12,048 tokens
- **Clones Found**: 0
- **Duplication**: 0%

## Further Reading

- [jscpd Documentation](https://github.com/kucherenko/jscpd)
- [Configuration Options](https://github.com/kucherenko/jscpd/tree/master/packages/jscpd)
- [Badge Reporter](https://github.com/kucherenko/jscpd/tree/master/packages/badge-reporter)
