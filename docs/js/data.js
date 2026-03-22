/**
 * Data Module - Handles data loading and management
 */

// Sample data structure for development/fallback
const SAMPLE_DATA = {
    "TW": [
        {
            "symbol": "0050.TW",
            "name": "元大台灣50",
            "market": "TW",
            "current_price": 145.5,
            "kd_k": 75.5,
            "kd_d": 72.3,
            "last_updated": new Date().toISOString(),
            "history": []
        },
        {
            "symbol": "0056.TW",
            "name": "元大高股息",
            "market": "TW",
            "current_price": 32.8,
            "kd_k": 82.1,
            "kd_d": 80.5,
            "last_updated": new Date().toISOString(),
            "history": []
        },
        {
            "symbol": "2330.TW",
            "name": "台積電",
            "market": "TW",
            "current_price": 550.0,
            "kd_k": 15.2,
            "kd_d": 18.7,
            "last_updated": new Date().toISOString(),
            "history": []
        },
        {
            "symbol": "2317.TW",
            "name": "鴻海",
            "market": "TW",
            "current_price": 105.5,
            "kd_k": 45.0,
            "kd_d": 48.2,
            "last_updated": new Date().toISOString(),
            "history": []
        },
        {
            "symbol": "2454.TW",
            "name": "聯發科",
            "market": "TW",
            "current_price": 890.0,
            "kd_k": 85.3,
            "kd_d": 81.2,
            "last_updated": new Date().toISOString(),
            "history": []
        }
    ],
    "US": [
        {
            "symbol": "AAPL",
            "name": "Apple Inc.",
            "market": "US",
            "current_price": 175.5,
            "kd_k": 12.5,
            "kd_d": 15.8,
            "last_updated": new Date().toISOString(),
            "history": []
        },
        {
            "symbol": "TSLA",
            "name": "Tesla Inc.",
            "market": "US",
            "current_price": 240.0,
            "kd_k": 78.2,
            "kd_d": 75.5,
            "last_updated": new Date().toISOString(),
            "history": []
        },
        {
            "symbol": "MSFT",
            "name": "Microsoft Corp.",
            "market": "US",
            "current_price": 380.5,
            "kd_k": 68.5,
            "kd_d": 65.2,
            "last_updated": new Date().toISOString(),
            "history": []
        },
        {
            "symbol": "GOOGL",
            "name": "Alphabet Inc.",
            "market": "US",
            "current_price": 142.8,
            "kd_k": 88.5,
            "kd_d": 85.3,
            "last_updated": new Date().toISOString(),
            "history": []
        },
        {
            "symbol": "NVDA",
            "name": "NVIDIA Corp.",
            "market": "US",
            "current_price": 495.0,
            "kd_k": 25.3,
            "kd_d": 28.7,
            "last_updated": new Date().toISOString(),
            "history": []
        }
    ],
    "last_updated": new Date().toISOString()
};

const SAMPLE_ALERTS = [
    {
        "id": "0056.TW_20240321_overbought",
        "symbol": "0056.TW",
        "name": "元大高股息",
        "market": "TW",
        "type": "overbought",
        "level": "high",
        "kd_k": 82.1,
        "kd_d": 80.5,
        "current_price": 32.8,
        "threshold": 80,
        "message": "⚠️ 0056.TW (元大高股息) is OVERBOUGHT! KD-K: 82.1, KD-D: 80.5",
        "timestamp": new Date().toISOString(),
        "date": new Date().toISOString().split('T')[0],
        "acknowledged": false
    },
    {
        "id": "2330.TW_20240321_oversold",
        "symbol": "2330.TW",
        "name": "台積電",
        "market": "TW",
        "type": "oversold",
        "level": "low",
        "kd_k": 15.2,
        "kd_d": 18.7,
        "current_price": 550.0,
        "threshold": 20,
        "message": "✅ 2330.TW (台積電) is OVERSOLD! KD-K: 15.2, KD-D: 18.7",
        "timestamp": new Date().toISOString(),
        "date": new Date().toISOString().split('T')[0],
        "acknowledged": false
    },
    {
        "id": "AAPL_20240321_oversold",
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "market": "US",
        "type": "oversold",
        "level": "low",
        "kd_k": 12.5,
        "kd_d": 15.8,
        "current_price": 175.5,
        "threshold": 20,
        "message": "✅ AAPL (Apple Inc.) is OVERSOLD! KD-K: 12.5, KD-D: 15.8",
        "timestamp": new Date().toISOString(),
        "date": new Date().toISOString().split('T')[0],
        "acknowledged": false
    },
    {
        "id": "GOOGL_20240321_overbought",
        "symbol": "GOOGL",
        "name": "Alphabet Inc.",
        "market": "US",
        "type": "overbought",
        "level": "high",
        "kd_k": 88.5,
        "kd_d": 85.3,
        "current_price": 142.8,
        "threshold": 80,
        "message": "⚠️ GOOGL (Alphabet Inc.) is OVERBOUGHT! KD-K: 88.5, KD-D: 85.3",
        "timestamp": new Date().toISOString(),
        "date": new Date().toISOString().split('T')[0],
        "acknowledged": false
    }
];

