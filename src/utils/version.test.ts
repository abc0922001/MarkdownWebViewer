/**
 * 版本與快取更新模組單元測試。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APP_VERSION, COMMIT_HASH, BUILD_TIME, formatVersionInfo, initVersionBadge, checkCacheAndUpdate } from './version';
import * as toastModule from './toast';

describe('Version & Cache Management (version.ts)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('應具有符合語意化版本規範之 APP_VERSION 字串', () => {
    expect(APP_VERSION).toBeDefined();
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('formatVersionInfo(false) 應回傳以 v 開頭之簡短版本字串', () => {
    const shortVer = formatVersionInfo(false);
    expect(shortVer).toBe(`v${APP_VERSION}`);
  });

  it('formatVersionInfo(true) 應包含完整版本資訊', () => {
    const fullVer = formatVersionInfo(true);
    expect(fullVer).toContain(`v${APP_VERSION}`);
    if (COMMIT_HASH) {
      expect(fullVer).toContain(COMMIT_HASH);
    }
    if (BUILD_TIME) {
      expect(fullVer).toContain(BUILD_TIME);
    }
  });

  it('initVersionBadge 應正確配置 DOM 元素之文字、標題與無障礙屬性', () => {
    const brandEl = document.createElement('span');
    const statusEl = document.createElement('span');

    initVersionBadge(brandEl, statusEl);

    const expectedText = `v${APP_VERSION}`;
    expect(brandEl.textContent).toBe(expectedText);
    expect(statusEl.textContent).toBe(expectedText);

    expect(brandEl.getAttribute('role')).toBe('button');
    expect(brandEl.getAttribute('tabindex')).toBe('0');
    expect(brandEl.title).toContain(expectedText);
    expect(brandEl.title).toContain('點選檢查更新與快取狀態');

    expect(statusEl.getAttribute('role')).toBe('button');
    expect(statusEl.getAttribute('tabindex')).toBe('0');
    expect(statusEl.title).toContain(expectedText);
  });

  it('點選版本徽章時應觸發 checkCacheAndUpdate 並發送 Toast 提示', async () => {
    const showToastSpy = vi.spyOn(toastModule, 'showToast').mockImplementation(() => {});

    const brandEl = document.createElement('span');
    initVersionBadge(brandEl, null);

    brandEl.click();

    expect(showToastSpy).toHaveBeenCalled();
    const firstCallArgs = showToastSpy.mock.calls[0];
    expect(firstCallArgs[0]).toContain(`目前版本：v${APP_VERSION}`);
  });

  it('鍵盤按下 Enter 或空白鍵時應觸發版本快取檢查', () => {
    const showToastSpy = vi.spyOn(toastModule, 'showToast').mockImplementation(() => {});

    const brandEl = document.createElement('span');
    initVersionBadge(brandEl, null);

    brandEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(showToastSpy).toHaveBeenCalled();

    showToastSpy.mockClear();
    brandEl.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(showToastSpy).toHaveBeenCalled();
  });

  it('checkCacheAndUpdate 在無 serviceWorker 支援時應平穩執行且不噴錯', async () => {
    const showToastSpy = vi.spyOn(toastModule, 'showToast').mockImplementation(() => {});

    await expect(checkCacheAndUpdate()).resolves.toBeUndefined();
    expect(showToastSpy).toHaveBeenCalledWith(expect.stringContaining(`目前版本：v${APP_VERSION}`), 'info', 3500);
  });
});
