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
          // FIX #8: Excluir ping.txt do precache/runtime cache para que o teste de conectividade
          // sempre atinja o servidor real e nunca seja servido do cache offline
          globIgnores: ['**/ping.txt'],
          // Limite de tamanho para precache (5MB)
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // Fallback de navegação
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [
            /^\/auth\//,       // Não cachear rotas de auth
            /^\/api\//,        // Não cachear APIs
            /^\/rest\/v1\//,   // Não cachear API REST do Supabase
            // P3 FIX: Não interceptar callbacks de autenticação PKCE do Supabase.
            // O SW interceptando ?code= ou ?token_hash= pode servir o index.html do cache
            // antes que o código seja trocado por sessão, quebrando o fluxo de login/
            // redefinição de senha. Esses parâmetros chegam via redirect do Supabase Auth.
            /[?&]code=/,            // OAuth/PKCE authorization code
            /[?&]token_hash=/,      // Email confirmation e password recovery
            /^\/redefinir-senha/,   // Rota de redefinição de senha (sempre usa tokens)
            /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|webp|ico|json|txt|map)$/,  // Não interceptar assets estáticos
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
    // FIX: Remover console.log/warn/error e debugger em builds de produção
    // para evitar exposição de internos de autenticação e sessão.
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['console' as const, 'debugger' as const] : [],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Chunk splitting: dividir o bundle monolítico (~810KB) em chunks menores
          // para cache granular e carregamento paralelo.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return;

            // React core + router (~150KB)
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router/') ||
              id.includes('/react-router-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'vendor-react';
            }

            // Supabase (~200KB)
            if (id.includes('/@supabase/')) {
              return 'vendor-supabase';
            }

            // Sentry (~150KB)
            if (id.includes('/@sentry/')) {
              return 'vendor-sentry';
            }

            // Motion / Framer Motion (~100KB)
            if (id.includes('/motion/') || id.includes('/framer-motion/')) {
              return 'vendor-motion';
            }

            // Dexie (IndexedDB) (~50KB)
            if (id.includes('/dexie/') || id.includes('/dexie-react-hooks/')) {
              return 'vendor-dexie';
            }

            // Lucide icons (~50KB)
            if (id.includes('/lucide-react/')) {
              return 'vendor-icons';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
