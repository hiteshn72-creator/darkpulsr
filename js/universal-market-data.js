/**
 * DarkPulsr — Universal Market Data API
 * Yahoo Finance (browser yfinance) + Binance live crypto.
 * Supports indices, crypto, commodities, and any Yahoo ticker.
 */
const SYMBOL_CATALOG = {
  BTC: {
    id: 'BTC',
    label: 'BTC/USDT',
    yahoo: 'BTC-USD',
    binance: 'BTCUSDT',
    category: 'crypto',
    live: true,
  },
  ETH: {
    id: 'ETH',
    label: 'ETH/USDT',
    yahoo: 'ETH-USD',
    binance: 'ETHUSDT',
    category: 'crypto',
    live: true,
  },
  NIFTY: {
    id: 'NIFTY',
    label: 'NIFTY 50',
    yahoo: '^NSEI',
    category: 'index',
    live: false,
  },
  SENSEX: {
    id: 'SENSEX',
    label: 'SENSEX',
    yahoo: '^BSESN',
    category: 'index',
    live: false,
  },
  BANKNIFTY: {
    id: 'BANKNIFTY',
    label: 'Bank Nifty',
    yahoo: '^NSEBANK',
    category: 'index',
    live: false,
  },
  NASDAQ: {
    id: 'NASDAQ',
    label: 'NASDAQ Composite',
    yahoo: '^IXIC',
    category: 'index',
    live: false,
  },
  DAX: {
    id: 'DAX',
    label: 'DAX',
    yahoo: '^GDAXI',
    category: 'index',
    live: false,
  },
  NIKKEI: {
    id: 'NIKKEI',
    label: 'Nikkei 225',
    yahoo: '^N225',
    category: 'index',
    live: false,
  },
  HSI: {
    id: 'HSI',
    label: 'Hang Seng',
    yahoo: '^HSI',
    category: 'index',
    live: false,
  },
  FTSE: {
    id: 'FTSE',
    label: 'FTSE 100',
    yahoo: '^FTSE',
    category: 'index',
    live: false,
  },
  CAC40: {
    id: 'CAC40',
    label: 'CAC 40',
    yahoo: '^FCHI',
    category: 'index',
    live: false,
  },
  SHANGHAI: {
    id: 'SHANGHAI',
    label: 'Shanghai Composite',
    yahoo: '000001.SS',
    category: 'index',
    live: false,
  },
  GOLD: {
    id: 'GOLD',
    label: 'Gold Futures',
    yahoo: 'GC=F',
    category: 'commodity',
    live: false,
  },
};

const UniversalMarketData = {
  catalog: SYMBOL_CATALOG,
  dynamic: {},

  /** Resolve button key, catalog id, or raw Yahoo ticker (AAPL, ^GSPC). */
  resolve(key) {
    const normalized = String(key || '').trim();
    if (!normalized) return null;

    const upper = normalized.toUpperCase();
    if (this.catalog[upper]) return this.catalog[upper];
    if (this.dynamic[upper]) return this.dynamic[upper];

    const yahoo = normalized.startsWith('^') ? normalized : normalized.toUpperCase();
    const dynamic = {
      id: upper,
      label: yahoo,
      yahoo,
      category: 'custom',
      live: false,
    };
    this.dynamic[upper] = dynamic;
    return dynamic;
  },

  getConfig(key) {
    return this.resolve(key);
  },

  isLive(key) {
    return !!this.resolve(key)?.live;
  },

  statusLabel(key) {
    const cfg = this.resolve(key);
    if (!cfg) return String(key);
    if (cfg.live) return `${cfg.label} · Live`;
    return `${cfg.label} · Yahoo Finance`;
  },

  async fetchKlines(key, interval = '1h') {
    const cfg = this.resolve(key);
    if (!cfg) throw new Error(`Unknown symbol: ${key}`);

    if (cfg.binance && cfg.category === 'crypto') {
      try {
        return await window.BinanceFeed.fetchKlines(cfg.binance, interval);
      } catch (error) {
        console.warn(`[UniversalMarketData] Binance failed for ${key}`, error);
      }
    }

    return window.YahooFeed.fetchKlines(cfg.yahoo, interval);
  },

  subscribe(key, interval, onCandle) {
    const cfg = this.resolve(key);
    if (!cfg) return null;

    if (cfg.binance && cfg.category === 'crypto') {
      try {
        const connection = window.BinanceFeed.subscribeKlines(cfg.binance, interval, onCandle);
        connection.onerror = () => {
          console.warn(`[UniversalMarketData] Binance WS error for ${key}`);
        };
        return {
          type: 'ws',
          close() {
            connection?.close();
          },
        };
      } catch (error) {
        console.warn(`[UniversalMarketData] Binance WS unavailable for ${key}`, error);
      }
    }

    const poll = async () => {
      try {
        const candles = await window.YahooFeed.fetchKlines(cfg.yahoo, interval);
        const last = candles[candles.length - 1];
        if (last) onCandle(last);
      } catch (error) {
        console.warn('[UniversalMarketData] Yahoo poll failed:', error);
      }
    };

    const timer = setInterval(poll, 60000);
    return {
      type: 'poll',
      close() {
        clearInterval(timer);
      },
    };
  },
};

window.SYMBOL_CATALOG = SYMBOL_CATALOG;
window.UniversalMarketData = UniversalMarketData;
window.MarketData = UniversalMarketData;
