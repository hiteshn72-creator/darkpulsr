const { searchSymbols } = require('../server/yahoo-proxy');

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

  const query = String(req.query.q || req.query.query || '').trim();
  const quotesCount = Math.min(Number(req.query.quotesCount) || 25, 50);

  if (!query) {
    return res.status(400).json({
      ok: false,
      error: { code: 'MISSING_QUERY', message: 'Query parameter "q" is required.' },
    });
  }

  const result = await searchSymbols(query, quotesCount);
  if (!result.ok) return sendError(res, result);
  return res.status(200).json({ ok: true, data: result.data });
};
