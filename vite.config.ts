// @ts-check
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src',
  build: {
    outDir: '../www',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
  },
  server: {
    port: 3000,
    host: true,
  },
});