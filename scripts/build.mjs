import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, 'src');
const DIST = resolve(ROOT, 'dist');
const PUBLIC = resolve(ROOT, 'public');

const isWatch = process.argv.includes('--watch');

// Clean dist
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// Copy static files (manifest, icons, popup.html)
cpSync(PUBLIC, DIST, { recursive: true });
cpSync(resolve(SRC, 'popup', 'popup.html'), resolve(DIST, 'popup.html'));

const buildOptions = {
  entryPoints: {
    background: resolve(SRC, 'background', 'background.ts'),
    content:    resolve(SRC, 'content', 'content.ts'),
    popup:      resolve(SRC, 'popup', 'popup.ts'),
  },
  bundle: true,
  outdir: DIST,
  platform: 'browser',
  target: 'es2020',
  format: 'iife',
  sourcemap: true,
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(buildOptions);
  console.log('Build complete.');
}
