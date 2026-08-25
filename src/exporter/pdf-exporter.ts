/**
 * Export document as PDF using native window.print()
 */
export function exportPdf(): void {
  // Trigger native print dialog which leverages @media print stylesheet
  window.print();
}
