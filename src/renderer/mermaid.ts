/** 快取之 Mermaid.js 動態匯入模組實例 */
let mermaidModule: typeof import('mermaid').default | null = null;
/** 渲染序號 Token，用於競態條件（Race Condition）防禦，防止過期的非同步回呼覆蓋最新內容 */
let currentRenderToken = 0;
/**
 * 取得當前環境或 DOM 根節點所套用之色彩主題。
 * 優先依據 DOM 根節點（html）之 class 進行偵測，若包含 'dark' 則為深色主題，否則為淺色主題。
 *
 * @returns 當前作用中之主題（'dark' | 'light'）
 */
export function getActiveTheme(): 'dark' | 'light' {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }
  return 'light';
}

/** 當前作用中之圖表色彩主題，依據 DOM 根節點狀態自動初始化 */
let currentTheme: 'dark' | 'light' = getActiveTheme();

/**
 * 依據指定主題產生適配 Linear Design System 之 Mermaid 設定物件。
 *
 * @param theme 目標視覺主題（'dark' | 'light'）
 * @returns Mermaid 初始化設定選項
 */
function getMermaidConfig(theme: 'dark' | 'light') {
  if (theme === 'light') {
    return {
      startOnLoad: false,
      theme: 'default' as const,
      securityLevel: 'loose' as const,
      fontFamily: 'Inter, sans-serif',
      themeVariables: {
        darkMode: false,
        background: '#F5F6F7',
        primaryColor: '#5E6AD2',
        primaryTextColor: '#08090A',
        primaryBorderColor: '#5E6AD2',
        lineColor: '#4B5563',
        secondaryColor: '#EBECEE',
        tertiaryColor: '#FFFFFF',
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
      },
    };
  }

  return {
    startOnLoad: false,
    theme: 'dark' as const,
    securityLevel: 'loose' as const,
    fontFamily: 'Inter, sans-serif',
    themeVariables: {
      darkMode: true,
      background: '#0F1011',
      primaryColor: '#5E6AD2',
      primaryTextColor: '#F7F8F8',
      primaryBorderColor: '#5E6AD2',
      lineColor: '#8A8F98',
      secondaryColor: '#141516',
      tertiaryColor: '#010102',
      fontFamily: 'Inter, sans-serif',
      fontSize: '13px',
    },
  };
}

/**
 * 延遲非同步載入 Mermaid.js 核心庫並套用主題初始化。
 *
 * 僅於首次偵測到圖表渲染需求時才載入模組，降低首屏 Bundle 載入體積。
 *
 * @returns 初始化完畢之 Mermaid 實例
 */
async function getMermaid() {
  if (!mermaidModule) {
    const imported = await import('mermaid');
    const mermaid = imported.default;
    mermaid.initialize(getMermaidConfig(currentTheme));
    mermaidModule = mermaid;
  }
  return mermaidModule;
}

/**
 * 設定 Mermaid 向量圖表之渲染主題並重新配置核心引擎。
 *
 * @param theme 欲套用之視覺主題（'dark' | 'light'）
 */
export function setMermaidTheme(theme: 'dark' | 'light'): void {
  currentTheme = theme;
  if (mermaidModule) {
    mermaidModule.initialize(getMermaidConfig(theme));
  }
}

/**
 * 掃描並非同步渲染指定容器內之所有 Mermaid 圖表節點。
 *
 * 具備主題自動校準、渲染 Token 防競態檢查、孤立錯誤節點自動清除與錯誤邊界（Error Boundary）提示機制。
 *
 * @param container 包含 `.mermaid-diagram` 節點之容器 DOM 元素
 * @param theme 可選指定欲套用之視覺主題，未指定時自動依據 DOM 當前狀態校準
 * @returns 全部圖表渲染成功回傳 true，若存在語法錯誤或異常則回傳 false
 */
export async function renderMermaidDiagrams(
  container: HTMLElement,
  theme?: 'dark' | 'light'
): Promise<boolean> {
  const elements = container.querySelectorAll<HTMLElement>('.mermaid-diagram');
  if (elements.length === 0) {
    return true;
  }

  // 自動依據指定主題或 DOM 當前狀態校準 Mermaid 渲染配置
  const targetTheme = theme ?? getActiveTheme();
  if (targetTheme !== currentTheme) {
    setMermaidTheme(targetTheme);
  }

  // 累加渲染 Token，使後續輸入可立即使前次未完成之非同步流程作廢
  const token = ++currentRenderToken;
  let hasError = false;

  try {
    const mermaid = await getMermaid();
    if (token !== currentRenderToken) return true; // 捨棄過期之渲染請求

    for (let i = 0; i < elements.length; i++) {
      if (token !== currentRenderToken) return true;

      const element = elements[i];
      // 自 data-raw 屬性還原原始 Mermaid 語法字串
      const rawCode = element.dataset.raw ? decodeURIComponent(element.dataset.raw) : element.textContent || '';

      if (!rawCode.trim()) continue;

      const uniqueId = `mermaid-svg-${Date.now()}-${i}`;

      try {
        const { svg } = await mermaid.render(uniqueId, rawCode.trim());
        if (token !== currentRenderToken) return true;

        element.innerHTML = svg;
        element.classList.add('rendered');
      } catch (err: any) {
        if (token !== currentRenderToken) return true;
        hasError = true;
        
        // 清除 Mermaid 核心於 document.body 殘留之錯誤 DOM 節點
        const strayError = document.getElementById('d' + uniqueId);
        if (strayError) strayError.remove();

        const errMsg = err?.message || '語法未完成或錯誤';
        element.innerHTML = `
          <div class="mermaid-error">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Mermaid 圖表解析中 (${errMsg.split('\n')[0]})</span>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('Failed to load or render Mermaid:', err);
    return false;
  }

  return !hasError;
}
