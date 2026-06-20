const { fetchChart, searchSymbols } = require('../server/yahoo-proxy');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendError(res, result) {
  return res.status(result.httpStatus || 502).json({
    ok: false,
    error: {
      code: result.code,
      message: result.message,
      detail: result.detail,
    },
  });
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'GET only' } });

  const symbol = String(req.query.symbol || '').trim();
  const interval = String(req.query.interval || '1h').trim();
  const range = String(req.query.range || '1mo').trim();

  if (!symbol) {
    return res.status(400).json({
      ok: false,
      error: { code: 'MISSING_SYMBOL', message: 'Query parameter "symbol" is required.' },
    });
  }

  const result = await fetchChart(symbol, interval, range);
  if (!result.ok) return sendError(res, result);
  return res.status(200).json({ ok: true, data: result.data });
};
