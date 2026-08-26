/**
 * 觸發瀏覽器原生列印對話框以匯出高解析度 PDF。
 *
 * 搭配 CSS `@media print` 專屬列印樣式表（`print.css`），自動隱藏編輯器、工具列與狀態列，
 * 並套用高對比白底排版、字型微調與分頁斷行保護（`page-break-inside: avoid`）。
 */
export function exportPdf(): void {
  // 調用原生列印 API，由瀏覽器觸發排版與 PDF 輸出對話框
  window.print();
}
