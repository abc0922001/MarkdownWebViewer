/**
 * PNG 圖片匯出模組 (PNG Exporter)
 *
 * 專為 MarkdownWebViewer 打造之純前端高解析度長圖匯出器。
 * 透過依需求動態載入 html-to-image 函式庫，支援完整預覽內容（包含 Mermaid 向量圖表、
 * 程式碼區塊、表格、任務清單與警示區塊）之無損繪製。
 *
 * 具備以下核心架構升級：
 * 1. 隔離沙盒重排架構 (Isolated Sandbox Reflow)：在 DOM 底層建立專屬離屏沙盒容器進行完整深層複製（Deep Clone），
 *    徹底避免污染或修改主畫面實際預覽元素，消除畫面跳動（UI Flickering）與捲動震顫風險。
 * 2. 寬度自適應與響應式排版 (Responsive Adaptive Layout)：支援手機直式 412px（適配 6.3 吋 18:9）、
 *    平板直式 834px（適配 11 吋 4:3）與自適應等寬排版，動態計算標題字級、內文字距與適配內距。
 * 3. 表格與程式碼防截斷保護 (Table & Pre Overflow Protection)：自動重設表格為標準 display: table 與
 *    word-break: break-word 換行機制，徹底消除靜態圖片中無效之水平捲軸，確保所有資料欄位完整呈現。
 * 4. 向量圖表自動縮放 (Mermaid SVG Auto-Scaling)：限制 Mermaid 向量圖表寬度不超出容器邊界，自適應縮放。
 * 5. 3x Retina 級超高解析度 (3x High-DPI Rendering)：預設採用 pixelRatio = 3，確保文字筆觸與向量圖形清晰銳利。
 * 6. 主題色彩精準契合 (Linear Surface Tokens Alignment)：曜黑深色（#010102）與紙白淺色（#FFFFFF）
 *    嚴格對齊 Surface Ladder 與 Hairline 設計規範。
 * 7. 安全記憶體與 DOM 生命週期管理：使用 Blob 與 Object URL 觸發瀏覽器原生下載，排程撤銷 URL，並在 finally 區塊 100% 清除沙盒節點。
 */

export interface PngExportOptions {
  /**
   * 文件標題與下載檔名基準，預設為 'Untitled'
   */
  title?: string;
  /**
   * 欲套用之色彩主題（'dark' | 'light'），預設依據目前 DOM 狀態自動判斷
   */
  theme?: 'dark' | 'light';
  /**
   * 圖片寬度（像素數值如 412、834、1200，或 'auto' 自適應目前預覽視窗寬度），預設為 'auto'
   */
  width?: number | 'auto';
  /**
   * 繪圖像素倍率（Device Pixel Ratio），預設為 3（3x 超高解析度）
   */
  pixelRatio?: number;
  /**
   * 自訂日期時間物件（供測試與時間戳記格式化使用），預設為 new Date()
   */
  date?: Date;
}

/**
 * 將 Date 物件格式化為年月日時分秒時間戳記字串（YYYYMMDD-HHmmss）。
 *
 * @param date 欲格式化之 Date 物件，預設為目前時間
 * @returns 格式化之時間戳記字串（例如：'20260908-192735'）
 */
export function formatTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

/**
 * 依據原始文件名稱與時間戳記生成符合規範之 PNG 下載檔名。
 *
 * 自動去除既有之副檔名（如 .md、.html、.png 等），並在後綴串接精確至秒的時間戳記。
 * 格式範例：'Untitled-20260908-192735.png'
 *
 * @param title 原始標題或檔名
 * @param date 欲標註之日期時間物件，預設為目前時間
 * @returns 符合規範之 PNG 檔案名稱
 */
export function formatPngFilename(title: string, date: Date = new Date()): string {
  const cleanTitle = title.trim();
  const baseName = cleanTitle.replace(/\.[^/.]+$/, '').trim() || 'Untitled';
  const timestamp = formatTimestamp(date);
  return `${baseName}-${timestamp}.png`;
}

/**
 * 產生隔離沙盒專屬之防截斷與響應式排版樣式字串。
 *
 * @param isLight 是否為淺色視覺主題
 * @param isMobile 是否為手機直式窄寬度規格（寬度 <= 500px）
 * @param isTablet 是否為平板直式規格（寬度 501px ~ 900px）
 * @returns 內嵌於隔離沙盒容器內之 CSS 樣式字串
 */
