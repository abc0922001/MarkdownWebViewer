/**
 * 顯示非侵入式輕量通知（Toast）。
 *
 * 動態建立通知 DOM 節點並注入指定容器，在達指定停留時間後執行淡出動畫並自 DOM 移除。
 *
 * @param message 欲顯示的通知訊息內文
 * @param type 通知類型，影響圖示與視覺主題配色（'success' | 'error' | 'info'）
 * @param duration 訊息停留之毫秒數，預設為 2500 毫秒
 */
export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 2500): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  } else {
    iconSvg = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  container.appendChild(toast);

  // 停留時間結束後觸發 CSS 退場轉場動畫，並於動畫完畢後自 DOM 樹移除
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px) scale(0.95)';
    // 配合 CSS 轉場時間（180ms）延遲移除節點
    setTimeout(() => toast.remove(), 180);
  }, duration);
}
