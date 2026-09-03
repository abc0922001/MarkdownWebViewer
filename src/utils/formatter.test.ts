import { describe, it, expect } from 'vitest';
import { fixMarkdownFormatting, fixMathSymbols, fixBoldFormatting } from './formatter';

describe('Markdown Formatter 智慧修復引擎', () => {
  describe('fixMathSymbols() — LaTeX 數學與比較符號標準化', () => {
    it('應正確將獨立的 $ \\le $ 與 $ \\ge $ 等轉為標準 Unicode 符號', () => {
      const input = '數值 A $\\le$ 10 且 B $\\ge$ 20，兩者 $\\neq$ 30，誤差 $\\pm$ 0.5。';
      const output = fixMathSymbols(input);
      expect(output).toBe('數值 A ≤ 10 且 B ≥ 20，兩者 ≠ 30，誤差 ± 0.5。');
    });

    it('應支援行內公式內部的運算符號轉換', () => {
      const input = '已知 $x \\le y$ 且 $a \\ge b$ 且 $c \\neq d$。';
      const output = fixMathSymbols(input);
      expect(output).toBe('已知 $x ≤ y$ 且 $a ≥ b$ 且 $c ≠ d$。');
    });

    it('應保護程式碼區塊不受 LaTeX 符號替換干擾', () => {
      const input = '```latex\n\\le \\ge \\neq\n```\n行內 `\\le` 不應被替換。';
      const output = fixMathSymbols(input);
      expect(output).toBe('```latex\n\\le \\ge \\neq\n```\n行內 `\\le` 不應被替換。');
    });
  });

  describe('fixBoldFormatting() — 粗體排版優化', () => {
    it('應消除粗體標籤內部多餘空格', () => {
      const input = '這是 ** 粗體文字 ** 範例。';
      const output = fixBoldFormatting(input);
      expect(output).toBe('這是 **粗體文字** 範例。');
    });

    it('應自動為純英數粗體與相鄰 CJK 中文字元補齊排版空格', () => {
      const input = '請安裝**Node.js**環境並執行**npm start**指令。';
      const output = fixBoldFormatting(input);
      expect(output).toBe('請安裝 **Node.js** 環境並執行 **npm start** 指令。');
    });

    it('應移除無效的空粗體標記', () => {
      const input = '無效標記 **** 以及 **   ** 應被清除。';
      const output = fixBoldFormatting(input);
      expect(output).toBe('無效標記  以及  應被清除。');
    });

    it('應修復 CJK 字元與引號/括號交界處之 CommonMark 粗體邊界空格（避免未渲染）', () => {
      const input = '採取了**「上午出門 ➔ 中午/下午回 Airbnb 避暑補眠 ➔ 傍晚/晚上再出門」**的防暑策略';
      const output = fixBoldFormatting(input);
      expect(output).toBe('採取了 **「上午出門 ➔ 中午/下午回 Airbnb 避暑補眠 ➔ 傍晚/晚上再出門」** 的防暑策略');
    });

    it('應修復粗體以標點符號（如括號）結尾且後續接 CJK 字元時的邊界空格', () => {
      const input = '安排整天待在**海遊館（Kaiyukan）**是極為聰明的決定！海遊館是大阪最頂級的** A+ 級全室內避暑與雨備景點**';
      const output = fixBoldFormatting(input);
      expect(output).toBe('安排整天待在**海遊館（Kaiyukan）** 是極為聰明的決定！海遊館是大阪最頂級的 **A+ 級全室內避暑與雨備景點**');
    });
  });

  describe('fixMarkdownFormatting() — 全流程 9 大修復管線', () => {
    it('應正確修復斷裂或缺少管線符號之表格', () => {
      const brokenTable = `| 標題 1 | 標題 2 |
| --- | --- |
| 資料 1
| 資料 2 |`;

      const { formatted, changed, fixesSummary } = fixMarkdownFormatting(brokenTable);
      expect(changed).toBe(true);
      expect(formatted).toContain('| 標題 1 | 標題 2 |');
      expect(formatted).toContain('| --- | --- |');
      expect(formatted).toContain('| 資料 1 | 資料 2 |');
      expect(fixesSummary.some((s) => s.includes('表格'))).toBe(true);
    });

    it('應正確修復 Issue #8 之跨行斷裂含 <br> 標籤與空行之表格', () => {
      const brokenIssue8Table = `| 調校領域 | 核心技術與機制 | 實質效益與操作方式 | 潛在代價與排除解方 |
| --- | --- | --- | --- |
| **Android 背景節電**<br>

<br>([快取應用程式凍結](https://www.makeuseof.com/suspend-execution-for-cached-apps-fix-background-battery-drain/)) | 運用 Linux \`cgroup\` 機制，在 App 進入快取時直接暫停其 CPU 運算，而非完全強制關閉。 | 開發人員選項開啟 **Suspend execution for cached apps**。隔夜耗電可從 7–10% 驟降至 1–2%，喚醒時依舊能秒開。 | 部分 App 可能延遲推播。若有重要通訊軟體，至「應用程式資訊」將電池設為「不受限制」即可豁免。 |
| **本機 AI 空間釋放**<br>

<br>([AI 模型瘦身](https://www.makeuseof.com/iphone-users-discover-hack-to-save-21gb-of-storage-that-also-works-on-android/)) | 移除裝置端 AI 大型語言模型（如 Gemini Nano、Apple Intelligence）及其照片特徵快取。 | iOS 關閉「Apple Intelligence」；Android 至設定搜尋 **AICore** 點選「清除儲存空間」並停用，能立即釋出數 GB 至 21GB。 | 失去裝置端離線智慧功能（如離線摘要、本機照片語意搜尋、自動智慧回覆）。 |
| **失物記憶管理**<br>

<br>([Find Hub 記憶功能](https://www.makeuseof.com/android-find-hub-remembered-tab-no-tracker/)) | Android 16+ 結合 Gemini，由使用者口述位置建立純文字與照片索引，而非依賴藍牙防丟器。 | 對助理說「記住備用鑰匙在廚房抽屜」，資料即彙整於 Find Hub 的 **Remembered** 標籤頁，省去藍牙標籤電池維護成本。 | 不具備即時追蹤能力；若物品被他人挪動，系統無法感知變更。適合放護照、備用鑰匙等靜態物品。 |

顯示的樣子:
說明文字`;

      const { formatted, changed, fixesSummary } = fixMarkdownFormatting(brokenIssue8Table);
      expect(changed).toBe(true);
      expect(fixesSummary.some((s) => s.includes('表格'))).toBe(true);

      // 驗證第一列成功縫合儲存格，且包含完整的 4 個欄位，重複冗餘之 <br> 成功收斂為單一 <br>
      expect(formatted).toContain(
        '| **Android 背景節電**<br>([快取應用程式凍結](https://www.makeuseof.com/suspend-execution-for-cached-apps-fix-background-battery-drain/)) | 運用 Linux `cgroup` 機制，在 App 進入快取時直接暫停其 CPU 運算，而非完全強制關閉。 | 開發人員選項開啟 **Suspend execution for cached apps**。隔夜耗電可從 7–10% 驟降至 1–2%，喚醒時依舊能秒開。 | 部分 App 可能延遲推播。若有重要通訊軟體，至「應用程式資訊」將電池設為「不受限制」即可豁免。 |'
      );
      // 驗證第二列成功縫合
      expect(formatted).toContain(
        '| **本機 AI 空間釋放**<br>([AI 模型瘦身](https://www.makeuseof.com/iphone-users-discover-hack-to-save-21gb-of-storage-that-also-works-on-android/)) | 移除裝置端 AI 大型語言模型（如 Gemini Nano、Apple Intelligence）及其照片特徵快取。 | iOS 關閉「Apple Intelligence」；Android 至設定搜尋 **AICore** 點選「清除儲存空間」並停用，能立即釋出數 GB 至 21GB。 | 失去裝置端離線智慧功能（如離線摘要、本機照片語意搜尋、自動智慧回覆）。 |'
      );
      // 驗證第三列成功縫合
      expect(formatted).toContain(
        '| **失物記憶管理**<br>([Find Hub 記憶功能](https://www.makeuseof.com/android-find-hub-remembered-tab-no-tracker/)) | Android 16+ 結合 Gemini，由使用者口述位置建立純文字與照片索引，而非依賴藍牙防丟器。 | 對助理說「記住備用鑰匙在廚房抽屜」，資料即彙整於 Find Hub 的 **Remembered** 標籤頁，省去藍牙標籤電池維護成本。 | 不具備即時追蹤能力；若物品被他人挪動，系統無法感知變更。適合放護照、備用鑰匙等靜態物品。 |'
      );
      // 驗證表格後方文字未遭破壞
      expect(formatted).toContain('顯示的樣子:\n說明文字');
    });

    it('應正確修復 Issue #9 之多行儲存格包含空行與重複 <br> 之表格', () => {
      const input = `| 評估維度 | 核心統計項目 | 關鍵數據表現 | 教練戰術解讀 |
| --- | --- | --- | --- |
| **賽季基底** | 出賽 / 先發 / 打席 | 94 G / 68 GS / 274 PA | **.269 / .315 / .423（OPS .738, 8 HR, 36 RBI）**，作為內野中線（主守二壘、兼修三壘），產出優於聯盟平均（sOPS+ 105）。 |
| **左右打逆向現象** | 右打 vs. 右投 / 左投 | vs. 右投：**.288 / .342 / .468 (OPS .810, 6 HR)**<br>

<br>vs. 左投：**.246 / .281 / .368 (OPS .649, 2 HR)** | 出現罕見的**「反向排球效應（Reverse Splits）」**。對右投掌握度極高，但面對左投（特別是左先發 OPS 僅 .563）缺乏長打威脅。 |
| **殘酷得點圈與大心臟** | 壘上有人 / 得點圈 (RISP) / 兩出局得點圈 | RISP：**.317 / .400 / .413 (OPS .813)**<br>

<br>**2 outs, RISP：.406 / .472 / .531 (OPS 1.003)** | 高張力專注度驚人。兩出局得點圈敲出 13 安打、進帳 16 分打點；高槓桿情境（High Leverage）打擊率達 **.300 / OPS .846**。 |
| **球數狙擊力** | 球數領先 / 1-1 球數 / 兩好球 | 1-1 球數：**.577 BA / 1.000 SLG (3 HR)**<br>

<br>Batter Ahead：**.318 / .459 / .500 (OPS .959)**<br>

<br>Two Strikes：**.114 / .197 / .154 (64 SO)** | 鎖定好球帶核心攻擊效率極高；但在兩好球陷入被動後，缺乏破壞邊界球的能力，吞下全季 64 次三振。 |
| **擊球型態與落點** | 平飛球 / 飛球 / 滾地球 | 平飛球（Line Drives）：**.642 BA / .830 SLG**<br>

<br>飛球（Fly Balls）：**8 HR / .619 SLG**<br>

<br>拉打（Pulled）：**.531 BA / 1.469 OPS (3 HR)** | 平飛球轉換率優秀。打擊落點均勻（拉打 17 安、中路 35 安、推打 16 安），但面對滾地球投手打擊率僅 **.189 (OPS .587)**。 |`;

      const expected = `| 評估維度 | 核心統計項目 | 關鍵數據表現 | 教練戰術解讀 |
| --- | --- | --- | --- |
| **賽季基底** | 出賽 / 先發 / 打席 | 94 G / 68 GS / 274 PA | **.269 / .315 / .423（OPS .738, 8 HR, 36 RBI）**，作為內野中線（主守二壘、兼修三壘），產出優於聯盟平均（sOPS+ 105）。 |
| **左右打逆向現象** | 右打 vs. 右投 / 左投 | vs. 右投：**.288 / .342 / .468 (OPS .810, 6 HR)**<br>vs. 左投：**.246 / .281 / .368 (OPS .649, 2 HR)** | 出現罕見的 **「反向排球效應（Reverse Splits）」**。對右投掌握度極高，但面對左投（特別是左先發 OPS 僅 .563）缺乏長打威脅。 |
| **殘酷得點圈與大心臟** | 壘上有人 / 得點圈 (RISP) / 兩出局得點圈 | RISP：**.317 / .400 / .413 (OPS .813)**<br>**2 outs, RISP：.406 / .472 / .531 (OPS 1.003)** | 高張力專注度驚人。兩出局得點圈敲出 13 安打、進帳 16 分打點；高槓桿情境（High Leverage）打擊率達 **.300 / OPS .846**。 |
| **球數狙擊力** | 球數領先 / 1-1 球數 / 兩好球 | 1-1 球數：**.577 BA / 1.000 SLG (3 HR)**<br>Batter Ahead：**.318 / .459 / .500 (OPS .959)**<br>Two Strikes：**.114 / .197 / .154 (64 SO)** | 鎖定好球帶核心攻擊效率極高；但在兩好球陷入被動後，缺乏破壞邊界球的能力，吞下全季 64 次三振。 |
| **擊球型態與落點** | 平飛球 / 飛球 / 滾地球 | 平飛球（Line Drives）：**.642 BA / .830 SLG**<br>飛球（Fly Balls）：**8 HR / .619 SLG**<br>拉打（Pulled）：**.531 BA / 1.469 OPS (3 HR)** | 平飛球轉換率優秀。打擊落點均勻（拉打 17 安、中路 35 安、推打 16 安），但面對滾地球投手打擊率僅 **.189 (OPS .587)**。 |`;

      const { formatted, changed, fixesSummary } = fixMarkdownFormatting(input);
      expect(changed).toBe(true);
      expect(fixesSummary.some((s) => s.includes('表格'))).toBe(true);
      expect(formatted).toBe(expected);
    });

    it('應正確隔離多個連續獨立表格，防止跨空行錯誤合併', () => {
      const twoTables = `| 表格 1 標題 A | 表格 1 標題 B |
| --- | --- |
| 1 | 2 |

| 表格 2 標題 X | 表格 2 標題 Y | 表格 2 標題 Z |
| --- | --- | --- |
| A | B | C |`;

      const { formatted } = fixMarkdownFormatting(twoTables);
      expect(formatted).toContain('| 表格 1 標題 A | 表格 1 標題 B |');
      expect(formatted).toContain('| 1 | 2 |');
      expect(formatted).toContain('| 表格 2 標題 X | 表格 2 標題 Y | 表格 2 標題 Z |');
      expect(formatted).toContain('| A | B | C |');
    });

    it('應支援無管線跨行儲存格之文字縫合', () => {
      const wrappedCellTable = `| 欄位 1 | 欄位 2 | 欄位 3 |
| --- | --- | --- |
| A | 資料 1
續接說明文字 | C |
| D | E | F |`;

      const { formatted } = fixMarkdownFormatting(wrappedCellTable);
      expect(formatted).toContain('| A | 資料 1 續接說明文字 | C |');
    });

    it('應正確收斂各種變體之 <br/>、<BR> 與多重冗餘換行', () => {
      const input = `| 項目 | 說明 |
| --- | --- |
| A | 第一行<BR />

<br/>第二行<br >第三行 |
| B | 測試<br><br><br>多重標籤 |`;

      const { formatted } = fixMarkdownFormatting(input);
      expect(formatted).toContain('| A | 第一行<br>第二行<br>第三行 |');
      expect(formatted).toContain('| B | 測試<br>多重標籤 |');
    });

    it('應支援儲存格內連續多行無管線文字跨空行縫合，且不誤吞表格後方段落', () => {
      const input = `| 標題 A | 標題 B |
| --- | --- |
| 項目 1 | 內容 1<br>

<br>內容 2<br>

<br>內容 3 |

這是表格後方的獨立普通段落。
這是第二行段落。`;

      const { formatted } = fixMarkdownFormatting(input);
      expect(formatted).toContain('| 項目 1 | 內容 1<br>內容 2<br>內容 3 |');
      expect(formatted).toContain('這是表格後方的獨立普通段落。\n這是第二行段落。');
    });

    it('應正確保護表格內反引號程式碼區塊中的管線字元與轉義管線', () => {
      const input = `| 指令 | 說明 |
| --- | --- |
| \`cat file | grep text\` | 管道管線過濾 |
| 包含 \\| 轉義符號 | 測試轉義 |`;

      const { formatted } = fixMarkdownFormatting(input);
      expect(formatted).toContain('| `cat file | grep text` | 管道管線過濾 |');
      expect(formatted).toContain('| 包含 \\| 轉義符號 | 測試轉義 |');
    });

    it('應標準化表格分隔線冒號對齊格式', () => {
      const tableWithSpacedAlign = `| 左 | 居中 | 右 |
| : - : | : - | - : |
| A | B | C |`;

      const { formatted } = fixMarkdownFormatting(tableWithSpacedAlign);
      expect(formatted).toContain('| :---: | :--- | ---: |');
    });

    it('應自動補齊標題語法缺失的空格', () => {
      const input = '#標題 1\n##標題 2';
      const { formatted, changed } = fixMarkdownFormatting(input);
      expect(changed).toBe(true);
      expect(formatted).toBe('# 標題 1\n## 標題 2');
    });

    it('應自動補齊清單與核取方塊語法空格', () => {
      const input = '-項目 1\n*項目 2\n1.項目 3\n-[]待辦\n-[x]完成';
      const { formatted, changed } = fixMarkdownFormatting(input);
      expect(changed).toBe(true);
      expect(formatted).toContain('- 項目 1');
      expect(formatted).toContain('* 項目 2');
      expect(formatted).toContain('1. 項目 3');
      expect(formatted).toContain('- [ ] 待辦');
      expect(formatted).toContain('- [x] 完成');
    });

    it('應於文末自動閉合未成對的程式碼區塊 (```)', () => {
      const input = '```typescript\nconst message = "Hello";';
      const { formatted, changed } = fixMarkdownFormatting(input);
      expect(changed).toBe(true);
      expect(formatted.endsWith('```\n')).toBe(true);
    });

    it('應將超過 2 行之連續空行壓縮為標準雙換行', () => {
      const input = '段落 1\n\n\n\n\n段落 2';
      const { formatted, changed } = fixMarkdownFormatting(input);
      expect(changed).toBe(true);
      expect(formatted).toBe('段落 1\n\n段落 2');
    });
  });
});
