import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'favicon-16.png',
          'favicon-32.png',
          'favicon-48.png',
          'favicon-128.png',
          'apple-touch-icon.png',
          'logo.png',
          'logo-transparent.png',
          'logo-192.png',
          'logo-256.png',
          'logo-384.png',
          'logo-512.png',
          'logo-maskable-192.png',
          'logo-maskable-512.png',
          'caixa-registradora.mp3',
          'door-knock.mp3',
          'screenshots/screenshot-desktop.png',
          'screenshots/screenshot-mobile.png',
        ],
        manifest: {
          id: '/',
          name: 'Empreiteiro Saminês',
          short_name: 'Saminês',
          description: 'Sistema de gestão de obras, serviços, clientes e comprovantes com sincronização e funcionamento offline.',
          theme_color: '#15803d',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/favicon-32.png?v=20261025',
              sizes: '32x32',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/favicon-128.png?v=20261025',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/apple-touch-icon.png?v=20261025',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/logo-192.png?v=20261025',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/logo-maskable-192.png?v=20261025',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/logo-256.png?v=20261025',
              sizes: '256x256',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/logo-384.png?v=20261025',
              sizes: '384x384',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/logo-512.png?v=20261025',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/logo-maskable-512.png?v=20261025',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/logo-transparent.png?v=20261025',
              sizes: '1024x1024',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/logo.png?v=20261025',
              sizes: '1024x1024',
              type: 'image/png',
              purpose: 'any',
            },
          ],
          screenshots: [
            {
              src: '/screenshots/screenshot-desktop.png?v=20261025',
              sizes: '1366x768',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Painel de controle de serviços, indicadores financeiros e obras no computador',
            },
            {
              src: '/screenshots/screenshot-mobile.png?v=20261025',
              sizes: '750x1334',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Acesso rápido ao sistema, registro de serviços e fotos no celular',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,mp3}'],
          navigateFallback: '/index.html',
          additionalManifestEntries: [
            { url: '/favicon.ico', revision: '20261025-v2' },
            { url: '/favicon-16.png', revision: '20261025-v2' },
            { url: '/favicon-32.png', revision: '20261025-v2' },
            { url: '/favicon-48.png', revision: '20261025-v2' },
            { url: '/favicon-128.png', revision: '20261025-v2' },
            { url: '/apple-touch-icon.png', revision: '20261025-v2' },
            { url: '/logo.png', revision: '20261025-v2' },
            { url: '/logo-transparent.png', revision: '20261025-v2' },
            { url: '/logo-192.png', revision: '20261025-v2' },
            { url: '/logo-256.png', revision: '20261025-v2' },
            { url: '/logo-384.png', revision: '20261025-v2' },
            { url: '/logo-512.png', revision: '20261025-v2' },
            { url: '/logo-maskable-192.png', revision: '20261025-v2' },
            { url: '/logo-maskable-512.png', revision: '20261025-v2' },
            { url: '/manifest.json', revision: '20261025-v2' },
            { url: '/screenshots/screenshot-desktop.png', revision: '20261025-v2' },
            { url: '/screenshots/screenshot-mobile.png', revision: '20261025-v2' },
          ],
          runtimeCaching: [
            {
              // Estratégia NetworkFirst agressiva para ícones, imagens e logotipos
              urlPattern: /\.(?:png|jpg|jpeg|svg|ico|webp)$/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'samines-icons-images-v2',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dias
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/.vs/**', '**/node_modules/**', '**/dist/**'] },
    },
  };
});
