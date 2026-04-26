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
        """
        快漲慢跌 - 主力出貨信號
        核心邏輯：高檔 + 前期明顯漲幅 + 快漲 + 量縮慢跌 = 出貨
        排除：低檔反彈後的健康回撡
        """
        if len(self.df) < 10:
            return False, "數據不足", 0.0
        
        recent_data = self.df.tail(10)
        first_half = recent_data.head(5)
        second_half = recent_data.tail(5)
        
        first_half_change = (first_half['Close'].iloc[-1] / first_half['Close'].iloc[0] - 1) * 100
        second_half_change = (second_half['Close'].iloc[-1] / second_half['Close'].iloc[0] - 1) * 100
        
        atr_pct = self._get_latest_atr_pct()
        slope_first = first_half['Slope_5D_Pct'].mean() if 'Slope_5D_Pct' in first_half.columns else 0
        
        # ── 1. 高檔位置：股價 > MA20 × 1.05（低檔的快漲慢跌可能是反彈整理）
        price_vs_ma20 = recent_data['Close'].iloc[-1] / recent_data['MA20'].iloc[-1]
        at_high = price_vs_ma20 > 1.05
        
        # ── 2. 前期漲幅：近 20 天漲幅 > max(5%, 3×ATR)（確保是「漲後」出貨）
        if len(self.df) >= 21:
            prev_20_change = (self.df['Close'].iloc[-1] / self.df['Close'].iloc[-21] - 1) * 100
        else:
            prev_20_change = 0
        has_prior_rise = prev_20_change > max(5.0, atr_pct * 3)
        
        # ── 3. ATR 相對閾值：漲幅需超過 max(3%, 2×ATR)
        rise_threshold = max(3.0, atr_pct * 2.0)
        fall_threshold = atr_pct * 1.0
        
        quick_rise = first_half_change > rise_threshold
        slow_fall = -fall_threshold < second_half_change < 0
        volume_shrink = second_half['Volume'].mean() < first_half['Volume'].mean() * 0.85
        
        # ── 4. 排除剛剛恐慌殺跌後的 V 轉：近 10 天無量比 > 2.0 且跌 > 3%
        panic_days = ((recent_data['Volume_Ratio'] > 2.0) & (recent_data['Price_Change'] < -0.03)).sum()
        no_recent_panic = panic_days == 0
        
        confidence = 0.0
        if at_high:
            confidence += 0.2
        if has_prior_rise:
            confidence += 0.2
        if quick_rise:
            confidence += 0.25
        if slow_fall:
            confidence += 0.2
        if volume_shrink:
            confidence += 0.1
        if slope_first > atr_pct * 1.5:
            confidence += 0.05
        
        # 必須同時滿足：高檔 + 前期漲幅 + 快漲 + 慢跌
        if at_high and has_prior_rise and quick_rise and slow_fall and no_recent_panic:
            msg = f"高檔出貨：漲{prev_20_change:.1f}%>快漲{first_half_change:.1f}%慢跌{abs(second_half_change):.1f}%"
            return True, msg, min(confidence, 1.0)
        
        return False, "不符合高檔出貨特徵", 0.0
    
    def detect_pattern_2_quick_fall_slow_rise(self) -> Tuple[bool, str, float]:
        """
        快跌慢漲 - 主力吸籌信號
        核心邏輯：低檔 + 前期明顯跌幅 + 快跌 + 量縮慢漲 = 吸籌
        排除：高檔下跌中繼的快跌慢漲
        """
        if len(self.df) < 10:
            return False, "數據不足", 0.0
        
        recent_data = self.df.tail(10)
        first_half = recent_data.head(5)
        second_half = recent_data.tail(5)
        
        first_half_change = (first_half['Close'].iloc[-1] / first_half['Close'].iloc[0] - 1) * 100
        second_half_change = (second_half['Close'].iloc[-1] / second_half['Close'].iloc[0] - 1) * 100
        
        atr_pct = self._get_latest_atr_pct()
        slope_second = second_half['Slope_5D_Pct'].mean() if 'Slope_5D_Pct' in second_half.columns else 0
        
        # ── 1. 低檔位置：股價 < MA20 × 1.02（高檔的快跌慢漲是下跌中繼）
        price_vs_ma20 = recent_data['Close'].iloc[-1] / recent_data['MA20'].iloc[-1]
        at_low = price_vs_ma20 < 1.02
        
        # ── 2. 前期跌幅：近 20 天跌幅 > max(5%, 3×ATR)（確保是「跌後」吸籌）
        if len(self.df) >= 21:
            prev_20_change = (self.df['Close'].iloc[-1] / self.df['Close'].iloc[-21] - 1) * 100
        else:
            prev_20_change = 0
        has_prior_fall = prev_20_change < -max(5.0, atr_pct * 3)
        
        # ── 3. ATR 相對閾值
        fall_threshold = max(3.0, atr_pct * 2.0)
        rise_cap = atr_pct * 1.0
        
        quick_fall = first_half_change < -fall_threshold
        slow_rise = 0 < second_half_change < rise_cap
        volume_shrink = second_half['Volume'].mean() < first_half['Volume'].mean() * 0.8
        
        # ── 4. 整體 10 天 Slope 不過於負：排除下跌趨勢中的中繼
        overall_slope = recent_data['Slope_5D_Pct'].mean() if 'Slope_5D_Pct' in recent_data.columns else 0
        not_downtrend = overall_slope > -atr_pct * 0.5
        
        # ── 5. 排除剛剛爆量長紅：近 5 天無量比 > 2.5 且漲 > 4%（可能是出貨後的拉高）
        pump_days = ((recent_data['Volume_Ratio'] > 2.5) & (recent_data['Price_Change'] > 0.04)).sum()
        no_recent_pump = pump_days == 0
        
        confidence = 0.0
        if at_low:
            confidence += 0.15
        if has_prior_fall:
            confidence += 0.25
        if quick_fall:
            confidence += 0.2
        if slow_rise:
            confidence += 0.15
        if volume_shrink:
            confidence += 0.15
        if 0 < slope_second < atr_pct * 1.2:
            confidence += 0.1
        
        # 必須同時滿足：低檔 + 前期跌幅 + 快跌 + 慢漲 + 非下跌趨勢
        if at_low and has_prior_fall and quick_fall and slow_rise and not_downtrend and no_recent_pump:
            msg = f"低檔吸籌：跌{abs(prev_20_change):.1f}%>快跌{abs(first_half_change):.1f}%慢漲{second_half_change:.1f}%"
            return True, msg, min(confidence, 1.0)
        
        return False, "不符合低檔吸籌特徵", 0.0
    
    def detect_pattern_3_volume_price_rise(self) -> Tuple[bool, str, float]:
        """
        放量上漲 - 可能短期見頂（高檔或漲後的放量大漲）
        核心邏輯：高檔/漲後 + 極度放量 + 大漲 = 出貨或短線過熱
        排除：低檔啟動的放量上漲
        """
        latest = self.df.iloc[-1]
        atr_pct = self._get_latest_atr_pct()
        
        # ── 1. 極度放量：量比 > 2.0（非原來寬鬆的 1.5）
        volume_surge = latest['Volume_Ratio'] > 2.0
        
        # ── 2. 明顯上漲：漲幅 > max(2%, 1.5×ATR)
        price_rise_threshold = max(2.0, atr_pct * 1.5)
        price_rise = latest['Price_Change'] * 100 > price_rise_threshold
        
        # ── 3. 高檔或漲後位置：股價 > MA20 × 1.05 或近 20 天漲幅 > 10%
        price_vs_ma20 = latest['Close'] / latest['MA20']
        at_high_or_extended = price_vs_ma20 > 1.05
        
        if len(self.df) >= 21:
            prev_20_change = (self.df['Close'].iloc[-1] / self.df['Close'].iloc[-21] - 1) * 100
        else:
            prev_20_change = 0
        has_big_rise = prev_20_change > max(10.0, atr_pct * 5)
        
        # ── 4. 連續放量確認：近 3 天至少 2 天量比 > 1.5（非原來寬鬆的 1.3）
        recent_3days = self.df.tail(3)
        continuous_surge = (recent_3days['Volume_Ratio'] > 1.5).sum() >= 2
        
        # ── 5. 排除上影線極長：若上影線 > 3%，可能是拉高出貨
        upper_shadow = (latest['High'] - max(latest['Open'], latest['Close'])) / latest['Close']
        not_extreme_upper_shadow = upper_shadow < 0.03
        
        confidence = 0.0
        if volume_surge:
            confidence += 0.25
        if price_rise:
            confidence += 0.2
        if at_high_or_extended:
            confidence += 0.2
        if has_big_rise:
            confidence += 0.15
        if continuous_surge:
            confidence += 0.15
        if not_extreme_upper_shadow:
            confidence += 0.05
        
        # ATR 濾網：若相對波動異常高（>3倍ATR），可能是恐慌或異常，降低信心度
        if latest['Relative_Move'] > 3.0:
            confidence -= 0.15
        
        # 必須同時滿足：極度放量 + 大漲 + 高檔/漲後 + 連續放量
        if volume_surge and price_rise and (at_high_or_extended or has_big_rise) and continuous_surge:
            msg = f"放量大漲(量{latest['Volume_Ratio']:.1f}倍,漲{latest['Price_Change']*100:.1f}%,MA20:{price_vs_ma20:.2f}倍)"
            return True, msg, min(confidence, 1.0)
        
        return False, "不符合高檔放量見頂特徵", 0.0
    
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
        """
        縮量上漲 - 籌碼穩定（趨勢健康，排除高檔拉高出貨）
        核心邏輯：中低檔 + 明顯上漲 + 量縮 + 斜率正 = 趨勢健康
        """
        recent = self.df.tail(10)
        atr_pct = self._get_latest_atr_pct()
        
        # ── 1. 嚴格量縮：近 10 天平均量比 < 0.75（非原來寬鬆的 1.0）
        volume_shrink = recent['Volume_Ratio'].mean() < 0.75
        
        # ── 2. 明顯上漲：近 10 天漲幅 > max(2%, 1.5×ATR)
        price_change = recent['Close'].iloc[-1] / recent['Close'].iloc[0] - 1
        rise_threshold = max(2.0, atr_pct * 1.5)
        price_rise = price_change * 100 > rise_threshold
        
        # ── 3. 排除極度高檔：股價 < MA20 × 1.15（高檔縮量上漲可能是拉高出貨）
        price_vs_ma20 = recent['Close'].iloc[-1] / recent['MA20'].iloc[-1]
        not_at_extreme_high = price_vs_ma20 < 1.15
        
        # ── 4. Slope 確認上漲趨勢：斜率 > 0.3×ATR（更嚴格）
        recent_slope = recent['Slope_5D_Pct'].mean() if 'Slope_5D_Pct' in recent.columns else 0
        slope_positive = recent_slope > atr_pct * 0.3
        
        # ── 5. 排除剛剛恐慌殺跌後的 V 轉：近 10 天內無「放量跌停」（量比 > 2.0 且跌 > 3%）
        recent_10 = self.df.tail(10)
        panic_days = ((recent_10['Volume_Ratio'] > 2.0) & (recent_10['Price_Change'] < -0.03)).sum()
        no_recent_panic = panic_days == 0
        
        confidence = 0.0
        if volume_shrink:
            confidence += 0.25
        if price_rise:
            confidence += 0.35
        if not_at_extreme_high:
            confidence += 0.15
        if slope_positive:
            confidence += 0.15
        if no_recent_panic:
            confidence += 0.1
        
        if volume_shrink and price_rise and not_at_extreme_high:
            msg = f"籌碼穩定縮量上漲{price_change*100:.1f}%(MA20:{price_vs_ma20:.2f}倍)"
            return True, msg, min(confidence, 1.0)
        
        return False, "不符合籌碼穩定縮量上漲特徵", 0.0
    
    def detect_pattern_6_volume_shrink_fall(self) -> Tuple[bool, str, float]:
        """
        縮量下跌 - 繼續看跌（下跌趨勢中的無量陰跌）
        核心邏輯：下跌趨勢 + 無量陰跌 + 無承接 = 還會繼續跌
        注意：上漲趨勢中的縮量回檔是健康的，不會觸發此訊號
        """
        recent = self.df.tail(10)
        atr_pct = self._get_latest_atr_pct()
        
        # ── 1. 嚴格量縮：近 10 天平均量比 < 0.7（極度無量，非原來寬鬆的 1.0）
        volume_shrink = recent['Volume_Ratio'].mean() < 0.7
        
        # ── 2. 明顯下跌：近 10 天跌幅 > max(2%, 1.5×ATR)
        price_change = recent['Close'].iloc[-1] / recent['Close'].iloc[0] - 1
        fall_threshold = max(2.0, atr_pct * 1.5)
        price_fall = price_change * 100 < -fall_threshold
        
        # ── 3. 下跌趨勢確認：近 20 天已有明顯下跌（> 5% 或 3×ATR）
        if len(self.df) >= 21:
            prev_20_change = (self.df['Close'].iloc[-1] / self.df['Close'].iloc[-21] - 1) * 100
        else:
            prev_20_change = 0
        in_downtrend = prev_20_change < -max(5.0, atr_pct * 3)
        
        # ── 4. Slope 確認下跌：斜率為負（非單日回檔）
        recent_slope = recent['Slope_5D_Pct'].mean() if 'Slope_5D_Pct' in recent.columns else 0
        slope_negative = recent_slope < -atr_pct * 0.3
        
        # ── 5. 排除恐慌殺跌：若有「量比 > 2.0 且跌 > 4%」的極端日，轉由口訣 8 處理
        recent_10 = self.df.tail(10)
        panic_days = ((recent_10['Volume_Ratio'] > 2.0) & (recent_10['Price_Change'] < -0.04)).sum()
        not_panic = panic_days == 0
        
        confidence = 0.0
        if volume_shrink:
            confidence += 0.2
        if price_fall:
            confidence += 0.25
        if in_downtrend:
            confidence += 0.3
        if slope_negative:
            confidence += 0.25
        
        # 必須同時滿足：量縮 + 跌勢 + 下跌趨勢 + 斜率負（排除上漲中的健康回檔）
        if volume_shrink and price_fall and in_downtrend and slope_negative and not_panic:
            msg = f"無量陰跌{abs(price_change)*100:.1f}%(20天跌{abs(prev_20_change):.1f}%)"
            return True, msg, min(confidence, 1.0)
        
        return False, "不符合下跌趨勢中縮量下跌特徵", 0.0
    
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
        """
        放量下跌 - 恐慌殺跌
        核心邏輯：放量下跌 = 恐慌拋售，絕大多數情況下應該 AVOID，非「必然反彈」
        只有「連續下跌後的極度恐慌 + 關鍵支撐 + 止跌訊號」才可能短線反彈
        """
        latest = self.df.iloc[-1]
        atr_pct = self._get_latest_atr_pct()
        
        # ── 1. 極度放量：量比 > 2.5（非原來寬鬆的 1.5）
        volume_surge = latest['Volume_Ratio'] > 2.5
        
        # ── 2. 明顯下跌：跌幅 > max(3%, 2×ATR)
        fall_threshold = max(3.0, atr_pct * 2.0)
        price_fall = latest['Price_Change'] * 100 < -fall_threshold
        
        # ── 3. 必須處於下跌趨勢：近 20 天已有明顯下跌（> 8% 或 4×ATR）
        if len(self.df) >= 21:
            prev_20_change = (self.df['Close'].iloc[-1] / self.df['Close'].iloc[-21] - 1) * 100
        else:
            prev_20_change = 0
        in_downtrend = prev_20_change < -max(8.0, atr_pct * 4)
        
        # ── 4. 近 5 天已累積明顯跌幅（> 5%）：確保是「跌了一段」後的恐慌，非剛開始跌
        recent_5days = self.df.tail(5)['Price_Change'].sum()
        already_falling = recent_5days < -0.05
        
        # ── 5. 止跌訊號：長下影線 = 下方有承接
        lower_shadow = (min(latest['Open'], latest['Close']) - latest['Low']) / latest['Close']
        has_support = lower_shadow > 0.015
        
        # ── 6. 今日收盤遠離最低點：確認有買盤扛住
        bounce_from_low = (latest['Close'] - latest['Low']) / latest['Close'] > 0.01
        
        confidence = 0.0
        if volume_surge:
            confidence += 0.2
        if price_fall:
            confidence += 0.2
        if in_downtrend:
            confidence += 0.2
        if already_falling:
            confidence += 0.15
        if has_support:
            confidence += 0.15
        if bounce_from_low:
            confidence += 0.1
        
        # 必須同時滿足：極度放量 + 明顯下跌 + 下跌趨勢 + 已累跌
        if volume_surge and price_fall and in_downtrend and already_falling:
            if has_support and bounce_from_low:
                # 有止跌跡象：潛在短線反彈機會（但信號仍為 AVOID，只是消息提示）
                msg = f"恐慌後有承接(量{latest['Volume_Ratio']:.1f}倍,下影{lower_shadow*100:.1f}%,5日跌{abs(recent_5days)*100:.1f}%)"
                return True, msg, min(confidence, 1.0)
            else:
                # 無止跌跡象：繼續看跌
                msg = f"恐慌殺跌無承接(量{latest['Volume_Ratio']:.1f}倍,5日跌{abs(recent_5days)*100:.1f}%,20日跌{abs(prev_20_change):.1f}%)"
                return True, msg, min(confidence, 0.85)
        
        return False, "不符合恐慌殺跌特徵", 0.0
    
    def _calc_rsi(self, period: int = 14) -> float:
        """計算最新 RSI 值"""
        if len(self.df) < period + 1:
            return 50.0
        closes = self.df['Close']
        delta = closes.diff()
        gain = delta.where(delta > 0, 0.0)
        loss = -delta.where(delta < 0, 0.0)
        avg_gain = gain.rolling(window=period).mean()
        avg_loss = loss.rolling(window=period).mean()
        rs = avg_gain / avg_loss.replace(0, 1e-9)
        rsi = 100 - (100 / (1 + rs))
        return rsi.iloc[-1]
    
    def detect_pattern_9_panic_bottom(self) -> Tuple[bool, str, float]:
        """
        極度恐慌底部 - 短線搶反彈（極嚴格，一年僅數次）
        核心邏輯：跌深 + 極度恐慌 + 嚴重乖離 + 止跌訊號 = 短線反彈機會
        風險提示：此訊號為「短線搶反彈」，必須嚴設停損！
        """
        latest = self.df.iloc[-1]
        atr_pct = self._get_latest_atr_pct()
        
        # ── 1. 已跌深：近 20 天跌幅 > max(15%, 5×ATR)
        if len(self.df) >= 21:
            prev_20_change = (self.df['Close'].iloc[-1] / self.df['Close'].iloc[-21] - 1) * 100
        else:
            prev_20_change = 0
        deeply_fallen = prev_20_change < -max(15.0, atr_pct * 5)
        
        # ── 2. 極度恐慌：單日量比 > 3.0
        extreme_volume = latest['Volume_Ratio'] > 3.0
        
        # ── 3. 明顯殺跌：單日跌幅 > max(4%, 3×ATR)
        fall_threshold = max(4.0, atr_pct * 3.0)
        big_fall = latest['Price_Change'] * 100 < -fall_threshold
        
        # ── 4. 嚴重乖離：股價 < MA20 × 0.92（遠離均線）
        price_vs_ma20 = latest['Close'] / latest['MA20']
        severe_deviation = price_vs_ma20 < 0.92
        
        # ── 5. 止跌訊號：長下影線 > 2%（收盤遠離最低點）
        lower_shadow = (min(latest['Open'], latest['Close']) - latest['Low']) / latest['Close']
        has_bounce = lower_shadow > 0.02
        
        # ── 6. RSI 超賣：RSI(14) < 35
        rsi_value = self._calc_rsi(14)
        rsi_oversold = rsi_value < 35
        
        confidence = 0.0
        if deeply_fallen:
            confidence += 0.2
        if extreme_volume:
            confidence += 0.2
        if big_fall:
            confidence += 0.15
        if severe_deviation:
            confidence += 0.15
        if has_bounce:
            confidence += 0.15
        if rsi_oversold:
            confidence += 0.15
        
        # 必須同時滿足：跌深 + 極度放量 + 明顯跌 + 严重乖離 + 止跌 + RSI超賣
        if deeply_fallen and extreme_volume and big_fall and severe_deviation and has_bounce and rsi_oversold:
            msg = (f"極度恐慌底部(跌{abs(prev_20_change):.0f}%,"
                   f"量{latest['Volume_Ratio']:.1f}倍,RSI{rsi_value:.0f},"
                   f"乖離{(1-price_vs_ma20)*100:.0f}%)"
                   f"【短線搶反彈，嚴設停損】")
            return True, msg, min(confidence, 1.0)
        
        return False, "不符合極度恐慌底部特徵", 0.0
    
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
            ("放量下跌", "恐慌殺跌", "AVOID", self.detect_pattern_8_volume_surge_fall),
            ("恐慌底部", "短線搶反彈", "BUY", self.detect_pattern_9_panic_bottom),
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
