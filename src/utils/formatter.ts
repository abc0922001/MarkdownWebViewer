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

  // 2.2 修正 AI 複製之 LaTeX 數學與比較符號（例如：$\le$ 轉為 ≤、$\ge$ 轉為 ≥）
  const beforeMath = text;
  text = fixMathSymbols(text);
  if (text !== beforeMath) {
    fixes.push('校正數學與比較符號');
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

  // 5. 校正無序/有序清單與任務核取方塊排版（補齊空格與標準化方括號狀態）
  const beforeList = text;
  text = text
    // 修正 "-項目" 轉為 "- 項目"
    .replace(/^(\s*[-*+])([^\s\-*+\d])/gm, '$1 $2')
    // 修正 "1.項目" 轉為 "1. 項目"
    .replace(/^(\s*\d+\.)([^\s\d])/gm, '$1 $2')
    // 修正任務核取方塊排版（如 "-[]", "-[x]", "- [ ]", "- [x]" 等，補齊空格並標準化方括號狀態，確保冪等性）
    .replace(/^(\s*(?:[-*+]|\d+\.))\s*\[\s*\](?:[ \t]*([^\s\n].*)|[ \t]*$)/gm, (_, prefix, content) => {
      return content ? `${prefix} [ ] ${content}` : `${prefix} [ ]`;
    })
    .replace(/^(\s*(?:[-*+]|\d+\.))\s*\[[xX]\](?:[ \t]*([^\s\n].*)|[ \t]*$)/gm, (_, prefix, content) => {
      return content ? `${prefix} [x] ${content}` : `${prefix} [x]`;
    });
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
 * 修正自 AI（如 Gemini、ChatGPT 等）複製內容中殘留的 LaTeX 數學與比較符號。
 *
 * 將常見的獨立 LaTeX 符號標記（如 $\le$、$\ge$、$\neq$ 等）轉換為標準 Unicode 符號（≤、≥、≠ 等）。
 * 支援帶有 $ 標記（如 $\le$）、公式內部運算符號（如 $x \le y$ 轉為 $x ≤ y$）與不帶 $ 標記之獨立 LaTeX 巨集（如 \le 35）。
 * 同時保護多行程式碼區塊（```...```）與行內程式碼（`...`），防止程式碼內容遭誤替換。
 *
 * @param text 待處理的文字內容
 * @returns 轉換後的文字內容
 */
export function fixMathSymbols(text: string): string {
  // 保護多行程式碼區塊與行內程式碼，避免替換程式碼內容
  const codeSpans: string[] = [];
  const textWithoutCode = text.replace(/(```[\s\S]*?```|`[^`\r\n]+`)/g, (match) => {
    codeSpans.push(match);
    return `\x00CODE_${codeSpans.length - 1}\x00`;
  });

  let result = textWithoutCode;

  // 1. 替換帶有獨立 $ 標記的 LaTeX 符號（如 $\le$, $ \le $）
  result = result
    .replace(/\$\s*\\(?:le|leq)\s*\$/g, '≤')
    .replace(/\$\s*\\(?:ge|geq)\s*\$/g, '≥')
    .replace(/\$\s*\\(?:ne|neq)\s*\$/g, '≠')
    .replace(/\$\s*\\approx\s*\$/g, '≈')
    .replace(/\$\s*\\pm\s*\$/g, '±')
    .replace(/\$\s*\\times\s*\$/g, '×')
    .replace(/\$\s*\\div\s*\$/g, '÷')
    .replace(/\$\s*\\(?:degree|circ)\s*\$/g, '°')
    .replace(/\$\s*\\sim\s*\$/g, '~')
    .replace(/\$\s*\\infty\s*\$/g, '∞');

  // 2. 替換行內數學式 $...$ 內部的運算符號（如 $x \le y$ 轉為 $x ≤ y$）
  result = result.replace(/\$([^$\r\n]+)\$/g, (_, inner) => {
    const replaced = inner
      .replace(/\\(?:le|leq)\b/g, '≤')
      .replace(/\\(?:ge|geq)\b/g, '≥')
      .replace(/\\(?:ne|neq)\b/g, '≠')
      .replace(/\\approx\b/g, '≈')
      .replace(/\\pm\b/g, '±')
      .replace(/\\times\b/g, '×')
      .replace(/\\div\b/g, '÷')
      .replace(/\\degree\b/g, '°')
      .replace(/\^\{\\circ\}|\^\\circ\b/g, '°');
    return `$${replaced}$`;
  });

  // 3. 替換無 $ 標記但獨立出現的 LaTeX 符號（如 \le 35 轉為 ≤ 35）
  result = result
    .replace(/(?<![\\a-zA-Z])\\(?:le|leq)(?![a-zA-Z])/g, '≤')
    .replace(/(?<![\\a-zA-Z])\\(?:ge|geq)(?![a-zA-Z])/g, '≥')
    .replace(/(?<![\\a-zA-Z])\\(?:ne|neq)(?![a-zA-Z])/g, '≠')
    .replace(/(?<![\\a-zA-Z])\\approx(?![a-zA-Z])/g, '≈')
    .replace(/(?<![\\a-zA-Z])\\pm(?![a-zA-Z])/g, '±')
    .replace(/(?<![\\a-zA-Z])\\times(?![a-zA-Z])/g, '×')
    .replace(/(?<![\\a-zA-Z])\\div(?![a-zA-Z])/g, '÷');

  // 還原程式碼區塊
  result = result.replace(/\x00CODE_(\d+)\x00/g, (_, idx) => codeSpans[parseInt(idx, 10)]);
  return result;
}

/**
 * 掃描字串中所有未被反斜線轉義的連續星號序列。
 *
 * @param text 待掃描的文字內容
 * @returns 星號序列的位置與長度清單
 */
function findAsteriskRuns(text: string): { index: number; length: number }[] {
  const runs: { index: number; length: number }[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === '*') {
      let backslashes = 0;
      for (let b = i - 1; b >= 0 && text[b] === '\\'; b--) {
        backslashes++;
      }
      if (backslashes % 2 === 1) {
        i++;
        continue;
      }
      const start = i;
      while (i < text.length && text[i] === '*') {
        i++;
      }
      runs.push({ index: start, length: i - start });
    } else {
      i++;
    }
  }
  return runs;
}

/**
 * 檢查字元是否為 Unicode 標點符號。
 *
 * 涵蓋標準 ASCII 標點符號以及全形/CJK 標點符號（如 「」『』【】《》〈〉（）“”‘’！？、。，；：… 等）。
 *
 * @param ch 待檢查之單一字元
 * @returns 若為標點符號則回傳 true，否則回傳 false
 */
function isUnicodePunctuation(ch: string): boolean {
  if (!ch) return false;
  return /\p{P}/u.test(ch);
}

/**
 * 檢查字元是否為 CJK 中日韓文字元或英數字元。
 *
 * @param ch 待檢查之單一字元
 * @returns 若為 CJK 或英數字元則回傳 true
 */
function isCJKOrAlphanumeric(ch: string): boolean {
  if (!ch) return false;
  return /[\u4e00-\u9fa5\u3040-\u30ffA-Za-z0-9]/.test(ch);
}

/**
 * 修正單行文字中的粗體標記排版，包含消除標記內首尾空白、移除空粗體標記以及優化中英文字界空格。
 *
 * @param line 待處理的單行文字
 * @returns 修正粗體排版後的單行文字
 */
function fixBoldInLine(line: string): string {
  // 若該行為 Markdown 水平分隔線（如 *** 或 * * *），直接保留不更動
  if (/^\s*(\*\s*){3,}$/.test(line)) return line;

  // 保護行內程式碼區塊（`...`），避免更改程式碼內容中的星號
  const codeSpans: string[] = [];
  const textWithoutCode = line.replace(/(`+)([\s\S]*?)\1/g, (match) => {
    codeSpans.push(match);
    return `\x00CODE_${codeSpans.length - 1}\x00`;
  });

  const runs = findAsteriskRuns(textWithoutCode);
  if (runs.length < 2) return line;

  let result = '';
  let lastIndex = 0;
  let r = 0;

  while (r < runs.length) {
    const openRun = runs[r];
    // 單一星號為清單項目或斜體標記，略過
    if (openRun.length === 1) {
      r++;
      continue;
    }

    // 四個以上星號為無效空粗體（****），直接移除
    if (openRun.length === 4) {
      result += textWithoutCode.slice(lastIndex, openRun.index);
      lastIndex = openRun.index + openRun.length;
      r++;
      continue;
    }

    // 向後尋找配對的閉合星號序列（長度 >= 2）
    let closeRunIdx = -1;
    for (let nextR = r + 1; nextR < runs.length; nextR++) {
      if (runs[nextR].length >= 2) {
        closeRunIdx = nextR;
        break;
      }
    }

    if (closeRunIdx === -1) {
      break;
    }

    const closeRun = runs[closeRunIdx];
    result += textWithoutCode.slice(lastIndex, openRun.index);

    // 支援粗斜體（***）標記：外層保留單一斜體星號
    const isTripleOpen = openRun.length === 3;
    const isTripleClose = closeRun.length === 3;
    const outerOpen = isTripleOpen ? '*' : '';
    const outerClose = isTripleClose ? '*' : '';

    const content = textWithoutCode.slice(openRun.index + openRun.length, closeRun.index);

    // 若標記內部皆為空白字元（如 ** **），視為空粗體清除
    if (content.trim() === '') {
      lastIndex = closeRun.index + closeRun.length;
      r = closeRunIdx + 1;
      continue;
    }

    // 將粗體內部首尾多餘的空白移至粗體外側
    const leadingSpace = content.match(/^[ \t]+/)?.[0] || '';
    const trailingSpace = content.match(/[ \t]+$/)?.[0] || '';
    const trimmed = content.slice(leadingSpace.length, content.length - trailingSpace.length);

    // 取得相鄰的前後字元
    const prevChar = (result + outerOpen).length > 0 ? (result + outerOpen)[(result + outerOpen).length - 1] : '';
    const nextChar = closeRun.index + closeRun.length < textWithoutCode.length ? textWithoutCode[closeRun.index + closeRun.length] : '';

    const isCJK = (ch: string) => /[\u4e00-\u9fa5\u3040-\u30ff]/.test(ch);

    let prefixSpace = leadingSpace;
    let suffixSpace = trailingSpace;

    // 1. 若粗體為純英數或技術名詞（如 Node.js、Vue.js、A+ 等），且相鄰字元為 CJK 中日文字，則於外側補入排版空格
    const isAlphanumeric = /^[A-Za-z0-9_#+\-@./:&~%\s]+$/.test(trimmed.trim()) && /[A-Za-z0-9]/.test(trimmed);
    if (isAlphanumeric) {
      if (isCJK(prevChar) && !prefixSpace && !result.endsWith(' ')) {
        prefixSpace = ' ';
      }
      if (isCJK(nextChar) && !suffixSpace && !textWithoutCode.slice(closeRun.index + closeRun.length).startsWith(' ')) {
        suffixSpace = ' ';
      }
    }

    // 2. CommonMark Delimiter Flanking 合規性修復（解決 CJK 字元與引號/括號交界處粗體未渲染問題）：
    // (a) 若粗體以標點符號開頭（如 「【《（" 等），且前置字元為非空格非標點之 CJK/英數字元（如 "了**「"），
    //     依 CommonMark §6.2 規範該 ** 不具備 left-flanking 特性，必須於左側補齊空格（"了 **「"）方可成功開啟粗體。
    const startsWithPunctuation = isUnicodePunctuation(trimmed[0]);
    if (startsWithPunctuation && isCJKOrAlphanumeric(prevChar) && !prefixSpace && !result.endsWith(' ')) {
      prefixSpace = ' ';
    }

    // (b) 若粗體以標點符號結尾（如 」】》）" 等），且後續字元為非空格非標點之 CJK/英數字元（如 "）**是"），
    //     依 CommonMark §6.2 規範該 ** 不具備 right-flanking 特性，必須於右側補齊空格（"）** 是"）方可成功閉合粗體。
    const endsWithPunctuation = isUnicodePunctuation(trimmed[trimmed.length - 1]);
    if (endsWithPunctuation && isCJKOrAlphanumeric(nextChar) && !suffixSpace && !textWithoutCode.slice(closeRun.index + closeRun.length).startsWith(' ')) {
      suffixSpace = ' ';
    }

    // 若前置結果已具備空格且 prefixSpace 亦包含空格，則消除重複空格
    if (result.endsWith(' ') && prefixSpace.startsWith(' ')) {
      prefixSpace = prefixSpace.trimStart();
    }
    // 若後續文字已具備空格且 suffixSpace 亦包含空格，則消除重複空格
    if (textWithoutCode.slice(closeRun.index + closeRun.length).startsWith(' ') && suffixSpace.endsWith(' ')) {
      suffixSpace = suffixSpace.trimEnd();
    }

    result += `${prefixSpace}${outerOpen}**${trimmed}**${outerClose}${suffixSpace}`;
    lastIndex = closeRun.index + closeRun.length;
    r = closeRunIdx + 1;
  }

  result += textWithoutCode.slice(lastIndex);
  result = result.replace(/\x00CODE_(\d+)\x00/g, (_, idx) => codeSpans[parseInt(idx, 10)]);
  return result;
}

/**
 * 修正 Markdown 文本中的粗體排版與邊界空格問題。
 *
 * 逐行嚴格配對成對的粗體星號標記，修剪標記內部首尾多餘空白並移至外側、清除空粗體標記，
 * 同時保護行內程式碼不受干擾，避免跨標籤誤配導致一般文字被轉為粗體。
 *
 * @param text 待處理的文字內容
 * @returns 修正粗體排版後的文字內容
 */
export function fixBoldFormatting(text: string): string {
  return text.split('\n').map(fixBoldInLine).join('\n');
}

/**
 * 表格結構修復與拼接演算法。
 *
 * 掃描並重組 Markdown 表格，自動忽略表格內部異常插入的空白行與孤立管線字元，
 * 依據標頭與分隔線欄位數量自動縫合斷裂跨行的儲存格資料，並將分散的資料列合併為標準 GFM 表格區塊。
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

    // 剔除任何獨立存在於表格外的孤立管線字元行（例如單獨一行的 "|" 或 " | "）
    if (isGlitchPipeLine(trimmed) && trimmed !== '') {
      fixedTables++;
      i++;
      continue;
    }

    // 偵測潛在表格標頭行：包含管線符號且非孤立管線行、非標題行與非區塊標籤
    if (!isGlitchPipeLine(trimmed) && trimmed.includes('|') && isPotentialTableRow(trimmed) && !isHeaderOrHeading(trimmed)) {
      // 向前探查接下來數行中是否存在合法之分隔線（| --- | --- |）
      let separatorIndex = -1;
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const nextTrimmed = lines[j].trim();
        if (isGlitchPipeLine(nextTrimmed)) continue; // 略過標頭與分隔線之間的異常空白或孤立管線行
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

        // 解析標頭與分隔線欄位
        const headerCells = splitTableCells(lines[i]);
        const sepCells = splitTableCells(lines[separatorIndex]);
        const expectedCols = Math.max(headerCells.length, sepCells.length, 1);

        // 補齊標頭與分隔線缺失之欄位
        while (headerCells.length < expectedCols) headerCells.push('');
        while (sepCells.length < expectedCols) sepCells.push('---');

        // 標準化分隔線儲存格（確保至少 3 個短橫線，並保留對齊冒號，消除內部多餘空白）
        const normalizedSepCells = sepCells.map((cell) => {
          const clean = cell.replace(/\s+/g, '');
          const leftColon = clean.startsWith(':');
          const rightColon = clean.endsWith(':') && clean.length > 1;
          const dashes = clean.replace(/:/g, '');
          const dashCount = dashes.length >= 3 ? dashes : '---';
          return `${leftColon ? ':' : ''}${dashCount}${rightColon ? ':' : ''}`;
        });

        tableRows.push(formatTableRow(headerCells));
        tableRows.push(formatTableRow(normalizedSepCells));

        let cursor = separatorIndex + 1;
        let currentCells: string[] = [];
        let isLastCellOpen = false;
        let hadGlitches = separatorIndex > i + 1;

        // 逐行掃描後續表格資料列
        while (cursor < lines.length) {
          const curLine = lines[cursor];
          const curTrimmed = curLine.trim();

          // 1. 空白行或孤立管線符號行處理
          if (isGlitchPipeLine(curTrimmed)) {
            // 向前探查：若後續仍有有效表格資料行且非新表格起點，則跳過此異常空行
            let hasMoreTableDataAhead = false;
            const lookaheadLimit = Math.min(cursor + 20, lines.length);

            if (currentCells.length === 0) {
              // 當前列已完成，次一資料列必須為具備管線字元之表格行
              for (let k = cursor + 1; k < lookaheadLimit; k++) {
                const lookahead = lines[k].trim();
                if (isGlitchPipeLine(lookahead)) continue;
                if (isNewTableStart(k, lines) || isHeaderOrHeading(lookahead) || isBlockBoundary(lookahead)) {
                  break;
                }
                if (isPotentialTableRow(lookahead)) {
                  hasMoreTableDataAhead = true;
                }
                break;
              }
            } else {
              // 當前列尚未完成，後續可能夾帶無管線之儲存格換行內容（例如：<br>文字<br>）
              // 只要在區塊邊界或新表格起點前仍存在管線資料行，或帶有 <br> 標籤之接續行，即視為當前列或表格之延續
              for (let k = cursor + 1; k < lookaheadLimit; k++) {
                const lookahead = lines[k].trim();
                if (isGlitchPipeLine(lookahead)) continue;
                if (isNewTableStart(k, lines) || isHeaderOrHeading(lookahead) || isBlockBoundary(lookahead)) {
                  break;
                }
                if (isPotentialTableRow(lookahead) || /^<\s*br\s*\/?>/i.test(lookahead)) {
                  hasMoreTableDataAhead = true;
                  break;
                }
                // 若前一儲存格未閉合且以 <br> 結尾，其後續首個非空行亦為跨行接續
                if (isLastCellOpen && /(?:<\s*br\s*\/?>\s*)+$/i.test(currentCells[currentCells.length - 1])) {
                  hasMoreTableDataAhead = true;
                  break;
                }
              }
            }

            if (hasMoreTableDataAhead) {
              hadGlitches = true;
              cursor++;
              continue;
            } else {
              // 後續無有效表格資料，視為表格區塊結束
              break;
            }
          }

          // 2. 區塊邊界檢查（標題、程式碼區塊、引號、分隔線或新表格起點）
          if (isHeaderOrHeading(curTrimmed) || isBlockBoundary(curTrimmed) || isNewTableStart(cursor, lines)) {
            break;
          }

          // 3. 資料行處理
          if (curTrimmed.includes('|')) {
            const startsWithPipe = curTrimmed.startsWith('|');
            const endsWithPipe = curTrimmed.endsWith('|');
            const extracted = splitTableCells(curLine);
            let justFlushed = false;

            for (let eIdx = 0; eIdx < extracted.length; eIdx++) {
              const cell = extracted[eIdx];

              // 若剛完成上一列且此儲格為雙管線 (||) 產生的空字串，則略過該黏合符號
              if (justFlushed && cell === '' && currentCells.length === 0) {
                justFlushed = false;
                continue;
              }
              justFlushed = false;

              // 若上一列最後儲存格未封閉且此行未以管線符號開頭，則首個元素為前一儲存格之跨行接續
              if (eIdx === 0 && isLastCellOpen && !startsWithPipe && currentCells.length > 0) {
                currentCells[currentCells.length - 1] = mergeCellContent(currentCells[currentCells.length - 1], cell);
                hadGlitches = true;
              } else {
                currentCells.push(cell);
              }

              // 檢查行尾最後一個儲存格是否保持開啟未閉合狀態（例如結尾未帶管線且以 <br> 結尾，或後續有接續內容）
              const isLastCellInLine = eIdx === extracted.length - 1;
              if (isLastCellInLine && !endsWithPipe) {
                const lastVal = currentCells[currentCells.length - 1];
                const endsWithBr = /(?:<\s*br\s*\/?>\s*)+$/i.test(lastVal);
                if (endsWithBr || isContinuationAhead(cursor, lines)) {
                  isLastCellOpen = true;
                  hadGlitches = true;
                } else {
                  isLastCellOpen = false;
                }
              } else if (isLastCellInLine && endsWithPipe) {
                isLastCellOpen = false;
              }

              // 若已湊齊一整列的所有欄位且最後儲存格非開啟狀態，輸出為完整表格資料列
              if (currentCells.length === expectedCols && !isLastCellOpen) {
                tableRows.push(formatTableRow(currentCells));
                currentCells = [];
                isLastCellOpen = false;
                justFlushed = true;
              }
            }

            cursor++;
          } else {
            // 當前行不含管線符號
            if (currentCells.length > 0) {
              const lastCellVal = currentCells[currentCells.length - 1] || '';
              const isCellBrContinuation =
                isLastCellOpen &&
                (/^<\s*br\s*\/?>/i.test(curTrimmed) || /(?:<\s*br\s*\/?>\s*)+$/i.test(lastCellVal));

              // 向前確認後續是否仍有管線資料行（避免誤吞表格後之一般段落文字）
              let hasTablePipeAhead = false;
              const lookaheadLimit = Math.min(cursor + 20, lines.length);
              for (let k = cursor; k < lookaheadLimit; k++) {
                const lookahead = lines[k].trim();
                if (isGlitchPipeLine(lookahead)) continue;
                if (isNewTableStart(k, lines) || isHeaderOrHeading(lookahead) || isBlockBoundary(lookahead)) {
                  break;
                }
                if (isPotentialTableRow(lookahead)) {
                  hasTablePipeAhead = true;
                  break;
                }
              }

              if (!hasTablePipeAhead && !isCellBrContinuation) {
                // 若後續已無管線資料行且非明確之儲存格跨行接續，當前表格結束
                break;
              }

              hadGlitches = true;
              if (isLastCellOpen) {
                // 若前一儲存格未封閉，將此行文字合併進前一儲存格
                currentCells[currentCells.length - 1] = mergeCellContent(currentCells[currentCells.length - 1], curTrimmed);
              } else if (currentCells.length < expectedCols) {
                // 若前一儲存格已封閉但該列尚未湊滿，將此行文字作為獨立儲存格填入
                currentCells.push(curTrimmed);
                isLastCellOpen = true;
              }

              // 若當前行結尾帶有 <br> 標籤或後續仍有跨行接續，保持開啟狀態；否則正常閉合儲存格
              if (/(?:<\s*br\s*\/?>\s*)+$/i.test(curTrimmed) || isContinuationAhead(cursor, lines)) {
                isLastCellOpen = true;
              } else {
                isLastCellOpen = false;
              }

              if (currentCells.length === expectedCols && !isLastCellOpen) {
                tableRows.push(formatTableRow(currentCells));
                currentCells = [];
                isLastCellOpen = false;
              }
              cursor++;
            } else {
              // 當前列已滿且此行無管線符號，表格結束
              break;
            }
          }
        }

        // 若掃描結束後仍有未閉合/未湊滿之資料列，補齊並輸出
        if (currentCells.length > 0) {
          hadGlitches = true;
          while (currentCells.length < expectedCols) {
            currentCells.push('');
          }
          tableRows.push(formatTableRow(currentCells));
          currentCells = [];
          isLastCellOpen = false;
        }

        // 清理表格後方緊隨之孤立殘留管線行或空白行
        while (cursor < lines.length && isGlitchPipeLine(lines[cursor].trim())) {
          if (lines[cursor].trim() !== '') hadGlitches = true;
          cursor++;
        }

        // 確保表格上方具備適當之空行區隔
        if (outputLines.length > 0 && outputLines[outputLines.length - 1].trim() !== '') {
          outputLines.push('');
        }

        // 寫入完整連續表格資料行
        outputLines.push(...tableRows);

        // 若表格後方非空白行且未達文末，追加空行區隔
        if (cursor < lines.length && lines[cursor].trim() !== '') {
          outputLines.push('');
        }

        // 比對原始片段與重構片段是否發生變更（排除末尾空白行造成的比對誤差）
        const origFullSlice = lines.slice(i, cursor).join('\n').trim();
        const reconstructed = tableRows.join('\n').trim();
        if (origFullSlice !== reconstructed || hadGlitches) {
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
 * 檢查字串是否為空行或僅包含管線符號與空白字元之無效行（例如：`|`、`||`、`|   |`）。
 *
 * @param line 待檢查之文字行
 * @returns 若為無效管線行則回傳 true，否則回傳 false
 */
function isGlitchPipeLine(line: string): boolean {
  const noPipes = line.replace(/\|/g, '').trim();
  return noPipes.length === 0;
}

/**
 * 驗證文字行是否符合 Markdown 表格分隔線語法結構（例如：`| --- | :---: | ---: |` 或 `| : - : | : - |`）。
 *
 * @param line 待驗證之文字行字串
 * @returns 若符合分隔線語法結構則回傳 true，否則回傳 false
 */
function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  // 依 GFM 規範，表格分隔線必須同時包含短橫線與管線符號，避免誤判水平分隔線 (---)
  if (!trimmed.includes('-') || !trimmed.includes('|')) return false;
  // 必須只包含 |, :, -, 空格等分隔字元
  if (trimmed.replace(/[|\s:\-]/g, '').length !== 0) return false;

  // 依管線符號切割儲存格並排除首尾空字串
  const rawSegments = trimmed.split('|');
  const cells = rawSegments
    .map((c) => c.trim())
    .filter((c, idx, arr) => {
      if ((idx === 0 || idx === arr.length - 1) && c === '') return false;
      return true;
    });

  if (cells.length === 0) return false;
  return cells.every((cell) => {
    const dashes = cell.replace(/[^-\s]/g, '').replace(/\s+/g, '');
    return dashes.length >= 1;
  });
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
 * 判斷文字行是否為 Markdown 區塊邊界標籤（如程式碼區塊、引號、HTML 區塊標籤、水平線或無管線之清單）。
 *
 * @param line 待判斷之文字行字串
 * @returns 若為區塊邊界標籤則回傳 true，否則回傳 false
 */
function isBlockBoundary(line: string): boolean {
  const trimmed = line.trim();
  // 程式碼區塊開閉標籤或引用區塊標記
  if (trimmed.startsWith('```') || trimmed.startsWith('>')) return true;
  // 水平分隔線標記（如 ***, ---, ___）
  if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) return true;
  // 清單標記且不含管線符號
  if (/^(\s*[-*+]\s+|\s*\d+\.\s+)/.test(line) && !line.includes('|')) return true;
  // 僅當文字行不含管線符號時，檢查是否為 HTML 區塊級標籤（排除行內元素如 <br>、<span>、<a> 等）
  if (
    !line.includes('|') &&
    /^<\/?(?:div|table|tbody|thead|tfoot|tr|td|th|section|article|header|footer|nav|aside|p|pre|details|summary|figure|figcaption|form|iframe|blockquote)\b/i.test(
      trimmed
    )
  ) {
    return true;
  }
  return false;
}

