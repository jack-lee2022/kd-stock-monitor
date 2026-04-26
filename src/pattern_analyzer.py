#!/usr/bin/env python3
"""
股票交易模式檢測系統
根據8種經典量價關係進行自動分析
整合到 KD Stock Monitor
加入 ATR 濾網 與 Slope 趨勢強度（純 pandas，無須 TA-Lib）
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from enum import Enum


class TradeSignal(Enum):
    """交易信號"""
    BUY = "買入"
    SELL = "賣出"
    HOLD = "持有"
    AVOID = "避開"


class TradingPatternAnalyzer:
    """
    交易模式檢測類
    實現8種經典量價分析模式
    """
    
    def __init__(self, df: pd.DataFrame):
        """
        初始化
        
        Args:
            df: DataFrame with columns ['Open', 'High', 'Low', 'Close', 'Volume']
        """
        self.df = df.copy()
        if len(self.df) < 30:
            raise ValueError("需要至少30天的歷史數據")
        
        self.df = self.df.sort_index()
        self._calculate_indicators()
    
    def _calculate_indicators(self):
        """計算必要技術指標"""
        # 價格變動率
        self.df['Price_Change'] = self.df['Close'].pct_change()
        self.df['Price_Change_Abs'] = self.df['Price_Change'].abs()
        
        # 成交量變動率
        self.df['Volume_MA'] = self.df['Volume'].rolling(window=20).mean()
        self.df['Volume_Ratio'] = self.df['Volume'] / self.df['Volume_MA']
        
        # 移動平均線
        self.df['MA5'] = self.df['Close'].rolling(window=5).mean()
        self.df['MA20'] = self.df['Close'].rolling(window=20).mean()
        
        # 波動率
        self.df['Volatility'] = self.df['Price_Change_Abs'].rolling(window=20).mean()
        
        # === ATR 濾網（純 pandas 實作）===
        self.df['ATR'] = self._calc_atr(period=14)
        # ATR 佔收盤價百分比，用於跨股票統一比較
        self.df['ATR_Pct'] = (self.df['ATR'] / self.df['Close']) * 100
        # 相對波動 = 當日漲跌幅度 / ATR%，衡量是否異常波動
        self.df['Relative_Move'] = self.df['Price_Change_Abs'] / (self.df['ATR_Pct'] / 100 + 1e-9)
        
        # === Slope 趨勢強度（純 pandas 實作）===
        self.df['Slope_5D'] = self._calc_slope(self.df['Close'], period=5)
        # Slope 佔收盤價百分比，跨股票可比較
        self.df['Slope_5D_Pct'] = (self.df['Slope_5D'] / self.df['Close']) * 100
    
    def _calc_atr(self, period: int = 14) -> pd.Series:
        """
        計算 Average True Range（平均真實波幅）
        純 pandas 實作，無須 TA-Lib
        
        TR = max(High - Low, |High - Close_prev|, |Low - Close_prev|)
        ATR = TR 的 N 日移動平均
        """
        high = self.df['High']
        low = self.df['Low']
        close = self.df['Close']
        
        tr1 = high - low
        tr2 = (high - close.shift(1)).abs()
        tr3 = (low - close.shift(1)).abs()
        
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=period, min_periods=1).mean()
        return atr
    
    def _calc_slope(self, series: pd.Series, period: int = 5) -> pd.Series:
        """
        計算線性回歸斜率（Linear Regression Slope）
        純 pandas + numpy 實作，無須 TA-Lib
        
        對最近 N 個收盤價做線性回歸，回傳每日斜率
        """
        x = np.arange(period)
        
        def _linear_slope(y):
            if len(y) < period or np.isnan(y).any():
                return np.nan
            # np.polyfit(x, y, 1) 回傳 [斜率, 截距]
            return np.polyfit(x, y, 1)[0]
        
        return series.rolling(window=period, min_periods=period).apply(
            _linear_slope, raw=True
        )
    
    def _get_latest_atr_pct(self) -> float:
        """取得最新 ATR 百分比（保底值 1.0%）"""
        return self.df['ATR_Pct'].iloc[-1] if not self.df.empty else 1.0
    
    def _get_recent_slope_pct(self, days: int = 5) -> float:
        """取得最近 N 天平均 Slope 百分比"""
        recent = self.df['Slope_5D_Pct'].tail(days)
        return recent.mean() if not recent.empty else 0.0
    
    def detect_pattern_1_quick_rise_slow_fall(self) -> Tuple[bool, str, float]:
        """快漲慢跌 - 主力出貨信號"""
        if len(self.df) < 10:
            return False, "數據不足", 0.0
        
        recent_data = self.df.tail(10)
        first_half = recent_data.head(5)
        second_half = recent_data.tail(5)
        
        first_half_change = (first_half['Close'].iloc[-1] / first_half['Close'].iloc[0] - 1) * 100
        second_half_change = (second_half['Close'].iloc[-1] / second_half['Close'].iloc[0] - 1) * 100
        
        atr_pct = self._get_latest_atr_pct()
        slope_first = first_half['Slope_5D_Pct'].mean() if 'Slope_5D_Pct' in first_half.columns else 0
        
        # ATR 相對閾值：漲幅需超過 max(3%, 2倍ATR)，適應不同波動特性股票
        rise_threshold = max(3.0, atr_pct * 2.0)
        fall_threshold = atr_pct * 1.0  # 回跌 < 1倍ATR 視為「慢跌」
        
        quick_rise = first_half_change > rise_threshold
        slow_fall = -fall_threshold < second_half_change < 0
        volume_shrink = second_half['Volume'].mean() < first_half['Volume'].mean() * 0.85
        
        confidence = 0.0
        if quick_rise:
            confidence += 0.35
        if slow_fall:
            confidence += 0.25
        if volume_shrink:
            confidence += 0.25
        # Slope 趨勢確認：前段上漲斜率陡峭加分
        if slope_first > atr_pct * 1.5:
            confidence += 0.15
        
        if quick_rise and slow_fall:
            msg = f"快漲{first_half_change:.1f}%後緩跌{abs(second_half_change):.1f}% (ATR:{atr_pct:.1f}%)"
            return True, msg, min(confidence, 1.0)
        
        return False, "不符合快漲慢跌特徵", 0.0
    
    def detect_pattern_2_quick_fall_slow_rise(self) -> Tuple[bool, str, float]:
        """快跌慢漲 - 主力吸籌信號"""
        if len(self.df) < 10:
            return False, "數據不足", 0.0
        
        recent_data = self.df.tail(10)
        first_half = recent_data.head(5)
        second_half = recent_data.tail(5)
        
        first_half_change = (first_half['Close'].iloc[-1] / first_half['Close'].iloc[0] - 1) * 100
        second_half_change = (second_half['Close'].iloc[-1] / second_half['Close'].iloc[0] - 1) * 100
        
        atr_pct = self._get_latest_atr_pct()
        slope_second = second_half['Slope_5D_Pct'].mean() if 'Slope_5D_Pct' in second_half.columns else 0
        
        # ATR 相對閾值
        fall_threshold = max(3.0, atr_pct * 2.0)
        rise_cap = atr_pct * 1.0
        
        quick_fall = first_half_change < -fall_threshold
        slow_rise = 0 < second_half_change < rise_cap
        volume_shrink = second_half['Volume'].mean() < first_half['Volume'].mean() * 0.8
        
        confidence = 0.0
        if quick_fall:
            confidence += 0.35
        if slow_rise:
            confidence += 0.25
        if volume_shrink:
            confidence += 0.25
        # 後段緩漲斜率溫和加分
        if 0 < slope_second < atr_pct * 1.2:
            confidence += 0.15
        
        if quick_fall and slow_rise:
            msg = f"快跌{abs(first_half_change):.1f}%後緩漲{second_half_change:.1f}% (ATR:{atr_pct:.1f}%)"
            return True, msg, min(confidence, 1.0)
        
        return False, "不符合快跌慢漲特徵", 0.0
    
    def detect_pattern_3_volume_price_rise(self) -> Tuple[bool, str, float]:
        """放量上漲 - 可能短期見頂"""
        latest = self.df.iloc[-1]
        atr_pct = self._get_latest_atr_pct()
        
        # ATR 相對閾值：漲幅需超過 max(2%, 1.5倍ATR)
        price_rise_threshold = max(2.0, atr_pct * 1.5)
        
        volume_surge = latest['Volume_Ratio'] > 1.5
        price_rise = latest['Price_Change'] * 100 > price_rise_threshold
        
        confidence = 0.0
        if volume_surge:
            confidence += 0.45
        if price_rise:
            confidence += 0.35
        
        recent_3days = self.df.tail(3)
        continuous_surge = (recent_3days['Volume_Ratio'] > 1.3).sum() >= 2
        if continuous_surge:
            confidence += 0.15
        
        # ATR 濾網：若相對波動異常高（>3倍ATR），可能是恐慌或異常，降低信心度
        if latest['Relative_Move'] > 3.0:
            confidence -= 0.15
        
        if volume_surge and price_rise:
            return True, f"放量{latest['Volume_Ratio']:.1f}倍大漲 (ATR:{atr_pct:.1f}%)", min(confidence, 1.0)
        
        return False, "未達放量上漲條件", 0.0
    
    def detect_pattern_4_volume_shrink_flat(self) -> Tuple[bool, str, float]:
        """縮量不跌 - 頭部可能形成（價格在高檔橫盤，量縮）"""
        # 延長觀察期到 10 天，頭部築頂通常需要較長時間
        recent = self.df.tail(10)
        atr_pct = self._get_latest_atr_pct()
        
        # ── 1. 位置判斷：必須在相對高檔（股價 > MA20 的 1.08 倍）
        price_vs_ma20 = recent['Close'].iloc[-1] / recent['MA20'].iloc[-1]
        at_high = price_vs_ma20 > 1.08
        
        # ── 2. 前期漲幅：近 20 天需有明顯漲幅（> 8% 或 4倍ATR），排除無方向盤整
        if len(self.df) >= 21:
            prev_20_change = (self.df['Close'].iloc[-1] / self.df['Close'].iloc[-21] - 1) * 100
        else:
            prev_20_change = 0
        has_prior_rise = prev_20_change > max(8.0, atr_pct * 4)
        
        # ── 3. 嚴格量縮：近 10 天平均量比 < 0.65（非寬鬆的 0.8）
        volume_shrink = recent['Volume_Ratio'].mean() < 0.65
        
        # ── 4. 橫盤定義：近 10 天價格變動在 ±0.6倍ATR 以內（更嚴格）
        price_change = recent['Close'].iloc[-1] / recent['Close'].iloc[0] - 1
        flat_threshold = max(1.0, atr_pct * 0.6)
        price_flat = -flat_threshold/100 <= price_change <= flat_threshold/100
        
        # ── 5. Slope 接近 0 確認真正橫盤（非緩漲或緩跌）
        recent_slope = recent['Slope_5D_Pct'].mean() if 'Slope_5D_Pct' in recent.columns else 0
        slope_flat = abs(recent_slope) < atr_pct * 0.25
        
        # ── 信心度計算（四項各 0.25，最高 1.0）
        confidence = 0.0
        if at_high:
            confidence += 0.25
        if has_prior_rise:
            confidence += 0.25
        if volume_shrink:
            confidence += 0.25
        if price_flat:
            confidence += 0.25
        # Slope 接近 0 為額外確認，但不加分（作為過濾條件）
        
        # 必須同時滿足：高檔 + 前期漲幅 + 量縮 + 橫盤
        if at_high and has_prior_rise and volume_shrink and price_flat:
            # 若 slope 也接近 0，信心度微調至更穩健
            if slope_flat:
                confidence = min(confidence + 0.05, 1.0)
            msg = f"高檔縮量橫盤{recent['Volume_Ratio'].mean():.2f}倍(漲{prev_20_change:.1f}%後) (ATR:{atr_pct:.1f}%)"
            return True, msg, confidence
        
        return False, "不符合縮量不跌頭部特徵", 0.0
    
    def detect_pattern_5_volume_shrink_rise(self) -> Tuple[bool, str, float]:
        """縮量上漲 - 籌碼穩定（明顯上漲，漲幅超過門檻）"""
        recent = self.df.tail(5)
        atr_pct = self._get_latest_atr_pct()
        
        volume_shrink = recent['Volume_Ratio'].mean() < 1.0
        price_change = recent['Close'].iloc[-1] / recent['Close'].iloc[0] - 1
        # ATR 相對閾值：上漲需超過 max(1.5%, 1.2倍ATR)
        rise_threshold = max(1.5, atr_pct * 1.2)
        price_rise = price_change * 100 > rise_threshold
        
        # Slope 確認趨勢：需為正且穩定上漲
        recent_slope = recent['Slope_5D_Pct'].mean() if 'Slope_5D_Pct' in recent.columns else 0
        slope_positive = recent_slope > atr_pct * 0.2
        
        confidence = 0.0
        if volume_shrink:
            confidence += 0.35
        if price_rise:
            confidence += 0.45
        if slope_positive:
            confidence += 0.2
        
        if volume_shrink and price_rise:
            return True, f"縮量上漲{price_change*100:.1f}% (ATR:{atr_pct:.1f}%)", min(confidence, 1.0)
        
        return False, "不符合縮量上漲特徵", 0.0
    
    def detect_pattern_6_volume_shrink_fall(self) -> Tuple[bool, str, float]:
        """縮量下跌 - 繼續看跌（明顯下跌，跌幅超過門檻）"""
        recent = self.df.tail(5)
        atr_pct = self._get_latest_atr_pct()
        
        volume_shrink = recent['Volume_Ratio'].mean() < 1.0
        price_change = recent['Close'].iloc[-1] / recent['Close'].iloc[0] - 1
        # ATR 相對閾值：下跌需超過 max(1.5%, 1.2倍ATR)
        fall_threshold = max(1.5, atr_pct * 1.2)
        price_fall = price_change * 100 < -fall_threshold
        
        confidence = 0.0
        if volume_shrink:
            confidence += 0.35
        if price_fall:
            confidence += 0.55
        # ATR 濾網：若波動極大，可能是恐慌拋售而非正常看跌
        recent_move = recent['Relative_Move'].mean() if 'Relative_Move' in recent.columns else 0
        if recent_move > 2.5:
            confidence -= 0.1
        
        if volume_shrink and price_fall:
            return True, f"縮量下跌{abs(price_change)*100:.1f}% (ATR:{atr_pct:.1f}%)", min(confidence, 1.0)
        
        return False, "不符合縮量下跌特徵", 0.0
    
    def detect_pattern_7_volume_shrink_no_rise(self) -> Tuple[bool, str, float]:
        """
        縮量不漲 - 頭部確立（比口訣 4 更嚴格的確認訊號）
        核心邏輯：大漲後 + 極端量縮 + 多次上攻失敗 = 頭部確立
        """
        recent = self.df.tail(10)
        atr_pct = self._get_latest_atr_pct()
        
        # ── 1. 高檔定義：股價 > MA20 × 1.12（比口訣 4 的 1.08 更嚴）
        price_vs_ma20 = recent['Close'].iloc[-1] / recent['MA20'].iloc[-1]
        at_high = price_vs_ma20 > 1.12
        
        # ── 2. 前期大漲：近 30 天漲幅 > 15% 或 5×ATR（確認是「漲後」滯漲）
        if len(self.df) >= 31:
            prev_30_change = (self.df['Close'].iloc[-1] / self.df['Close'].iloc[-31] - 1) * 100
        else:
            prev_30_change = 0
        has_big_rise = prev_30_change > max(15.0, atr_pct * 5)
        
        # ── 3. 嚴格量縮：量比 < 0.6（比口訣 4 的 0.65 更嚴）
        volume_shrink = recent['Volume_Ratio'].mean() < 0.6
        
        # ── 4. 滯漲定義：近 10 天價格變動在 ±0.5×ATR 以內（更嚴格）
        stagnant_threshold = max(0.8, atr_pct * 0.5)
        price_stagnant = abs(recent['Close'].iloc[-1] / recent['Close'].iloc[0] - 1) * 100 < stagnant_threshold
        
        # ── 5. Slope 接近 0 確認真正滯漲
        recent_slope = recent['Slope_5D_Pct'].mean() if 'Slope_5D_Pct' in recent.columns else 0
        slope_stagnant = abs(recent_slope) < atr_pct * 0.2
        
        # ── 6. 多次上攻失敗：近 10 天內至少 2 天出現「上影線」（開高走低）
        # 上影線 = (High - max(Open, Close)) / Close，> 1.5% 視為上攻失敗
        recent_10 = self.df.tail(10)
        upper_shadow = (recent_10['High'] - recent_10[['Open', 'Close']].max(axis=1)) / recent_10['Close']
        failed_attacks = (upper_shadow > 0.015).sum()
        has_failed_attacks = failed_attacks >= 2
        
        # ── 信心度計算（五項合計，最高 1.0）
        confidence = 0.0
        if at_high:
            confidence += 0.25
        if has_big_rise:
            confidence += 0.25
        if volume_shrink:
            confidence += 0.2
        if price_stagnant:
            confidence += 0.15
        if has_failed_attacks:
            confidence += 0.15
        # Slope 接近 0 為額外確認，信心度微調
        if slope_stagnant:
            confidence = min(confidence + 0.05, 1.0)
        
        # 必須同時滿足：高檔 + 大漲 + 量縮 + 滯漲（上攻失敗為加分項）
        if at_high and has_big_rise and volume_shrink and price_stagnant:
            msg = f"頭部確立：漲{prev_30_change:.1f}% 後滯漲，{failed_attacks}次上攻失敗"
            return True, msg, min(confidence, 1.0)
        
        return False, "不符合縮量不漲頭部確立特徵", 0.0
    
    def detect_pattern_8_volume_surge_fall(self) -> Tuple[bool, str, float]:
        """放量下跌 - 恐慌殺跌"""
        latest = self.df.iloc[-1]
        atr_pct = self._get_latest_atr_pct()
        
        # ATR 相對閾值：跌幅需超過 max(2%, 1.5倍ATR)
        fall_threshold = max(2.0, atr_pct * 1.5)
        
        volume_surge = latest['Volume_Ratio'] > 1.5
        price_fall = latest['Price_Change'] * 100 < -fall_threshold
        
        confidence = 0.0
        if volume_surge:
            confidence += 0.45
        if price_fall:
            confidence += 0.4
        
        # 連跌後放量殺跌（原有邏輯保留）
        recent_5days = self.df.tail(5)['Price_Change'].sum()
        if recent_5days < -0.08:
            confidence += 0.15
        
        # ATR 濾網：若跌幅異常大（>3倍ATR），可能是恐慌性拋售，視為撿便宜機會
        if latest['Relative_Move'] > 3.0:
            confidence += 0.1
        
        if volume_surge and price_fall:
            return True, f"放量{latest['Volume_Ratio']:.1f}倍下跌 (ATR:{atr_pct:.1f}%)", min(confidence, 1.0)
        
        return False, "不符合放量下跌特徵", 0.0
    
    def analyze_all_patterns(self) -> List[Dict]:
        """分析所有8種交易模式"""
        patterns = []
        
        patterns_to_check = [
            ("快漲慢跌", "主力出貨", "SELL", self.detect_pattern_1_quick_rise_slow_fall),
            ("快跌慢漲", "主力吸籌", "BUY", self.detect_pattern_2_quick_fall_slow_rise),
            ("放量上漲", "見頂風險", "SELL", self.detect_pattern_3_volume_price_rise),
            ("縮量不跌", "頭部形成", "AVOID", self.detect_pattern_4_volume_shrink_flat),
            ("縮量上漲", "趨勢健康", "HOLD", self.detect_pattern_5_volume_shrink_rise),
            ("縮量下跌", "繼續看跌", "AVOID", self.detect_pattern_6_volume_shrink_fall),
            ("縮量不漲", "頭部確立", "SELL", self.detect_pattern_7_volume_shrink_no_rise),
            ("放量下跌", "恐慌殺跌", "BUY", self.detect_pattern_8_volume_surge_fall),
        ]
        
        for name, desc, signal, detect_func in patterns_to_check:
            detected, message, confidence = detect_func()
            if detected:
                patterns.append({
                    'pattern_id': name,
                    'pattern_name': desc,
                    'signal': signal,
                    'description': message,
                    'confidence': round(confidence * 100, 1),
                    'detected_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                })
        
        # 按信心度排序
        patterns.sort(key=lambda x: x['confidence'], reverse=True)
        return patterns


def analyze_stock_patterns(df: pd.DataFrame) -> Dict:
    """
    對單一股票進行交易模式分析
    
    Args:
        df: 股票歷史數據 DataFrame
        
    Returns:
        包含所有檢測結果的字典
    """
    try:
        analyzer = TradingPatternAnalyzer(df)
        patterns = analyzer.analyze_all_patterns()
        
        # 確定主導信號
        if not patterns:
            dominant_signal = "HOLD"
            signal_strength = 0
        else:
            # 計算各信號的加權分數
            signal_scores = {"BUY": 0, "SELL": 0, "HOLD": 0, "AVOID": 0}
            for p in patterns:
                signal_scores[p['signal']] += p['confidence']
            
            dominant_signal = max(signal_scores, key=signal_scores.get)
            signal_strength = signal_scores[dominant_signal]
        
        return {
            'patterns_detected': len(patterns),
            'patterns': patterns,
            'dominant_signal': dominant_signal,
            'signal_strength': signal_strength,
            'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
    except Exception as e:
        return {
            'patterns_detected': 0,
            'patterns': [],
            'dominant_signal': 'HOLD',
            'signal_strength': 0,
            'error': str(e),
            'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
