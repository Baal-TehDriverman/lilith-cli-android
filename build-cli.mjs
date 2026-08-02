#!/usr/bin/env node
/**
 * Build Lilith CLI for Android using esbuild (bypasses Vite/rollup/terser native module issues)
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const ESBUILD_BINARY = join(ROOT, 'node_modules', '@esbuild', 'android-arm64', 'bin', 'esbuild');
process.env.ESBUILD_BINARY_PATH = ESBUILD_BINARY;

const entry = join(ROOT, 'src', 'main.ts');
const outDir = join(ROOT, 'dist');

// Node builtins to externalize
const nodeBuiltins = [
  'readline', 'url', 'path', 'fs/promises', 'events', 'child_process',
  'fs', 'process', 'util', 'os', 'crypto', 'stream', 'buffer',
  'net', 'http', 'https', 'tls', 'zlib', 'querystring', 'http2',
];

const result = await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  outfile: outDir + '/main.cjs',
  external: nodeBuiltins,
  sourcemap: false,
  minify: false,
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
}).catch((err) => {
  console.error('✘ Build failed:', err);
  process.exit(1);
});

// Fix the output: prepend proper shebang on line 1 (esbuild banner adds it after a comment)
const outFile = outDir + '/main.cjs';
let content = readFileSync(outFile, 'utf-8');
// Remove any existing shebang lines (esbuild may have placed it incorrectly)
content = content.replace(/^#!.*\n/gm, '');
// Add correct shebang as first line
content = '#!/data/user/0/com.hermesagent.android/files/home/.nodejs-lts/bin/node\n' + content;
writeFileSync(outFile, content);
console.log('✓ Build complete with shebang: dist/main.cjs');
