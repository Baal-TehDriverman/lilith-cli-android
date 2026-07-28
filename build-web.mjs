#!/usr/bin/env node
/** Build Lilith Web App for Capacitor using esbuild */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const srcDir = resolve(process.env.HOME, 'lilith-cli-android/src');
const outDir = resolve(process.env.HOME, 'lilith-cli-android/www');

// Ensure www directory exists
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

// Copy index.html to www
const indexHtml = readFileSync(resolve(srcDir, 'index.html'), 'utf-8');
writeFileSync(resolve(outDir, 'index.html'), indexHtml);

console.log('Building web app with esbuild...');

try {
  await build({
    entryPoints: [resolve(srcDir, 'main.tsx')],
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2020',
    outDir: outDir,
    sourcemap: false,
    minify: true,
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
      '.jsx': 'jsx',
      '.js': 'js',
    },
    define: {
      'process.env.NODE_ENV': '"production"',
      'import.meta.env.VITE_GATEWAY_URL': '"http://tehlappy.local:8080"',
    },
    external: [],
    jsx: 'automatic',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    logLevel: 'info',
  });
  
  console.log('✓ Web build complete:', outDir);
} catch (err) {
  console.error('✘ Build failed:', err);
  process.exit(1);
}
