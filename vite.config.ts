import { defineConfig, Plugin } from 'vite';

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
  plugins: [inlineCssPlugin()],
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
