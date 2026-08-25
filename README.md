# Markdown & Mermaid Web Viewer

> 一套基於 **Linear Design System (`DESIGN.md`)** 規格打造、具備極速冷啟動（Cold Start）、純記憶體無痕暫態（Zero-Persistence）與 **AI / Gemini 複製排版智慧「✨ 自動修正」** 特性的純前端 Markdown & Mermaid 即時查看器與排版工具。

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)
![Design System](https://img.shields.io/badge/Design%20System-Linear%20(DESIGN.md)-5E6AD2)
![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-222222?logo=github)
![Zero-Persistence](https://img.shields.io/badge/Security-Zero--Persistence-27A644)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

---

## 🌟 核心特色 (Key Features)

### 1. 雙欄即時預覽與雙向滾動同步
- **CodeMirror 6 現代編輯器**：支援 Markdown 語法著色、行號、自動折行切換、本機檔案拖曳載入。
- **等比雙向滾動同步**：左右雙向平滑滾動，內建互斥鎖與 `requestAnimationFrame` 節流，徹底杜絕無窮循環震顫。

### 2. ✨ AI / Gemini 排版智慧「自動修正」引擎 (`Alt + F`)
- **表格智慧縫合**：一鍵修復自 Gemini / ChatGPT 等 AI 介面複製時常發生的**表格行間空行**與**孤立 `|` 符號**。
- **管線補齊與對齊**：自動為缺失首尾管線的資料列補齊 `| ` 與 ` |`，無損還原為標準 GFM 表格。
- **隱形字元與排版清理**：自動清除零寬空格（`\u200B`）與置換不換行空格（`\u00A0`），修補標題空格（`#標題` ➔ `# 標題`）與任務方框（`-[ ]` ➔ `- [ ]`）。

### 3. ☀️ 淺色／🌙 深色主題即時切換 (`Alt + T`)
- **全站系統同步聯動**：全站 UI、CodeMirror 6 編輯器（透過 Compartment 動態重配）、Highlight.js 程式碼著色與 Mermaid 向量圖表皆即時重繪適配。
- **深度對齊 DESIGN.md**：深色模式呈現 `#010102` 黑曜底色與 `#5E6AD2` Lavender 點綴；淺色模式呈現純淨 `#FFFFFF` / `#F5F6F7` 高對比紙張質感。

### 4. Linear 風格三態佈局切換 (`Alt + 1 / 2 / 3`)
- **右上角 Segmented Control**：一鍵切換「**純編輯** (`Alt+1`)」、「**雙欄對照** (`Alt+2`)」與「**純瀏覽** (`Alt+3`)」，具備滑動指示條。
- **中央彈性拖曳分隔條**：支援滑鼠與觸控拖曳調整欄寬比例（15% ~ 85% 範圍限制保護）。

### 5. Mermaid 向量圖表按需延遲載入 (Lazy Pipeline)
- **首屏零體積負擔**：僅當文件中出現 ````mermaid` 區塊時才透過 Dynamic Import 動態加載模組。
- **防競態 Token 與錯誤邊界**：快速打字時不會被舊非同步任務覆蓋，語法未完成時顯示微型錯誤提示，不中斷預覽體驗。

### 6. 純前端三合一多格式匯出
- **Markdown (`.md`)**：標準 UTF-8 純文字檔案下載。
- **獨立自給 HTML (`.html`)**：內嵌全套 Linear 樣式表與 Mermaid 向量 SVG，無須任何網路連線即可於任何裝置離線開啟。
- **列印級無損 PDF (`.pdf`)**：注入專屬 `@media print` 樣式，自動反轉高對比白底黑字，防止圖表與表格跨頁腰斬。

### 7. 嚴格無痕暫態生命週期 (Zero-Persistence)
- **零本機儲存**：全流程純記憶體生命週期，嚴禁使用 `localStorage`、`sessionStorage` 或 `Cookie`。
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

### 3. 執行型別檢查並編譯生產環境資源
```bash
npm run build
```
編譯完成之靜態資源將輸出至 `dist/` 目錄中。

### 4. 本機預覽編譯後成果
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
├── .github/workflows/deploy.yml  # GitHub Actions 自動部署流程
├── src/
│   ├── editor/
│   │   └── codemirror.ts         # CodeMirror 6 實例、深淺主題、Compartments、檔案拖曳
│   ├── exporter/
│   │   ├── html-exporter.ts      # 封裝獨立自給 .html (內嵌 CSS 與 SVG)
│   │   ├── md-exporter.ts        # Blob 匯出純文字 .md
│   │   └── pdf-exporter.ts       # window.print() 搭配 @media print 高解析列印
│   ├── layout/
│   │   ├── resizer.ts            # 中央分割條拖曳與寬度限制 (15% ~ 85%)
│   │   ├── switcher.ts           # 右上角三態佈局狀態機 (Alt+1/2/3)
│   │   └── sync-scroll.ts        # 雙向等比滾動同步與防迴圈互斥鎖
│   ├── renderer/
│   │   ├── markdown.ts           # markdown-it 配置、Highlight.js 著色、DOMPurify
│   │   └── mermaid.ts            # 按需動態加載 mermaid.js、主題重繪、防競態 Token
│   ├── styles/                   # Linear Design Tokens、深淺主題、排版與列印樣式
│   ├── utils/
│   │   ├── debounce.ts           # 120ms 防抖調度器
│   │   ├── formatter.ts          # Gemini / AI Markdown 壞格式自動修正引擎
│   │   ├── sample.ts             # 初始範例 Markdown 模板
│   │   └── toast.ts              # 非侵入式 Toast 輕量通知模組
│   └── main.ts                   # 應用程式進入點與全域事件綁定
├── DESIGN.md                     # Linear 設計系統權威分析與 Token 定義文件
├── GEMINI.md                     # LLM & 開發者全域上下文指引文件
├── index.html                    # 靜態 HTML Shell
├── package.json                  # 專案相依配置
├── tsconfig.json                 # TypeScript 編譯設定
└── vite.config.ts                # Vite 相對路徑建置與 Rollup 手動拆包配置
```

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 開源授權。