export function buildExportSandboxStyles(
  isLight: boolean,
  isMobile: boolean,
  isTablet: boolean
): string {
  const textColor = isLight ? '#1F2328' : '#EDEDED';
  const surfaceColor = isLight ? '#F5F6F7' : '#0F1011';
  const surfaceElevatedColor = isLight ? '#EBECEE' : '#141516';
  const borderColor = isLight ? '#E5E7EB' : '#23252A';

  const tableFontSize = isMobile ? '11px' : (isTablet ? '12.5px' : '13.5px');
  const tableCellPadding = isMobile ? '6px 6px' : (isTablet ? '8px 10px' : '10px 14px');
  const tableLineHeight = isMobile ? '1.4' : '1.5';

  const preFontSize = isMobile ? '12px' : '13px';
  const prePadding = isMobile ? '10px 12px' : '14px 18px';

  const mermaidPadding = isMobile ? '12px' : (isTablet ? '16px' : '20px');

  const h1Size = isMobile ? '1.45em' : (isTablet ? '1.7em' : '2em');
  const h2Size = isMobile ? '1.25em' : (isTablet ? '1.35em' : '1.5em');
  const h3Size = isMobile ? '1.1em' : (isTablet ? '1.18em' : '1.25em');

  const bodyFontSize = isMobile ? '13px' : (isTablet ? '14px' : '14.5px');
  const bodyLineHeight = isMobile ? '1.6' : '1.75';

  return `
    .png-export-sandbox, .png-export-sandbox * {
      scrollbar-width: none !important;
    }
    .png-export-sandbox *::-webkit-scrollbar {
      display: none !important;
    }
    .png-export-sandbox {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif !important;
    }
    .png-export-sandbox table {
      display: table !important;
      width: 100% !important;
      max-width: 100% !important;
      table-layout: auto !important;
      overflow: visible !important;
      border-collapse: collapse !important;
      margin: 1.5em 0 !important;
      background: ${surfaceColor} !important;
      border: 1px solid ${borderColor} !important;
      border-radius: 8px !important;
    }
    .png-export-sandbox th, .png-export-sandbox td {
      border: 1px solid ${borderColor} !important;
      padding: ${tableCellPadding} !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
      white-space: normal !important;
      font-size: ${tableFontSize} !important;
      line-height: ${tableLineHeight} !important;
    }
    .png-export-sandbox th {
      background-color: ${surfaceElevatedColor} !important;
      color: ${textColor} !important;
      font-weight: 600 !important;
    }
    .png-export-sandbox pre {
      white-space: pre-wrap !important;
      word-break: break-word !important;
      overflow: visible !important;
      padding: ${prePadding} !important;
      font-size: ${preFontSize} !important;
      border-radius: 12px !important;
      background-color: ${surfaceColor} !important;
      border: 1px solid ${borderColor} !important;
    }
    .png-export-sandbox .mermaid-wrapper {
      overflow: visible !important;
      padding: ${mermaidPadding} !important;
      border-radius: 12px !important;
      background: ${surfaceColor} !important;
      border: 1px solid ${borderColor} !important;
    }
    .png-export-sandbox .mermaid-wrapper svg {
      max-width: 100% !important;
      height: auto !important;
    }
    .png-export-sandbox h1 { font-size: ${h1Size} !important; }
    .png-export-sandbox h2 { font-size: ${h2Size} !important; }
    .png-export-sandbox h3 { font-size: ${h3Size} !important; }
    .png-export-sandbox p, .png-export-sandbox li {
      font-size: ${bodyFontSize} !important;
      line-height: ${bodyLineHeight} !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
    }
  `;
}

/**
 * 匯出包含完整預覽內容之高品質 PNG 長圖檔案。
 *
 * 具備以下核心技術特點：
 * 1. 隔離沙盒重排架構 (Isolated Sandbox Reflow)：在 DOM 底層建立專屬離屏沙盒容器進行完整深層複製（Deep Clone），
 *    徹底避免污染或修改主畫面實際預覽元素，消除畫面跳動（UI Flickering）與捲動震顫風險。
 * 2. 寬度自適應與響應式排版 (Responsive Adaptive Layout)：支援手機直式 412px（適配 6.3 吋 18:9）、
 *    平板直式 834px（適配 11 吋 4:3）與自適應等寬排版，動態計算標題字級、內文字距與適配內距。
 * 3. 表格與程式碼防截斷保護 (Table & Pre Overflow Protection)：自動重設表格為標準 display: table 與
 *    word-break: break-word 換行機制，徹底消除靜態圖片中無效之水平捲軸，確保所有資料欄位完整呈現。
 * 4. 向量圖表自動縮放 (Mermaid SVG Auto-Scaling)：限制 Mermaid 向量圖表寬度不超出容器邊界，自適應縮放。
 * 5. 3x Retina 級超高解析度 (3x High-DPI Rendering)：預設採用 pixelRatio = 3，確保文字筆觸與向量圖形清晰銳利。
 * 6. 主題色彩精準契合 (Linear Surface Tokens Alignment)：曜黑深色（#010102）與紙白淺色（#FFFFFF）
 *    嚴格對齊 Surface Ladder 與 Hairline 設計規範。
 * 7. 安全記憶體與 DOM 生命週期管理：使用 Blob 與 Object URL 觸發瀏覽器原生下載，排程撤銷 URL，並在 finally 區塊 100% 清除沙盒節點。
 *
 * @param previewElement 包含已渲染 Markdown 與圖表之預覽 DOM 容器
 * @param options PNG 匯出配置選項
 * @throws 當轉換過程發生錯誤或 DOM 無法解析時拋出例外
 */
