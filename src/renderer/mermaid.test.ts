// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getActiveTheme, setMermaidTheme, renderMermaidDiagrams } from './mermaid';

describe('Mermaid Renderer (主題切換與圖表渲染防護)', () => {
  let originalGetBBox: any;

  beforeEach(() => {
    // 設置 JSDOM 缺失之 SVG getBBox 模擬，使 Mermaid 佈局計算順暢執行
    if (typeof window !== 'undefined' && window.SVGElement) {
      originalGetBBox = (window.SVGElement.prototype as any).getBBox;
      (window.SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 100, height: 40 });
    }
    document.documentElement.className = 'light';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (typeof window !== 'undefined' && window.SVGElement && originalGetBBox) {
      (window.SVGElement.prototype as any).getBBox = originalGetBBox;
    }
    document.documentElement.className = 'light';
    document.body.innerHTML = '';
  });

  describe('主題偵測與狀態管理 (getActiveTheme & setMermaidTheme)', () => {
    it('在 html class 為 light 時，getActiveTheme 應回傳 light', () => {
      document.documentElement.className = 'light';
      expect(getActiveTheme()).toBe('light');
    });

    it('在 html class 為 dark 時，getActiveTheme 應回傳 dark', () => {
      document.documentElement.className = 'dark';
      expect(getActiveTheme()).toBe('dark');
    });

    it('在 html 未帶有 dark 類別時，應預設回傳 light', () => {
      document.documentElement.className = '';
      expect(getActiveTheme()).toBe('light');
    });

    it('呼叫 setMermaidTheme 應正常運作不拋出異常', () => {
      expect(() => setMermaidTheme('dark')).not.toThrow();
      expect(() => setMermaidTheme('light')).not.toThrow();
    });
  });

  describe('圖表渲染管線 (renderMermaidDiagrams)', () => {
    it('容器內無任何 .mermaid-diagram 時，應快速返回 true', async () => {
      const container = document.createElement('div');
      const result = await renderMermaidDiagrams(container);
      expect(result).toBe(true);
    });

    it('冷啟動在淺色主題下點擊範例圖表時，應套用淺色樣式而非深色全黑樣式 (Issue #11)', async () => {
      // 模擬冷啟動進入 light 主題
      document.documentElement.className = 'light';

      const container = document.createElement('div');
      const diagramEl = document.createElement('div');
      diagramEl.className = 'mermaid-diagram';
      diagramEl.dataset.raw = encodeURIComponent('graph TD\nA[開始] --> B[結束]');
      container.appendChild(diagramEl);
      document.body.appendChild(container);

      const result = await renderMermaidDiagrams(container, 'light');
      expect(result).toBe(true);
      expect(diagramEl.classList.contains('rendered')).toBe(true);

      const svg = diagramEl.querySelector('svg');
      expect(svg).not.toBeNull();

      // 檢查樣式：深色主題時節點 rect fill 為 #1f2020（全黑），淺色主題下應為淺色紫色系 #ECECFF
      const styleContent = svg?.querySelector('style')?.textContent || '';
      expect(styleContent).toContain('fill:#ECECFF');
      expect(styleContent).not.toContain('fill:#1f2020');
    });

    it('切換至深色主題後，應自動套用深色圖表樣式', async () => {
      document.documentElement.className = 'dark';

      const container = document.createElement('div');
      const diagramEl = document.createElement('div');
      diagramEl.className = 'mermaid-diagram';
      diagramEl.dataset.raw = encodeURIComponent('graph TD\nC[步驟1] --> D[步驟2]');
      container.appendChild(diagramEl);
      document.body.appendChild(container);

      const result = await renderMermaidDiagrams(container, 'dark');
      expect(result).toBe(true);
      expect(diagramEl.classList.contains('rendered')).toBe(true);

      const svg = diagramEl.querySelector('svg');
      expect(svg).not.toBeNull();

      const styleContent = svg?.querySelector('style')?.textContent || '';
      expect(styleContent).toContain('fill:#1f2020');
    });

    it('切換至深色主題後再切回淺色主題，應正確恢復淺色樣式', async () => {
      // 1. 先設為深色並渲染
      document.documentElement.className = 'dark';
      const containerDark = document.createElement('div');
      const diagramDark = document.createElement('div');
      diagramDark.className = 'mermaid-diagram';
      diagramDark.dataset.raw = encodeURIComponent('graph TD\nA[節點A] --> B[節點B]');
      containerDark.appendChild(diagramDark);
      document.body.appendChild(containerDark);

      await renderMermaidDiagrams(containerDark, 'dark');

      // 2. 切回淺色並渲染
      document.documentElement.className = 'light';
      const containerLight = document.createElement('div');
      const diagramLight = document.createElement('div');
      diagramLight.className = 'mermaid-diagram';
      diagramLight.dataset.raw = encodeURIComponent('graph TD\nA[節點A] --> B[節點B]');
      containerLight.appendChild(diagramLight);
      document.body.appendChild(containerLight);

      const result = await renderMermaidDiagrams(containerLight, 'light');
      expect(result).toBe(true);
      expect(diagramLight.classList.contains('rendered')).toBe(true);

      const svg = diagramLight.querySelector('svg');
      expect(svg).not.toBeNull();

      const styleContent = svg?.querySelector('style')?.textContent || '';
      expect(styleContent).toContain('fill:#ECECFF');
      expect(styleContent).not.toContain('fill:#1f2020');
    });

    it('冷啟動在淺色主題下渲染時序圖 (sequenceDiagram)，應成功產生 SVG 且不拋錯', async () => {
      document.documentElement.className = 'light';

      const seqCode = `sequenceDiagram
        autonumber
        actor User as 使用者
        participant CM as CodeMirror
        User->>CM: 輸入文字
        CM-->>User: 呈現畫面`;

      const container = document.createElement('div');
      const diagramEl = document.createElement('div');
      diagramEl.className = 'mermaid-diagram';
      diagramEl.dataset.raw = encodeURIComponent(seqCode);
      container.appendChild(diagramEl);
      document.body.appendChild(container);

      const result = await renderMermaidDiagrams(container, 'light');
      expect(result).toBe(true);
      expect(diagramEl.classList.contains('rendered')).toBe(true);

      const svg = diagramEl.querySelector('svg');
      expect(svg).not.toBeNull();
    });

    it('當語法不完整或錯誤時，應觸發 Error Boundary 並清除殘留 DOM 節點', async () => {
      const container = document.createElement('div');
      const diagramEl = document.createElement('div');
      diagramEl.className = 'mermaid-diagram';
      // 故意提供破損不合法的 Mermaid 語法
      diagramEl.dataset.raw = encodeURIComponent('graph TD\n[BrokenSyntax???');
      container.appendChild(diagramEl);
      document.body.appendChild(container);

      const result = await renderMermaidDiagrams(container);
      expect(result).toBe(false);

      const errorBoundary = diagramEl.querySelector('.mermaid-error');
      expect(errorBoundary).not.toBeNull();
      expect(errorBoundary?.textContent).toContain('Mermaid 圖表解析中');
    });

    it('當原始碼為純空白時，應略過該節點且不產生錯誤', async () => {
      const container = document.createElement('div');
      const diagramEl = document.createElement('div');
      diagramEl.className = 'mermaid-diagram';
      diagramEl.dataset.raw = encodeURIComponent('   \n\t  ');
      container.appendChild(diagramEl);
      document.body.appendChild(container);

      const result = await renderMermaidDiagrams(container);
      expect(result).toBe(true);
      expect(diagramEl.querySelector('svg')).toBeNull();
    });
  });
});
