/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

// Сборка пакета: два entry — библиотека (dist/index.js) и демо на MemoryFsClient (dist/demo.js).
// Стили компонентов — строки в TS (см. src/ui/theme), поэтому sass/postcss не нужны; иконки — SVG-строки.
// `--watch` — пересборка при изменениях.

import * as esbuild from 'esbuild';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const common = {
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  minify: !watch,
  legalComments: 'none',
  alias: {'@': path.resolve(__dirname, 'src')},
  tsconfig: path.resolve(__dirname, 'tsconfig.json'),
  logLevel: 'info',
};

const builds = [
  {...common, entryPoints: [path.resolve(__dirname, 'src/index.ts')], outfile: path.resolve(__dirname, 'dist/index.js')},
  {...common, entryPoints: [path.resolve(__dirname, 'src/demo.ts')], outfile: path.resolve(__dirname, 'dist/demo.js')},
];

try {
  if (watch) {
    const contexts = await Promise.all(builds.map((options) => esbuild.context(options)));
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log('👀 filemanager-core2: watch mode');
  } else {
    await Promise.all(builds.map((options) => esbuild.build(options)));
    console.log('✅ filemanager-core2: dist/index.js + dist/demo.js');
  }
} catch (error) {
  console.error('💥 filemanager-core2: ошибка сборки', error);
  process.exit(1);
}
