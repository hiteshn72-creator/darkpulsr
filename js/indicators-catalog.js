/**
 * DarkPulsr — Built-in indicators catalog (TradingView-style)
 */
(function () {
  const INDICATOR_SIDEBAR = [
    { id: 'my_scripts', label: 'My scripts', section: 'Personal', icon: 'user', disabled: true },
    { id: 'purchased', label: 'Purchased', section: 'Personal', icon: 'wallet', disabled: true },
    { id: 'technicals', label: 'Technicals', section: 'Built-in', icon: 'chart' },
    { id: 'fundamentals', label: 'Fundamentals', section: 'Built-in', icon: 'bars', disabled: true },
    { id: 'editors_picks', label: "Editors' picks", section: 'Community', icon: 'bookmark', disabled: true },
    { id: 'top', label: 'Top', section: 'Community', icon: 'trend', disabled: true },
    { id: 'trending', label: 'Trending', section: 'Community', icon: 'flame', disabled: true },
    { id: 'store', label: 'Store', section: 'Community', icon: 'store', disabled: true },
  ];

  const INDICATOR_TABS = [
    { id: 'indicators', label: 'Indicators' },
    { id: 'strategies', label: 'Strategies' },
    { id: 'profiles', label: 'Profiles' },
    { id: 'patterns', label: 'Patterns' },
  ];

  const TECHNICAL_INDICATORS = [
    { id: 'volume_24h', name: '24-hour Volume', group: 'volume', badge: null },
    { id: 'acc_dist', name: 'Accumulation/Distribution', group: 'volume', badge: null },
    { id: 'chaikin_money_flow', name: 'Chaikin Money Flow', group: 'volume', badge: null },
    { id: 'ease_of_movement', name: 'Ease of Movement', group: 'volume', badge: null },
    { id: 'force_index', name: 'Force Index', group: 'volume', badge: null },
    { id: 'klinger', name: 'Klinger Oscillator', group: 'volume', badge: null },
    { id: 'mfi', name: 'Money Flow Index', group: 'volume', badge: null },
    { id: 'obv', name: 'On Balance Volume', group: 'volume', badge: null },
    { id: 'pvt', name: 'Price Volume Trend', group: 'volume', badge: null },
    { id: 'volume', name: 'Volume', group: 'volume', badge: null },
    { id: 'volume_osc', name: 'Volume Oscillator', group: 'volume', badge: null },
    { id: 'vwap', name: 'VWAP', group: 'volume', badge: 'NEW' },
    { id: 'vwma', name: 'Volume Weighted Moving Average', group: 'volume', badge: null },

    { id: 'alma', name: 'Arnaud Legoux Moving Average', group: 'moving_averages', badge: 'NEW' },
    { id: 'sma', name: 'Moving Average', group: 'moving_averages', badge: null },
    { id: 'ema', name: 'Moving Average Exponential', group: 'moving_averages', badge: null },
    { id: 'wma', name: 'Moving Average Weighted', group: 'moving_averages', badge: null },
    { id: 'hma', name: 'Hull Moving Average', group: 'moving_averages', badge: null },
    { id: 'dema', name: 'Double EMA', group: 'moving_averages', badge: null },
    { id: 'tema', name: 'Triple EMA', group: 'moving_averages', badge: null },
    { id: 'smma', name: 'Smoothed Moving Average', group: 'moving_averages', badge: null },
    { id: 'ma_ribbon', name: 'Moving Average Ribbon', group: 'moving_averages', badge: null },
    { id: 'ma_cross', name: 'Moving Average Cross', group: 'moving_averages', badge: null },
    { id: 'mcginley', name: 'McGinley Dynamic', group: 'moving_averages', badge: null },

    { id: 'rsi', name: 'Relative Strength Index', group: 'oscillators', badge: null },
    { id: 'stoch', name: 'Stochastic', group: 'oscillators', badge: null },
    { id: 'stoch_rsi', name: 'Stochastic RSI', group: 'oscillators', badge: null },
    { id: 'macd', name: 'MACD', group: 'oscillators', badge: null },
    { id: 'awesome', name: 'Awesome Oscillator', group: 'oscillators', badge: null },
    { id: 'momentum', name: 'Momentum', group: 'oscillators', badge: null },
    { id: 'roc', name: 'Rate Of Change', group: 'oscillators', badge: null },
    { id: 'cci', name: 'Commodity Channel Index', group: 'oscillators', badge: null },
    { id: 'williams_r', name: 'Williams %R', group: 'oscillators', badge: null },
    { id: 'ultimate', name: 'Ultimate Oscillator', group: 'oscillators', badge: null },
    { id: 'fisher', name: 'Fisher Transform', group: 'oscillators', badge: 'BETA' },
    { id: 'coppock', name: 'Coppock Curve', group: 'oscillators', badge: null },

    { id: 'adx', name: 'Average Directional Index', group: 'trend', badge: null },
    { id: 'aroon', name: 'Aroon', group: 'trend', badge: null },
    { id: 'ichimoku', name: 'Ichimoku Cloud', group: 'trend', badge: null },
    { id: 'psar', name: 'Parabolic SAR', group: 'trend', badge: null },
    { id: 'supertrend', name: 'SuperTrend', group: 'trend', badge: null },
    { id: 'vortex', name: 'Vortex Indicator', group: 'trend', badge: null },
    { id: 'dmi', name: 'Directional Movement Index', group: 'trend', badge: null },
    { id: 'trix', name: 'TRIX', group: 'trend', badge: null },

    { id: 'atr', name: 'Average True Range', group: 'volatility', badge: null },
    { id: 'bb', name: 'Bollinger Bands', group: 'volatility', badge: null },
    { id: 'bb_width', name: 'Bollinger Bands Width', group: 'volatility', badge: null },
    { id: 'keltner', name: 'Keltner Channels', group: 'volatility', badge: null },
    { id: 'donchian', name: 'Donchian Channels', group: 'volatility', badge: null },
    { id: 'hist_vol', name: 'Historical Volatility', group: 'volatility', badge: null },
    { id: 'chop', name: 'Choppiness Index', group: 'volatility', badge: null },

    { id: 'alligator', name: 'Alligator', group: 'bill_williams', badge: null },
    { id: 'fractals', name: 'Fractals', group: 'bill_williams', badge: null },
    { id: 'gator', name: 'Gator Oscillator', group: 'bill_williams', badge: null },
    { id: 'market_facilitation', name: 'Market Facilitation Index', group: 'bill_williams', badge: null },

    { id: 'pivot', name: 'Pivot Points Standard', group: 'support', badge: null },
    { id: 'pivot_fib', name: 'Pivot Points Fibonacci', group: 'support', badge: null },
    { id: 'envelope', name: 'Envelopes', group: 'support', badge: null },
    { id: 'linear_regression', name: 'Linear Regression Channel', group: 'support', badge: null },

    { id: 'ao', name: 'Accelerator Oscillator', group: 'momentum', badge: null },
    { id: 'ppo', name: 'Price Oscillator', group: 'momentum', badge: null },
    { id: 'trix_momentum', name: 'TRIX Momentum', group: 'momentum', badge: null },
    { id: 'elder_ray', name: 'Elder Ray Index', group: 'momentum', badge: null },
  ];

  const STRATEGY_ITEMS = [
    { id: 'strat_sma_cross', name: 'Moving Average Cross Strategy', badge: null },
    { id: 'strat_rsi_reversal', name: 'RSI Reversal Strategy', badge: null },
    { id: 'strat_macd_signal', name: 'MACD Signal Strategy', badge: null },
    { id: 'strat_bb_breakout', name: 'Bollinger Breakout Strategy', badge: null },
    { id: 'strat_supertrend', name: 'SuperTrend Strategy', badge: 'NEW' },
  ];

  const PROFILE_ITEMS = [
    { id: 'prof_volume', name: 'Volume Profile', badge: null },
    { id: 'prof_session', name: 'Session Volume Profile', badge: null },
    { id: 'prof_tpo', name: 'TPO Profile', badge: 'BETA' },
  ];

  const PATTERN_ITEMS = [
    { id: 'pat_head_shoulders', name: 'Head and Shoulders', badge: null },
    { id: 'pat_double_top', name: 'Double Top / Double Bottom', badge: null },
    { id: 'pat_triangle', name: 'Triangle Patterns', badge: null },
    { id: 'pat_flag', name: 'Flag / Pennant', badge: null },
    { id: 'pat_candlestick', name: 'Candlestick Patterns', badge: null },
  ];

  window.IndicatorsCatalog = {
    sidebar: INDICATOR_SIDEBAR,
    tabs: INDICATOR_TABS,
    technicals: TECHNICAL_INDICATORS,
    strategies: STRATEGY_ITEMS,
    profiles: PROFILE_ITEMS,
    patterns: PATTERN_ITEMS,
    getItemsForTab(tabId, sidebarId) {
      if (sidebarId !== 'technicals') return [];
      if (tabId === 'indicators') return TECHNICAL_INDICATORS;
      if (tabId === 'strategies') return STRATEGY_ITEMS;
      if (tabId === 'profiles') return PROFILE_ITEMS;
      if (tabId === 'patterns') return PATTERN_ITEMS;
      return [];
    },
  };
})();
