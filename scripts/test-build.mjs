#!/usr/bin/env node
/**
 * Test build for Lilith CLI — bundles test files with esbuild, runs `node --test`.
 * Per roadmap A1: esbuild-bundle src+tests to CJS, run node:test.
 */
import { build } from 'esbuild';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, mkdirSync } from 'fs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const ESBUILD_BINARY = join(ROOT, '..', 'node_modules', '@esbuild', 'android-arm64', 'bin', 'esbuild');
process.env.ESBUILD_BINARY_PATH = ESBUILD_BINARY;

const testDir = join(ROOT, '..', 'tests');
const outDir = join(ROOT, '..', '.test-build');
mkdirSync(outDir, { recursive: true });

const nodeBuiltins = [
  'readline', 'url', 'path', 'fs/promises', 'events', 'child_process',
  'fs', 'process', 'util', 'os', 'crypto', 'stream', 'buffer',
  'net', 'http', 'https', 'tls', 'zlib', 'querystring', 'http2',
];

const testFiles = readdirSync(testDir).filter(f => f.endsWith('.test.ts'));
if (testFiles.length === 0) {
  console.error('No test files found in tests/');
  process.exit(1);
}

console.log(`Found ${testFiles.length} test file(s): ${testFiles.join(', ')}`);

for (const tf of testFiles) {
  const entry = join(testDir, tf);
  const outfile = join(outDir, tf.replace('.test.ts', '.test.cjs'));
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    outfile,
    external: nodeBuiltins,
    sourcemap: false,
    minify: false,
    logLevel: 'info',
    define: { 'process.env.NODE_ENV': '"test"' },
  }).catch(err => {
    console.error(`✘ Build failed for ${tf}:`, err);
    process.exit(1);
  });
}

// Run the built tests with node:test
console.log('\nRunning tests...\n');
try {
  execSync(`node --test ${join(outDir, '*.test.cjs')}`, {
    cwd: join(ROOT, '..'),
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--experimental-vm-modules' },
  });
} catch {
  process.exit(1);
}
