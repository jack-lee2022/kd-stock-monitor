#!/usr/bin/env python3
"""
股票交易模式檢測系統
根據8種經典量價關係進行自動分析
整合到 KD Stock Monitor
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
    
    def detect_pattern_1_quick_rise_slow_fall(self) -> Tuple[bool, str, float]:
        """快漲慢跌 - 主力出貨信號"""
        if len(self.df) < 10:
            return False, "數據不足", 0.0
        
        recent_data = self.df.tail(10)
        first_half = recent_data.head(5)
        second_half = recent_data.tail(5)
        
        first_half_change = (first_half['Close'].iloc[-1] / first_half['Close'].iloc[0] - 1) * 100
        second_half_change = (second_half['Close'].iloc[-1] / second_half['Close'].iloc[0] - 1) * 100
        
        quick_rise = first_half_change > 10
        slow_fall = -5 < second_half_change < 0
        volume_shrink = second_half['Volume'].mean() < first_half['Volume'].mean() * 0.8
        
        confidence = 0.0
        if quick_rise:
            confidence += 0.4
        if slow_fall:
            confidence += 0.3
        if volume_shrink:
            confidence += 0.3
        
        if quick_rise and slow_fall:
            msg = f"快漲{first_half_change:.1f}%後緩跌{abs(second_half_change):.1f}%"
            return True, msg, confidence
        
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
        
        quick_fall = first_half_change < -10
        slow_rise = 0 < second_half_change < 8
        volume_shrink = second_half['Volume'].mean() < first_half['Volume'].mean() * 0.7
        
        confidence = 0.0
        if quick_fall:
            confidence += 0.4
        if slow_rise:
            confidence += 0.3
        if volume_shrink:
            confidence += 0.3
        
        if quick_fall and slow_rise:
            msg = f"快跌{abs(first_half_change):.1f}%後緩漲{second_half_change:.1f}%"
            return True, msg, confidence
        
        return False, "不符合快跌慢漲特徵", 0.0
    
    def detect_pattern_3_volume_price_rise(self) -> Tuple[bool, str, float]:
        """放量上漲 - 可能短期見頂"""
        latest = self.df.iloc[-1]
        
        volume_surge = latest['Volume_Ratio'] > 2.0
        price_rise = latest['Price_Change'] > 0.05
        
        confidence = 0.0
        if volume_surge:
            confidence += 0.5
        if price_rise:
            confidence += 0.3
        
        recent_3days = self.df.tail(3)
        continuous_surge = (recent_3days['Volume_Ratio'] > 1.5).sum() >= 2
        if continuous_surge:
            confidence += 0.2
        
        if volume_surge and price_rise:
            return True, f"放量{latest['Volume_Ratio']:.1f}倍大漲", confidence
        
        return False, "未達放量上漲條件", 0.0
    
    def detect_pattern_4_volume_shrink_flat(self) -> Tuple[bool, str, float]:
        """縮量不跌 - 頭部可能形成"""
        recent = self.df.tail(5)
        
        volume_shrink = recent['Volume_Ratio'].mean() < 0.6
        price_flat = abs(recent['Close'].iloc[-1] / recent['Close'].iloc[0] - 1) < 0.02
        
        confidence = 0.0
        if volume_shrink:
            confidence += 0.5
        if price_flat:
            confidence += 0.5
        
        if volume_shrink and price_flat:
            return True, f"縮量至{recent['Volume_Ratio'].mean():.1f}倍", confidence
        
        return False, "不符合縮量不跌特徵", 0.0
    
    def detect_pattern_5_volume_shrink_rise(self) -> Tuple[bool, str, float]:
        """縮量上漲 - 籌碼穩定"""
        recent = self.df.tail(5)
        
        volume_shrink = recent['Volume_Ratio'].mean() < 0.8
        price_rise = (recent['Close'].iloc[-1] / recent['Close'].iloc[0] - 1) > 0.03
        
        confidence = 0.0
        if volume_shrink:
            confidence += 0.4
        if price_rise:
            confidence += 0.6
        
        if volume_shrink and price_rise:
            change = (recent['Close'].iloc[-1] / recent['Close'].iloc[0] - 1) * 100
            return True, f"縮量上漲{change:.1f}%", confidence
        
        return False, "不符合縮量上漲特徵", 0.0
    
    def detect_pattern_6_volume_shrink_fall(self) -> Tuple[bool, str, float]:
        """縮量下跌 - 繼續看跌"""
        recent = self.df.tail(5)
        
        volume_shrink = recent['Volume_Ratio'].mean() < 0.7
        price_fall = (recent['Close'].iloc[-1] / recent['Close'].iloc[0] - 1) < -0.03
        
        confidence = 0.0
        if volume_shrink:
            confidence += 0.4
        if price_fall:
            confidence += 0.6
        
        if volume_shrink and price_fall:
            change = (recent['Close'].iloc[-1] / recent['Close'].iloc[0] - 1) * 100
            return True, f"縮量下跌{abs(change):.1f}%", confidence
        
        return False, "不符合縮量下跌特徵", 0.0
    
    def detect_pattern_7_volume_shrink_no_rise(self) -> Tuple[bool, str, float]:
        """縮量不漲 - 頭部確立"""
        recent = self.df.tail(5)
        
        price_vs_ma20 = recent['Close'].iloc[-1] / recent['MA20'].iloc[-1]
        at_high = price_vs_ma20 > 1.1
        
        volume_shrink = recent['Volume_Ratio'].mean() < 0.7
        price_stagnant = abs(recent['Close'].iloc[-1] / recent['Close'].iloc[0] - 1) < 0.02
        
        confidence = 0.0
        if at_high:
            confidence += 0.4
        if volume_shrink:
            confidence += 0.3
        if price_stagnant:
            confidence += 0.3
        
        if at_high and volume_shrink and price_stagnant:
            return True, "高位縮量滯漲", confidence
        
        return False, "不符合縮量不漲特徵", 0.0
    
    def detect_pattern_8_volume_surge_fall(self) -> Tuple[bool, str, float]:
        """放量下跌 - 恐慌殺跌"""
        latest = self.df.iloc[-1]
        
        volume_surge = latest['Volume_Ratio'] > 2.0
        price_fall = latest['Price_Change'] < -0.05
        
        confidence = 0.0
        if volume_surge:
            confidence += 0.5
        if price_fall:
            confidence += 0.5
        
        if volume_surge and price_fall:
            recent_5days = self.df.tail(5)['Price_Change'].sum()
            if recent_5days < -0.10:
                confidence += 0.3
                return True, f"連跌後放量{latest['Volume_Ratio']:.1f}倍殺跌", min(confidence, 1.0)
            else:
                return True, f"放量{latest['Volume_Ratio']:.1f}倍下跌", confidence
        
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
