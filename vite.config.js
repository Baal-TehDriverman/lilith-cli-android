import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'src',
  build: {
    outDir: '../www',
    emptyOutDir: true,
    sourcemap: false,
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
    esbuild: false,
  },
  server: {
    port: 3000,
    host: true,
  },
})