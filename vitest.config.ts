/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {defineConfig} from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {'@': path.resolve(__dirname, 'src')},
  },
  test: {
    include: ['src/**/*.test.ts'],
    // Домен и api тестируются в node; для UI-тестов (когда появятся) — jsdom.
    environment: 'node',
  },
});
