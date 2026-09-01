# Markdown & Mermaid Web Viewer

> 一套基於 **Linear Design System (`DESIGN.md`)** 規格打造、具備極速冷啟動（Cold Start）、純記憶體無痕暫態（Zero-Persistence）、Lighthouse 全項滿分（100/100）與 **AI / Gemini 複製排版智慧「✨ 自動修正」** 特性的純前端 Markdown & Mermaid 即時查看器與排版工具。

![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite)
![Design System](https://img.shields.io/badge/Design%20System-Linear%20(DESIGN.md)-5E6AD2)
![Lighthouse](https://img.shields.io/badge/Lighthouse-100%2F100-success?logo=lighthouse)
![JSDoc](https://img.shields.io/badge/JSDoc-100%25-blue)
![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-222222?logo=github)
![Zero-Persistence](https://img.shields.io/badge/Security-Zero--Persistence-27A644)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

---

## 🌟 核心特色 (Key Features)

### 1. 雙欄即時預覽與雙向滾動同步
- **CodeMirror 6 現代編輯器**：支援 Markdown 語法著色、行號、自動折行切換、本機檔案拖曳載入，以及行數、字數、字元數與游標動態統計。
- **等比雙向滾動同步**：左右雙向平滑滾動，內建互斥鎖與 `requestAnimationFrame` 節流，徹底杜絕無窮循環震顫。

### 2. ✨ AI / Gemini 排版智慧「自動修正」引擎 (`Alt + F`)
- **LaTeX 數學與比較符號標準化**：自動將自 AI 介面複製之 LaTeX 不等式與符號（如 `$\le$`、`$\ge$`、`$\neq$`、`$\approx$`、`$\pm$`、`$\times$`、`$\div$` 等）轉為對應標準 Unicode 符號（`≤`、`≥`、`≠`、`≈`、`±`、`×`、`÷` 等），支援行內公式運算子替換，並具備多行與行內程式碼遮罩保護。
- **粗體標籤格式校正**：閉合孤立星號、消除標記內側贅餘空格，在中文字元與英數字元交界處智能補齊標準半形空格，嚴格限制單行配對以防止跨行合併與跨標記跑版。
- **表格智慧修復**：一鍵修復自 Gemini / ChatGPT 等 AI 介面複製時常發生的**表格行間空行**與**孤立 `|` 符號**，並為缺失首尾管線的資料列補齊 `| ` 與 ` |`。
- **語法修補與隱形字元清洗**：自動清除零寬字元（`\u200B`~`\u2060`）與置換不換行空格（`\u00A0`），修補標題空格（`#標題` ➔ `# 標題`）、清單任務方框（`-[]` ➔ `- [ ] `）、未閉合反引號區塊（```）並壓縮連續空行。

### 3. ☀️ 淺色／🌙 深色主題即時切換 (`Alt + T`)
- **全站系統同步聯動**：全站 UI、CodeMirror 6 編輯器（透過 Compartment 動態重配）、Highlight.js 程式碼著色與 Mermaid 向量圖表皆即時重繪適配。
- **深度對齊 DESIGN.md**：深色模式呈現 `#010102` 黑曜底色與 `#5E6AD2` Lavender 點綴；淺色模式呈現純淨 `#FFFFFF` / `#F5F6F7` 高對比紙張質感。

### 4. Linear 風格三態佈局切換 (`Alt + 1 / 2 / 3`)
- **右上角 Segmented Control**：一鍵切換「**純編輯** (`Alt+1`)」、「**雙欄對照** (`Alt+2`)」與「**純瀏覽** (`Alt+3`)」，具備滑動指示條。
- **中央彈性拖曳分隔條**：支援滑鼠與觸控拖曳調整欄寬比例（15% ~ 85% 範圍限制保護）。

### 5. Mermaid 向量圖表延遲載入 & GFM Alerts 完整巢狀支援
- **首屏零體積負擔**：僅當文件中出現 ````mermaid` 區塊時才透過 Dynamic Import 動態加載模組。
- **防競態 Token 與錯誤邊界**：快速打字時不會被舊非同步任務覆蓋，語法未完成時顯示微型錯誤提示，不中斷預覽體驗。
- **GFM Alerts 完整巢狀支援**：自研零依賴 Token Stream Ruler，原生支援 `[!NOTE]`、`[!TIP]`、`[!IMPORTANT]`、`[!WARNING]`、`[!CAUTION]`，支援內部多段落、清單、表格與程式碼區塊等無限制巢狀 Markdown 排版。
- **GFM Tasklists 核取清單**：自動將 `- [ ]` 與 `- [x]` 轉譯為標準 HTML 核取方塊元素，完美適配 Linear 主題樣式。

### 6. 純前端三合一多格式匯出
- **Markdown (`.md`)**：標準 UTF-8 純文字檔案下載，即時釋放 Blob ObjectURL 避免記憶體洩漏。
- **獨立自給 HTML (`.html`)**：內嵌全套 Linear 樣式表與 Mermaid 向量 SVG，無須任何網路連線即可於任何裝置離線開啟。
- **列印級無損 PDF (`.pdf`)**：注入專屬 `@media print` 樣式，自動反轉高對比白底黑字，針對程式碼、表格與 Mermaid 圖表套用 `break-inside: avoid` 防止跨頁截斷。

### 7. 極致冷啟動與效能優化 (Lighthouse 全項滿分 100/100)
- **按需延遲載入管線**：CodeMirror 6 延遲互動載入（首屏輕量佔位，首次操作或 3.5 秒閒置掛載），Markdown 解析引擎延遲預擷取。
- **消除渲染阻斷請求**：建置期 CSS 自動內聯外掛將樣式直接注入 HTML，搭配 Highlight.js common 語言子集精簡打包。
- **無障礙 (a11y) 與 SEO 全面適配**：全站按鈕具備明確 `aria-label`、符合 WCAG AA 高對比度標準、結構化語意標籤與 `robots.txt`。

### 8. 嚴格無痕暫態生命週期 (Zero-Persistence)
- **零本機儲存**：全流程純記憶體生命週期，嚴禁使用 `localStorage`、`sessionStorage`、`IndexedDB` 或 `Cookie`。
- **防誤關閉防護**：內容編輯後若未手動匯出，重新整理或關閉分頁前會彈出原生確認對話框。

---

## ⌨️ 鍵盤快捷鍵 (Keyboard Shortcuts)

| 快捷鍵 | 功能說明 |
| :--- | :--- |
| **`Alt + 1`** | 切換至「純編輯」模式 (100% 編輯欄) |
| **`Alt + 2`** | 切換至「雙欄對照」模式 (50 / 50 分割) |
| **`Alt + 3`** | 切換至「純瀏覽」模式 (100% 技術文檔置中預覽) |
| **`Alt + F`** | 執行「✨ 自動修正」Markdown 排版與修復表格 |
| **`Alt + T`** | 切換「☀️ 淺色／🌙 深色」主題 |
| **`Ctrl / Cmd + Z`** | 復原 (Undo) |
| **`Ctrl / Cmd + Y`** | 重做 (Redo) |
| **`Tab / Shift + Tab`** | 縮排 / 取消縮排 |

---

## 🚀 本地開發與建置 (Getting Started)

### 1. 安裝相依套件
```bash
npm install
```

### 2. 啟動本機開發伺服器
```bash
npm run dev
```

### 3. 執行自動化單元測試
```bash
npm test
```

### 4. 執行型別檢查並編譯生產環境資源
```bash
npm run build
```
編譯完成之靜態資源將輸出至 `dist/` 目錄中。

### 5. 本機預覽編譯後成果
```bash
npm run preview
```

---

## 🌐 GitHub Pages 一鍵部署指南

本專案已內建完整的 GitHub Actions 自動化建置與發布工作流（[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)）：

1. **推送程式碼至 GitHub 儲存庫**：
   ```bash
   git add .
   git commit -m "feat: complete markdown web viewer"
   git push origin main
   ```
2. **設定 GitHub Pages 來源**：
   * 前往 GitHub 儲存庫頁面 ➔ **Settings** ➔ **Pages**。
   * 在 **Build and deployment** 區塊下的 **Source** 下拉選單中，選擇 **`GitHub Actions`**。
3. **自動完成上線**：
   * 每次推送到 `main` 分支時，GitHub Actions 會自動執行 `npm run build` 並部署至：
     `https://<your-username>.github.io/<repo-name>/`。

---

## 📂 專案架構概覽 (Architecture)

```
MarkdownWebViewer/
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions 自動部署至 GitHub Pages
├── public/
│   └── robots.txt            # 搜尋引擎檢索規範設定
├── src/
│   ├── editor/
│   │   └── codemirror.ts     # CodeMirror 6 實例、Linear 深淺主題、Compartments、拖曳檔案、統計指標
│   ├── exporter/
│   │   ├── html-exporter.ts  # 封裝單一獨立自給 .html 檔案 (內嵌 CSS 與 SVG 向量圖)
│   │   ├── md-exporter.ts    # Blob 匯出純文字 .md 檔案 (釋放 ObjectURL 避免洩漏)
│   │   └── pdf-exporter.ts   # window.print() 搭配 @media print 高解析列印與反白樣式
│   ├── layout/
│   │   ├── resizer.ts        # 中央分割條拖曳與寬度限制 (15% ~ 85%)
│   │   ├── switcher.ts       # 右上角三態佈局狀態機 (Alt+1/2/3) 與 Segmented 指示條
│   │   └── sync-scroll.ts    # 雙向等比滾動同步與 isScrolling 迴圈互斥鎖 (rAF 節流)
│   ├── renderer/
│   │   ├── markdown.ts       # markdown-it 配置、Highlight.js 著色、GitHub 警示區塊、DOMPurify 消毒
│   │   └── mermaid.ts        # 按需動態加載 mermaid.js、主題重繪、防競態 Token、錯誤邊界
│   ├── styles/
│   │   ├── base.css          # 全域 Reset、自訂捲軸、Toast 動畫、[hidden] 全域保護
│   │   ├── dropdown.css      # Linear 懸浮選單與彈出動畫
│   │   ├── editor.css        # CodeMirror 6 自訂樣式與 Gutters
│   │   ├── layout.css        # 工具列、雙欄容器、狀態列佈局與響應式斷點
│   │   ├── preview.css       # 技術文檔排版、表格、程式碼、深淺色 Highlight.js、Mermaid 容器
│   │   ├── print.css         # @media print 高對比白底列印、防跨頁截斷 (break-inside: avoid)
│   │   └── tokens.css        # DESIGN.md 權威 Design Tokens (深色與淺色變數)
│   ├── utils/
│   │   ├── debounce.ts       # 120ms 防抖排程調度器
│   │   ├── formatter.ts      # Gemini / AI Markdown 壞格式智慧修復引擎 (含 LaTeX 數學符號轉換)
│   │   ├── sample.ts         # 初始範例 Markdown 模板 (含流程圖、時序圖、表格、程式碼、公式)
│   │   └── toast.ts          # 非侵入式 Toast 輕量通知模組 (支援 success / info / error)
│   └── main.ts               # 應用程式進入點，延遲掛載、生命週期管線、快捷鍵與全域事件
├── DESIGN.md                 # Linear 設計系統權威分析與 Token 定義文件
├── GEMINI.md                 # LLM & 開發者全域上下文指引文件
├── index.html                # 靜態 HTML Shell (含預設輕量佔位與 SEO meta)
├── package.json              # 專案相依套件與腳本
├── plan.md                   # 產品初始架構與規格計畫書
├── tsconfig.json             # TypeScript 編譯設定
└── vite.config.ts            # Vite 相對路徑建置、CSS 自動內聯外掛與 Rollup 手動拆包配置
```

---

## 📝 程式碼品質與工程規範 (Code Quality & Standards)

全專案遵循嚴格之現代軟體工程規範：
* **100% JSDoc 完整繁體中文註解**：涵蓋所有公開類別、函式、介面、生命週期管線與建置設定檔。
* **嚴格靜態型別安全**：全專案啟用 TypeScript 嚴格模式，無隱式 `any`，介面與列舉型別明確。
* **純記憶體生命週期管理**：及時解除事件監聽器、即時釋放 DOM ObjectURL，確保零殘留與無記憶體洩漏。

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 開源授權。
