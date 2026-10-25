// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { wasm as allWasm } from 'ondine/compiler/wasm/all';
import {
  getActiveTheme,
  setMermaidTheme,
  initOndineRenderer,
  renderMermaidDiagrams,
} from './mermaid';

describe('Mermaid / Ondine Renderer (主題切換與圖表渲染防護)', () => {
  beforeAll(() => {
    // 於單元測試環境注入內嵌 Base64 WASM 模組，免除外部 HTTP Fetch 相依
    initOndineRenderer(allWasm);
  });

  beforeEach(() => {
    document.documentElement.className = 'light';
    document.body.innerHTML = '';
  });

  afterEach(() => {
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

    it('呼叫 setMermaidTheme 應正常運作不擲出例外', () => {
      expect(() => setMermaidTheme('dark')).not.toThrow();
      expect(() => setMermaidTheme('light')).not.toThrow();
    });
  });

  describe('圖表渲染管線 (renderMermaidDiagrams with Ondine)', () => {
    it('容器內無任何 .mermaid-diagram 時，應快速返回 true', async () => {
      const container = document.createElement('div');
      const result = await renderMermaidDiagrams(container);
      expect(result).toBe(true);
    });

    it('冷啟動在淺色主題下渲染流程圖，應透過 Ondine 產生具備 ondine-flowchart 類別與 light 主題標記之 SVG', async () => {
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
      expect(diagramEl.dataset.theme).toBe('light');

      const svg = diagramEl.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.classList.contains('ondine')).toBe(true);
      expect(svg?.classList.contains('ondine-flowchart')).toBe(true);
      expect(svg?.getAttribute('data-theme')).toBe('light');
      expect(svg?.textContent).toContain('開始');
      expect(svg?.textContent).toContain('結束');
    });

    it('切換至深色主題後，應自動套用 dark 主題標記並渲染 Ondine SVG', async () => {
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
      expect(diagramEl.dataset.theme).toBe('dark');

      const svg = diagramEl.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.classList.contains('ondine')).toBe(true);
      expect(svg?.getAttribute('data-theme')).toBe('dark');
    });

    it('切換至深色主題後再切回淺色主題，應正確更新為 light 主題標記', async () => {
      // 1. 先設為深色並渲染
      document.documentElement.className = 'dark';
      const containerDark = document.createElement('div');
      const diagramDark = document.createElement('div');
      diagramDark.className = 'mermaid-diagram';
      diagramDark.dataset.raw = encodeURIComponent('graph TD\nA[節點A] --> B[節點B]');
      containerDark.appendChild(diagramDark);
      document.body.appendChild(containerDark);

      await renderMermaidDiagrams(containerDark, 'dark');
      expect(diagramDark.dataset.theme).toBe('dark');

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
      expect(diagramLight.dataset.theme).toBe('light');

      const svg = diagramLight.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('data-theme')).toBe('light');
    });

    it('冷啟動在淺色主題下渲染時序圖 (sequenceDiagram)，應成功產生 ondine-sequence SVG 且不拋錯', async () => {
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
      expect(svg?.classList.contains('ondine')).toBe(true);
      expect(svg?.classList.contains('ondine-sequence')).toBe(true);
    });

    it('當語法不完整或錯誤時，應攔截 RenderError 並觸發 Error Boundary 提示', async () => {
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
