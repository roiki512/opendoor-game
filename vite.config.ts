import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site works from any subpath (GitHub Pages, etc.)
  base: './',
  server: {
    // Honor an externally assigned port (e.g. preview tooling)
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
});
