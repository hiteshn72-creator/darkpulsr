/**
 * DarkPulsr — Express server
 * Serves static frontend + Yahoo Finance proxy API (fixes browser CORS).
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const { fetchChart, searchSymbols } = require('./server/yahoo-proxy');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

app.use(cors({
  origin: [
    'https://hiteshn72-creator.github.io',
    /^https:\/\/.*\.github\.io$/,
    /^http:\/\/localhost(:\d+)?$/,
  ],
  credentials: false,
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'darkpulsr-yahoo-proxy' });
});

app.get('/api/yahoo-chart', async (req, res) => {
  const symbol = String(req.query.symbol || '').trim();
  const interval = String(req.query.interval || '1h').trim();
  const range = String(req.query.range || '1mo').trim();

  if (!symbol) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'MISSING_SYMBOL',
        message: 'Query parameter "symbol" is required.',
      },
    });
  }

  const result = await fetchChart(symbol, interval, range);

  if (!result.ok) {
    return res.status(result.httpStatus || 502).json({
      ok: false,
      error: {
        code: result.code,
        message: result.message,
        detail: result.detail,
      },
    });
  }

  return res.json({ ok: true, data: result.data });
});

app.get('/api/yahoo-search', async (req, res) => {
  const query = String(req.query.q || req.query.query || '').trim();
  const quotesCount = Math.min(Number(req.query.quotesCount) || 25, 50);

  if (!query) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'MISSING_QUERY',
        message: 'Query parameter "q" is required.',
      },
    });
  }

  const result = await searchSymbols(query, quotesCount);

  if (!result.ok) {
    return res.status(result.httpStatus || 502).json({
      ok: false,
      error: {
        code: result.code,
        message: result.message,
        detail: result.detail,
      },
    });
  }

  return res.json({ ok: true, data: result.data });
});

app.use(express.static(ROOT));

app.get('*', (_req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DarkPulsr running at http://localhost:${PORT}`);
  console.log('Yahoo proxy: /api/yahoo-chart  /api/yahoo-search');
});
