/**
 * DarkPulsr — TradingView Full Chart Widget (tv.js)
 * Advanced chart with watchlist, drawing tools, indicators, date ranges
 */
(function () {
  const TV_THEMES = {
    dark: {
      theme: 'dark',
      toolbar_bg: '#1e222d',
      backgroundColor: '#131722',
    },
    light: {
      theme: 'light',
      toolbar_bg: '#f1f3f6',
      backgroundColor: '#ffffff',
    },
  };

  /** Catalog key → TradingView symbol */
  const TV_SYMBOL_MAP = {
    BTC: 'BINANCE:BTCUSDT',
    ETH: 'BINANCE:ETHUSDT',
    NIFTY: 'NSE:NIFTY',
    SENSEX: 'BSE:SENSEX',
    BANKNIFTY: 'NSE:BANKNIFTY',
    NIFTYIT: 'NSE:CNXIT',
    INDIAVIX: 'NSE:INDIAVIX',
    SP500: 'SP:SPX',
    DOW: 'DJ:DJI',
    NASDAQ: 'NASDAQ:IXIC',
    RUSSELL: 'RUSSELL:RUT',
    TSX: 'TSX:TSX',
    BOVESPA: 'BMFBOVESPA:IBOV',
    MEXICO: 'BMV:ME',
    DAX: 'XETR:DAX',
    FTSE: 'FTSE:UKX',
    CAC40: 'EURONEXT:PX1',
    EUROSTOXX: 'STOXX:SX5E',
    NIKKEI: 'TVC:NI225',
    HSI: 'HSI:HSI',
    SHANGHAI: 'SSE:000001',
    KOSPI: 'KRX:KOSPI',
    ASX: 'ASX:XJO',
    VIX: 'TVC:VIX',
    GOLD: 'TVC:GOLD',
    SILVER: 'TVC:SILVER',
    CRUDE: 'TVC:USOIL',
    BRENT: 'TVC:UKOIL',
    NATGAS: 'TVC:NATURALGAS',
    EURUSD: 'FX:EURUSD',
    GBPUSD: 'FX:GBPUSD',
    USDJPY: 'FX:USDJPY',
    USDINR: 'FX:USDINR',
  };

  const DEFAULT_WATCHLIST = [
    'NSE:NIFTY',
    'NSE:BANKNIFTY',
    'BSE:SENSEX',
    'NSE:CNXIT',
    'SP:SPX',
    'NASDAQ:IXIC',
    'XETR:DAX',
    'TVC:NI225',
    'BINANCE:BTCUSDT',
    'BINANCE:ETHUSDT',
    'TVC:GOLD',
    'FX:USDINR',
  ];

  function getThemeConfig() {
    const mode = String(window.DARKPULSR_THEME || 'dark').toLowerCase();
    return TV_THEMES[mode] || TV_THEMES.dark;
  }

  function catalogKeyToTvSymbol(key) {
    const normalized = String(key || '').trim().toUpperCase();
    if (TV_SYMBOL_MAP[normalized]) return TV_SYMBOL_MAP[normalized];

    const cfg = window.UniversalMarketData?.resolve(normalized);
    if (!cfg) return normalized;

    if (cfg.binance && cfg.category === 'crypto') {
      return `BINANCE:${cfg.binance}`;
    }

    const ex = String(cfg.exchange || '').toUpperCase();
    const label = String(cfg.shortLabel || cfg.label || normalized).replace(/\s+/g, '');
    if (ex === 'NSE') return `NSE:${label === 'NIFTY' ? 'NIFTY' : label}`;
    if (ex === 'BSE') return `BSE:${label}`;
    if (ex === 'NYSE' || ex === 'NASDAQ') return `${ex}:${label}`;

    return normalized;
  }

  function buildWatchlist(extraKeys) {
    const fromCatalog = (extraKeys || [])
      .map(catalogKeyToTvSymbol)
      .filter(Boolean);
    return [...new Set([...DEFAULT_WATCHLIST, ...fromCatalog])];
  }

  class TradingViewChartEmbed {
    constructor(containerId, options = {}) {
      this.containerId = containerId;
      this.widget = null;
      this.ready = false;
      this.options = options;
    }

    init() {
      if (typeof TradingView === 'undefined') {
        console.error('[TradingView] tv.js not loaded');
        return null;
      }

      const theme = getThemeConfig();
      const container = document.getElementById(this.containerId);
      if (!container) {
        console.error('[TradingView] container not found:', this.containerId);
        return null;
      }

      const symbol = this.options.symbol || catalogKeyToTvSymbol('NIFTY') || 'NSE:NIFTY';
      const interval = this.options.interval || 'D';

      this.widget = new TradingView.widget({
        autosize: true,
        width: '100%',
        height: '100%',
        symbol,
        interval,
        timezone: 'Asia/Kolkata',
        theme: theme.theme,
        style: '1',
        locale: 'en',
        toolbar_bg: theme.toolbar_bg,
        backgroundColor: theme.backgroundColor,
        enable_publishing: false,
        withdateranges: true,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        details: true,
        hotlist: false,
        calendar: false,
        save_image: true,
        watchlist: buildWatchlist(this.options.watchlistKeys),
        studies: this.options.studies || [],
        show_popup_button: true,
        popup_width: '1000',
        popup_height: '650',
        container_id: this.containerId,
        ...(this.options.widgetOverrides || {}),
      });

      this.widget.onChartReady(() => {
        this.ready = true;
        if (typeof this.options.onReady === 'function') {
          this.options.onReady(this.widget);
        }
      });

      window.tvWidget = this.widget;
      window.tvChartEmbed = this;
      return this.widget;
    }

    setSymbol(catalogOrTvSymbol) {
      const tvSymbol = catalogOrTvSymbol.includes(':')
        ? catalogOrTvSymbol
        : catalogKeyToTvSymbol(catalogOrTvSymbol);

      const apply = () => {
        try {
          const chart = this.widget?.chart?.() || this.widget?.activeChart?.();
          if (chart?.setSymbol) {
            chart.setSymbol(tvSymbol);
          }
        } catch (error) {
          console.warn('[TradingView] setSymbol failed', error);
        }
      };

      if (this.ready) apply();
      else this.widget?.onChartReady?.(apply);
    }
  }

  window.TradingViewChartEmbed = TradingViewChartEmbed;
  window.catalogKeyToTvSymbol = catalogKeyToTvSymbol;
  window.getTradingViewTheme = getThemeConfig;
})();
