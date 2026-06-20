/**
 * DarkPulsr — Yahoo Finance chart API (browser yfinance equivalent).
 * Uses Yahoo's public chart endpoint; falls back to CORS proxy on GitHub Pages.
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

  async _fetchJson(url) {
    const attempts = [
      () => fetch(url),
      () => fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`),
      () => fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`),
    ];

    for (const attempt of attempts) {
      try {
        const response = await attempt();
        if (response.ok) return response.json();
      } catch (_) {
        /* try next proxy */
      }
    }

    throw new Error(`Yahoo chart unreachable for ${url}`);
  },

  async fetchKlines(yahooSymbol, interval = '1h') {
    const cfg = this.INTERVAL_MAP[interval] || this.INTERVAL_MAP['1h'];
    const url = `${this.CHART_BASE}${encodeURIComponent(yahooSymbol)}?interval=${cfg.interval}&range=${cfg.range}&includePrePost=false`;

    const payload = await this._fetchJson(url);
    const result = payload?.chart?.result?.[0];
    if (!result?.timestamp?.length) {
      throw new Error(`No Yahoo data for ${yahooSymbol}`);
    }

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

    return candles;
  },
};

window.YahooFeed = YahooFeed;
