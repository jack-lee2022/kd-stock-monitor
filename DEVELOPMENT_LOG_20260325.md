# 股票 KD 指標監控系統 - 開發與優化紀錄 (2026-03-25)

## 🛠 已解決的問題
1. **GitHub Pages 自動更新失效**：
   - **原因**：原先的 `update-data.yml` 與 `deploy-pages.yml` 是分開的。由於資料更新是由 `GITHUB_TOKEN` 推送的，GitHub 為了安全會阻止其觸發另一個 Deployment 工作流，導致網頁內容永不更新。
   - **解決方法**：將「抓取資料」與「部署網頁」合併至同一個 `update-data.yml` 檔案中，打破連鎖限制。

2. **網頁按鈕更新失敗**：
   - **原因**：前端 JavaScript 在資料尚未就緒或路徑變動時會拋出異常，且原先按鈕僅具備「重新整理頁面」功能，而非「觸發後台更新」。
   - **解決方法**：重寫 `app.js` 邏輯，增加防錯機制，並實作 GitHub API 調用功能。

---

## ✨ 新增功能與優化
1. **每小時自動更新 (Hourly Update)**：
   - 設定為每小時整點執行 (`cron: '0 * * * *'`)，確保資料最即時。
   - 包含週六日（若有美股需求）或根據排程全天候運作。

2. **台灣時區支援 (Taiwan Timezone)**：
   - 在 GitHub Actions 環境中設定 `TZ: Asia/Taipei`。
   - 自動產生的 Commit 訊息（如：`📊 自動更新資料 - 2026-03-25 10:30 (台北時間)`）現在會顯示精確的台灣時間。

3. **網頁端「遠端觸發」功能**：
   - 點擊網頁右上角「更新資料」後，可選擇「確定」以通知 GitHub 後台立刻抓取最新股價。
   - 支援安全儲存 **Personal Access Token (PAT)** 於瀏覽器 `localStorage` 中。

4. **效能加速 (Pip Caching)**：
   - 啟用 GitHub Actions 的 `pip` 快取機制，大幅縮短每次安裝 `pandas`、`yfinance` 等套件的時間。

5. **前端穩定性增強**：
   - 修正 `updateStats()` 等渲染函數，在 JSON 資料不完整時會自動使用範例資料或優雅跳過，不再跳出報錯視窗。

---

## 📖 操作指南
### 1. 如何手動觸發後台更新？
- 打開網頁，點擊「更新資料」。
- 點選「確定」。
- 第一次使用時，請輸入您的 **GitHub PAT (Token)**。
- 看到「成功觸發」訊息後，約等 **3 分鐘**，GitHub Actions 跑完綠燈後重新整理網頁即可。

### 2. 遇到 Git 推送衝突怎麼辦？
由於後台會自動更新資料，若您本地端有修改程式碼，推送前請執行：
```powershell
git pull origin main --no-edit
git push
```
如果衝突嚴重，可使用強行推送（謹慎使用）：
```powershell
git push -f
```

---

## 📅 下一步建議
- 定期檢查 `data/run_log.json` 確保自動化任務沒有因為 yfinance API 限制而失敗。
- 若有新增監控股票，請修改 `src/main.py` 或相關設定檔後推送即可。

---
**紀錄整理者：** Gemini CLI 助手
**日期：** 2026年3月25日
