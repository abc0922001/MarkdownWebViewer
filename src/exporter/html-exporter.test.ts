// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportHtml } from './html-exporter';

describe('HTML Exporter (exportHtml)', () => {
  let createdBlob: Blob | null = null;
  let clickedLink: HTMLAnchorElement | null = null;
  let originalCreateObjectURL: any;
  let originalRevokeObjectURL: any;

  beforeEach(() => {
    createdBlob = null;
    clickedLink = null;

    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi.fn((blob: Blob) => {
      createdBlob = blob;
      return 'blob:mock-url';
    });
    URL.revokeObjectURL = vi.fn();

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedLink = this;
    });
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it('淺色主題下匯出 HTML，應包含 class="light" 與淺色 Design Tokens', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<h1>測試標題</h1><p>內文說明</p>';

    exportHtml(container, '測試文件', 'light');

    expect(clickedLink).not.toBeNull();
    expect(clickedLink?.download).toBe('測試文件.html');
    expect(createdBlob).not.toBeNull();

    const htmlText = await (createdBlob as Blob).text();
    expect(htmlText).toContain('<html lang="zh-TW" class="light">');
    expect(htmlText).toContain('--bg-app: #FFFFFF');
    expect(htmlText).toContain('--bg-surface: #F5F6F7');
    expect(htmlText).toContain('--text-primary: #08090A');
    expect(htmlText).toContain('測試標題');
  });

  it('深色主題下匯出 HTML，應包含 class="dark" 與深色 Design Tokens', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<h1>深色標題</h1>';

    exportHtml(container, '深色文件.html', 'dark');

    expect(clickedLink?.download).toBe('深色文件.html');
    expect(createdBlob).not.toBeNull();

    const htmlText = await (createdBlob as Blob).text();
    expect(htmlText).toContain('<html lang="zh-TW" class="dark">');
    expect(htmlText).toContain('--bg-app: #010102');
    expect(htmlText).toContain('--bg-surface: #0F1011');
    expect(htmlText).toContain('--text-primary: #F7F8F8');
  });

  it('未顯式指定主題時，應依據 DOM 根節點狀態自動解析主題', async () => {
    document.documentElement.className = 'light';
    const container = document.createElement('div');
    container.innerHTML = '<p>自動偵測淺色</p>';

    exportHtml(container, '自動文件');
    const lightHtml = await (createdBlob as Blob).text();
    expect(lightHtml).toContain('class="light"');

    document.documentElement.className = 'dark';
    exportHtml(container, '自動文件');
    const darkHtml = await (createdBlob as Blob).text();
    expect(darkHtml).toContain('class="dark"');
  });

  it('當渲染內容包含 KaTeX 數學公式時，匯出 HTML 應自動注入 KaTeX 樣式表連結', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>公式：<span class="katex"><span class="katex-html">E = mc^2</span></span></p>';

    exportHtml(container, '數學文件');
    const htmlText = await (createdBlob as Blob).text();
    expect(htmlText).toContain('katex.min.css');
    expect(htmlText).toContain('.katex-display-wrapper');
    expect(htmlText).toContain('.katex .katex-mathml');

    // 驗證 .katex-display-wrapper 樣式區塊具備完整的大括號閉合，無語法截斷或嵌套錯誤
    expect(htmlText).toMatch(/\.katex-display-wrapper\s*\{[^}]*overflow-x:\s*auto;\s*\}/);
  });
});