/**
 * 檢查指定行索引是否為新表格之起始標頭列。
 *
 * 當前行包含管線符號且其後續緊鄰之非空行為標準表格分隔線時，判定為新表格起點，
 * 以防止多個連續表格跨空行探查時產生錯誤合併。
 *
 * @param index 待檢查之行索引
 * @param lines 全部文字行陣列
 * @returns 若為新表格起始標頭則回傳 true，否則回傳 false
 */
function isNewTableStart(index: number, lines: string[]): boolean {
  if (index >= lines.length) return false;
  const line = lines[index].trim();
  if (isHeaderOrHeading(line) || isBlockBoundary(line) || isGlitchPipeLine(line)) return false;
  if (!line.includes('|')) return false;

  // 向前探查緊鄰之次一非空行是否為分隔線
  for (let j = index + 1; j < Math.min(index + 3, lines.length); j++) {
    const next = lines[j].trim();
    if (isGlitchPipeLine(next)) continue;
    return isTableSeparator(next);
  }
  return false;
}

/**
 * 向前探查緊鄰之非空行是否為前一未閉合儲存格之跨行接續內容。
 *
 * @param cursor 當前行索引
 * @param lines 全部文字行陣列
 * @returns 若後續行具備儲存格接續特徵則回傳 true，否則回傳 false
 */