export function exportPng(
  previewElement: HTMLElement,
  options: PngExportOptions = {}
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    // 解析主題設定：未顯式指定時自 DOM 根節點偵測
    const isDomDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const theme = options.theme ?? (isDomDark ? 'dark' : 'light');
    const isLight = theme === 'light';
    const backgroundColor = isLight ? '#FFFFFF' : '#010102';
    const textColor = isLight ? '#1F2328' : '#EDEDED';
    const pixelRatio = options.pixelRatio ?? 3;
    const requestedWidth = options.width ?? 'auto';
    const finalFilename = formatPngFilename(options.title ?? 'Untitled', options.date);

    // 解析目標輸出寬度與響應式內距（未顯式指定像素時，依據目前預覽容器實際寬度自適應）
    const targetWidth = typeof requestedWidth === 'number'
      ? requestedWidth
      : Math.max(320, previewElement.offsetWidth || previewElement.clientWidth || 860);

    const isMobile = targetWidth <= 500;
    const isTablet = targetWidth > 500 && targetWidth <= 900;
    const padding = isMobile ? '20px 16px' : (isTablet ? '32px 28px' : '36px 36px');

    // 建立隔離沙盒容器，置於 body 底層進行真實重排，絕不污染實際視圖
    const sandbox = document.createElement('div');
    sandbox.className = `png-export-sandbox markdown-body ${theme}`;
    sandbox.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: ${targetWidth}px;
      max-width: ${targetWidth}px;
      box-sizing: border-box;
      padding: ${padding};
      background-color: ${backgroundColor};
      color: ${textColor};
      z-index: -9999;
      visibility: visible;
      pointer-events: none;
      margin: 0;
    `;

    // 深度複製預覽節點並重設外層盒模型約束，使其完全繼承沙盒之寬度排版
    const clone = previewElement.cloneNode(true) as HTMLElement;
    clone.style.cssText = `
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      background-color: transparent !important;
      overflow: visible !important;
    `;

    // 注入專屬長圖匯出防截斷與防捲軸樣式規則
    const styleEl = document.createElement('style');
    styleEl.textContent = buildExportSandboxStyles(isLight, isMobile, isTablet);

    sandbox.appendChild(styleEl);
    sandbox.appendChild(clone);
    document.body.appendChild(sandbox);

    try {
      // 等候瀏覽器完成重排 (Reflow)
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        await new Promise<void>((r) => {
          window.requestAnimationFrame(() => {
            setTimeout(r, 20);
          });
        });
      }

      // 依需求動態匯入 html-to-image 模組
      const { toBlob, toPng } = await import('html-to-image');

      // 優先採用 toBlob 產生二進位串流，規避超長 Data URL 可能觸發之瀏覽器長度限制
      let downloadUrl: string;
      let shouldRevoke = false;

      try {
        const blob = await toBlob(sandbox, {
          pixelRatio,
          backgroundColor,
          type: 'image/png',
        });

        if (blob) {
          downloadUrl = URL.createObjectURL(blob);
          shouldRevoke = true;
        } else {
          // 若環境或瀏覽器無法產出 Blob，降級使用 toPng Data URL
          downloadUrl = await toPng(sandbox, {
            pixelRatio,
            backgroundColor,
          });
        }
      } catch (blobErr) {
        // 降級保護：若 toBlob 發生非預期錯誤，改以 toPng 重新嘗試
        downloadUrl = await toPng(sandbox, {
          pixelRatio,
          backgroundColor,
        });
      }

      // 建立虛擬 <a> 標籤並觸發點選下載
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 若使用 Object URL，排程延遲 1000ms 釋放記憶體
      if (shouldRevoke) {
        setTimeout(() => {
          URL.revokeObjectURL(downloadUrl);
        }, 1000);
      }

      resolve();
    } catch (err) {
      console.error('[PNG Exporter] 匯出圖片過程發生錯誤:', err);
      reject(err);
    } finally {
      // 確保無論成功或失敗，皆 100% 清除隔離沙盒容器，零 DOM 殘留
      if (sandbox.parentNode) {
        sandbox.parentNode.removeChild(sandbox);
      }
    }
  });
}

