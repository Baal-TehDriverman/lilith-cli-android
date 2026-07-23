// @ts-check
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src',
  build: {
    outDir: '../www',
    emptyOutDir: true,
    sourcemap: false, // Don't leak source code like Claude Code did!
    minify: 'terser',
    lib: {
      entry: 'main.ts',
      formats: ['cjs'],
      fileName: 'main',
    },
    rollupOptions: {
      external: [
        'readline',
        'url',
        'path',
        'fs/promises',
        'events',
        'child_process',
        'fs',
        'process',
        'util',
        'os',
        'crypto',
        'stream',
        'buffer',
      ],
      output: {
        globals: {},
      },
    },
    target: 'node18',
  },
  server: {
    port: 3000,
    host: true,
  },
});