/**
 * DarkPulsr — Binance public data feed (no API key required).
 * Swap or extend this module for Yahoo Finance, NSE, etc.
 */
const BinanceFeed = {
  REST_BASE: 'https://api.binance.com/api/v3',
  WS_BASE: 'wss://stream.binance.com:9443/ws',

  async fetchKlines(symbol, interval = '1h', limit = 500) {
    const url = `${this.REST_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance klines failed: ${response.status}`);
    }

    const rows = await response.json();
    return rows.map((row) => ({
      time: Math.floor(row[0] / 1000),
      open: parseFloat(row[1]),
      high: parseFloat(row[2]),
      low: parseFloat(row[3]),
      close: parseFloat(row[4]),
    }));
  },

  subscribeKlines(symbol, interval, onCandle) {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    const ws = new WebSocket(`${this.WS_BASE}/${stream}`);

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      const k = payload.k;
      if (!k) return;

      onCandle({
        time: Math.floor(k.t / 1000),
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
      });
    };

    return ws;
  },
};

window.BinanceFeed = BinanceFeed;
