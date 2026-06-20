const { fetchChart, searchSymbols } = require('../server/yahoo-proxy');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  return res.status(200).json({ ok: true, service: 'darkpulsr-yahoo-proxy' });
};
