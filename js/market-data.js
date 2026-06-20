/**
 * DarkPulsr — Unified market data router (Binance crypto + Yahoo stocks).
 * No TradingView restrictions; you own the feed.
 */
const DARKPULSR_SYMBOLS = {
  BTC: {
    label: 'BTC/USDT',
    source: 'binance',
    binance: 'BTCUSDT',
    live: true,
  },
  ETH: {
    label: 'ETH/USDT',
    source: 'binance',
    binance: 'ETHUSDT',
    live: true,
  },
  NIFTY: {
    label: 'NIFTY 50',
    source: 'yahoo',
    yahoo: '^NSEI',
    live: false,
  },
  DAX: {
    label: 'DAX',
    source: 'yahoo',
    yahoo: '^GDAXI',
    live: false,
  },
  NIKKEI: {
    label: 'Nikkei 225',
    source: 'yahoo',
    yahoo: '^N225',
    live: false,
  },
  NASDAQ: {
    label: 'NASDAQ',
    source: 'yahoo',
    yahoo: '^IXIC',
    live: false,
  },
  GOLD: {
    label: 'Gold',
    source: 'yahoo',
    yahoo: 'GC=F',
    live: false,
  },
};

const MarketData = {
  symbols: DARKPULSR_SYMBOLS,

  getConfig(key) {
    return DARKPULSR_SYMBOLS[key] || null;
  },

  isLive(key) {
    return !!this.getConfig(key)?.live;
  },

  async fetchKlines(symbolKey, interval = '1h') {
    const cfg = this.getConfig(symbolKey);
    if (!cfg) throw new Error(`Unknown symbol: ${symbolKey}`);

    if (cfg.source === 'binance') {
      return window.BinanceFeed.fetchKlines(cfg.binance, interval);
    }
    return window.YahooFeed.fetchKlines(cfg.yahoo, interval);
  },

  subscribe(symbolKey, interval, onCandle) {
    const cfg = this.getConfig(symbolKey);
    if (!cfg) return null;

    if (cfg.source === 'binance') {
      const connection = window.BinanceFeed.subscribeKlines(cfg.binance, interval, onCandle);
      return {
        type: 'ws',
        connection,
        close() {
          connection?.close();
        },
      };
    }

    const timer = setInterval(async () => {
      try {
        const candles = await window.YahooFeed.fetchKlines(cfg.yahoo, interval);
        const last = candles[candles.length - 1];
        if (last) onCandle(last);
      } catch (error) {
        console.warn('[MarketData] Yahoo poll failed:', error);
      }
    }, 60000);

    return {
      type: 'poll',
      timer,
      close() {
        clearInterval(timer);
      },
    };
  },
};

window.DARKPULSR_SYMBOLS = DARKPULSR_SYMBOLS;
window.MarketData = MarketData;
