import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Chemins relatifs : le même build fonctionne à la racine d'un domaine
  // comme dans un sous-répertoire (GitHub Pages : /<nom-du-depot>/),
  // sans avoir à reconfigurer quoi que ce soit.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'Cartes de fidélité',
        short_name: 'Cartes',
        description: 'Vos cartes de fidélité, hors ligne.',
        lang: 'fr',
        // Relatifs eux aussi : résolus par rapport à l'URL du manifeste.
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#1f2937',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell entirely precached: the app must boot with the radio off.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Hash-based routing means every navigation resolves to index.html.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
