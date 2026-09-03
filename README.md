# Markdown & Mermaid Web Viewer

> 一套基於 **Linear Design System (`DESIGN.md`)** 規格打造、具備極速冷啟動（Cold Start）、純記憶體無痕暫態（Zero-Persistence）、Lighthouse 全項滿分（100/100）與 **AI / Gemini 複製排版智慧「✨ 自動修正」** 特性的純前端 Markdown & Mermaid 即時檢視器與排版工具。

![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite)
![Design System](https://img.shields.io/badge/Design%20System-Linear%20(DESIGN.md)-5E6AD2)
![Lighthouse](https://img.shields.io/badge/Lighthouse-100%2F100-success?logo=lighthouse)
![JSDoc](https://img.shields.io/badge/JSDoc-100%25-blue)
![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-222222?logo=github)
![PWA](https://img.shields.io/badge/PWA-Ready-success?logo=pwa)
![Zero-Persistence](https://img.shields.io/badge/Security-Zero--Persistence-27A644)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

---

## 🌟 核心特色 (Key Features)

### 1. 雙欄即時預覽與雙向捲動同步
- **CodeMirror 6 現代編輯器**：支援 Markdown 語法著色、行號、自動折行切換、本機檔案拖曳載入，以及行數、字數、字元數與游標動態統計。
- **等比雙向捲動同步**：左右雙向平滑捲動，內建互斥鎖與 `requestAnimationFrame` 節流，徹底杜絕無窮循環震顫。

### 2. ✨ AI / Gemini 排版智慧「自動修正」引擎 (`Alt + F`)
- **LaTeX 數學與比較符號標準化**：自動將自 AI 介面複製之 LaTeX 不等式與符號（如 `$\le$`、`$\ge$`、`$\neq$`、`$\approx$`、`$\pm$`、`$\times$`、`$\div$` 等）轉為對應標準 Unicode 符號（`≤`、`≥`、`≠`、`≈`、`±`、`×`、`÷` 等），支援行內公式運算子替換，並具備多行與行內程式碼遮罩保護。
- **粗體標籤格式校正**：閉合孤立星號、消除標記內側贅餘空格，在中文字元與英數字元交界處智慧補齊標準半形空格，嚴格限制單行配對以防止跨行合併與跨標記跑版。
- **表格智慧修復**：一鍵修復自 Gemini / ChatGPT 等 AI 介面複製時常發生的**表格列間空行**與**孤立 `|` 符號**，並為缺失首尾直線符號的資料列補齊 `| ` 與 ` |`。
- **語法修補與隱形字元清洗**：自動清除零寬字元（`\u200B`~`\u2060`）與置換不換行空格（`\u00A0`），修補標題空格（`#標題` ➔ `# 標題`）、清單待辦核取方塊（`-[]` ➔ `- [ ] `）、未閉合反引號區塊（```）並壓縮連續空行。

### 3. ☀️ 淺色／🌙 深色主題即時切換 (`Alt + T`)
- **全站系統同步連動**：全站 UI、CodeMirror 6 編輯器（透過 Compartment 動態重配）、Highlight.js 程式碼著色與 Mermaid 向量圖表皆即時重繪以完整支援。
- **嚴格遵循 DESIGN.md**：深色模式呈現 `#010102` 黑曜底色與 `#5E6AD2` Lavender 點綴；淺色模式呈現純淨 `#FFFFFF` / `#F5F6F7` 高對比紙張質感。

### 4. Linear 風格三態版面切換 (`Alt + 1 / 2 / 3`)
- **右上角 Segmented Control**：一鍵切換「**純編輯** (`Alt+1`)」、「**雙欄對照** (`Alt+2`)」與「**純瀏覽** (`Alt+3`)」，具備滑動指示條。
- **純瀏覽極簡無干擾排版**：切換至「純瀏覽」時自動隱藏次要編輯按鈕、即時預覽次標題欄與底部狀態列，釋放全螢幕閱讀空間；支援 `Alt+2` 或 `Escape` 鍵一鍵無縫返回雙欄對照。
- **專注全螢幕閱讀模式 (`Alt + Z`)**：支援一鍵隱藏頂部工具列進行沈浸式文件閱讀，並提供懸浮膠囊控制項隨時返回雙欄對照或顯示工具列。
- **中央彈性拖曳分隔條**：支援滑鼠與觸控拖曳調整欄寬比例（15% ~ 85% 範圍限制保護）。

### 5. Mermaid 向量圖表延遲載入 & GFM Alerts 完整巢狀支援
- **初次載入零體積負擔**：僅當文件中出現 ````mermaid` 區塊時才透過 Dynamic Import 動態載入模組。
- **防競態 Token 與錯誤邊界**：快速打字時不會被舊非同步任務覆蓋，語法未完成時顯示微型錯誤提示，不中斷預覽體驗。
- **GFM Alerts 完整巢狀支援**：自行開發之零依賴 Token Stream Ruler，原生支援 `[!NOTE]`、`[!TIP]`、`[!IMPORTANT]`、`[!WARNING]`、`[!CAUTION]`，支援內部多段落、清單、表格與程式碼區塊等無限制巢狀 Markdown 排版。
- **GFM Tasklists 核取清單**：自動將 `- [ ]` 與 `- [x]` 轉譯為標準 HTML 核取方塊元素，完美符合 Linear 主題樣式。

### 6. 純前端三合一多格式匯出
- **Markdown (`.md`)**：標準 UTF-8 純文字檔案下載，即時釋放 Blob ObjectURL 避免記憶體洩漏。
- **獨立自給 HTML (`.html`)**：內嵌全套 Linear 樣式表與 Mermaid 向量 SVG，無須任何網路連線即可於任何裝置離線開啟。
- **列印級無損 PDF (`.pdf`)**：注入專屬 `@media print` 樣式，自動反轉高對比白底黑字，針對程式碼、表格與 Mermaid 圖表套用 `break-inside: avoid` 防止跨頁截斷。

### 7. 極致冷啟動與效能最佳化 (Lighthouse 全項滿分 100/100)
- **即時掛載與隨選載入架構**：CodeMirror 6 於網頁開啟時即刻掛載並自動聚焦（Auto-Focus），開箱即用支援剪貼簿直接貼上與鍵盤輸入；Markdown 解析引擎則於瀏覽器閒置時預先擷取。
- **消除渲染阻斷請求**：建置期 CSS 自動內嵌外掛將樣式直接注入 HTML，搭配 Highlight.js common 語言子集精簡打包。
- **無障礙 (a11y) 與 SEO 全面支援**：全站按鈕具備明確 `aria-label`、符合 WCAG AA 高對比度標準、結構化語意標籤與 `robots.txt`。

### 8. 嚴格無痕暫態生命週期 (Zero-Persistence)
- **零本機儲存**：全流程純記憶體生命週期，嚴禁使用 `localStorage`、`sessionStorage`、`IndexedDB` 或 `Cookie`。
- **防誤關閉防護**：內容編輯後若未手動匯出，重新整理或關閉分頁前會彈出原生確認對話框。

### 9. PWA 漸進式網頁應用程式 (Progressive Web App)
- **桌面與行動裝置獨立視窗安裝**：支援透過 Chrome / Edge / Safari 原生安裝至桌面或主畫面，以獨立 App 視窗執行。
- **完整離線 App Shell**：透過 Workbox Service Worker 預先快取完整應用核心（含 CodeMirror、Markdown 解析器與大型 Mermaid.js 繪圖引擎），在飛機上或無網路環境中仍可 100% 正常檢視與繪製圖表。
- **無感背景自動更新**：新版本靜默於背景快取，於使用者下一次開啟應用時生效，絕不突發重整以保護記憶體中未匯出的文件。
- **堅守 Zero-Persistence**：快取僅限應用程式靜態程式碼，文件資料依然純記憶體操作、絕無本機殘留。

---

## ⌨️ 鍵盤快捷鍵 (Keyboard Shortcuts)

| 快捷鍵 | 功能說明 |
| :--- | :--- |
| **`Alt + 1`** | 切換至「純編輯」模式 (100% 編輯欄) |
| **`Alt + 2`** | 切換至「雙欄對照」模式 (50 / 50 分割) |
| **`Alt + 3`** | 切換至「純瀏覽」模式 (100% 極簡技術文件置中預覽) |
| **`Alt + Z`** | 切換「專注全螢幕閱讀」模式 (隱藏頂部工具列) |
| **`Escape`** | 於純瀏覽或專注模式下快速返回雙欄對照模式 |
| **`Alt + F`** | 執行「✨ 自動修正」Markdown 排版與修復表格 |
| **`Alt + T`** | 切換「☀️ 淺色／🌙 深色」主題 |
| **`Ctrl / Cmd + Z`** | 復原 (Undo) |
| **`Ctrl / Cmd + Y`** | 重做 (Redo) |
| **`Tab / Shift + Tab`** | 縮排 / 取消縮排 |

---

## 🚀 本機開發與建置 (Getting Started)

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

本專案已內建完整的 GitHub Actions 自動化建置與發佈工作流程（[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)）：

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
│   │   ├── switcher.ts       # 右上角三態版面狀態機 (Alt+1/2/3) 與 Segmented 指示條
│   │   └── sync-scroll.ts    # 雙向等比捲動同步與 isScrolling 迴圈互斥鎖 (rAF 節流)
│   ├── renderer/
│   │   ├── markdown.ts       # markdown-it 配置、Highlight.js 著色、GitHub 警示區塊、DOMPurify 消毒
│   │   └── mermaid.ts        # 視需求動態載入 mermaid.js、主題重繪、防競態 Token、錯誤邊界
│   ├── styles/
│   │   ├── base.css          # 全域 Reset、自訂捲軸、Toast 動畫、[hidden] 全域保護
│   │   ├── dropdown.css      # Linear 懸浮選單與彈出動畫
│   │   ├── editor.css        # CodeMirror 6 自訂樣式與 Gutters
│   │   ├── layout.css        # 工具列、雙欄容器、狀態列版面與響應式斷點
│   │   ├── preview.css       # 技術文件排版、表格、程式碼、深淺色 Highlight.js、Mermaid 容器
│   │   ├── print.css         # @media print 高對比白底列印、防跨頁截斷 (break-inside: avoid)
│   │   └── tokens.css        # DESIGN.md 權威 Design Tokens (深色與淺色變數)
│   ├── utils/
│   │   ├── debounce.ts       # 120ms Debounce 防彈跳排程器
│   │   ├── formatter.ts      # Gemini / AI Markdown 壞格式智慧修復引擎 (含 LaTeX 數學符號轉換)
│   │   ├── sample.ts         # 初始範例 Markdown 模板 (含流程圖、時序圖、表格、程式碼、公式)
│   │   └── toast.ts          # 非侵入式 Toast 輕量通知模組 (支援 success / info / error)
│   └── main.ts               # 應用程式進入點，即時掛載與自動聚焦、生命週期管線、快捷鍵與全域事件
├── DESIGN.md                 # Linear 設計系統權威分析與 Token 定義文件
├── GEMINI.md                 # LLM & 開發者全域上下文指引文件
├── index.html                # 靜態 HTML Shell (含預設輕量佔位與 SEO meta)
├── package.json              # 專案相依套件與腳本
├── plan.md                   # 產品初始架構與規格計畫書
├── tsconfig.json             # TypeScript 編譯設定
└── vite.config.ts            # Vite 相對路徑建置、CSS 自動內嵌外掛與 Rollup 自訂分包設定
```

---

## 📝 程式碼品質與工程規範 (Code Quality & Standards)

全專案遵循嚴格之現代軟體工程規範：
* **100% JSDoc 完整正體中文註解**：涵蓋所有公開類別、函式、介面、生命週期管線與建置設定檔。
* **嚴格靜態型別安全**：全專案啟用 TypeScript 嚴格模式，無隱式 `any`，介面與列舉型別明確。
* **純記憶體生命週期管理**：及時解除事件監聽器、即時釋放 DOM ObjectURL，確保零殘留與無記憶體洩漏。

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 開源授權。