function isContinuationAhead(cursor: number, lines: string[]): boolean {
  for (let k = cursor + 1; k < Math.min(cursor + 6, lines.length); k++) {
    const next = lines[k].trim();
    if (isGlitchPipeLine(next)) continue;
    if (isNewTableStart(k, lines) || isHeaderOrHeading(next) || isBlockBoundary(next)) return false;
    // 若後續非空行以 <br> 標籤開頭，明確為儲存格接續內容
    if (/^<\s*br\s*\/?>/i.test(next)) return true;
    // 若後續非空行不以管線開頭，且包含管線符號，則為前行儲存格之跨行收尾（例如：接續說明 |）
    if (!next.startsWith('|') && next.includes('|')) return true;
    // 若後續非空行以管線開頭，代表是新資料行，當前儲存格未跨行至該行
    if (next.startsWith('|')) return false;
    // 若後續非空行既無管線也無 <br>（即純文字接續行），繼續向後檢查後續是否有跨行收尾符號
  }
  return false;
}

/**
 * 智慧合併斷裂於多行之儲存格文字。
 *
 * 專為解決自 LLM 或複製貼上時儲存格內容遭換行斷開之問題。
 * 若前段結尾或後段開頭具備 `<br>` 標籤，收斂重複冗餘之 `<br>` 為單一標準標籤；
 * 若兩側交界皆為 CJK 中文字元，直接銜接；
 * 若已有空格則保留；其餘英數或符號情況自動補入標準半形空格以維持排版。
 *
 * @param prev 前段儲存格文字內容
 * @param next 後段接續文字內容
 * @returns 合併完成之儲存格字串
 */
