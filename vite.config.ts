/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves a project site from /<repo>/, so the base path is injected at
// build time. Locally it stays '/', which keeps dev and preview URLs clean.
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      // Pages has no server-side routing: a deep link like /candidates would 404.
      // Serving the same document as 404.html hands those URLs back to the router.
      name: 'spa-fallback-for-pages',
      apply: 'build',
      closeBundle() {
        const { copyFileSync, existsSync } = require('node:fs');
        if (existsSync('dist/index.html')) copyFileSync('dist/index.html', 'dist/404.html');
      },
    },
  ],
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  base,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
