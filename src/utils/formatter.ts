/**
 * Markdown Auto-Fix & Formatting Engine
 * Specially tuned to repair copy-paste formatting anomalies from Gemini, ChatGPT, and Web LLMs.
 */

export interface FixResult {
  formatted: string;
  changed: boolean;
  fixesSummary: string[];
}

/**
 * Main entrypoint for Markdown auto-formatting
 */
export function fixMarkdownFormatting(rawText: string): FixResult {
  const fixes: string[] = [];
  let text = rawText;

  // 1. Normalize line endings (CRLF -> LF)
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Clean invisible zero-width characters and non-standard spaces
  const beforeCharClean = text;
  text = text
    .replace(/[\u200B\u200C\u200D\uFEFF\u2060]/g, '') // Remove zero-width spaces
    .replace(/[\u00A0\u202F]/g, ' '); // Replace non-breaking spaces with standard space
  if (text !== beforeCharClean) {
    fixes.push('清除隱形零寬字元與非標準空格');
  }

  // 2.5 Fix bold formatting (trim inner spaces, remove empty bold markers, add CJK spacing)
  const beforeBold = text;
  text = fixBoldFormatting(text);
  if (text !== beforeBold) {
    fixes.push('修正粗體標籤排版與空格問題');
  }

  // 3. Repair Tables (Stitch broken table rows, remove orphan pipes and internal blank lines)
  const { result: tableFixedText, fixedCount: tableFixedCount } = repairMarkdownTables(text);
  if (tableFixedCount > 0) {
    text = tableFixedText;
    fixes.push(`修復 ${tableFixedCount} 個破損或中斷的表格區塊`);
  }

  // 4. Fix Headings without space (e.g. #Title -> # Title)
  const beforeHeading = text;
  text = text.replace(/^(#{1,6})([^#\s\n])/gm, '$1 $2');
  if (text !== beforeHeading) {
    fixes.push('校正標題語法缺失之空格');
  }

  // 5. Fix Lists & Task Checkboxes
  const beforeList = text;
  text = text
    // Fix "-item" -> "- item"
    .replace(/^(\s*[-*+])([^\s\-*+\d])/gm, '$1 $2')
    // Fix "-[]" or "-[x]" -> "- [ ]" or "- [x]"
    .replace(/^(\s*[-*+]\s*)\[\s*\]/gm, '$1[ ] ')
    .replace(/^(\s*[-*+]\s*)\[[xX]\]/gm, '$1[x] ');
  if (text !== beforeList) {
    fixes.push('校正清單與核取方塊排版');
  }

  // 6. Balance unclosed code blocks
  const codeBlockCount = (text.match(/^```/gm) || []).length;
  if (codeBlockCount % 2 !== 0) {
    text = text.trimEnd() + '\n```\n';
    fixes.push('自動補齊未閉合的程式碼區塊 (```)');
  }

  // 7. Compress 3+ consecutive newlines into standard double newlines
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
 * 修正 Markdown 文本中的粗體排版與空格問題
 */
export function fixBoldFormatting(text: string): string {
  let result = text;

  // 1. Remove empty bold tags (e.g. **** or **   **)
  result = result.replace(/\*\*\s*\*\*/g, '');

  // 2. Trim spaces inside bold markers
  // "** text **" -> "**text**"
  result = result.replace(/\*\*\s+([^\*\n]+?)\s+\*\*/g, '**$1**');
  result = result.replace(/\*\*\s+([^\*\n]+?)\*\*/g, '**$1**');
  result = result.replace(/\*\*([^\*\n]+?)\s+\*\*/g, '**$1**');

  // 3. Add space between CJK (Chinese/Japanese/Korean) and bolded latin/number runs
  // CJK + **latin** -> CJK + ' ' + **latin**
  result = result.replace(/([\u4e00-\u9fa5\u3040-\u30ff])\*\*([A-Za-z0-9_#+\-@\s]+?)\*\*/g, '$1 **$2**');
  // **latin** + CJK -> **latin** + ' ' + CJK
  result = result.replace(/\*\*([A-Za-z0-9_#+\-@\s]+?)\*\*([\u4e00-\u9fa5\u3040-\u30ff])/g, '**$1** $2');

  // 4. Normalize accidental extra spaces around bold markers
  result = result.replace(/ {2,}\*\*/g, ' **');
  result = result.replace(/\*\* {2,}/g, '** ');

  return result;
}

/**
 * Advanced table stitching algorithm
 * Fixes Gemini table outputs containing:
 * - Empty lines between table rows
 * - Orphan pipe lines (e.g. "|")
 * - Missing closing/opening pipes
 */
function repairMarkdownTables(content: string): { result: string; fixedCount: number } {
  const lines = content.split('\n');
  const outputLines: string[] = [];
  let i = 0;
  let fixedTables = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect potential table header: line contains '|'
    if (trimmed.startsWith('|') || (trimmed.includes('|') && isPotentialTableRow(trimmed))) {
      // Look ahead to see if the next non-empty line is a separator (| --- | --- |)
      let separatorIndex = -1;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextTrimmed = lines[j].trim();
        if (!nextTrimmed) continue; // skip blank line between header and separator
        if (isTableSeparator(nextTrimmed)) {
          separatorIndex = j;
          break;
        } else {
          break; // Next line is not a separator, not a standard table start
        }
      }

      if (separatorIndex !== -1) {
        // Table detected! Begin collecting and repairing all table rows
        const tableRows: string[] = [];
        let hadGlitches = false;

        // Add header
        tableRows.push(normalizeTableRow(lines[i].trim()));

        // Add separator
        tableRows.push(normalizeTableSeparator(lines[separatorIndex].trim()));

        let cursor = separatorIndex + 1;

        // Scan subsequent table body lines
        while (cursor < lines.length) {
          const currentLine = lines[cursor];
          const curTrimmed = currentLine.trim();

          // Check if this is an orphan pipe line (e.g. "|" or "|   |")
          if (curTrimmed === '|' || curTrimmed === '||' || /^\|\s*\|$/.test(curTrimmed)) {
            hadGlitches = true;
            cursor++;
            continue;
          }

          // Check if this is an empty line
          if (curTrimmed === '') {
            // Check ahead: if the next non-empty line is a table row, skip this blank line!
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
              // End of table block reached
              break;
            }
          }

          // Check if line is a valid table row
          if (isPotentialTableRow(curTrimmed) && !isHeaderOrHeading(curTrimmed)) {
            const normalizedRow = normalizeTableRow(curTrimmed);
            tableRows.push(normalizedRow);
            cursor++;
          } else {
            // Reached non-table content
            break;
          }
        }

        // Ensure proper blank line before table if needed
        if (outputLines.length > 0 && outputLines[outputLines.length - 1].trim() !== '') {
          outputLines.push('');
        }

        // Push all contiguous table rows
        outputLines.push(...tableRows);
        outputLines.push(''); // Add trailing blank line after table

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
 * Checks if a line looks like a table separator (e.g. | --- | :---: | ---: |)
 */
function isTableSeparator(line: string): boolean {
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(line);
}

/**
 * Checks if a line looks like a table row with column content
 */
function isPotentialTableRow(line: string): boolean {
  if (line.startsWith('#') || line.startsWith('```') || line.startsWith('>')) return false;
  // Must contain at least one pipe and some text
  return line.includes('|') && line.replace(/\|/g, '').trim().length > 0;
}

/**
 * Checks if line is a heading
 */
function isHeaderOrHeading(line: string): boolean {
  return /^#{1,6}\s+/.test(line);
}

/**
 * Normalizes a table row to ensure leading '| ' and trailing ' |'
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
 * Normalizes a table separator row
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
