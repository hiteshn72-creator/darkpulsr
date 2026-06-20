/**
 * DarkPulsr — TradingView Advanced Charts Widget (tv.js)
 * Forces BINANCE:BTCUSDT — blocks NSE/BSE restore from saved charts.
 */
const TRADINGVIEW_DEFAULT_SYMBOL = 'BINANCE:BTCUSDT';
const TRADINGVIEW_DEFAULT_INTERVAL = '60';

const TRADINGVIEW_FORBIDDEN_SYMBOLS = [
  'NSE:NIFTY',
  'NSE:BSE',
  'NSE:NSE',
  'BSE:SENSEX',
];

/** Prevents TradingView from loading a saved chart with NSE:NIFTY */
const TRADINGVIEW_NO_SAVE_ADAPTER = {
  getAllCharts() {
    return Promise.resolve([]);
  },
  removeChart() {
    return Promise.resolve();
  },
  saveChart() {
    return Promise.resolve('1');
  },
  getChartContent() {
    return Promise.resolve(null);
  },
  getAllStudyTemplates() {
    return Promise.resolve([]);
  },
  removeStudyTemplate() {
    return Promise.resolve();
  },
  saveStudyTemplate() {
    return Promise.resolve('1');
  },
  getStudyTemplateContent() {
    return Promise.resolve('');
  },
};

const TRADINGVIEW_WIDGET_CONFIG = {
  autosize: true,
  fullscreen: true,
  symbol: TRADINGVIEW_DEFAULT_SYMBOL,
  interval: TRADINGVIEW_DEFAULT_INTERVAL,
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
  save_load_adapter: TRADINGVIEW_NO_SAVE_ADAPTER,
  enabled_features: ['side_toolbar_in_fullscreen_mode'],
  disabled_features: [
    'use_localstorage_for_settings',
    'save_chart_properties_to_local_storage',
    'header_saveload',
    'study_templates',
  ],
  loading_screen: {
    backgroundColor: '#050505',
    foregroundColor: '#FFD700',
  },
};

function isForbiddenTradingViewSymbol(symbol) {
  if (!symbol) return false;
  const normalized = String(symbol).toUpperCase().trim();
  if (TRADINGVIEW_FORBIDDEN_SYMBOLS.includes(normalized)) return true;
  return normalized.startsWith('NSE:') || normalized.startsWith('BSE:');
}

function clearTradingViewStorage() {
  const patterns = [/tradingview/i, /tv\./i, /tvwidget/i, /chart\.properties/i, /nifty/i, /nse:/i];
  try {
    for (const store of [localStorage, sessionStorage]) {
      for (let i = store.length - 1; i >= 0; i -= 1) {
        const key = store.key(i);
        if (key && patterns.some((re) => re.test(key))) {
          store.removeItem(key);
        }
      }
    }
  } catch (_) {
    /* private browsing */
  }
}

function forceSafeSymbol(widget) {
  if (!widget || typeof widget.chart !== 'function') return;

  try {
    const chart = widget.chart();
    if (!chart || typeof chart.setSymbol !== 'function') return;

    chart.setSymbol(TRADINGVIEW_DEFAULT_SYMBOL, TRADINGVIEW_DEFAULT_INTERVAL, () => {
      console.info('[DarkPulsr] Chart symbol locked to', TRADINGVIEW_DEFAULT_SYMBOL);
    });
  } catch (error) {
    console.warn('[DarkPulsr] setSymbol fallback:', error);
  }
}

function initTradingViewAdvancedChart(containerId = 'tradingview-advanced-chart') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[TradingView] Container #${containerId} not found`);
    return null;
  }

  clearTradingViewStorage();
  container.innerHTML = '';

  function createWidget() {
    if (typeof TradingView === 'undefined') {
      setTimeout(createWidget, 50);
      return;
    }

    const widget = new TradingView.widget({
      ...TRADINGVIEW_WIDGET_CONFIG,
      container_id: containerId,
      symbol: TRADINGVIEW_DEFAULT_SYMBOL,
      theme: 'Dark',
      allow_symbol_change: true,
      hide_side_toolbar: false,
    });

    widget.onChartReady(() => {
      forceSafeSymbol(widget);
      setTimeout(() => forceSafeSymbol(widget), 800);
    });

    window.tradingViewWidget = widget;
  }

  createWidget();
  return window.tradingViewWidget;
}

window.TRADINGVIEW_DEFAULT_SYMBOL = TRADINGVIEW_DEFAULT_SYMBOL;
window.TRADINGVIEW_WIDGET_CONFIG = TRADINGVIEW_WIDGET_CONFIG;
window.initTradingViewAdvancedChart = initTradingViewAdvancedChart;
