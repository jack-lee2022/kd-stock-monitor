# 📊 KD Stock Monitor | 股票 KD 指標監控系統

[English](#english) | [繁體中文](#繁體中文)

---

<a name="english"></a>
## 🌐 English Description

A GitHub-powered stock monitoring system that tracks KD (Stochastic Oscillator) indicators for Taiwan and US stocks. Features automatic **hourly** data updates and a web dashboard deployed on GitHub Pages.

### ✨ Features
- 📈 **KD Indicator Tracking**: Calculates 9-day Stochastic Oscillator (KD) for all monitored stocks.
- 🔔 **Smart Alerts**: Automatic notifications when KD ≥ 80 (overbought) or ≤ 20 (oversold).
- 🇹🇼 **Taiwan Stocks**: Supports TWSE stocks (e.g., 0050.TW, 2330.TW).
- 🇺🇸 **US Stocks**: Supports NYSE/NASDAQ stocks (e.g., AAPL, TSLA).
- 🌐 **Web Dashboard**: Interactive dashboard with charts and real-time data.
- ⚡ **Auto Updates**: **Hourly** automated data fetching and deployment via GitHub Actions.
- 📱 **Mobile Friendly**: Responsive design works on all devices.

### 📉 Trading Patterns
Automated analysis of 8 market patterns:
1. 🔴 **Quick Rise, Slow Fall** (Main force shipping): Usually a sell signal.
2. 🟢 **Quick Fall, Slow Rise** (Main force accumulating): Usually a buy signal.
3. 🔴 **Volume Surge on Rise** (Peak risk): Potential top forming, suggest sell.
4. ⚫ **Shrinking Volume, No Fall** (Top forming): Suggest avoid.
5. 🟡 **Shrinking Volume on Rise** (Healthy trend): Trend is healthy, suggest hold.
6. ⚫ **Shrinking Volume on Fall** (Continued bearish): Lack of buying power.
7. 🔴 **Shrinking Volume, No Rise** (Top confirmed): Suggest sell.
8. 🟢 **Volume Surge on Fall** (Panic selling): Potential buying opportunity.

### 🌐 Macro Indicators | 宏觀指標
1. **VIX (Fear Index) | VIX 恐慌指數**: Measures market volatility and fear levels. High VIX (>30) indicates high fear and potential buying opportunities.
   *   衡量市場波動度與恐慌情緒。高 VIX (>30) 通常代表恐慌，可能是分批買點。
2. **US 10Y (Bond Yield) | 美債 10 年期收益率**: Benchmark for risk-free rates. Rising yields can put pressure on stock valuations, especially for tech stocks.
   *   無風險利率的基準。收益率上升會對股市估值造成壓力，尤其是科技股。
3. **DXY (US Dollar Index) | 美元指數**: Strength of the USD. Strong dollar often correlates with pressure on emerging markets and commodity prices.
   *   衡量美元強度。強勢美元通常會對新興市場與大宗商品價格產生壓力。
4. **BTC (Bitcoin) | 比特幣**: Often considered a high-risk asset proxy. Its trend can reflect overall market risk appetite.
   *   通常被視為高風險資產的代表。其趨勢反映了市場對風險的整體偏好程度。

---

<a name="繁體中文"></a>
## 🌐 繁體中文說明

這是一個利用 GitHub Actions 驅動的股票監控系統，追蹤台股與美股的 KD 指標。具備**每小時**自動資料更新功能，並透過 GitHub Pages 提供互動式儀表板。

### ✨ 核心功能
- 📈 **KD 指標追蹤**：自動計算所有監控股票的 9 日隨機指標 (KD)。
- 🔔 **智能警示**：當 KD ≥ 80 (超買) 或 ≤ 20 (超賣) 時自動發出提醒。
- 🇹🇼 **台股支援**：支援台股代碼 (如 0050.TW, 2330.TW)。
- 🇺🇸 **美股支援**：支援美股代碼 (如 AAPL, TSLA)。
- 🌐 **網頁儀表板**：提供圖表與即時數據的互動式介面。
- ⚡ **自動更新**：透過 GitHub Actions 進行**每小時**自動化抓取與部署。
- 📱 **行動裝置優化**：響應式設計，適合手機查看。

### 📉 交易模式分析
系統自動分析以下 8 種市場模式：
1. 🔴 **快漲慢跌** (主力出貨)：通常為賣出訊號。
2. 🟢 **快跌慢漲** (主力吸籌)：通常為買入訊號。
3. 🔴 **放量上漲** (見頂風險)：可能是見頂風險，建議賣出。
4. ⚫ **縮量不跌** (頭部形成)：可能是頭部形成，建議避開。
5. 🟡 **縮量上漲** (趨勢健康)：代表趨勢健康，建議持有。
6. ⚫ **縮量下跌** (繼續看跌)：代表買盤不足，建議繼續看跌。
7. 🔴 **縮量不漲** (頭部確立)：通常是頭部確立，建議賣出。
8. 🟢 **放量下跌** (恐慌殺跌)：可能是分批買入機會。

### 🌐 宏觀指標
1. **VIX 恐慌指數**: 衡量市場波動度與恐慌情緒。高 VIX (>30) 通常代表恐慌，可能是分批買點。
2. **美債 10 年期收益率**: 無風險利率的基準。收益率上升會對股市估值造成壓力，尤其是科技股。
3. **美元指數**: 衡量美元強度。強勢美元通常會對新興市場與大宗商品價格產生壓力。
4. **比特幣**: 通常被視為高風險資產的代表。其趨勢反映了市場對風險的整體偏好程度。

---

## 🚀 Quick Start | 快速上手

### Prerequisites | 前置條件
- Python 3.11+
- Git

### Installation | 安裝步驟
```bash
git clone https://github.com/jack-lee2022/kd-stock-monitor.git
cd kd-stock-monitor
pip install -r requirements.txt
```

### Run Locally | 本地執行
```bash
cd src
python main.py
```

---

## 🚀 Deployment & Usage | 部署與使用

### Deploying to GitHub Pages | 部署至 GitHub Pages
Follow these steps to deploy your own instance of the KD Stock Monitor on GitHub Pages.
請遵循以下步驟，將您自己的 KD 股票監控器部署到 GitHub Pages。

1.  **Fork the Repository | Fork 此專案**: Click the "Fork" button at the top-right of this page to create a copy of this project in your GitHub account.
    *   點擊頁面右上角的 "Fork" 按鈕，將此專案複製一份到您自己的 GitHub 帳號下。
2.  **Enable Actions | 啟用 Actions**: In your forked repository, go to the `Actions` tab and click the "I understand my workflows, go ahead and enable them" button. This is required for automatic data updates and deployment.
    *   在您 Fork 的專案中，前往 `Actions` 頁籤，點擊 "I understand my workflows, go ahead and enable them" 按鈕以啟用工作流程。這是實現自動化資料更新與部署的必要步驟。
3.  **Trigger the Deployment | 觸發部署**:
    *   Still in the `Actions` tab, click on `Hourly Stock Update & Deploy` on the left sidebar.
    *   Click the `Run workflow` dropdown, then the green `Run workflow` button. This will start the first build and deployment process.
    *   仍在 `Actions` 頁籤，點擊左側的 `Hourly Stock Update & Deploy`，接著點擊 `Run workflow` 下拉選單，並按下綠色的 `Run workflow` 按鈕。這會開始第一次的建置與部署流程。
4.  **Configure and Visit Your Site | 設定並瀏覽您的網站**:
    *   Wait for the workflow to complete (it may take 2-3 minutes).
    *   Go to your repository's `Settings` > `Pages` tab.
    *   You should see a message "Your site is live at `https://<Your-Username>.github.io/<Your-Repo-Name>/`". Visit this URL to see your monitor.
    *   If not already configured, set the `Source` under `Build and deployment` to `GitHub Actions`.
    *   等待工作流程執行完畢 (約需 2-3 分鐘)，然後前往專案的 `Settings` > `Pages` 頁籤。您會看到網站已發佈的網址，例如：`https://<您的帳號>.github.io/<專案名稱>/`。如果頁面尚未設定，請在 `Build and deployment` 的 `Source` 選擇 `GitHub Actions`。

### Using the Web Interface Locally | 在本地端使用網頁介面
You can run the web dashboard on your local machine to view the latest data you've fetched.
您可以在本機電腦上運行網頁儀表板，以查看您已抓取的最新數據。

1.  **Fetch Data | 抓取資料**: First, run the Python script to fetch the latest stock data. This will populate the `/data` directory.
    *   首先，執行 Python 腳本以抓取最新的股票數據，這會將資料填入 `/data` 資料夾。
    ```bash
    python src/main.py
    ```
2.  **Copy Data to Docs | 複製資料至 docs**: The web page expects data to be inside the `/docs/data` directory. Copy the fetched data over.
    *   網頁需要讀取 `/docs/data` 裡的資料，請將剛抓取的數據複製過去。
    ```bash
    # On macOS/Linux | 在 macOS/Linux 上
    mkdir -p docs/data && cp -r data/* docs/data/

    # On Windows (PowerShell) | 在 Windows (PowerShell) 上
    if (-not (Test-Path -Path docs/data)) { New-Item -ItemType Directory -Path docs/data }; Copy-Item -Path data\* -Destination docs\data -Recurse
    ```
3.  **Start a Web Server | 啟動網頁伺服器**: You need a local web server to view the `index.html` file correctly. The easiest way is using Python's built-in server. From the project's root directory, run:
    *   您需要一個本地網頁伺服器才能正確瀏覽 `index.html`。最簡單的方式是使用 Python 內建的伺服器。請在專案的根目錄下執行：
    ```bash
    # For Python 3 | 適用於 Python 3
    python -m http.server 8000
    ```
4.  **View in Browser | 在瀏覽器中查看**: Open your web browser and navigate to `http://localhost:8000/docs/`.
    *   打開您的瀏覽器並前往 `http://localhost:8000/docs/`。

---

## 📊 Data Update Schedule | 資料更新排程

GitHub Actions runs automatically:
- **Every Hour**: Runs on the hour (`0 * * * *`), 24/7.
- **On Push**: Whenever code is pushed to the `main` or `master` branch.
- **Manual Trigger**: Via the **Actions** tab in your GitHub repository.

---

## ⚠️ Disclaimer | 免責聲明
This tool is for **educational purposes only**. Not financial advice. Always do your own research before making investment decisions.
本系統僅供**教育用途**，不構成任何投資建議。投資有風險，請自行判斷。

## 📜 License | 授權
MIT License.

---
Made with ❤️ for the trading community
