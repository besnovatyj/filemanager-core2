/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ['src/**/*.ts']},
  {
    languageOptions: {
      globals: {...globals.browser},
      ecmaVersion: 'latest',
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}],
      '@typescript-eslint/consistent-type-imports': 'error',
      // Границы слоёв (см. docs/ARCHITECTURE.md §2): домен не импортирует ничего выше себя.
      'no-restricted-imports': ['error', {
        patterns: [
          {group: ['@/ui/*', '@/widgets/*', '@/features/*', '@/model/*', '@/commands/*', '@/app/*'],
            message: 'domain/api/shared не могут зависеть от верхних слоёв'},
        ],
      }],
    },
  },
  {
    // Ограничение выше действует только для нижних слоёв.
    files: ['src/model/**', 'src/commands/**', 'src/features/**', 'src/ui/**', 'src/widgets/**', 'src/app/**', 'src/index.ts', 'src/demo.ts'],
    rules: {'no-restricted-imports': 'off'},
  },
];
