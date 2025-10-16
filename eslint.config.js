import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import sonarjs from 'eslint-plugin-sonarjs';

export default tseslint.config(
  // Base JavaScript rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommendedTypeChecked,

  // SonarJS rules
  sonarjs.configs.recommended,

  // Prettier integration
  prettierConfig,

  // Project-specific configuration
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      prettier,
    },

    rules: {
      // Prettier integration
      'prettier/prettier': 'error',

      // TypeScript-specific overrides
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Allow async functions without await (useful for command handlers)
      '@typescript-eslint/require-await': 'off',

      // Allow explicit any types in catch blocks (we use unknown instead)
      '@typescript-eslint/no-explicit-any': 'error',

      // Prefer const over let when possible
      'prefer-const': 'error',

      // No console.log in production code (console.error is ok for CLI)
      'no-console': 'off', // CLI app needs console output

      // SonarJS - Cognitive Complexity
      'sonarjs/cognitive-complexity': ['error', 15], // Max complexity of 15

      // SonarJS - Other useful rules
      'sonarjs/no-duplicate-string': ['warn', { threshold: 3 }],
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-nested-template-literals': 'warn',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '*.js', // Ignore JS files in root (like this config)
      'gamedata/**',
    ],
  }
);
