# 中一 DT：自動化與機械人（自學網站）

中一設計與科技科「自動化與機械人」單元的自學網站。共四課：第一堂認識機械人（概念），第二至四堂 1–2 人一組，用真車實作（麥昆 Plus V2）；學生最後下載有驗證碼的成績報告交給老師。課堂頁不用模擬器；模擬器仍保留在 `sim/` 供老師示範。

## 學生網址

開啟 GitHub Pages 後（Settings → Pages → Branch: `main` / root）：

| 頁面 | 網址 |
|---|---|
| 單元首頁 | `https://edwardyungch.github.io/F1-DT/` |
| 第一堂：認識機械人 | `…/L1/` |
| 第二堂：小車走正方形 | `…/L2/` |
| 第三堂：巡線機械人 | `…/L3/` |
| 第四堂：流程圖與巡線優化 | `…/L4/` |
| 麥昆小車模擬器 | `…/sim/` |
| 單元小專題 | `…/project.html` |
| 老師區（要密碼） | `…/teacher/` |

## 結構

```
index.html          單元首頁（顯示每課進度及徽章）
L1/ L2/ L3/ L4/     四課課堂頁（每頁獨立，沒有連往其他課的連結）
project.html        單元小專題：課室送遞機械人（附評分準則）
sim/                麥昆小車模擬器（Blockly 7 已放在 sim/blockly，可離線）
  engine.js         物理引擎及程式執行器（瀏覽器及 Node 都可運行）
  blocks.js         積木定義（字眼照繁體 MakeCode）及 MakeCode 程式碼匯出
  missions.js       每課的模擬器任務及過關條件
assets/
  config.js         老師設定：密碼、報告密鑰
  common.css/.js    各課共用的樣式及程式（練習元件、成績、報告等）
  art.js            動態插圖（感應器讀數、轉彎方式、巡線圖、流程圖）
  img/              插圖（SVG）及積木圖（PNG）
teacher/
  index.html        老師區：課堂流程、分組及器材、答案、教學提示
  summary.html      成績匯總工具：核對驗證碼、匯出 CSV、題目分析
tools/              產生插圖、積木圖、單一檔案版本及測試的程式
  mcblocks/         MakeCode 外觀的積木繪圖（pxt-blockly）
```

## 老師設定

修改 `assets/config.js`：

- `TEACHER_PIN`：老師驗收及老師區密碼（預設 `dt2026`，與中二單元相同，請自行更改）。
- `SIGN_KEY`：成績報告驗證密鑰。

> 網站是公開的：密碼和密鑰任何人都可以在原始碼看到，只能防止一般學生改分。

## 更新插圖及測試

```bash
python3 tools/gen_art.py        # 重新產生 assets/img 的 SVG 插圖
python3 tools/render_blocks.py  # 重新產生 MakeCode 外觀的積木圖（需要 Playwright）
python3 tools/build_single.py   # 每課打包成單一 HTML（放 Google Drive 或離線用）→ dist/single/
node tools/tune_sim.js          # 模擬器調校：各種巡線程式的成功率
python3 tools/test_sim.py cases # 模擬器瀏覽器測試
python3 tools/test_site.py      # 全站測試（頁面錯誤、練習、報告驗證、匯總工具）
python3 tools/gen_stl.py png    # 第五堂障礙物 3D 打印檔（assets/stl/）
```

## 版權及來源

- Blockly 7（Google，Apache License 2.0）：`sim/blockly/`
- pxt-blockly 4（Microsoft，Apache License 2.0）：`tools/mcblocks/pxt-blockly/`，只用來繪畫積木圖
- 麥昆 Plus 擴展積木名稱及函數：DFRobot `pxt-DFRobot_MaqueenPlus_v20`（MIT）
- 插圖：本網站自繪（SVG）；小車相片由老師提供
- 第一堂運動會數據：新華網、iThome（2026 年 8 月報道）；影片由老師提供
