/**
 * MarkdownWebViewer — KaTeX 數學公式動態非同步渲染模組
 *
 * 遵循 Linear Design System 與極致冷啟動架構設計：
 * 1. 僅當預覽區掃描到 `.katex-math` 或 `.katex-math-block` 節點時才動態非同步載入 KaTeX 核心與 CSS。
 * 2. 具備遞增渲染序號 Token，防禦快速連續輸入時的非同步競態條件（Race Condition）。
 * 3. 內建錯誤邊界（Error Boundary），語法錯誤時降級顯示友善錯誤提示，不阻斷整體預覽。
 */

import type katexType from 'katex';

/** 快取之 KaTeX 動態匯入模組實例 */
let katexModule: typeof katexType | null = null;

/** 渲染序號 Token，用於競態條件（Race Condition）防禦，防止過期的非同步回呼覆蓋最新內容 */
let currentRenderToken = 0;

/**
 * 對文字字串進行 HTML 特殊符號逸出處理，防止 XSS 與破壞標籤結構。
 *
 * @param str 欲處理之純文字字串
 * @returns 逸出後的 HTML 安全字串
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 依需求非同步載入 KaTeX 模組及其樣式表。
 *
 * 若模組已完成快取則直接回傳，避免重複載入。
 *
 * @returns KaTeX 模組實例物件
 */
export async function getKatexInstance(): Promise<typeof katexType> {
  if (!katexModule) {
    const [mod] = await Promise.all([
      import('katex'),
      import('katex/dist/katex.min.css'),
    ]);
    katexModule = (mod as any).default || mod;
  }
  return katexModule!;
}

/**
 * 掃描指定容器內部所有數學公式預留位置節點，並執行 KaTeX 渲染。
 *
 * 支援 `.katex-math`（行內公式）與 `.katex-math-block`（獨立區塊展示公式），
 * 讀取節點之 `data-math` 屬性還原原始 LaTeX 代碼並套用對應排版。
 * 輸出設定固定為 `output: 'html'`，防止 KaTeX 預設輸出 MathML 與 HTML 雙結構導致符號重複顯示。
 *
 * @param container 包含公式預留節點之父層 DOM 元素（如預覽容器）
 * @returns 渲染流程是否順利完成之 Promise（若遭新渲染中斷則回傳 false）
 */
export async function renderKatexMath(container: HTMLElement): Promise<boolean> {
  const mathNodes = container.querySelectorAll<HTMLElement>('.katex-math, .katex-math-block');
  if (mathNodes.length === 0) {
    return true;
  }

  // 取得此渲染週期之專屬序號 Token
  const renderToken = ++currentRenderToken;

  try {
    const katex = await getKatexInstance();

    // 若非同步載入期間已有新渲染任務啟動，則放棄當前過期回呼
    if (renderToken !== currentRenderToken) {
      return false;
    }

    mathNodes.forEach((node) => {
      const rawMath = node.getAttribute('data-math');
      const formula = rawMath ? decodeURIComponent(rawMath) : node.textContent || '';
      const isDisplay = node.classList.contains('katex-math-block');

      try {
        katex.render(formula, node, {
          displayMode: isDisplay,
          throwOnError: false,
          errorColor: '#F2555A',
          output: 'html',
        });
      } catch (err) {
        // 渲染發生例外時降級顯示友善錯誤標籤
        node.innerHTML = `<span class="katex-error" title="${escapeHtml(String(err))}">${escapeHtml(formula)}</span>`;
      }
    });

    return true;
  } catch (error) {
    console.error('KaTeX 載入或繪製失敗:', error);
    return false;
  }
}
