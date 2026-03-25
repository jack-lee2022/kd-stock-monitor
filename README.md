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
