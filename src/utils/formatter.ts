/**
 * Markdown 排版自動修正引擎。
 *
 * 專門用於偵測並修復自 LLM（如 Gemini、ChatGPT 等）複製內容時常見的格式異常，
 * 包括零寬字元、粗體符號未閉合、表格斷裂、缺少管線字元、缺少標題空格以及清單語法錯誤。
 */

/**
 * 自動修正執行結果介面。
 */
export interface FixResult {
  /** 修正後的 Markdown 文字內容 */
  formatted: string;
  /** 內容是否發生變更 */
  changed: boolean;
  /** 已執行的修復項目摘要清單 */
  fixesSummary: string[];
}

/**
 * 執行 Markdown 內容自動排版與異常修復。
 *
 * 依序進行行尾換行標準化、清除隱形零寬字元、修復粗體標記、拼接修補斷裂表格、
 * 校正標題與清單空格、補齊未閉合程式碼區塊以及壓縮多餘連續空行。
 *
 * @param rawText 原始輸入 Markdown 字串
 * @returns 包含修復後文字與修復摘要之結果物件
 */
export function fixMarkdownFormatting(rawText: string): FixResult {
  const fixes: string[] = [];
  let text = rawText;

  // 1. 標準化行尾換行字元（CRLF / CR 轉為 LF）
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. 清除隱形零寬字元（\u200B ~ \u2060）並將不換行空格替換為標準空格
  const beforeCharClean = text;
  text = text
    .replace(/[\u200B\u200C\u200D\uFEFF\u2060]/g, '') // 清除零寬空格與格式控制字元
    .replace(/[\u00A0\u202F]/g, ' '); // 將 Non-breaking Space 轉換為標準半形空格
  if (text !== beforeCharClean) {
    fixes.push('清除隱形零寬字元與非標準空格');
  }

  // 2.5 修正粗體標記格式（去除內側空格、清除空粗體、補齊中英文字界空格）
  const beforeBold = text;
  text = fixBoldFormatting(text);
  if (text !== beforeBold) {
    fixes.push('修正粗體標籤排版與空格問題');
  }

  // 3. 修復 Markdown 表格（拼接中斷行、移除孤立管線字元與內部異常空行）
  const { result: tableFixedText, fixedCount: tableFixedCount } = repairMarkdownTables(text);
  if (tableFixedCount > 0) {
    text = tableFixedText;
    fixes.push(`修復 ${tableFixedCount} 個破損或中斷的表格區塊`);
  }

  // 4. 校正標題語法缺少空格（例如：#標題 轉為 # 標題）
  const beforeHeading = text;
  text = text.replace(/^(#{1,6})([^#\s\n])/gm, '$1 $2');
  if (text !== beforeHeading) {
    fixes.push('校正標題語法缺失之空格');
  }

  // 5. 校正無序清單與任務核取方塊排版（補齊破折號後空格與標準化方括號狀態）
  const beforeList = text;
  text = text
    // 修正 "-項目" 轉為 "- 項目"
    .replace(/^(\s*[-*+])([^\s\-*+\d])/gm, '$1 $2')
    // 修正 "-[]" 或 "-[x]" 轉為 "- [ ] " 或 "- [x] "
    .replace(/^(\s*[-*+]\s*)\[\s*\]/gm, '$1[ ] ')
    .replace(/^(\s*[-*+]\s*)\[[xX]\]/gm, '$1[x] ');
  if (text !== beforeList) {
    fixes.push('校正清單與核取方塊排版');
  }

  // 6. 檢查程式碼區塊閉合性，若開閉標記個數為奇數則於文末補齊閉合反引號
  const codeBlockCount = (text.match(/^```/gm) || []).length;
  if (codeBlockCount % 2 !== 0) {
    text = text.trimEnd() + '\n```\n';
    fixes.push('自動補齊未閉合的程式碼區塊 (```)');
  }

  // 7. 將超過 2 行之連續空行壓縮為標準雙空行
  const beforeCompress = text;
  text = text.replace(/\n{3,}/g, '\n\n');
  if (text !== beforeCompress) {
    fixes.push('壓縮過多的連續空白行');
  }

  const changed = text !== rawText;
  return {
    formatted: text,
    changed,
    fixesSummary: fixes,
  };
}

/**
 * 修正 Markdown 文本中的粗體排版與邊界空格問題。
 *
 * 處理空粗體標記、清除標記內部首尾多餘空格，並在中日韓文字（CJK）與粗體英數字邊界處插入標準半形空格。
 * 限制僅比對行內水平空白（[ \t]），防止跨行誤配導致段落換行遭吞噬合併。
 *
 * @param text 待處理的文字內容
 * @returns 修正粗體排版後的文字內容
 */
export function fixBoldFormatting(text: string): string {
  let result = text;

  // 1. 清除無實質內文之空粗體標記（如 **** 或 **   **，僅限行內水平空白）
  result = result.replace(/\*\*[ \t]*\*\*/g, '');

  // 2. 修剪粗體標記內部多餘的首尾空白，防止語法解析失效（如 "** 內文 **" 轉為 "**內文**"，僅限行內水平空白）
  result = result.replace(/\*\*[ \t]+([^*\r\n]+?)[ \t]+\*\*/g, '**$1**');
  result = result.replace(/\*\*[ \t]+([^*\r\n]+?)\*\*/g, '**$1**');
  result = result.replace(/\*\*([^*\r\n]+?)[ \t]+\*\*/g, '**$1**');

  // 3. 在中日韓文字（CJK）與粗體英數字之間補入半形空格以優化排版可讀性（僅限行內字元）
  // CJK + **英數** -> CJK + 空格 + **英數**
  result = result.replace(/([\u4e00-\u9fa5\u3040-\u30ff])\*\*([A-Za-z0-9_#+\-@ \t]+?)\*\*/g, '$1 **$2**');
  // **英數** + CJK -> **英數** + 空格 + CJK
  result = result.replace(/\*\*([A-Za-z0-9_#+\-@ \t]+?)\*\*([\u4e00-\u9fa5\u3040-\u30ff])/g, '**$1** $2');

  // 4. 正規化粗體外側連續多個空格為單一空格（僅限行內水平空白）
  result = result.replace(/[ \t]{2,}\*\*/g, ' **');
  result = result.replace(/\*\*[ \t]{2,}/g, '** ');

  return result;
}

/**
 * 表格結構修復與拼接演算法。
 *
 * 掃描並重組 Markdown 表格，自動忽略表格內部異常插入的空白行與孤立管線字元，
 * 並將分散的資料列合併為標準 GFM 表格區塊。
 *
 * @param content 待修復之 Markdown 內容
 * @returns 包含修復後內容與修復表格總數之物件
 */
function repairMarkdownTables(content: string): { result: string; fixedCount: number } {
  const lines = content.split('\n');
  const outputLines: string[] = [];
  let i = 0;
  let fixedTables = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 偵測潛在表格標頭行：包含管線符號且符合表格行基本結構
    if (trimmed.startsWith('|') || (trimmed.includes('|') && isPotentialTableRow(trimmed))) {
      // 向前探查接下來數行中是否存在合法之分隔線（| --- | --- |）
      let separatorIndex = -1;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextTrimmed = lines[j].trim();
        if (!nextTrimmed) continue; // 略過標頭與分隔線之間的異常空白行
        if (isTableSeparator(nextTrimmed)) {
          separatorIndex = j;
          break;
        } else {
          break; // 若次一非空行非分隔線，則視為非標準表格起點
        }
      }

      if (separatorIndex !== -1) {
        // 確認偵測到表格結構，開始收集並修復所有資料行
        const tableRows: string[] = [];
        let hadGlitches = false;

        // 加入正規化後之標頭行
        tableRows.push(normalizeTableRow(lines[i].trim()));

        // 加入正規化後之分隔線行
        tableRows.push(normalizeTableSeparator(lines[separatorIndex].trim()));

        let cursor = separatorIndex + 1;

        // 逐行掃描後續表格資料列
        while (cursor < lines.length) {
          const currentLine = lines[cursor];
          const curTrimmed = currentLine.trim();

          // 偵測並過濾孤立管線行（例如 "|" 或 "|   |"）
          if (curTrimmed === '|' || curTrimmed === '||' || /^\|\s*\|$/.test(curTrimmed)) {
            hadGlitches = true;
            cursor++;
            continue;
          }

          // 處理表格內部空白行
          if (curTrimmed === '') {
            // 向前探查：若後續仍有有效表格資料行，則跳過此異常空行
            let hasMoreTableRowAhead = false;
            for (let k = cursor + 1; k < Math.min(cursor + 4, lines.length); k++) {
              const lookahead = lines[k].trim();
              if (!lookahead || lookahead === '|') continue;
              if (isPotentialTableRow(lookahead) && !isHeaderOrHeading(lookahead)) {
                hasMoreTableRowAhead = true;
                break;
              } else {
                break;
              }
            }

            if (hasMoreTableRowAhead) {
              hadGlitches = true;
              cursor++;
              continue;
            } else {
              // 後續無有效表格資料，視為表格區塊結束
              break;
            }
          }

          // 檢查當前行是否為合法表格資料行
          if (isPotentialTableRow(curTrimmed) && !isHeaderOrHeading(curTrimmed)) {
            const normalizedRow = normalizeTableRow(curTrimmed);
            tableRows.push(normalizedRow);
            cursor++;
          } else {
            // 讀取至非表格內容，結束當前表格收集
            break;
          }
        }

        // 確保表格上方具備適當之空行區隔
        if (outputLines.length > 0 && outputLines[outputLines.length - 1].trim() !== '') {
          outputLines.push('');
        }

        // 寫入完整連續表格資料行
        outputLines.push(...tableRows);
        outputLines.push(''); // 表格下方追加空行區隔

        if (hadGlitches || cursor > separatorIndex + 1) {
          fixedTables++;
        }

        i = cursor;
        continue;
      }
    }

    outputLines.push(line);
    i++;
  }

  return {
    result: outputLines.join('\n'),
    fixedCount: fixedTables,
  };
}

/**
 * 驗證文字行是否符合 Markdown 表格分隔線語法結構（例如：`| --- | :---: | ---: |`）。
 *
 * @param line 待驗證之文字行字串
 * @returns 若符合分隔線語法結構則回傳 true，否則回傳 false
 */
function isTableSeparator(line: string): boolean {
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(line);
}

/**
 * 判斷文字行是否具備表格資料行之特徵（包含管線字元且非純語法區塊標籤）。
 *
 * @param line 待判斷之文字行字串
 * @returns 若符合表格資料行特徵則回傳 true，否則回傳 false
 */
function isPotentialTableRow(line: string): boolean {
  if (line.startsWith('#') || line.startsWith('```') || line.startsWith('>')) return false;
  // 必須包含至少一個管線符號且移除管線後包含實質文字
  return line.includes('|') && line.replace(/\|/g, '').trim().length > 0;
}

/**
 * 判斷文字行是否為 Markdown 標題行（例如：`# 標題`）。
 *
 * @param line 待判斷之文字行字串
 * @returns 若為標題語法結構則回傳 true，否則回傳 false
 */
function isHeaderOrHeading(line: string): boolean {
  return /^#{1,6}\s+/.test(line);
}

/**
 * 正規化表格資料行，確保首尾皆包含標準管線符號與間距（`| ` 與 ` |`）。
 *
 * @param row 原始表格資料行字串
 * @returns 正規化後之表格資料行字串
 */
function normalizeTableRow(row: string): string {
  let trimmed = row.trim();
  if (!trimmed.startsWith('|')) {
    trimmed = '| ' + trimmed;
  }
  if (!trimmed.endsWith('|')) {
    trimmed = trimmed + ' |';
  }
  return trimmed;
}

/**
 * 正規化表格分隔線行，確保首尾皆包含標準管線符號與間距（`| ` 與 ` |`）。
 *
 * @param sep 原始分隔線字串
 * @returns 正規化後之分隔線字串
 */
function normalizeTableSeparator(sep: string): string {
  let trimmed = sep.trim();
  if (!trimmed.startsWith('|')) {
    trimmed = '| ' + trimmed;
  }
  if (!trimmed.endsWith('|')) {
    trimmed = trimmed + ' |';
  }
  return trimmed;
}
