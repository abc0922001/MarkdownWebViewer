/**
 * 應用程式版本與 Service Worker 快取狀態管理模組。
 *
 * 提供全站版本號、建置時間與 Git Commit 雜湊顯示，
 * 支援點選檢查 Service Worker 快取更新狀態與離線資源版本驗證。
 */

import { showToast } from './toast';

declare const __APP_VERSION__: string;
declare const __COMMIT_HASH__: string;
declare const __BUILD_TIME__: string;

/** 目前應用程式語意化版本號（預設相依於 package.json） */
export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.1';

/** 建置時當前 Git Commit 簡短雜湊值（若本機無 Git 則為空字串） */
export const COMMIT_HASH: string = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : '';

/** 應用程式打包建置時間戳記（格式如：YYYY-MM-DD HH:mm） */
export const BUILD_TIME: string = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';

/**
 * 產生完整版本資訊描述字串。
 *
 * @param verbose 是否包含建置時間與 Commit 雜湊詳細資訊
 * @returns 格式化之版本描述文字
 */
export function formatVersionInfo(verbose = false): string {
  const base = `v${APP_VERSION}`;
  if (!verbose) return base;

  const parts: string[] = [];
  if (COMMIT_HASH) parts.push(COMMIT_HASH);
  if (BUILD_TIME) parts.push(BUILD_TIME);

  if (parts.length > 0) {
    return `${base} (${parts.join(' · ')})`;
  }
  return base;
}

/**
 * 檢查 Service Worker 是否有新快取或更新版本，並透過 Toast 給予使用者即時回饋。
 *
 * @returns 非同步作業完成 Promise
 */
export async function checkCacheAndUpdate(): Promise<void> {
  const versionDesc = formatVersionInfo(true);
  showToast(`📦 目前版本：${versionDesc}`, 'info', 3500);

  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      return;
    }

    // 主動向伺服器觸發 Service Worker 差異檢查
    await reg.update();

    if (reg.waiting || reg.installing) {
      showToast('🔄 偵測到新版本快取，正在下載並套用...', 'info', 3000);
    } else {
      // 延遲微小時間確認無更新被觸發
      setTimeout(() => {
        if (!reg.waiting && !reg.installing) {
          showToast(`✅ 快取已是最新狀態 (${formatVersionInfo(false)})`, 'success', 2500);
        }
      }, 800);
    }
  } catch (err) {
    console.warn('[Version] 無法檢查 Service Worker 更新狀態：', err);
  }
}

/**
 * 初始化頂部導覽列與底部狀態列之版本徽章顯示與事件監聽。
 *
 * @param brandEl 頂部品牌區之版本元素 (可選，預設依 ID 'brand-version' 查詢)
 * @param statusEl 底部狀態列之版本元素 (可選，預設依 ID 'status-version' 查詢)
 */
export function initVersionBadge(
  brandEl: HTMLElement | null = document.getElementById('brand-version'),
  statusEl: HTMLElement | null = document.getElementById('status-version')
): void {
  const shortVer = formatVersionInfo(false);
  const fullVer = formatVersionInfo(true);
  const tooltipText = `版本：${fullVer}・點選檢查更新與快取狀態`;

  const setupBadge = (el: HTMLElement | null) => {
    if (!el) return;
    el.textContent = shortVer;
    el.title = tooltipText;
    el.setAttribute('aria-label', tooltipText);
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      checkCacheAndUpdate();
    });

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        checkCacheAndUpdate();
      }
    });
  };

  setupBadge(brandEl);
  setupBadge(statusEl);

  // 監聽 Service Worker 控制權轉移事件（新版本背景安裝完成並接管時）
  if ('serviceWorker' in navigator) {
    let hasNotified = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hasNotified) return;
      hasNotified = true;
      showToast('✨ 應用程式已更新至最新版本！', 'success', 4000);
    });
  }
}
