import { describe, it, expect, beforeEach } from 'vitest';
import { renderKatexMath, getKatexInstance } from './katex';

describe('KaTeX 數學公式動態渲染模組 (renderKatexMath)', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('當容器無任何公式標籤時，應直接回傳 true 且不進行多餘運算', async () => {
    container.innerHTML = '<p>一般文字段落，無任何數學公式</p>';
    const result = await renderKatexMath(container);
    expect(result).toBe(true);
    expect(container.innerHTML).toBe('<p>一般文字段落，無任何數學公式</p>');
  });

  it('應正確渲染行內公式 (.katex-math)', async () => {
    const rawFormula = 'E = mc^2';
    container.innerHTML = `<span class="katex-math" data-math="${encodeURIComponent(rawFormula)}">${rawFormula}</span>`;

    const result = await renderKatexMath(container);
    expect(result).toBe(true);

    const katexEl = container.querySelector('.katex');
    expect(katexEl).not.toBeNull();
    // 應包含 MathML 或 HTML 結構
    expect(container.innerHTML).toContain('katex-html');
  });

  it('應正確渲染獨立展示區塊公式 (.katex-math-block)', async () => {
    const rawFormula = '\\frac{a}{b}';
    container.innerHTML = `<div class="katex-display-wrapper"><div class="katex-math-block" data-math="${encodeURIComponent(rawFormula)}">${rawFormula}</div></div>`;

    const result = await renderKatexMath(container);
    expect(result).toBe(true);

    const displayEl = container.querySelector('.katex-display');
    expect(displayEl).not.toBeNull();
    expect(container.innerHTML).toContain('mfrac');
  });

  it('遇到破損或無效之 LaTeX 語法時應平穩降級顯示友善錯誤提示且不拋出例外', async () => {
    const brokenFormula = '\\unknownmacro{123';
    container.innerHTML = `<span class="katex-math" data-math="${encodeURIComponent(brokenFormula)}">${brokenFormula}</span>`;

    const result = await renderKatexMath(container);
    expect(result).toBe(true);

    // KaTeX throwOnError: false 會在 DOM 內標記錯誤或產生錯誤節點
    expect(container.innerHTML).toMatch(/katex-error|errorColor|\\unknownmacro/);
  });

  it('getKatexInstance 應正常快取模組實例，重複呼叫不重複載入', async () => {
    const inst1 = await getKatexInstance();
    const inst2 = await getKatexInstance();
    expect(inst1).toBe(inst2);
    expect(typeof inst1.render).toBe('function');
  });

  it('渲染結果應只包含 HTML 結構而不包含 MathML 結構，防禦符號重複顯示缺陷', async () => {
    const rawFormula = '\\rightarrow';
    container.innerHTML = `<span class="katex-math" data-math="${encodeURIComponent(rawFormula)}">${rawFormula}</span>`;

    const result = await renderKatexMath(container);
    expect(result).toBe(true);

    // 應只包含 katex-html，絕不包含 katex-mathml 輔助結構
    expect(container.innerHTML).toContain('katex-html');
    expect(container.innerHTML).not.toContain('katex-mathml');
    expect(container.querySelector('.katex-mathml')).toBeNull();
  });

  it('應正確渲染 issue 測試案例中的所有公式類型且無重複符號', async () => {
    // 包含基礎箭頭、數學關係、分數結構、上下標混合、複合公式與獨立區塊公式
    const testCases = [
      { raw: '\\rightarrow', isBlock: false, expectedText: '→' },
      { raw: '\\downarrow', isBlock: false, expectedText: '↓' },
      { raw: 'x \\neq y', isBlock: false, expectedText: 'x ≠ y' },
      { raw: 'a \\leq b \\approx c', isBlock: false, expectedText: 'a ≤ b ≈ c' },
      { raw: '\\frac{1}{2}', isBlock: false, expectedText: '21' }, // Note: HTML output has 1 and 2, but single instance
      { raw: '\\frac{a+b}{c}', isBlock: false, expectedText: 'ca+b' },
      { raw: 'x^2 + y_1 = 10^{n+1}', isBlock: false, expectedText: 'x2 + y1 = 10n+1' },
      { raw: '\\alpha \\implies \\beta', isBlock: false, expectedText: 'α ⟹ β' },
      { raw: '\\sum \\approx \\infty', isBlock: false, expectedText: '∑ ≈ ∞' },
      { raw: '\\lambda = 0.5', isBlock: true, expectedText: 'λ = 0.5' },
    ];

    container.innerHTML = testCases.map((tc, idx) => {
      const escaped = encodeURIComponent(tc.raw);
      return tc.isBlock
        ? `<div class="katex-display-wrapper"><div id="tc-${idx}" class="katex-math-block" data-math="${escaped}">${tc.raw}</div></div>`
        : `<span id="tc-${idx}" class="katex-math" data-math="${escaped}">${tc.raw}</span>`;
    }).join('\n');

    const result = await renderKatexMath(container);
    expect(result).toBe(true);

    // 每個案例應皆正確渲染且無任何 katex-mathml 節點
    expect(container.querySelectorAll('.katex-mathml').length).toBe(0);
    expect(container.querySelectorAll('.katex-html').length).toBe(testCases.length);

    // 驗證箭頭符號僅出現單一箭頭，絕無重複 "→ →"
    const arrowNode = container.querySelector('#tc-0')!;
    expect(arrowNode.textContent?.trim()).toBe('→');

    // 驗證無障礙屬性 role='math' 與 aria-label
    expect(arrowNode.getAttribute('role')).toBe('math');
    expect(arrowNode.getAttribute('aria-label')).toBe('\\rightarrow');

    // 驗證向下箭頭僅出現單一 "↓"
    const downArrowNode = container.querySelector('#tc-1')!;
    expect(downArrowNode.textContent?.trim()).toBe('↓');
    expect(downArrowNode.getAttribute('role')).toBe('math');
    expect(downArrowNode.getAttribute('aria-label')).toBe('\\downarrow');

    // 驗證區塊公式單行呈現
    const blockNode = container.querySelector('#tc-9')!;
    expect(blockNode.textContent?.trim()).toBe('λ=0.5');
    expect(blockNode.getAttribute('role')).toBe('math');
    expect(blockNode.getAttribute('aria-label')).toBe('\\lambda = 0.5');
  });

  it('端對端完整管線：從原文 Markdown 解析至 KaTeX 渲染，不應產生重複符號', async () => {
    const { renderMarkdownToHtml } = await import('./markdown');
    const issueMarkdown = `從 A $\\rightarrow$ B，再向下 $\\downarrow$
$x ≠ y$ 且 $a ≤ b ≈ c$
結果為 $\\frac{1}{2}$ 或 $\\frac{a+b}{c}$
公式 $x^2 + y_1 = 10^{n+1}$
若 $\\alpha \\implies \\beta$，則 $\\sum ≈ \\infty$
$$\\lambda = 0.5$$`;

    const html = renderMarkdownToHtml(issueMarkdown);
    container.innerHTML = html;

    const success = await renderKatexMath(container);
    expect(success).toBe(true);

    // 驗證完全無 MathML 外溢節點
    expect(container.querySelectorAll('.katex-mathml').length).toBe(0);

    // 全文包含 10 個公式節點
    const katexHtmlNodes = container.querySelectorAll('.katex-html');
    expect(katexHtmlNodes.length).toBe(10);

    // 驗證文字內容中不會出現雙箭頭 "→ →" 或 "↓↓"
    const pElements = container.querySelectorAll('p');
    const p1Text = pElements[0]?.textContent || '';
    expect(p1Text).toContain('從 A');
    expect(p1Text).not.toMatch(/→\s*→/);
    expect(p1Text).not.toMatch(/↓\s*↓/);

    // 驗證無多行重複 block 公式
    const blockWrapper = container.querySelectorAll('.katex-display-wrapper');
    expect(blockWrapper.length).toBe(1);
  });
});