function mergeCellContent(prev: string, next: string): string {
  if (!prev) return next;
  if (!next) return prev;
  // 若前段結尾或後段開頭已有 <br> 標籤，收斂重複之 <br> 為單一標準標籤拼接
  const prevHasBr = /(?:<\s*br\s*\/?>\s*)+$/i.test(prev);
  const nextHasBr = /^(?:\s*<\s*br\s*\/?>)+/i.test(next);
  if (prevHasBr || nextHasBr) {
    const cleanPrev = prev.replace(/(?:\s*<\s*br\s*\/?>)+\s*$/i, '');
    const cleanNext = next.replace(/^(?:\s*<\s*br\s*\/?>)+\s*/i, '');
    if (!cleanPrev) return cleanNext;
    if (!cleanNext) return cleanPrev;
    return `${cleanPrev}<br>${cleanNext}`;
  }
  // 若交界處已具備空格字元
  if (/\s$/.test(prev) || /^\s/.test(next)) {
    return prev + next;
  }
  // 若兩側交界處皆為 CJK 中文字元，無縫銜接
  const lastChar = prev[prev.length - 1];
  const firstChar = next[0];
  if (/[\u4e00-\u9fa5\u3040-\u30ff]/.test(lastChar) && /[\u4e00-\u9fa5\u3040-\u30ff]/.test(firstChar)) {
    return prev + next;
  }
  // 其餘英數或符號情況補標準半形空格
  return `${prev} ${next}`;
}

