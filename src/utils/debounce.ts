/**
 * 建立防彈跳（Debounce）包裝函式，延遲目標函式執行直到停止觸發達指定時間。
 *
 * 用於高頻觸發事件（如文字輸入、視窗調整），避免過度頻繁調用引發效能耗損。
 *
 * @param func 欲延遲執行的目標回呼函式
 * @param wait 延遲毫秒數
 * @returns 具防彈跳效果之包裝函式
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function (...args: Parameters<T>) {
    // 若定時器已存在，清除前次排程以重新計時
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}
