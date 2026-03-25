#!/usr/bin/env python3
"""
Stock Data Fetcher - Fetches stock data from Yahoo Finance for TW and US stocks.
"""

import yfinance as yf
import pandas as pd
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class StockFetcher:
    """Fetches historical stock data from Yahoo Finance."""
    
    def __init__(self, config_path: str = "config.json"):
        """Initialize with configuration."""
        self.config = self._load_config(config_path)
        self.data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
        os.makedirs(self.data_dir, exist_ok=True)
    
    def _load_config(self, config_path: str) -> dict:
        """Load configuration from JSON file."""
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def fetch_stock_data(self, symbol: str, period: str = "3mo", interval: str = "1d") -> Optional[pd.DataFrame]:
        """
        Fetch historical stock data from Yahoo Finance.
        
        Args:
            symbol: Stock symbol (e.g., 'AAPL', '2330.TW')
            period: Data period ('1mo', '3mo', '6mo', '1y', etc.)
            interval: Data interval ('1d', '1wk', '1mo')
        
        Returns:
            DataFrame with OHLCV data or None if fetch fails
        """
        try:
            logger.info(f"Fetching data for {symbol}...")
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)
            
            if df.empty:
                logger.warning(f"No data returned for {symbol}")
                return None
            
            # Reset index to make Date a column
            df = df.reset_index()
            
            # Ensure column names are standardized
            df.columns = [col.replace(' ', '_').lower() for col in df.columns]
            
            # Handle timezone-aware datetime
            if 'date' in df.columns and pd.api.types.is_datetime64_any_dtype(df['date']):
                df['date'] = df['date'].dt.tz_localize(None)
            
            logger.info(f"Successfully fetched {len(df)} records for {symbol}")
            return df
            
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {e}")
            return None
    
    def fetch_all_stocks(self) -> Dict[str, List[Dict]]:
        """
        Fetch data for all configured stocks.
        
        Returns:
            Dictionary with stock data organized by market
        """
        results = {"TW": [], "US": []}
        
        for market in ["TW", "US"]:
            stocks = self.config["stocks"][market]
            for stock in stocks:
                symbol = stock["symbol"]
                df = self.fetch_stock_data(symbol)
                
                if df is not None and not df.empty:
                    # Save raw data
                    self._save_raw_data(symbol, df)
                    
                    results[market].append({
                        "symbol": symbol,
                        "name": stock["name"],
                        "market": market,
                        "data": df,
                        "last_updated": datetime.now().isoformat()
                    })
                else:
                    logger.warning(f"Failed to fetch data for {symbol}")
        
        return results
    
    def _save_raw_data(self, symbol: str, df: pd.DataFrame):
        """Save raw stock data to CSV."""
        filepath = os.path.join(self.data_dir, f"{symbol.replace('.', '_')}_raw.csv")
        df.to_csv(filepath, index=False)
        logger.info(f"Saved raw data to {filepath}")

    def fetch_macro_indicators(self) -> Dict:
        """Fetch US10Y yield, Dollar Index, CNN Fear & Greed, and Bitcoin."""
        macro_data = {
            "us10y": {"value": None, "change": None},
            "dxy": {"value": None, "change": None},
            "fear_greed": {"value": None, "label": "N/A"},
            "btc": {"value": None, "change_pct": None}
        }

        # 1. Fetch US10Y Yield (^TNX)
        try:
            ticker_us10y = yf.Ticker("^TNX")
            hist_us10y = ticker_us10y.history(period="2d")
            if not hist_us10y.empty:
                latest_val = hist_us10y['Close'].iloc[-1]
                prev_val = hist_us10y['Close'].iloc[-2] if len(hist_us10y) >= 2 else latest_val
                macro_data["us10y"] = {"value": round(latest_val, 3), "change": round(latest_val - prev_val, 3)}
        except Exception as e:
            logger.error(f"Error fetching US10Y: {e}")

        # 2. Fetch Dollar Index (DX-Y.NYB)
        try:
            ticker_dxy = yf.Ticker("DX-Y.NYB")
            hist_dxy = ticker_dxy.history(period="2d")
            if not hist_dxy.empty:
                latest_val = hist_dxy['Close'].iloc[-1]
                prev_val = hist_dxy['Close'].iloc[-2] if len(hist_dxy) >= 2 else latest_val
                macro_data["dxy"] = {"value": round(latest_val, 2), "change": round(latest_val - prev_val, 2)}
        except Exception as e:
            logger.error(f"Error fetching DXY: {e}")

        # 3. Fetch Bitcoin Price (BTC-USD)
        try:
            ticker_btc = yf.Ticker("BTC-USD")
            hist_btc = ticker_btc.history(period="2d")
            if not hist_btc.empty:
                latest_val = hist_btc['Close'].iloc[-1]
                prev_val = hist_btc['Close'].iloc[-2] if len(hist_btc) >= 2 else latest_val
                change_pct = ((latest_val - prev_val) / prev_val) * 100 if prev_val else 0
                macro_data["btc"] = {"value": round(latest_val, 0), "change_pct": round(change_pct, 2)}
        except Exception as e:
            logger.error(f"Error fetching BTC: {e}")

        # 4. Fetch Real CNN Fear & Greed Index
        try:
            import requests
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            response = requests.get("https://production.dataviz.cnn.io/index/feargreed/static/historical", headers=headers, timeout=15)
            if response.ok:
                data = response.json()
                fng_val = data['fear_and_greed']['score']
                fng_rating = data['fear_and_greed']['rating']
                macro_data["fear_greed"] = {
                    "value": int(fng_val),
                    "label": fng_rating.capitalize(),
                    "timestamp": datetime.now().isoformat()
                }
        except Exception as e:
            logger.error(f"Error fetching CNN Fear & Greed: {e}")

        return macro_data
    
    def get_latest_price(self, symbol: str) -> Optional[float]:
        """Get the latest closing price for a stock."""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Try currentPrice first, then regularMarketPrice
            price = info.get('currentPrice') or info.get('regularMarketPrice')
            if price:
                return float(price)
            
            # Fallback to historical data
            df = self.fetch_stock_data(symbol, period="5d")
            if df is not None and not df.empty:
                return float(df['close'].iloc[-1])
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting latest price for {symbol}: {e}")
            return None
    
    def get_stock_info(self, symbol: str) -> Dict:
        """Get stock information from Yahoo Finance."""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            return {
                "symbol": symbol,
                "name": info.get('longName') or info.get('shortName', symbol),
                "sector": info.get('sector', 'N/A'),
                "industry": info.get('industry', 'N/A'),
                "market_cap": info.get('marketCap'),
                "currency": info.get('currency', 'USD'),
                "website": info.get('website', '')
            }
        except Exception as e:
            logger.error(f"Error getting info for {symbol}: {e}")
            return {"symbol": symbol, "name": symbol}


def main():
    """Test the fetcher."""
    fetcher = StockFetcher()
    
    # Test single stock
    df = fetcher.fetch_stock_data("AAPL", period="1mo")
    if df is not None:
        print(f"\nSample data for AAPL:")
        print(df.tail())
        print(f"\nLatest price: {fetcher.get_latest_price('AAPL')}")
    
    # Test fetching all stocks
    print("\n" + "="*50)
    print("Fetching all configured stocks...")
    all_data = fetcher.fetch_all_stocks()
    
    for market, stocks in all_data.items():
        print(f"\n{market} Stocks fetched: {len(stocks)}")
        for stock in stocks:
            print(f"  - {stock['symbol']}: {len(stock['data'])} records")


if __name__ == "__main__":
    main()