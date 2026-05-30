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
        registerType: 'prompt',
        includeAssets: [
          'logo.png',
          'offline.html',
          'icons/*.png',
          '*.png', // school logos
        ],
        manifest: false, // Usamos o manifest.json manual em public/
        workbox: {
          // Arquivos a incluir no precache
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // Limite de tamanho para precache (5MB)
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // Fallback de navegação
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [
            /^\/auth\//,       // Não cachear rotas de auth
            /^\/api\//,        // Não cachear APIs
            /^\/rest\/v1\//,   // Não cachear API REST do Supabase
          ],
          // Runtime caching strategies
          runtimeCaching: [
            // App Shell — StaleWhileRevalidate
            {
              urlPattern: /^https:\/\/.*\.(js|css)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-assets-v1',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
                },
              },
            },
            // Imagens estáticas — CacheFirst
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-v1',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
                },
              },
            },
            // Google Fonts CSS — StaleWhileRevalidate
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets-v1',
              },
            },
            // Google Fonts files — CacheFirst (longa vida)
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts-v1',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 365 * 24 * 60 * 60, // 1 ano
                },
              },
            },
          ],
          // Limpar caches antigos automaticamente
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    // SEGURANÇA: GEMINI_API_KEY removida do bundle frontend.
    // Para usar a Gemini API, utilize uma Edge Function do Supabase (server-side).
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
