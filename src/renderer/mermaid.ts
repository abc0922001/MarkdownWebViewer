import { mount } from 'ondine';
import { create, RenderError, type Render } from 'ondine/compiler/wasm';
import allWasmUrl from 'ondine/compiler/wasm/all.wasm?url';

/** 快取之 Ondine WASM 圖表編譯渲染器實例 */
let ondineRenderer: Render.create.ReturnType | null = null;
/** 快取之 WASM 載入與編譯 Promise，防止並行重複請求 */
let ondineLoadingPromise: Promise<Render.create.ReturnType> | null = null;
/** 渲染序號 Token，用於競態條件（Race Condition）防禦，防止過期的非同步回呼覆蓋最新內容 */
let currentRenderToken = 0;

/**
 * 對錯誤訊息字串進行 HTML 特殊字元跳脫，避免語法錯誤訊息內含標籤字元破壞 DOM。
 *
 * @param str 原始錯誤訊息字串
 * @returns 跳脫後之安全字串
 */
function escapeErrorHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 取得目前環境或 DOM 根節點所套用之色彩主題。
 * 優先依據 DOM 根節點（html）之 class 進行偵測，若包含 'dark' 則為深色主題，否則為淺色主題。
 *
 * @returns 目前作用中之主題（'dark' | 'light'）
 */
export function getActiveTheme(): 'dark' | 'light' {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }
  return 'light';
}

/** 目前作用中之圖表色彩主題，依據 DOM 根節點狀態自動初始化 */
let currentTheme: 'dark' | 'light' = getActiveTheme();

/**
 * 手動以預先編譯之 WebAssembly.Module 或 Base64 字串初始化 Ondine 渲染器。
 *
 * 供單元測試環境（JSDOM / Vitest）或自訂預載流程直接注入模組使用。
 *
 * @param wasmModule WebAssembly 模組實例或 Base64 編碼之 WASM 字串
 * @returns 初始化完畢之 Ondine 渲染器實例
 */
export function initOndineRenderer(
  wasmModule: WebAssembly.Module | string
): Render.create.ReturnType {
  ondineRenderer = create({ modules: { all: wasmModule } });
  ondineLoadingPromise = Promise.resolve(ondineRenderer);
  return ondineRenderer;
}

/**
 * 延遲非同步載入並串流編譯 Ondine (`all.wasm`) WebAssembly 圖表引擎。
 *
 * 僅於首次偵測到 `.mermaid-diagram` 渲染需求時才發起網路請求與 WASM 編譯，
 * 確保未包含圖表之文件維持 0 KB 額外執行期負擔。
 *
 * @returns 初始化完畢之 Ondine 渲染器實例
 */
async function getOndineRenderer(): Promise<Render.create.ReturnType> {
  if (ondineRenderer) {
    return ondineRenderer;
  }
  if (!ondineLoadingPromise) {
    ondineLoadingPromise = (async () => {
      try {
        let wasmModule: WebAssembly.Module;
        if (typeof WebAssembly.compileStreaming === 'function') {
          try {
            wasmModule = await WebAssembly.compileStreaming(fetch(allWasmUrl));
          } catch {
            // 若開發伺服器未回傳 application/wasm MIME 標頭，自動降級為 ArrayBuffer 編譯
            const response = await fetch(allWasmUrl);
            const buffer = await response.arrayBuffer();
            wasmModule = await WebAssembly.compile(buffer);
          }
        } else {
          const response = await fetch(allWasmUrl);
          const buffer = await response.arrayBuffer();
          wasmModule = await WebAssembly.compile(buffer);
        }
        ondineRenderer = create({ modules: { all: wasmModule } });
        return ondineRenderer;
      } catch (err) {
        ondineLoadingPromise = null;
        throw err;
      }
    })();
  }
  return ondineLoadingPromise;
}

/**
 * 設定 Mermaid / Ondine 向量圖表之渲染主題狀態。
 *
 * Ondine 透過 `--ondine-*` CSS 自訂屬性即時響應主題切換，無須重新初始化編譯器。
 *
 * @param theme 欲套用之視覺主題（'dark' | 'light'）
 */
export function setMermaidTheme(theme: 'dark' | 'light'): void {
  currentTheme = theme;
}

/**
 * 掃描並使用 Ondine Rust/WASM 引擎渲染指定容器內之所有 Mermaid 圖表節點。
 *
 * 具備主題狀態同步、渲染 Token 防競態檢查、210B `mount` 極速掛載與 `RenderError` 錯誤邊界提示機制。
 *
 * @param container 包含 `.mermaid-diagram` 節點之容器 DOM 元素
 * @param theme 可選指定欲套用之視覺主題，未指定時自動依據 DOM 目前狀態校準
 * @returns 全部圖表渲染成功回傳 true，若存在語法錯誤或例外則回傳 false
 */
export async function renderMermaidDiagrams(
  container: HTMLElement,
  theme?: 'dark' | 'light'
): Promise<boolean> {
  const elements = container.querySelectorAll<HTMLElement>('.mermaid-diagram');
  if (elements.length === 0) {
    return true;
  }

  // 自動依據指定主題或 DOM 目前狀態校準主題標記
  const targetTheme = theme ?? getActiveTheme();
  if (targetTheme !== currentTheme) {
    setMermaidTheme(targetTheme);
  }

  // 累加渲染 Token，使後續輸入可立即使前次未完成之非同步載入流程作廢
  const token = ++currentRenderToken;
  let hasError = false;

  try {
    const renderer = await getOndineRenderer();
    if (token !== currentRenderToken) return true; // 捨棄過期之渲染請求

    for (let i = 0; i < elements.length; i++) {
      if (token !== currentRenderToken) return true;

      const element = elements[i];
      // 自 data-raw 屬性還原原始 Mermaid 語法字串
      const rawCode = element.dataset.raw
        ? decodeURIComponent(element.dataset.raw)
        : element.textContent || '';

      if (!rawCode.trim()) continue;

      const idPrefix = `ondine-${token}-${i}`;

      try {
        const rendered = renderer.render(rawCode.trim(), {
          idPrefix,
          responsive: true,
        });
        if (token !== currentRenderToken) return true;

        mount(element, rendered);
        element.dataset.theme = targetTheme;
        element.classList.add('rendered');

        const svgEl = element.querySelector('svg');
        if (svgEl) {
          svgEl.setAttribute('data-theme', targetTheme);
        }
      } catch (err: unknown) {
        if (token !== currentRenderToken) return true;
        hasError = true;

        const rawMsg = err instanceof Error ? err.message : '語法未完成或錯誤';
        const firstLine = escapeErrorHtml(rawMsg.split('\n')[0]);
        const locationInfo =
          err instanceof RenderError && err.line > 0
            ? ` [行 ${err.line}${err.column > 0 ? `, 欄 ${err.column}` : ''}]`
            : '';

        element.innerHTML = `
          <div class="mermaid-error">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Mermaid 圖表解析中 (${firstLine}${locationInfo})</span>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('Failed to load or render Ondine Mermaid compiler:', err);
    return false;
  }

  return !hasError;
}
