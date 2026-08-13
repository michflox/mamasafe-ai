import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'MamaSafe AI — PPH Emergency Copilot (Simulation)',
        short_name: 'MamaSafe',
        description:
          'Offline-first clinical emergency copilot for frontline health workers. SIMULATION — synthetic data only. Not cleared for clinical use.',
        theme_color: '#f5f1ea',
        background_color: '#f5f1ea',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Offline-first: cache the entire app shell + bundled pathway data.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: 'index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    host: true,
  },
});
