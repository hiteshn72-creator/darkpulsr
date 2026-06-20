/**
 * DarkPulsr — TradingView Advanced Charts Widget (tv.js)
 */
const TRADINGVIEW_DEFAULT_SYMBOL = 'BINANCE:BTCUSDT';

const TRADINGVIEW_WIDGET_CONFIG = {
  autosize: true,
  fullscreen: true,
  symbol: TRADINGVIEW_DEFAULT_SYMBOL,
  interval: '60',
  timezone: 'Asia/Kolkata',
  theme: 'dark',
  style: '1',
  locale: 'en',
  toolbar_bg: '#050505',
  allow_symbol_change: true,
  show_popup_button: true,
  withdateranges: true,
  hide_side_toolbar: false,
  save_image: true,
  enable_publishing: false,
  hide_top_toolbar: false,
  hide_legend: false,
  support_host: 'https://www.tradingview.com',
};

function initTradingViewAdvancedChart(containerId = 'tradingview-advanced-chart') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[TradingView] Container #${containerId} not found`);
    return null;
  }

  function createWidget() {
    if (typeof TradingView === 'undefined') {
      setTimeout(createWidget, 50);
      return;
    }

    window.tradingViewWidget = new TradingView.widget({
      ...TRADINGVIEW_WIDGET_CONFIG,
      container_id: containerId,
    });
  }

  createWidget();
  return window.tradingViewWidget;
}

window.TRADINGVIEW_WIDGET_CONFIG = TRADINGVIEW_WIDGET_CONFIG;
window.initTradingViewAdvancedChart = initTradingViewAdvancedChart;
