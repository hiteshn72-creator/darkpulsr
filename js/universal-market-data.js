/**
 * DarkPulsr — Universal Market Data API
 * Yahoo Finance (via Render proxy) + Binance live crypto.
 */
const SYMBOL_CATALOG = {
  // ── Crypto ──
  BTC: { id: 'BTC', label: 'BTC/USDT', shortLabel: 'BTC', yahoo: 'BTC-USD', binance: 'BTCUSDT', category: 'crypto', exchange: 'Crypto', live: true },
  ETH: { id: 'ETH', label: 'ETH/USDT', shortLabel: 'ETH', yahoo: 'ETH-USD', binance: 'ETHUSDT', category: 'crypto', exchange: 'Crypto', live: true },

  // ── India ──
  NIFTY: { id: 'NIFTY', label: 'NIFTY 50', shortLabel: 'NIFTY', yahoo: '^NSEI', category: 'index', exchange: 'NSE' },
  SENSEX: { id: 'SENSEX', label: 'BSE Sensex', shortLabel: 'SENSEX', yahoo: '^BSESN', category: 'index', exchange: 'BSE' },
  BANKNIFTY: { id: 'BANKNIFTY', label: 'Bank Nifty', shortLabel: 'BNIFTY', yahoo: '^NSEBANK', category: 'index', exchange: 'NSE' },
  NIFTYIT: { id: 'NIFTYIT', label: 'NIFTY IT', shortLabel: 'NIFTY IT', yahoo: '^CNXIT', category: 'index', exchange: 'NSE' },
  INDIAVIX: { id: 'INDIAVIX', label: 'India VIX', shortLabel: 'IN VIX', yahoo: '^INDIAVIX', category: 'index', exchange: 'NSE' },

  // ── Americas ──
  SP500: { id: 'SP500', label: 'S&P 500', shortLabel: 'S&P 500', yahoo: '^GSPC', category: 'index', exchange: 'NYSE' },
  DOW: { id: 'DOW', label: 'Dow Jones', shortLabel: 'DOW', yahoo: '^DJI', category: 'index', exchange: 'NYSE' },
  NASDAQ: { id: 'NASDAQ', label: 'NASDAQ Composite', shortLabel: 'NASDAQ', yahoo: '^IXIC', category: 'index', exchange: 'NASDAQ' },
  RUSSELL: { id: 'RUSSELL', label: 'Russell 2000', shortLabel: 'RUSSELL', yahoo: '^RUT', category: 'index', exchange: 'NYSE' },
  TSX: { id: 'TSX', label: 'S&P/TSX Composite', shortLabel: 'TSX', yahoo: '^GSPTSE', category: 'index', exchange: 'TSX' },
  BOVESPA: { id: 'BOVESPA', label: 'Bovespa', shortLabel: 'BOVESPA', yahoo: '^BVSP', category: 'index', exchange: 'B3' },
  MEXICO: { id: 'MEXICO', label: 'IPC Mexico', shortLabel: 'IPC', yahoo: '^MXX', category: 'index', exchange: 'BMV' },

  // ── Europe ──
  DAX: { id: 'DAX', label: 'DAX', shortLabel: 'DAX', yahoo: '^GDAXI', category: 'index', exchange: 'XETRA' },
  FTSE: { id: 'FTSE', label: 'FTSE 100', shortLabel: 'FTSE', yahoo: '^FTSE', category: 'index', exchange: 'LSE' },
  CAC40: { id: 'CAC40', label: 'CAC 40', shortLabel: 'CAC 40', yahoo: '^FCHI', category: 'index', exchange: 'EURONEXT' },
  EUROSTOXX: { id: 'EUROSTOXX', label: 'EURO STOXX 50', shortLabel: 'STOXX50', yahoo: '^STOXX50E', category: 'index', exchange: 'EURONEXT' },
  SMI: { id: 'SMI', label: 'Swiss Market Index', shortLabel: 'SMI', yahoo: '^SSMI', category: 'index', exchange: 'SIX' },
  IBEX: { id: 'IBEX', label: 'IBEX 35', shortLabel: 'IBEX', yahoo: '^IBEX', category: 'index', exchange: 'BME' },
  FTSEMIB: { id: 'FTSEMIB', label: 'FTSE MIB', shortLabel: 'MIB', yahoo: 'FTSEMIB.MI', category: 'index', exchange: 'BIT' },
  AEX: { id: 'AEX', label: 'AEX Index', shortLabel: 'AEX', yahoo: '^AEX', category: 'index', exchange: 'EURONEXT' },

  // ── Asia-Pacific ──
  NIKKEI: { id: 'NIKKEI', label: 'Nikkei 225', shortLabel: 'NIKKEI', yahoo: '^N225', category: 'index', exchange: 'TSE' },
  HSI: { id: 'HSI', label: 'Hang Seng', shortLabel: 'HSI', yahoo: '^HSI', category: 'index', exchange: 'HKEX' },
  SHANGHAI: { id: 'SHANGHAI', label: 'Shanghai Composite', shortLabel: 'SHANGHAI', yahoo: '000001.SS', category: 'index', exchange: 'SSE' },
  SHENZHEN: { id: 'SHENZHEN', label: 'Shenzhen Component', shortLabel: 'SZSE', yahoo: '399001.SZ', category: 'index', exchange: 'SZSE' },
  KOSPI: { id: 'KOSPI', label: 'KOSPI', shortLabel: 'KOSPI', yahoo: '^KS11', category: 'index', exchange: 'KRX' },
  ASX: { id: 'ASX', label: 'ASX 200', shortLabel: 'ASX', yahoo: '^AXJO', category: 'index', exchange: 'ASX' },
  TAIWAN: { id: 'TAIWAN', label: 'Taiwan Weighted', shortLabel: 'TAIWAN', yahoo: '^TWII', category: 'index', exchange: 'TWSE' },
  STI: { id: 'STI', label: 'Straits Times', shortLabel: 'STI', yahoo: '^STI', category: 'index', exchange: 'SGX' },
  JAKARTA: { id: 'JAKARTA', label: 'Jakarta Composite', shortLabel: 'JKSE', yahoo: '^JKSE', category: 'index', exchange: 'IDX' },

  // ── Volatility ──
  VIX: { id: 'VIX', label: 'CBOE VIX', shortLabel: 'VIX', yahoo: '^VIX', category: 'index', exchange: 'CBOE' },

  // ── Commodities ──
  GOLD: { id: 'GOLD', label: 'Gold Futures', shortLabel: 'GOLD', yahoo: 'GC=F', category: 'commodity', exchange: 'COMEX' },
  SILVER: { id: 'SILVER', label: 'Silver Futures', shortLabel: 'SILVER', yahoo: 'SI=F', category: 'commodity', exchange: 'COMEX' },
  PLATINUM: { id: 'PLATINUM', label: 'Platinum Futures', shortLabel: 'PLAT', yahoo: 'PL=F', category: 'commodity', exchange: 'NYMEX' },
  PALLADIUM: { id: 'PALLADIUM', label: 'Palladium Futures', shortLabel: 'PALL', yahoo: 'PA=F', category: 'commodity', exchange: 'NYMEX' },
  CRUDE: { id: 'CRUDE', label: 'WTI Crude Oil', shortLabel: 'CRUDE', yahoo: 'CL=F', category: 'commodity', exchange: 'NYMEX' },
  BRENT: { id: 'BRENT', label: 'Brent Crude Oil', shortLabel: 'BRENT', yahoo: 'BZ=F', category: 'commodity', exchange: 'ICE' },
  NATGAS: { id: 'NATGAS', label: 'Natural Gas', shortLabel: 'NAT GAS', yahoo: 'NG=F', category: 'commodity', exchange: 'NYMEX' },
  GASOLINE: { id: 'GASOLINE', label: 'RBOB Gasoline', shortLabel: 'GASOLINE', yahoo: 'RB=F', category: 'commodity', exchange: 'NYMEX' },
  HEATINGOIL: { id: 'HEATINGOIL', label: 'Heating Oil', shortLabel: 'H.OIL', yahoo: 'HO=F', category: 'commodity', exchange: 'NYMEX' },
  COPPER: { id: 'COPPER', label: 'Copper Futures', shortLabel: 'COPPER', yahoo: 'HG=F', category: 'commodity', exchange: 'COMEX' },
  WHEAT: { id: 'WHEAT', label: 'Wheat Futures', shortLabel: 'WHEAT', yahoo: 'ZW=F', category: 'commodity', exchange: 'CBOT' },
  CORN: { id: 'CORN', label: 'Corn Futures', shortLabel: 'CORN', yahoo: 'ZC=F', category: 'commodity', exchange: 'CBOT' },
  SOYBEAN: { id: 'SOYBEAN', label: 'Soybean Futures', shortLabel: 'SOYBEAN', yahoo: 'ZS=F', category: 'commodity', exchange: 'CBOT' },
  SUGAR: { id: 'SUGAR', label: 'Sugar #11', shortLabel: 'SUGAR', yahoo: 'SB=F', category: 'commodity', exchange: 'ICE' },
  COFFEE: { id: 'COFFEE', label: 'Coffee Arabica', shortLabel: 'COFFEE', yahoo: 'KC=F', category: 'commodity', exchange: 'ICE' },
  COTTON: { id: 'COTTON', label: 'Cotton #2', shortLabel: 'COTTON', yahoo: 'CT=F', category: 'commodity', exchange: 'ICE' },
  COCOA: { id: 'COCOA', label: 'Cocoa Futures', shortLabel: 'COCOA', yahoo: 'CC=F', category: 'commodity', exchange: 'ICE' },

  // ── Forex ──
  EURUSD: { id: 'EURUSD', label: 'EUR/USD', shortLabel: 'EURUSD', yahoo: 'EURUSD=X', category: 'forex', exchange: 'Forex' },
  GBPUSD: { id: 'GBPUSD', label: 'GBP/USD', shortLabel: 'GBPUSD', yahoo: 'GBPUSD=X', category: 'forex', exchange: 'Forex' },
  USDJPY: { id: 'USDJPY', label: 'USD/JPY', shortLabel: 'USDJPY', yahoo: 'USDJPY=X', category: 'forex', exchange: 'Forex' },
  USDINR: { id: 'USDINR', label: 'USD/INR', shortLabel: 'USDINR', yahoo: 'USDINR=X', category: 'forex', exchange: 'Forex' },
  EURINR: { id: 'EURINR', label: 'EUR/INR', shortLabel: 'EURINR', yahoo: 'EURINR=X', category: 'forex', exchange: 'Forex' },
  AUDUSD: { id: 'AUDUSD', label: 'AUD/USD', shortLabel: 'AUDUSD', yahoo: 'AUDUSD=X', category: 'forex', exchange: 'Forex' },
  USDCAD: { id: 'USDCAD', label: 'USD/CAD', shortLabel: 'USDCAD', yahoo: 'USDCAD=X', category: 'forex', exchange: 'Forex' },
  USDCHF: { id: 'USDCHF', label: 'USD/CHF', shortLabel: 'USDCHF', yahoo: 'USDCHF=X', category: 'forex', exchange: 'Forex' },
  NZDUSD: { id: 'NZDUSD', label: 'NZD/USD', shortLabel: 'NZDUSD', yahoo: 'NZDUSD=X', category: 'forex', exchange: 'Forex' },
  USDCNH: { id: 'USDCNH', label: 'USD/CNH', shortLabel: 'USDCNH', yahoo: 'USDCNH=X', category: 'forex', exchange: 'Forex' },
  GBPINR: { id: 'GBPINR', label: 'GBP/INR', shortLabel: 'GBPINR', yahoo: 'GBPINR=X', category: 'forex', exchange: 'Forex' },
};

