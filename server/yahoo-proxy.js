/**
 * Server-side Yahoo Finance fetcher (no CORS restrictions).
 */
const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; DarkPulsr/1.0; +https://github.com/hiteshn72-creator/darkpulsr)',
  Accept: 'application/json',
};

const CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const SEARCH_BASE = 'https://query1.finance.yahoo.com/v1/finance/search';

function classifyYahooFailure(status, payload, symbol) {
  if (status === 429) {
    return {
      httpStatus: 429,
      code: 'RATE_LIMITED',
      message: 'Yahoo Finance rate limit reached. Wait a moment and try again.',
    };
  }

  const chartError = payload?.chart?.error;
  if (chartError) {
    const desc = String(chartError.description || chartError.code || '').toLowerCase();
    if (desc.includes('not found') || desc.includes('delisted') || desc.includes('invalid')) {
      return {
        httpStatus: 404,
        code: 'SYMBOL_NOT_FOUND',
        message: `Symbol not found: ${symbol || 'unknown'}`,
      };
    }
  }

  if (status === 404) {
    return {
      httpStatus: 404,
      code: 'SYMBOL_NOT_FOUND',
      message: `Symbol not found: ${symbol || 'unknown'}`,
    };
  }

  if (status >= 500) {
    return {
      httpStatus: 502,
      code: 'UPSTREAM_ERROR',
      message: 'Yahoo Finance is temporarily unavailable.',
    };
  }

  return {
    httpStatus: status || 502,
    code: 'UPSTREAM_ERROR',
    message: 'Unexpected response from Yahoo Finance.',
  };
}

async function fetchYahooJson(url, { symbol } = {}) {
  let response;

  try {
    response = await fetch(url, {
      headers: YAHOO_HEADERS,
      cache: 'no-store',
    });
  } catch (error) {
    return {
      ok: false,
      httpStatus: 503,
      code: 'NETWORK_ERROR',
      message: 'Could not reach Yahoo Finance from the server.',
      detail: error.message,
    };
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (_) {
    return {
      ok: false,
      httpStatus: 502,
      code: 'INVALID_RESPONSE',
      message: 'Yahoo Finance returned invalid JSON.',
    };
  }

  if (!response.ok) {
    const err = classifyYahooFailure(response.status, payload, symbol);
    return { ok: false, ...err, detail: payload };
  }

  return { ok: true, data: payload };
}

async function fetchChart(symbol, interval = '1h', range = '1mo') {
  const url = `${CHART_BASE}${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}&includePrePost=false`;
  const result = await fetchYahooJson(url, { symbol });

  if (!result.ok) return result;

  const chartResult = result.data?.chart?.result?.[0];
  if (!chartResult) {
    const chartErr = result.data?.chart?.error;
    if (chartErr) {
      const classified = classifyYahooFailure(404, result.data, symbol);
      return { ok: false, ...classified };
    }
    return {
      ok: false,
      httpStatus: 404,
      code: 'SYMBOL_NOT_FOUND',
      message: `No chart data for ${symbol}`,
    };
  }

  return { ok: true, data: result.data };
}

async function searchSymbols(query, quotesCount = 25) {
  const url = `${SEARCH_BASE}?q=${encodeURIComponent(query)}&quotesCount=${quotesCount}&newsCount=0&listsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`;
  const result = await fetchYahooJson(url, { symbol: query });

  if (!result.ok) return result;

  const quotes = result.data?.quotes
    || result.data?.finance?.result?.[0]?.quotes
    || [];

  return { ok: true, data: { quotes } };
}

module.exports = {
  fetchChart,
  searchSymbols,
};
