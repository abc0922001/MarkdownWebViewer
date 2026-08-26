/**
 * 將純文字 Markdown 內容匯出為本機 `.md` 檔案。
 *
 * 透過建立記憶體中的 Blob 物件與動態 `<a>` 下載連結觸發瀏覽器下載流程，
 * 並在下載觸發後排程釋放 Object URL 以避免記憶體洩漏。
 *
 * @param content 欲匯出的 Markdown 純文字內容
 * @param filename 下載之目標檔案名稱，預設為 'document.md'
 */
export function exportMarkdown(content: string, filename = 'document.md'): void {
  // 自動校驗副檔名，確保包含 .md
  const finalName = filename.endsWith('.md') ? filename : `${filename}.md`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  // 建立暫態 <a> 標籤並觸發點擊以啟動下載
  const link = document.createElement('a');
  link.href = url;
  link.download = finalName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 延遲釋放 Object URL 資源，確保瀏覽器下載佇列已取得資料串流
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
