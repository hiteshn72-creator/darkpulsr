/**
 * DarkPulsr — Yahoo Finance (browser yfinance equivalent).
 * Works on GitHub Pages via CORS proxies — no TradingView restrictions.
 */
const YahooFeed = {
  CHART_BASE: 'https://query1.finance.yahoo.com/v8/finance/chart/',

  INTERVAL_MAP: {
    '1m':  { interval: '1m',  range: '1d' },
    '5m':  { interval: '5m',  range: '5d' },
    '15m': { interval: '15m', range: '5d' },
    '1h':  { interval: '1h',  range: '1mo' },
    '4h':  { interval: '1h',  range: '3mo' },
    '1d':  { interval: '1d',  range: '1y' },
  },

  _proxyUrls(targetUrl) {
    return [
      `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
      targetUrl,
    ];
  },

  async _fetchJson(url) {
    let lastError = null;

    for (const fetchUrl of this._proxyUrls(url)) {
      try {
        const response = await fetch(fetchUrl, { cache: 'no-store' });
        if (!response.ok) {
          lastError = new Error(`HTTP ${response.status}`);
          continue;
        }
        const payload = await response.json();
        if (payload?.chart?.result?.[0]) return payload;
        lastError = new Error('Empty Yahoo payload');
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(`Yahoo chart unreachable: ${url}`);
  },

  async fetchKlines(yahooSymbol, interval = '1h') {
    const cfg = this.INTERVAL_MAP[interval] || this.INTERVAL_MAP['1h'];
    const url = `${this.CHART_BASE}${encodeURIComponent(yahooSymbol)}?interval=${cfg.interval}&range=${cfg.range}&includePrePost=false`;

    const payload = await this._fetchJson(url);
    const result = payload.chart.result[0];
    const quotes = result.indicators.quote[0];
    const candles = [];

    for (let i = 0; i < result.timestamp.length; i += 1) {
      const open = quotes.open[i];
      const high = quotes.high[i];
      const low = quotes.low[i];
      const close = quotes.close[i];
      if (open == null || high == null || low == null || close == null) continue;

      candles.push({
        time: result.timestamp[i],
        open,
        high,
        low,
        close,
      });
    }

    if (!candles.length) {
      throw new Error(`No candles for ${yahooSymbol}`);
    }

    return candles;
  },
};

window.YahooFeed = YahooFeed;
