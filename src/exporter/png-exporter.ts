/**
 * PNG 圖片匯出模組 (PNG Exporter)
 *
 * 專為 MarkdownWebViewer 打造之純前端高解析度長圖匯出器。
 * 透過依需求動態載入 html-to-image 函式庫，支援完整預覽內容（包含 Mermaid 向量圖表、
 * 程式碼區塊、表格、任務清單與警示區塊）之無損繪製。
 * 支援 3x Retina 級超高解析度（Pixel Ratio = 3）、主題色彩同步、自訂寬度排版與精確至秒的時間戳記命名。
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
   * 圖片寬度（像素數值如 800、1200，或 'auto' 自適應目前元素寬度），預設為 'auto'
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
 * 匯出包含完整預覽內容之高品質 PNG 長圖檔案。
 *
 * 具備以下核心技術特點：
 * 1. 依需求動態載入：僅在觸發匯出時非同步載入 html-to-image 模組，維持冷啟動零開銷。
 * 2. 3x 超高解析度：預設採用 pixelRatio = 3，確保高解析螢幕檢視與列印輸出皆銳利清晰。
 * 3. 乾淨自適應寬度：支援 800px、1200px 或 auto 寬度，透過 try...finally 安全動態重排，不污染實際畫面。
 * 4. 主題色彩契合：自動抓取當前深色或淺色主題之背景色，緊密貼齊內文邊緣無多餘留白。
 * 5. 安全記憶體管理：使用 Blob 與 Object URL 觸發瀏覽器原生下載，並自動排程釋放記憶體。
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
    const pixelRatio = options.pixelRatio ?? 3;
    const width = options.width ?? 'auto';
    const finalFilename = formatPngFilename(options.title ?? 'Untitled', options.date);

    // 暫存既有樣式屬性，以便在 finally 區塊中完全恢復
    const originalWidth = previewElement.style.width;
    const originalMaxWidth = previewElement.style.maxWidth;
    const originalBoxSizing = previewElement.style.boxSizing;
    const originalPadding = previewElement.style.padding;
    const originalBgColor = previewElement.style.backgroundColor;

    try {
      // 若指定具體寬度（例如手機 412px 或平板 834px），動態賦予樣式以重新計算排版與行高折行
      if (typeof width === 'number') {
        previewElement.style.width = `${width}px`;
        previewElement.style.maxWidth = `${width}px`;
      }
      previewElement.style.boxSizing = 'border-box';
      // 依據裝置寬度動態適配內距（手機規格 <=500px 採用 20px 16px；平板或寬版採用 32px 28px）
      previewElement.style.padding = typeof width === 'number' && width <= 500 ? '20px 16px' : '32px 28px';
      previewElement.style.backgroundColor = backgroundColor;

      // 依需求動態匯入 html-to-image 模組
      const { toBlob, toPng } = await import('html-to-image');

      // 優先採用 toBlob 產生二進位串流，規避超長 Data URL 可能觸發之瀏覽器長度限制
      let downloadUrl: string;
      let shouldRevoke = false;

      try {
        const blob = await toBlob(previewElement, {
          pixelRatio,
          backgroundColor,
          type: 'image/png',
        });

        if (blob) {
          downloadUrl = URL.createObjectURL(blob);
          shouldRevoke = true;
        } else {
          // 若環境或瀏覽器無法產出 Blob，降級使用 toPng Data URL
          downloadUrl = await toPng(previewElement, {
            pixelRatio,
            backgroundColor,
          });
        }
      } catch (blobErr) {
        // 降級保護：若 toBlob 發生非預期錯誤，改以 toPng 重新嘗試
        downloadUrl = await toPng(previewElement, {
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
      // 確保無論成功或失敗，皆 100% 恢復預覽元素之原始樣式
      previewElement.style.width = originalWidth;
      previewElement.style.maxWidth = originalMaxWidth;
      previewElement.style.boxSizing = originalBoxSizing;
      previewElement.style.padding = originalPadding;
      previewElement.style.backgroundColor = originalBgColor;
    }
  });
}
