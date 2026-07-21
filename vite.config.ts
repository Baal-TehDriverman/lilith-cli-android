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
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'ink', 'commander'],
          capacitor: ['@capacitor/core', '@capacitor/http'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});