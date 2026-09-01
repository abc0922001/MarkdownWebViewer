# GitHub Flavored Markdown (GFM) 規範合規性改進計畫

**計畫日期**：2026-09-01  
**目標**：將 MarkdownWebViewer 的 Markdown 解析與修正功能升級至 GFM 規範完全相容（目前合規度：~70%）  
**優先級**：P1（高）- 直接影響產品核心功能與規範遵循度

---

## 📊 現狀評估

### 合規性評分（5 個維度）

| 維度 | 評分 | 說明 | 關鍵問題 |
|:---|:---:|:---|:---|
| **基礎 Markdown** | 9/10 | CommonMark 完全相容 | 細節工作良好 |
| **GFM 核心特性** | 7/10 | 表格、刪除線、清單支援 | Alerts 多段落支援不完整 ❌ |
| **GitHub 專有擴充** | 6/10 | Mermaid 完整、Alerts 待改進 | Alert 正規表達式過於簡單 ❌ |
| **安全性 (XSS 防禦)** | 9/10 | DOMPurify 配置優秀 | SVG 屬性白名單需擴充 ⚠️ |
| **規範遵循度** | 7/10 | 符合 GFM 主線 | 邊界情況與嵌套支援遺漏 ❌ |
| **整體** | **7.6/10** | 基本可用，有改進空間 | 見下文詳細分析 |

---

## 🔴 優先級 1：緊急問題（必須修復）

### 1.1 GitHub Alerts 多段落支援不完整 ❌❌❌

**現狀**（`src/renderer/markdown.ts` 第 54-90 行）：
```typescript
function processAlerts(html: string): string {
  const alertTypes = ['note', 'tip', 'important', 'warning', 'caution'];
  
  return html.replace(
    /<blockquote>\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br>|\n)?([\s\S]*?)<\/p>\s*<\/blockquote>/gi,
    (_match, type, content) => {
      // ...
    }
  );
}
```

**問題**：
- ❌ 正規表達式只匹配**單一 `<p>` 標籤**，無法處理多段落警示
- ❌ 無法支援警示內部的嵌套 Markdown（清單、程式碼區塊、表格等）
- ❌ 不遵循 GFM 官方規範 — Alert 應為**容器級元素（Block-Level）**，而非區塊引言後處理

**GFM 標準範例**：
```markdown
> [!NOTE]
> 這是第一段
> 
> - 清單項目
> - 另一項目
> 
> 最後一段
```

**預期輸出**：
```html
<div class="markdown-alert markdown-alert-note">
  <div class="markdown-alert-title">
    <svg><!-- icon --></svg>
    <span>NOTE</span>
  </div>
  <p>這是第一段</p>
  <ul>
    <li>清單項目</li>
    <li>另一項目</li>
  </ul>
  <p>最後一段</p>
</div>
```

**改進方案**：
使用 `markdown-it-container` 或自訂 block rule，在解析階段（而非後處理）即正確識別並處理 Alert 容器內的所有內容。

---

### 1.2 表格對齊符號規範驗證缺失 ⚠️

**現狀**（`src/utils/formatter.ts` 第 328-514 行）：
```typescript
function repairMarkdownTables(content: string): { result: string; fixedCount: number } {
  // 表格修復邏輯完整，但未驗證分隔線對齊語法
  // 僅修復 "---" 但未檢查 ":---:", ":---", "---:" 等 GFM 對齐標記
}
```

**問題**：
- ⚠️ 標準化分隔線時（第 374-381 行）未驗證對齊冒號的正確性
- ⚠️ GFM 規範要求：`:---` (左對齐) / `:---:` (居中) / `---:` (右對齐)
- ⚠️ 若修復後的對齊符號不符合規範，可能導致渲染差異

**改進方案**：
在 `normalizedSepCells` 的映射函式中補充對齐驗證，確保所有分隔線符合 GFM 對齐規範。

---

## 🟡 優先級 2：重要改進（應該修復）

### 2.1 列表與工作清單嵌套規範化缺失