const TOOLBAR_GROUPS = [
  { label: 'Crypto', keys: ['BTC', 'ETH'] },
  { label: 'India', keys: ['NIFTY', 'SENSEX', 'BANKNIFTY', 'NIFTYIT', 'INDIAVIX'] },
  { label: 'Americas', keys: ['SP500', 'DOW', 'NASDAQ', 'RUSSELL', 'TSX', 'BOVESPA', 'MEXICO'] },
  { label: 'Europe', keys: ['DAX', 'FTSE', 'CAC40', 'EUROSTOXX', 'SMI', 'IBEX', 'FTSEMIB', 'AEX'] },
  { label: 'Asia', keys: ['NIKKEI', 'HSI', 'SHANGHAI', 'SHENZHEN', 'KOSPI', 'ASX', 'TAIWAN', 'STI', 'JAKARTA'] },
  { label: 'Volatility', keys: ['VIX'] },
  { label: 'Commodities', keys: ['GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM', 'CRUDE', 'BRENT', 'NATGAS', 'GASOLINE', 'HEATINGOIL', 'COPPER', 'WHEAT', 'CORN', 'SOYBEAN', 'SUGAR', 'COFFEE', 'COTTON', 'COCOA'] },
  { label: 'Forex', keys: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDINR', 'EURINR', 'GBPINR', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'USDCNH'] },
];

const UniversalMarketData = {
  catalog: SYMBOL_CATALOG,
  toolbarGroups: TOOLBAR_GROUPS,
  dynamic: {},

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
      shortLabel: upper,
      yahoo,
      category: 'custom',
      exchange: 'Yahoo',
      live: false,
    };
    this.dynamic[upper] = dynamic;
    return dynamic;
  },

  getConfig(key) {
    return this.resolve(key);
  },

  registerDynamic(entry) {
    const id = String(entry.id || entry.yahoo || '').trim().toUpperCase();
    if (!id) return null;

    const config = {
      id,
      label: entry.label || id,
      shortLabel: entry.shortLabel || id,
      yahoo: entry.yahoo || id,
      category: entry.category || 'custom',
      exchange: entry.exchange || 'Yahoo',
      live: !!entry.live,
      ...(entry.binance ? { binance: entry.binance } : {}),
      ...(entry.icon ? { icon: entry.icon } : {}),
    };

    this.dynamic[id] = config;
    return config;
  },

  renderToolbar(mountEl, onSelect, { activeKey = 'BTC' } = {}) {
    if (!mountEl) return;

    mountEl.innerHTML = TOOLBAR_GROUPS.map((group, groupIndex) => {
      const margin = groupIndex > 0 ? ' style="margin-left: 10px;"' : '';
      const buttons = group.keys
        .filter((key) => this.catalog[key])
        .map((key) => {
          const cfg = this.catalog[key];
          const active = key === activeKey ? ' active' : '';
          const title = cfg.label || key;
          return `<button type="button" class="symbol-btn${active}" data-symbol="${key}" title="${title}">${cfg.shortLabel || key}</button>`;
        })
        .join('');

      return `<span class="panel-label"${margin}>${group.label}</span>${buttons}`;
    }).join('');

    mountEl.querySelectorAll('.symbol-btn').forEach((btn) => {
      btn.addEventListener('click', () => onSelect(btn.dataset.symbol));
    });
  },

  setActiveToolbarSymbol(symbolKey) {
    document.querySelectorAll('.symbol-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.symbol === symbolKey);
    });
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
window.TOOLBAR_GROUPS = TOOLBAR_GROUPS;
window.UniversalMarketData = UniversalMarketData;
window.MarketData = UniversalMarketData;