/**
 * 將表格文字行安全分割為儲存格字串陣列，保護行內程式碼與轉義管線字元（`\|`）。
 *
 * @param line 表格文字行字串
 * @returns 儲存格字串陣列
 */
function splitTableCells(line: string): string[] {
  // 保護行內程式碼區塊（`...`），避免更改程式碼內容中的管線符號
  const codeSpans: string[] = [];
  let protectedLine = line.replace(/(`+)([\s\S]*?)\1/g, (match) => {
    codeSpans.push(match);
    return `\x00CODE_${codeSpans.length - 1}\x00`;
  });

  // 保護轉義之管線符號 \|
  protectedLine = protectedLine.replace(/\\\|/g, '\x00ESCAPED_PIPE\x00');

  let trimmed = protectedLine.trim();

  // 若開頭有管線符號，去除首個管線符號
  if (trimmed.startsWith('|')) {
    trimmed = trimmed.slice(1);
  }
  // 若結尾有管線符號，去除最後一個管線符號
  if (trimmed.endsWith('|')) {
    trimmed = trimmed.slice(0, -1);
  }

  // 依管線符號分割
  const rawCells = trimmed.split('|');

  return rawCells.map((cell) => {
    let restored = cell.trim();
    // 還原轉義管線符號
    restored = restored.replace(/\x00ESCAPED_PIPE\x00/g, '\\|');
    // 還原程式碼區塊
    restored = restored.replace(/\x00CODE_(\d+)\x00/g, (_, idx) => codeSpans[parseInt(idx, 10)]);
    return restored;
  });
}

/**
 * 將儲存格字串陣列格式化為標準 GFM 表格行（例如：`| 儲存格 1 | 儲存格 2 |`）。
 * 自動將儲存格內連續多餘的 `<br>` 標籤收斂為單一 `<br>` 標籤，並清除儲存格首尾贅餘之換行標籤。
 *
 * @param cells 儲存格字串陣列
 * @returns 標準化之表格行字串
 */
function formatTableRow(cells: string[]): string {
  const normalizedCells = cells.map((cell) => {
    return cell
      .replace(/<\s*br\s*\/?>/gi, '<br>')
      .replace(/(?:<br>\s*){2,}/gi, '<br>')
      .replace(/^(?:\s*<br>\s*)+/gi, '')
      .replace(/(?:\s*<br>\s*)+$/gi, '')
      .trim();
  });
  return '| ' + normalizedCells.join(' | ') + ' |';
}
