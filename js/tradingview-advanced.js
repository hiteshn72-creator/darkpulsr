/**
 * DarkPulsr — TradingView Advanced Charts Widget (tv.js)
 * Embed-safe defaults only — never NSE/BSE restricted symbols on load.
 */
const TRADINGVIEW_DEFAULT_SYMBOL = 'BINANCE:BTCUSDT';

const TRADINGVIEW_FORBIDDEN_SYMBOLS = [
  'NSE:NIFTY',
  'NSE:BSE',
  'NSE:NSE',
  'BSE:SENSEX',
];

const TRADINGVIEW_WIDGET_CONFIG = {
  autosize: true,
  fullscreen: true,
  symbol: TRADINGVIEW_DEFAULT_SYMBOL,
  interval: '60',
  timezone: 'Asia/Kolkata',
  theme: 'Dark',
  style: '1',
  locale: 'en',
  toolbar_bg: '#050505',
  custom_css_url: './darkpulsr.css',
  allow_symbol_change: true,
  show_popup_button: true,
  withdateranges: true,
  hide_side_toolbar: false,
  save_image: true,
  enable_publishing: false,
  hide_top_toolbar: false,
  hide_legend: false,
  support_host: 'https://www.tradingview.com',
  symbol_search_request_delay: 500,
  enabled_features: ['side_toolbar_in_fullscreen_mode'],
  disabled_features: [
    'use_localstorage_for_settings',
    'save_chart_properties_to_local_storage',
  ],
};

function isForbiddenTradingViewSymbol(symbol) {
  if (!symbol) return false;
  const normalized = String(symbol).toUpperCase().trim();
  if (TRADINGVIEW_FORBIDDEN_SYMBOLS.includes(normalized)) return true;
  return normalized.startsWith('NSE:') || normalized.startsWith('BSE:');
}

function clearTradingViewLocalCache() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && /tradingview|tv\.widget|tvwidget|chart\.properties/i.test(key)) {
        localStorage.removeItem(key);
      }
    }
  } catch (_) {
    /* storage blocked */
  }
}

function initTradingViewAdvancedChart(containerId = 'tradingview-advanced-chart') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[TradingView] Container #${containerId} not found`);
    return null;
  }

  clearTradingViewLocalCache();
  container.innerHTML = '';

  function createWidget() {
    if (typeof TradingView === 'undefined') {
      setTimeout(createWidget, 50);
      return;
    }

    const safeSymbol = isForbiddenTradingViewSymbol(TRADINGVIEW_WIDGET_CONFIG.symbol)
      ? TRADINGVIEW_DEFAULT_SYMBOL
      : TRADINGVIEW_WIDGET_CONFIG.symbol;

    window.tradingViewWidget = new TradingView.widget({
      ...TRADINGVIEW_WIDGET_CONFIG,
      container_id: containerId,
      symbol: safeSymbol,
      theme: 'Dark',
      allow_symbol_change: true,
      hide_side_toolbar: false,
    });
  }

  createWidget();
  return window.tradingViewWidget;
}

window.TRADINGVIEW_DEFAULT_SYMBOL = TRADINGVIEW_DEFAULT_SYMBOL;
window.TRADINGVIEW_WIDGET_CONFIG = TRADINGVIEW_WIDGET_CONFIG;
window.initTradingViewAdvancedChart = initTradingViewAdvancedChart;
