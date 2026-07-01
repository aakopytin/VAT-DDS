// Proxy to Aspro Cloud API — server-side pagination
// Env vars: ASPRO_API_KEY
// Domain is passed in request body (sent by client JS as JSON POST)

const https = require('https');

const ALLOWED = ['plan_money', 'transaction', 'categories', 'transaction_pls'];
const PAGE_SIZE = 100;

function readJsonBody(req) {
  return new Promise(function(resolve) {
    var d = '';
    req.on('data', function(c) { d += c.toString(); });
    req.on('end', function() {
      try { resolve(JSON.parse(d)); }
      catch(e) { resolve({}); }
    });
    req.on('error', function() { resolve({}); });
  });
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

  // GET diagnostic: /api/data?_test=1&domain=2cec.aspro.cloud
  if (req.method === 'GET') {
    const qs = new URLSearchParams((req.url || '').split('?')[1] || '');
    const apiKey = process.env.ASPRO_API_KEY;
    const result = { keySet: !!apiKey, keyLen: apiKey ? apiKey.length : 0 };
    const domain = qs.get('domain') || '';
    if (domain) {
      if (domain) {
        const testUrl = 'https://' + domain + '/api/v1/module/fin/categories/list?api_key=' + encodeURIComponent(apiKey || '') + '&limit=5&page=1';
        result.testUrl = testUrl.replace(encodeURIComponent(apiKey || ''), '[KEY]');
        try {
          const d = await httpsGet(testUrl);
          result.asproStatus = 'ok';
          result.total = d.response && d.response.total;
          result.itemsOnPage1 = d.response && d.response.items && d.response.items.length;
          result.rawKeys = d ? Object.keys(d) : [];
        } catch(e) {
          result.asproStatus = 'error';
          result.asproError = e.message;
        }
      }
    }
    return res.end(JSON.stringify(result));
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const apiKey = process.env.ASPRO_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'ASPRO_API_KEY not set' }));
  }

  // Read body manually — req.body is not auto-parsed in plain Vercel functions
  const body = await readJsonBody(req);
  const domain = body.domain;
  const entity = body.entity;

  if (!domain || !entity) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Missing domain or entity', got: { domain: !!domain, entity: !!entity } }));
  }

  if (!ALLOWED.includes(entity)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'entity not allowed' }));
  }

  const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const base = 'https://' + cleanDomain + '/api/v1/module/fin/' + entity + '/list'
    + '?api_key=' + encodeURIComponent(apiKey) + '&limit=' + PAGE_SIZE;

  try {
    const d0 = await httpsGet(base + '&page=1');
    const firstItems = (d0.response && d0.response.items) || [];
    const total = (d0.response && d0.response.total) || 0;

    if (firstItems.length === 0 || total <= PAGE_SIZE) {
      return res.end(JSON.stringify({ items: firstItems, total: total }));
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const allItems = [...firstItems];

    for (let page = 2; page <= Math.min(totalPages, 60); page++) {
      const d = await httpsGet(base + '&page=' + page);
      const items = (d.response && d.response.items) || [];
      if (items.length === 0) break;
      allItems.push(...items);
    }

    return res.end(JSON.stringify({ items: allItems, total: total }));
  } catch (err) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ error: err.message }));
  }
};
