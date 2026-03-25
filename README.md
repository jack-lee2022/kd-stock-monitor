# 📊 KD Stock Monitor

A GitHub-powered stock monitoring system that tracks KD (Stochastic Oscillator) indicators for Taiwan and US stocks. Features automatic **hourly** data updates and a web dashboard deployed on GitHub Pages.

![Python](https://img.shields.io/badge/Python-3.11-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen.svg)

## ✨ Features

- 📈 **KD Indicator Tracking**: Calculates 9-day Stochastic Oscillator (KD) for all monitored stocks
- 🔔 **Smart Alerts**: Automatic notifications when KD ≥ 80 (overbought) or ≤ 20 (oversold)
- 🇹🇼 **Taiwan Stocks**: Supports TWSE stocks (0050.TW, 2330.TW, etc.)
- 🇺🇸 **US Stocks**: Supports NYSE/NASDAQ stocks (AAPL, TSLA, etc.)
- 🌐 **Web Dashboard**: Interactive dashboard with charts and real-time data
- ⚡ **Auto Updates**: **Hourly** automated data fetching and deployment via GitHub Actions
- 📱 **Mobile Friendly**: Responsive design works on all devices

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jack-lee2022/kd-stock-monitor.git
   cd kd-stock-monitor
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the monitor locally**
   ```bash
   cd src
   python main.py
   ```

4. **Run in test mode** (with mock data)
   ```bash
   cd src
   python main.py --test
   ```

## 📁 Project Structure

```
kd-stock-monitor/
├── .github/
│   └── workflows/          
│       └── update-data.yml # Hourly Stock Update & Deploy (Merged)
├── data/                   # Generated data files (JSON/CSV)
├── docs/                   # GitHub Pages website
│   ├── index.html         # Dashboard
│   ├── css/
│   │   └── style.css      # Custom styles
│   └── js/
│       ├── data.js        # Data management
│       └── app.js         # Dashboard logic (includes API trigger)
├── src/                   # Python backend
│   ├── main.py            # Main orchestrator
│   ├── fetcher.py         # Yahoo Finance data fetcher
│   ├── kd_calculator.py   # KD indicator calculation
│   └── alert_checker.py   # Alert generation
├── config.json            # Stock list & settings
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## ⚙️ Configuration

Edit `config.json` to customize:

```json
{
  "stocks": {
    "TW": [
      {"symbol": "0050.TW", "name": "元大台灣50", "market": "TW"},
      {"symbol": "2330.TW", "name": "台積電", "market": "TW"}
    ],
    "US": [
      {"symbol": "AAPL", "name": "Apple Inc.", "market": "US"},
      {"symbol": "TSLA", "name": "Tesla Inc.", "market": "US"}
    ]
  },
  "kd_settings": {
    "k_period": 9,
    "d_period": 3
  },
  "alert_thresholds": {
    "overbought": 80,
    "oversold": 20
  }
}
```

## 🌐 GitHub Pages Setup

1. Go to **Settings** → **Pages** in your repository
2. Set **Source** to "GitHub Actions"
3. Push to `main` branch
4. The dashboard will be available at `https://yourusername.github.io/kd-stock-monitor/`

## 📊 Data Update Schedule

GitHub Actions runs automatically:
- **Every Hour**: Runs on the hour (`0 * * * *`), 24/7.
- **On Push**: Whenever code is pushed to the `main` or `master` branch.
- **Manual Trigger**: Via the **Actions** tab in your GitHub repository.

## 📈 Dashboard Features

- **Stock Cards**: Visual KD indicators with color coding
  - 🔴 Red: Overbought (KD ≥ 80)
  - 🟢 Green: Oversold (KD ≤ 20)
  - ⚪ Gray: Normal range
- **Interactive Charts**: Price and KD trend visualization
- **Alert History**: Track past overbought/oversold events
- **Market Filter**: Switch between TW/US stocks

## 🛠️ Development

### Adding New Stocks

1. Edit `config.json`
2. Add stock entry to `TW` or `US` array
3. Commit and push - data will update automatically

### Local Development Server

```bash
# Serve docs folder locally
cd docs
python -m http.server 8000

# Open http://localhost:8000
```

### Running Tests

```bash
cd src
python -c "from fetcher import StockFetcher; f = StockFetcher(); print(f.fetch_stock_data('AAPL'))"
```

## 📄 Output Files

After running, the following files are generated in `data/`:

| File | Description |
|------|-------------|
| `stock_data.json` | Current stock data with KD values |
| `alerts.json` | Alert history |
| `summary.json` | Daily run summary |
| `*_raw.csv` | Raw price data per stock |
| `*_kd.csv` | Processed data with KD values |

## ⚠️ Disclaimer

This tool is for **educational purposes only**. Not financial advice. Always do your own research before making investment decisions.

## 📜 License

MIT License - feel free to use and modify!

## 🙏 Credits

- Data: [Yahoo Finance](https://finance.yahoo.com/)
- Charts: [Chart.js](https://www.chartjs.org/)
- Styling: [Tailwind CSS](https://tailwindcss.com/)
- KD Calculation: [pandas-ta](https://github.com/twopirllc/pandas-ta)

---

Made with ❤️ for the trading community