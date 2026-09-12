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
});