const SAMPLE_SUMMARY = {
    "timestamp": new Date().toISOString(),
    "date": new Date().toISOString().split('T')[0],
    "stocks_processed": 10,
    "stocks_successful": 10,
    "stocks_failed": 0,
    "new_alerts": 4,
    "overbought_count": 2,
    "oversold_count": 2,
    "normal_count": 6,
    "overbought_stocks": [
        {"symbol": "0056.TW", "name": "元大高股息", "kd_k": 82.1, "kd_d": 80.5},
        {"symbol": "GOOGL", "name": "Alphabet Inc.", "kd_k": 88.5, "kd_d": 85.3}
    ],
    "oversold_stocks": [
        {"symbol": "2330.TW", "name": "台積電", "kd_k": 15.2, "kd_d": 18.7},
        {"symbol": "AAPL", "name": "Apple Inc.", "kd_k": 12.5, "kd_d": 15.8}
    ],
    "errors": []
};

// Data Manager
const DataManager = {
    stockData: null,
    alerts: null,
    summary: null,
    
    /**
     * Load all data from JSON files or use sample data
     */
    async loadData() {
        try {
            // Try to load from data files
            // Note: When deployed to GitHub Pages, data is copied to docs/data/
            const stockResponse = await fetch('./data/stock_data.json');
            const alertsResponse = await fetch('./data/alerts.json');
            const summaryResponse = await fetch('./data/summary.json');
            
            if (stockResponse.ok) {
                this.stockData = await stockResponse.json();
            } else {
                console.log('Using sample stock data');
                this.stockData = SAMPLE_DATA;
            }
            
            if (alertsResponse.ok) {
                this.alerts = await alertsResponse.json();
            } else {
                console.log('Using sample alerts');
                this.alerts = SAMPLE_ALERTS;
            }
            
            if (summaryResponse.ok) {
                this.summary = await summaryResponse.json();
            } else {
                console.log('Using sample summary');
                this.summary = SAMPLE_SUMMARY;
            }
            
        } catch (error) {
            console.warn('Error loading data, using samples:', error);
            this.stockData = SAMPLE_DATA;
            this.alerts = SAMPLE_ALERTS;
            this.summary = SAMPLE_SUMMARY;
        }
        
        return {
            stockData: this.stockData,
            alerts: this.alerts,
            summary: this.summary
        };
    },
    
    /**
     * Get all stocks as a flat array
     */
    getAllStocks() {
        if (!this.stockData) return [];
        return [
            ...(this.stockData.TW || []),
            ...(this.stockData.US || [])
        ];
    },
    
    /**
     * Get stocks by market
     */
    getStocksByMarket(market) {
        if (!this.stockData) return [];
        return this.stockData[market] || [];
    },
    
    /**
     * Get alert stocks only
     */
    getAlertStocks() {
        return this.getAllStocks().filter(stock => {
            if (stock.kd_k === null || stock.kd_k === undefined) return false;
            return stock.kd_k >= 80 || stock.kd_k <= 20 ||
                   (stock.kd_d !== null && (stock.kd_d >= 80 || stock.kd_d <= 20));
        });
    },
    
    /**
     * Get stock by symbol
     */
    getStock(symbol) {
        return this.getAllStocks().find(s => s.symbol === symbol);
    },
    
    /**
     * Get alerts
     */
    getAlerts(limit = null) {
        if (!this.alerts) return [];
        const alerts = Array.isArray(this.alerts) ? this.alerts : [];
        return limit ? alerts.slice(0, limit) : alerts;
    },
    
    /**
     * Get summary
     */
    getSummary() {
        return this.summary || SAMPLE_SUMMARY;
    },
    
    /**
     * Get KD status for a stock
     */
    getKDStatus(kd_k, kd_d) {
        if (kd_k === null || kd_k === undefined) return 'normal';
        if (kd_k >= 80 || (kd_d !== null && kd_d >= 80)) return 'overbought';
        if (kd_k <= 20 || (kd_d !== null && kd_d <= 20)) return 'oversold';
        return 'normal';
    },
    
    /**
     * Format date
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    /**
     * Format price
     */
    formatPrice(price, currency = 'USD') {
        if (price === null || price === undefined) return '-';
        const symbol = currency === 'TWD' ? 'NT$' : '$';
        return `${symbol}${price.toFixed(2)}`;
    }
};