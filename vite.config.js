import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],

  // Set base path only for production builds (GitHub Pages).
  // Dev server (StackBlitz, local) stays at root ('/') so assets resolve correctly.
  base: command === 'build' ? '/Microforest/' : '/',

  build: {
    outDir: 'dist',
    // Increase the chunk size warning threshold — Three.js + antd are large
    // by design; we accept the size in exchange for a full-featured game.
    chunkSizeWarningLimit: 1500,
  },

  // Vite dev server — StackBlitz handles the port externally.
  server: {
    host: true,
    strictPort: false,
  },
}));
