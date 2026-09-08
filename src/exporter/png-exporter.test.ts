// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTimestamp, formatPngFilename, exportPng } from './png-exporter';
import * as htmlToImage from 'html-to-image';

vi.mock('html-to-image', () => ({
  toBlob: vi.fn(),
  toPng: vi.fn(),
}));

describe('PNG Exporter (png-exporter)', () => {
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
      return 'blob:mock-png-url';
    });
    URL.revokeObjectURL = vi.fn();

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedLink = this;
    });

    // 預設 toBlob 成功產出 Blob
    vi.mocked(htmlToImage.toBlob).mockResolvedValue(new Blob(['mock-png-bytes'], { type: 'image/png' }));
    vi.mocked(htmlToImage.toPng).mockResolvedValue('data:image/png;base64,mockdata');
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  describe('formatTimestamp', () => {
    it('應將指定 Date 正確格式化為 YYYYMMDD-HHmmss 格式', () => {
      const fixedDate = new Date(2026, 8, 8, 19, 27, 35); // 2026-09-08 19:27:35
      const result = formatTimestamp(fixedDate);
      expect(result).toBe('20260908-192735');
    });

    it('對於小於 10 的月份、日期、小時、分鐘、秒數應自動補零', () => {
      const fixedDate = new Date(2026, 0, 5, 4, 3, 9); // 2026-01-05 04:03:09
      const result = formatTimestamp(fixedDate);
      expect(result).toBe('20260105-040309');
    });
  });

  describe('formatPngFilename', () => {
    const fixedDate = new Date(2026, 8, 8, 19, 27, 35);

    it('應自動剔除 .md 副檔名並串接時間戳記與 .png', () => {
      const filename = formatPngFilename('Architecture.md', fixedDate);
      expect(filename).toBe('Architecture-20260908-192735.png');
    });

    it('應自動剔除 .html 或其他副檔名並串接時間戳記', () => {
      const filename = formatPngFilename('Report.html', fixedDate);
      expect(filename).toBe('Report-20260908-192735.png');
    });

    it('無副檔名之標題應直接附加時間戳記與 .png', () => {
      const filename = formatPngFilename('Sprint Plan', fixedDate);
      expect(filename).toBe('Sprint Plan-20260908-192735.png');
    });

    it('傳入空字串或僅含空格時，應自動回退為 Untitled', () => {
      const filename = formatPngFilename('   ', fixedDate);
      expect(filename).toBe('Untitled-20260908-192735.png');
    });
  });

  describe('exportPng', () => {
    it('應呼叫 html-to-image 並建立下載連結與正確檔名', async () => {
      const container = document.createElement('div');
      container.innerHTML = '<h1>測試標題</h1><p>測試內文</p>';
      document.body.appendChild(container);

      const fixedDate = new Date(2026, 8, 8, 19, 27, 35);
      await exportPng(container, {
        title: 'Project Spec.md',
        date: fixedDate,
        theme: 'light',
        width: 800,
      });

      expect(htmlToImage.toBlob).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          pixelRatio: 3,
          backgroundColor: '#FFFFFF',
          type: 'image/png',
        })
      );

      expect(clickedLink).not.toBeNull();
      expect(clickedLink?.download).toBe('Project Spec-20260908-192735.png');
      expect(clickedLink?.href).toContain('blob:mock-png-url');
      expect(createdBlob).not.toBeNull();

      // 驗證 finally 是否成功復原 container 樣式
      expect(container.style.width).toBe('');
      expect(container.style.maxWidth).toBe('');
      expect(container.style.boxSizing).toBe('');

      document.body.removeChild(container);
    });

    it('當在深色主題下匯出時，應正確傳遞曜黑背景色', async () => {
      document.documentElement.className = 'dark';
      const container = document.createElement('div');
      container.innerHTML = '<p>深色內容</p>';
      document.body.appendChild(container);

      const fixedDate = new Date(2026, 8, 8, 19, 27, 35);
      await exportPng(container, {
        title: 'DarkDocument',
        date: fixedDate,
        width: 1200,
      });

      expect(htmlToImage.toBlob).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          pixelRatio: 3,
          backgroundColor: '#010102',
          type: 'image/png',
        })
      );

      expect(clickedLink?.download).toBe('DarkDocument-20260908-192735.png');
      expect(container.style.width).toBe('');

      document.body.removeChild(container);
      document.documentElement.className = 'light';
    });

    it('當 toBlob 回傳 null 時，應無縫降級至 toPng', async () => {
      vi.mocked(htmlToImage.toBlob).mockResolvedValueOnce(null);
      vi.mocked(htmlToImage.toPng).mockResolvedValueOnce('data:image/png;base64,fallback-data');

      const container = document.createElement('div');
      container.innerHTML = '<p>降級測試</p>';
      document.body.appendChild(container);

      await exportPng(container, {
        title: 'FallbackDoc',
        theme: 'light',
      });

      expect(htmlToImage.toPng).toHaveBeenCalled();
      expect(clickedLink?.href).toBe('data:image/png;base64,fallback-data');

      document.body.removeChild(container);
    });

    it('匯出手機直式 (412px) 時，應設定 412px 寬度並適配 20px 16px 邊距且安全復原', async () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>手機長圖內容</p>';
      document.body.appendChild(container);

      let capturedPadding = '';
      let capturedWidth = '';
      vi.mocked(htmlToImage.toBlob).mockImplementationOnce((node: HTMLElement) => {
        capturedPadding = node.style.padding;
        capturedWidth = node.style.width;
        return Promise.resolve(new Blob(['mobile-png'], { type: 'image/png' }));
      });

      await exportPng(container, {
        title: 'MobileDoc',
        width: 412,
      });

      expect(capturedWidth).toBe('412px');
      expect(capturedPadding).toBe('20px 16px');
      expect(container.style.width).toBe('');
      expect(container.style.padding).toBe('');

      document.body.removeChild(container);
    });

    it('匯出平板直式 (834px) 時，應設定 834px 寬度並適配 32px 28px 邊距且安全復原', async () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>平板長圖內容</p>';
      document.body.appendChild(container);

      let capturedPadding = '';
      let capturedWidth = '';
      vi.mocked(htmlToImage.toBlob).mockImplementationOnce((node: HTMLElement) => {
        capturedPadding = node.style.padding;
        capturedWidth = node.style.width;
        return Promise.resolve(new Blob(['tablet-png'], { type: 'image/png' }));
      });

      await exportPng(container, {
        title: 'TabletDoc',
        width: 834,
      });

      expect(capturedWidth).toBe('834px');
      expect(capturedPadding).toBe('32px 28px');
      expect(container.style.width).toBe('');
      expect(container.style.padding).toBe('');

      document.body.removeChild(container);
    });
  });
});
