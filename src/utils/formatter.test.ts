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
