# 黴菌裝潢 mold-decor

黴菌是好朋友：用各種黴菌裝潢房子，生長條件（濕度、溫度、光線、附著材質）決定長出什麼，解鎖後收進圖鑑。

## 目前階段：B2 最小可玩版本（`game/`）

- `game/`：一個牆角的可玩版本。功能見 `game/features.md`，任務單與科學檢查見 `game/TASK.md`。

## 美術方向（v3 流程 B，已選定）

- `directions/1-procedural/`：**房間**用這個。菌絲分岔、孢子柄、菌落擴張都是程式即時生成，每團都不同。
- `directions/2-plate/`：**圖鑑**用這個。Haeckel 風格科學圖版。
- `directions/screenshots/`、`directions/notes.html`：第 2 輪截圖與概念筆記。
- `archive/directions/`：未選的方向（第 2 輪 3-riso、第 1 輪 A／A2／B／C），依 v3 B.4 保留不刪。

## 已知待修

- 圖版 2（`directions/2-plate/`）仍寫青黴「三層分支」；遊戲內圖鑑已改成「分支層數依種而異」，圖版本身待修。
- 依任務單第 7 項「科學檢查」（onholdlab/rules PR #31）：已證實的生長條件做核心機制，前沿研究（例如菌絲體電訊號）只做成標示「猜想」的卡片。

© 2026 onholdlab