**現狀**（`src/utils/formatter.ts` 第 73-83 行）：
```typescript
// 只修復缺失空格，未驗證嵌套列表的 GFM 縮排規則
text = text
  .replace(/^(\s*[-*+])([^\s\-*+\d])/gm, '$1 $2')
  .replace(/^(\s*[-*+]\s*)\[\s*\]/gm, '$1[ ] ')
  .replace(/^(\s*[-*+]\s*)\[[xX]\]/gm, '$1[x] ');
```

**問題**：
- ⚠️ GFM 要求嵌套列表使用 **2 空格或 1 Tab 縮排**
- ⚠️ 工作清單 (`- [ ]`) 嵌套時需正確縮排，否則無法被識別為任務項

**GFM 正確範例**：
```markdown
- [ ] 任務 1
  - [ ] 子任務 1.1
  - [x] 子任務 1.2
- [x] 任務 2
```

**改進方案**：
新增列表縮排驗證函式，確保嵌套列表符合 GFM 規範。

---

### 2.2 SVG 屬性白名單不完整

**現狀**（`src/renderer/markdown.ts` 第 106-109 行）：
```typescript
return DOMPurify.sanitize(withAlerts, {
  ADD_TAGS: ['svg', 'g', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon', 'text', 'tspan', 'foreignObject'],
  ADD_ATTR: ['viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'points', 'data-raw'],
});
```

**問題**：
- ⚠️ 缺少 Mermaid 常用的高級 SVG 屬性：
  - `transform` — 圖形旋轉、縮放、平移
  - `clip-path` — 裁剪路徑
  - `filter` — 濾鏡效果
  - `marker` 與 `use` 元素 — 箭頭、圖形重用

**改進方案**：
擴充白名單以支援完整的 Mermaid SVG 功能。

---

## 🟢 優先級 3：可選改進（增強體驗）

### 3.1 缺少正式的 GFM 外掛聲明

**現狀**（`src/renderer/markdown.ts` 第 27-51 行）：
```typescript
const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight(str: string, lang: string): string {
    // ...
  },
});
// 沒有明確啟用 GFM 外掛
```

**問題**：
- 🟡 無法確認是否正確加載所有 GFM 外掛（表格、刪除線、工作清單等）
- 🟡 package.json 中未明確列舉 GFM 相關依賴

**改進方案**：
新增 `markdown-it` 的官方 GFM 外掛配置，並在 package.json 中明確聲明。

---

## 📋 修正功能強化計畫

除了上述 GFM 規範修復外，**修正（Fix）功能**也應同步升級以支援更多規範化場景：

### A. 增強 `fixMarkdownFormatting()` 的 GFM 規範支援

**新增功能**：
1. **Alert 語法規範化**
   - 偵測 `> [!TYPE]` 格式並自動補齊缺失空行、對齊層級
   - 處理多段落警示內容

2. **表格對齐符號標準化**
   - 驗證並修正分隔線對齐符號（`:---`, `:---:`, `---:` 等）
   - 自動對齐欄寬（可選）

3. **列表嵌套縮排規範化**
   - 驗證嵌套列表的縮排（2 空格 / 1 Tab）
   - 修正工作清單的嵌套結構

### B. 新增 GFM 規範驗證函式

**新檔案**：`src/utils/gfm-validator.ts`

```typescript
/**
 * GFM 規範驗證器
 * 檢查 Markdown 內容是否符合 GitHub Flavored Markdown 規範
 */

export interface GfmValidationResult {
  isValid: boolean;
  errors: GfmError[];
  warnings: GfmWarning[];
}

export interface GfmError {
  type: 'alert' | 'table' | 'list' | 'code' | 'heading';
  line: number;
  message: string;
  suggestion?: string;
}

export interface GfmWarning {
  type: string;
  line: number;
  message: string;
}

/**
 * 驗證 Markdown 內容是否符合 GFM 規範
 */
export function validateGfmCompliance(markdown: string): GfmValidationResult {
  const errors: GfmError[] = [];
  const warnings: GfmWarning[] = [];
  
  // 1. 驗證 Alerts 結構
  const alertErrors = validateAlerts(markdown);
  errors.push(...alertErrors);
  
  // 2. 驗證表格格式
  const tableErrors = validateTables(markdown);
  errors.push(...tableErrors);
  
  // 3. 驗證列表嵌套
  const listErrors = validateLists(markdown);
  errors.push(...listErrors);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
```

