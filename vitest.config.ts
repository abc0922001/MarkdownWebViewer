import { defineConfig } from 'vitest/config';

/**
 * Vitest 單元測試環境配置。
 *
 * 採用 jsdom 模擬瀏覽器 DOM 環境，以支援 DOMPurify 與 Markdown 渲染器之自動化測試。
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
