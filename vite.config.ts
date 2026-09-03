import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * 自訂 Vite 外掛：將建置產出之 CSS 樣式直接內聯（Inline）至 index.html。
 *
 * 消除額外的外部 CSS 網路請求與渲染阻斷（Render-Blocking Resources），
 * 同時自產出清單中移除獨立 CSS 檔案以減少 HTTP 請求數。
 *
 * @returns Vite 外掛實例物件
 */
function inlineCssPlugin(): Plugin {
  return {
    name: 'inline-css',
    enforce: 'post',
    transformIndexHtml(html, { bundle }) {
      if (!bundle) return html;
      let newHtml = html;
      for (const [fileName, file] of Object.entries(bundle)) {
        if (fileName.endsWith('.css') && file.type === 'asset' && typeof file.source === 'string') {
          const re = new RegExp(`<link[^>]+href="[^"]*${fileName.replace(/\./g, '\\.')}"[^>]*>`);
          newHtml = newHtml.replace(re, `<style>${file.source}</style>`);
          delete bundle[fileName];
        }
      }
      return newHtml;
    },
  };
}

/**
 * Vite 專案建置與開發伺服器配置。
 */
export default defineConfig({
  // 維持相對路徑，確保於 GitHub Pages 子路徑部署時資源連結正確
  base: './',
  plugins: [
    inlineCssPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Markdown & Mermaid Web Viewer',
        short_name: 'Markdown Viewer',
        description: '基於 Linear 設計風格的純前端 Markdown 與 Mermaid 即時預覽工具，具備雙向滾動同步、AI 格式修復與多格式匯出功能。',
        theme_color: '#0F1011',
        background_color: '#0F1011',
        display: 'standalone',
        orientation: 'any',
        scope: './',
        start_url: './',
        lang: 'zh-TW',
        categories: ['utilities', 'productivity'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt}'],
        // 放寬預快取大小上限至 5MB，確保動態分割之大型 Mermaid 模組（約 2.5MB）得以順利預先快取
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 年
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
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 年
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
    },
    // 關閉模組預先載入，避免首屏非同步拆包區塊被無差別提早載入
    modulePreload: false,
    rollupOptions: {
      output: {
        /**
         * 自訂 Rollup 程式碼分割（Code Splitting）策略。
         *
         * 將 CodeMirror 編輯器及其按鍵對應相依套件獨立打包為單一 Chunk，
         * 達成首屏與延遲載入模組之清晰隔離。
         */
        manualChunks(id) {
          if (id.includes('preload-helper')) {
            return 'helpers';
          }
          if (id.includes('@codemirror') || id.includes('codemirror') || id.includes('w3c-keyname')) {
            return 'codemirror-bundle';
          }
        },
      },
    },
  },
});
