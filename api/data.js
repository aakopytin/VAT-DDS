// Proxy to Aspro Cloud API — server-side pagination
// Env vars: ASPRO_API_KEY
// Domain is passed in request body (sent by Aspro widget POST)

const https = require('https');

const ALLOWED = ['plan_money', 'transaction', 'categories', 'transaction_pls'];

function httpsGet(url) {
  return new Promise(function(resolve, reject) {
    https.get(url, function(resp) {
      let data = '';
      resp.on('data', function(chunk) { data += chunk; });
      resp.on('end', function() {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('JSON parse: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const apiKey = process.env.ASPRO_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'ASPRO_API_KEY not set' }));
  }

  const { domain, entity } = req.body || {};
  if (!domain || !entity) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Missing domain or entity' }));
  }

  if (!ALLOWED.includes(entity)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'entity not allowed' }));
  }

  const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const base = 'https://' + cleanDomain + '/api/v1/module/fin/' + entity + '/list'
    + '?api_key=' + encodeURIComponent(apiKey) + '&count=50';

  try {
    const d0 = await httpsGet(base + '&page=1');
    const firstItems = (d0.response && d0.response.items) || [];
    const total = (d0.response && d0.response.total) || 0;
    const totalPages = Math.ceil(total / 50);

    if (totalPages <= 1) {
      return res.end(JSON.stringify({ items: firstItems }));
    }

    const allItems = [...firstItems];
    for (let page = 2; page <= Math.min(totalPages, 60); page++) {
      const d = await httpsGet(base + '&page=' + page);
      const items = (d.response && d.response.items) || [];
      allItems.push(...items);
    }

    return res.end(JSON.stringify({ items: allItems }));
  } catch (err) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ error: err.message }));
  }
};
