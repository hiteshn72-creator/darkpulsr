/**
 * DarkPulsr — Yahoo Finance client (via backend proxy, no browser CORS).
 */
class YahooFeedError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.name = 'YahooFeedError';
    this.code = code;
    this.status = status;
  }
}

const YahooFeed = {
  INTERVAL_MAP: {
    '1m':  { interval: '1m',  range: '1d' },
    '5m':  { interval: '5m',  range: '5d' },
    '15m': { interval: '15m', range: '5d' },
    '1h':  { interval: '1h',  range: '1mo' },
    '4h':  { interval: '1h',  range: '3mo' },
    '1d':  { interval: '1d',  range: '1y' },
    '1w':  { interval: '1wk', range: '5y' },
  },

  /** Base URL for proxy API. Empty string = same origin (node server.js). */
  get apiBase() {
    const configured = window.DARKPULSR_API_BASE;
    if (configured != null && configured !== '') return String(configured).replace(/\/$/, '');
    return '';
  },

  userMessage(error) {
    if (!(error instanceof YahooFeedError)) {
      return 'Unexpected error loading market data.';
    }

    switch (error.code) {
      case 'SYMBOL_NOT_FOUND':
        return error.message || 'Symbol not found on Yahoo Finance.';
      case 'RATE_LIMITED':
        return 'Yahoo Finance rate limit — wait a few seconds and retry.';
      case 'NETWORK_ERROR':
        return 'Network error — is the DarkPulsr server running? (npm start)';
      case 'PROXY_ERROR':
        return 'Backend proxy unreachable — start server with npm start.';
      case 'MISSING_SYMBOL':
      case 'MISSING_QUERY':
        return error.message;
      case 'UPSTREAM_ERROR':
      case 'INVALID_RESPONSE':
        return error.message || 'Yahoo Finance temporarily unavailable.';
      default:
        return error.message || 'Failed to load Yahoo Finance data.';
    }
  },

  async _fetchProxy(path, params = {}) {
    const qs = new URLSearchParams(params);
    const url = `${this.apiBase}${path}?${qs.toString()}`;

    let response;
    try {
      response = await fetch(url, { cache: 'no-store' });
    } catch (error) {
      throw new YahooFeedError(
        'PROXY_ERROR',
        'Cannot reach DarkPulsr Yahoo proxy. Run npm start locally or set DARKPULSR_API_BASE.',
        0
      );
    }

    let payload;
    try {
      payload = await response.json();
    } catch (_) {
      throw new YahooFeedError(
        'INVALID_RESPONSE',
        response.ok ? 'Proxy returned invalid JSON.' : `Proxy HTTP ${response.status}`,
        response.status
      );
    }

    if (!response.ok || payload?.ok === false) {
      const err = payload?.error || {};
      const code = err.code
        || (response.status === 429 ? 'RATE_LIMITED' : null)
        || (response.status === 404 ? 'SYMBOL_NOT_FOUND' : null)
        || (response.status >= 500 ? 'UPSTREAM_ERROR' : 'PROXY_ERROR');

      throw new YahooFeedError(
        code,
        err.message || `Proxy request failed (HTTP ${response.status})`,
        response.status
      );
    }

    return payload.data;
  },

  async search(query, { quotesCount = 25 } = {}) {
    const q = String(query || '').trim();
    if (!q) return [];

    const data = await this._fetchProxy('/api/yahoo-search', {
      q,
      quotesCount: String(quotesCount),
    });

    return (data?.quotes || []).filter((item) => item?.symbol);
  },

  async fetchKlines(yahooSymbol, interval = '1h') {
    const cfg = this.INTERVAL_MAP[interval] || this.INTERVAL_MAP['1h'];

    const payload = await this._fetchProxy('/api/yahoo-chart', {
      symbol: yahooSymbol,
      interval: cfg.interval,
      range: cfg.range,
    });

    const result = payload?.chart?.result?.[0];
    if (!result) {
      throw new YahooFeedError('SYMBOL_NOT_FOUND', `No chart data for ${yahooSymbol}`, 404);
    }

    const quotes = result.indicators?.quote?.[0];
    if (!quotes || !Array.isArray(result.timestamp)) {
      throw new YahooFeedError('INVALID_RESPONSE', `Invalid candle payload for ${yahooSymbol}`, 502);
    }

    const candles = [];
    for (let i = 0; i < result.timestamp.length; i += 1) {
      const open = quotes.open[i];
      const high = quotes.high[i];
      const low = quotes.low[i];
      const close = quotes.close[i];
      const volume = quotes.volume?.[i];
      if (open == null || high == null || low == null || close == null) continue;

      const candle = {
        time: result.timestamp[i],
        open,
        high,
        low,
        close,
      };
      if (volume != null && Number.isFinite(volume)) candle.volume = volume;
      candles.push(candle);
    }

    if (!candles.length) {
      throw new YahooFeedError('SYMBOL_NOT_FOUND', `No candles for ${yahooSymbol}`, 404);
    }

    return candles;
  },
};

window.YahooFeed = YahooFeed;
window.YahooFeedError = YahooFeedError;