---

## 🛠️ 實現路線圖

### Phase 1：Alerts 容器級支援（Week 1）
- [ ] 新增 Alert block rule 至 markdown-it 初始化
- [ ] 移除現有 `processAlerts()` 後處理，改用前置處理
- [ ] 支援 Alert 內嵌套 Markdown（清單、程式碼等）
- [ ] 補充測試用例（單段、多段、嵌套內容）

### Phase 2：表格與列表規範化（Week 2）
- [ ] 增強 `repairMarkdownTables()` 的對齐符號驗證
- [ ] 新增列表嵌套縮排檢查函式
- [ ] 擴充 `fixMarkdownFormatting()` 的 Alert 支援
- [ ] 新增單元測試與集成測試

### Phase 3：驗證系統與文檔（Week 3）
- [ ] 實現 `src/utils/gfm-validator.ts` 驗證器
- [ ] 新增 GFM 合規性檢查報告（可視化面板）
- [ ] 更新 README.md 與 DESIGN.md，明確標註 GFM 合規度
- [ ] 建立 GFM 測試套件（參考 [GFM Spec Examples](https://github.github.com/gfm/#example-1)）

### Phase 4：效能測試與上線（Week 4）
- [ ] 效能基準測試（Lighthouse、渲染速度）
- [ ] 相容性驗證（瀏覽器、邊界情況）
- [ ] 發布 Release Note
- [ ] 部署至 GitHub Pages

---

## 📝 檔案變更清單

| 檔案 | 變更類型 | 影響範圍 | 優先級 |
|:---|:---:|:---|:---:|
| `src/renderer/markdown.ts` | ✏️ 修改 | Alert 解析邏輯 | P1 |
| `src/utils/formatter.ts` | ✏️ 修改 | 表格/列表規範化 | P1 |
| `src/utils/gfm-validator.ts` | ✨ 新增 | 規範驗證系統 | P2 |
| `src/utils/gfm-fixer.ts` | ✨ 新增 | GFM 特定修復函式 | P2 |
| `__tests__/gfm-compliance.test.ts` | ✨ 新增 | GFM 測試套件 | P3 |
| `GFM_COMPLIANCE_REPORT.md` | ✨ 新增 | 合規性報告 | P3 |
| `package.json` | ✏️ 修改 | 新增依賴宣告 | P3 |
| `README.md` | ✏️ 修改 | 文檔更新 | P3 |

---

## 🧪 測試計畫

### GFM 規範測試用例

**Alert 多段落支援**：
```markdown
> [!WARNING]
> 這是警告
> 
> - 重點 1
> - 重點 2
> 
> 最後提醒
```

**表格對齐**：
```markdown
| 左對齐 | 居中 | 右對齐 |
| :--- | :---: | ---: |
| A | B | C |
```

**嵌套列表**：
```markdown
- 項目 1
  - [ ] 子任務 1
  - [x] 子任務 2
- 項目 2
```

**複合嵌套**：
```markdown
> [!NOTE]
> - 清單
>   1. 有序子清單
>   2. 第二項
> ```code
> snippet
> ```
```

---

## 📊 成功標準

✅ **完成條件**：
1. GFM 合規度提升至 **95%+**
2. 所有 P1 優先級問題已解決
3. 修正功能支援 GFM 規範化場景
4. 通過 GFM Spec 官方測試套件 **90%+** 用例
5. 無效能迴歸（Lighthouse 保持 100/100）
6. 文檔完整更新，清楚標註 GFM 合規狀態

---

## 📞 相關資源

- [GFM 官方規範](https://github.github.com/gfm/)
- [markdown-it 官方文檔](https://github.com/markdown-it/markdown-it)
- [markdown-it-container](https://github.com/markdown-it/markdown-it-container)
- [DOMPurify 配置](https://github.com/cure53/DOMPurify)

---

**計畫擁有者**：GitHub Copilot  
**最後更新**：2026-09-01
