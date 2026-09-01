import { describe, it, expect } from 'vitest';
import { renderMarkdownToHtml } from './markdown';

describe('Markdown Renderer (GFM & Alerts & Tasklists)', () => {
  it('應正確解析基礎 Markdown 語法（標題、段落、粗體、斜體、刪除線）', () => {
    const md = '# 標題 1\n\n這是**粗體**與*斜體*以及~~刪除線~~。';
    const html = renderMarkdownToHtml(md);

    expect(html).toContain('<h1>標題 1</h1>');
    expect(html).toContain('<strong>粗體</strong>');
    expect(html).toContain('<em>斜體</em>');
    expect(html).toContain('<s>刪除線</s>');
  });

  describe('GitHub Alerts 支援', () => {
    it('應正確解析 5 種標準 Alert 類型（NOTE, TIP, IMPORTANT, WARNING, CAUTION）', () => {
      const types = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'] as const;
      for (const type of types) {
        const md = `> [!${type}]\n> 這是 ${type} 的內容說明`;
        const html = renderMarkdownToHtml(md);

        expect(html).toContain(`markdown-alert-${type.toLowerCase()}`);
        expect(html).toContain(`<span>${type}</span>`);
        expect(html).toContain(`<p>這是 ${type} 的內容說明</p>`);
        expect(html).toContain('<svg');
      }
    });

    it('應支援大小寫不敏感之 Alert 標記（如 [!note], [!Warning]）', () => {
      const md = '> [!note]\n> 小寫測試\n\n> [!Warning]\n> 混合大小寫測試';
      const html = renderMarkdownToHtml(md);

      expect(html).toContain('markdown-alert-note');
      expect(html).toContain('<span>NOTE</span>');
      expect(html).toContain('markdown-alert-warning');
      expect(html).toContain('<span>WARNING</span>');
    });

    it('應支援 Alert 內部多段落內容', () => {
      const md = `> [!NOTE]
> 這是第一段內容。
> 
> 這是第二段詳細說明。
> 
> 這是第三段補充結論。`;

      const html = renderMarkdownToHtml(md);
      expect(html).toContain('markdown-alert-note');
      expect(html).toContain('<p>這是第一段內容。</p>');
      expect(html).toContain('<p>這是第二段詳細說明。</p>');
      expect(html).toContain('<p>這是第三段補充結論。</p>');
    });

    it('應支援 Alert 內部巢狀清單與程式碼區塊', () => {
      const md = `> [!TIP]
> 這是提示項目：
> - 清單項目 A
> - 清單項目 B
> 
> \`\`\`javascript
> const message = 'hello';
> \`\`\``;

      const html = renderMarkdownToHtml(md);
      expect(html).toContain('markdown-alert-tip');
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>清單項目 A</li>');
      expect(html).toContain('<li>清單項目 B</li>');
      expect(html).toContain('<pre class="hljs"><code class="language-javascript">');
    });

    it('應支援 Alert 內部巢狀 GFM 表格', () => {
      const md = `> [!WARNING]
> | 欄位 1 | 欄位 2 |
> | :--- | ---: |
> | 值 A | 值 B |`;

      const html = renderMarkdownToHtml(md);
      expect(html).toContain('markdown-alert-warning');
      expect(html).toContain('<table>');
      expect(html).toContain('欄位 1');
      expect(html).toContain('欄位 2');
      expect(html).toContain('值 A');
      expect(html).toContain('值 B');
    });

    it('普通 Blockquote 不應被誤轉為 Alert', () => {
      const md = '> 這是一般的引用文字，不包含警示標籤。\n> 第二行引用。';
      const html = renderMarkdownToHtml(md);

      expect(html).toContain('<blockquote>');
      expect(html).not.toContain('markdown-alert');
    });
  });

  describe('GFM Tasklists 核取清單支援', () => {
    it('應正確將 - [ ] 與 - [x] 轉為禁用狀態的 input checkbox', () => {
      const md = `- [ ] 待辦事項 1
- [x] 已完成事項 2
- [X] 大寫完成事項 3`;

      const html = renderMarkdownToHtml(md);
      expect(html).toContain('class="task-list-item"');
      expect(html).toContain('<input type="checkbox" class="task-list-item-checkbox" disabled');
      expect(html).toContain('待辦事項 1');
      expect(html).toContain('<input type="checkbox" class="task-list-item-checkbox" checked');
      expect(html).toContain('已完成事項 2');
      expect(html).toContain('大寫完成事項 3');
    });

    it('應支援巢狀任務清單結構', () => {
      const md = `- [ ] 主任務
  - [ ] 子任務 1
  - [x] 子任務 2`;

      const html = renderMarkdownToHtml(md);
      expect(html).toContain('class="task-list-item"');
      expect(html).toContain('主任務');
      expect(html).toContain('子任務 1');
      expect(html).toContain('子任務 2');
    });
  });

  describe('Mermaid 與程式碼高亮整合', () => {
    it('應正確將 mermaid 區塊轉換為 data-raw 佔位節點', () => {
      const md = '```mermaid\ngraph TD\nA --> B\n```';
      const html = renderMarkdownToHtml(md);

      expect(html).toContain('class="mermaid-wrapper"');
      expect(html).toContain('class="mermaid-diagram"');
      expect(html).toContain('data-raw="graph%20TD%0AA%20--%3E%20B"');
    });

    it('應正確高亮常見程式語言區塊', () => {
      const md = '```typescript\nconst count: number = 42;\n```';
      const html = renderMarkdownToHtml(md);

      expect(html).toContain('class="hljs"');
      expect(html).toContain('class="language-typescript"');
      expect(html).toContain('hljs-keyword');
    });
  });

  describe('DOMPurify 安全性過濾', () => {
    it('應過濾惡意 XSS 腳本標籤但保留 SVG 向量圖形', () => {
      const malicious = '<script>alert("XSS")</script><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"></circle></svg>';
      const html = renderMarkdownToHtml(malicious);

      expect(html).not.toContain('<script>');
      expect(html).toContain('<svg');
      expect(html).toContain('<circle');
    });

    it('應保留 Mermaid 常用的 defs, marker, use, filter 標籤與屬性', () => {
      const svgWithDefs = '<svg><defs><marker id="arrow" markerWidth="10" markerHeight="10"></marker></defs><path d="M0,0 L10,10" marker-end="url(#arrow)" transform="rotate(45)"></path></svg>';
      const html = renderMarkdownToHtml(svgWithDefs);

      expect(html).toContain('<defs>');
      expect(html).toContain('<marker');
      expect(html).toContain('marker-end="url(#arrow)"');
      expect(html).toContain('transform="rotate(45)"');
    });
  });
});
