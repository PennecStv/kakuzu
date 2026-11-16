import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      pwaAssets: { config: true },
      manifest: {
        name: 'Kakuzu',
        short_name: 'Kakuzu',
        description: 'Suivi de budget sans pub, avec un étang ASCII en fond.',
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        background_color: '#070b14',
        theme_color: '#070b14',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
