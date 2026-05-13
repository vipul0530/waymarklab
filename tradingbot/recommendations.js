/* ═══════════════════════════════════════════════
   Trade Recommendations
   Fetches prices via Alpha Vantage, sends to Claude function,
   renders trade table.
   ═══════════════════════════════════════════════ */

const AV_KEY = 'QARQRPK3ZWG2ZY4J';
const AV_BASE = 'https://www.alphavantage.co/query';
const PRICE_CACHE_KEY = 'ota_price_cache_v2';
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getRecommendations() {
  const zones = getLatestZones();
  if (!zones || !zones.tickers?.length) {
    showRecsStatus('error', 'No zones saved. Go to Tab 1, paste your screenshot, and save first.');
    return;
  }

  const btn = document.getElementById('getRecsBtn');
  btn.disabled = true;
  btn.innerHTML = 'Working <span class="spinner"></span>';

  try {
    showRecsStatus('info', `Fetching live prices for ${zones.tickers.length} tickers via Alpha Vantage…`);
    const prices = await fetchAllPrices(zones.tickers);

    showRecsStatus('info', '🧠 Asking Claude to analyze zones + prices and recommend trades…');
    const accountSize = parseFloat(document.getElementById('acctSize').value) || 50000;
    const riskPct     = parseFloat(document.getElementById('riskPctRec').value) || 2;

    const res = await fetch('/.netlify/functions/recommend-trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zones, prices, accountSize, riskPct }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Server error' }));
      throw new Error(err.error + (err.detail ? ' — ' + String(err.detail).slice(0, 200) : ''));
    }
    const data = await res.json();
    renderRecommendations(data, prices);
    showRecsStatus('success', `✓ ${data.trades?.length || 0} trades recommended.`);
  } catch (e) {
    showRecsStatus('error', '⚠ ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🧠 Get Trades from Claude';
  }
}

function showRecsStatus(cls, msg) {
  const el = document.getElementById('recsStatus');
  el.className = 'parse-status ' + cls;
  el.classList.remove('hidden');
  el.innerHTML = msg;
}

/* ═══════════════════════════════════════════════
   ALPHA VANTAGE PRICE FETCHING
   Free tier: 5 calls/min, 25/day. We cache aggressively
   and fetch quote + 30 daily bars per ticker.
   ═══════════════════════════════════════════════ */
async function fetchAllPrices(tickers) {
  const cache = loadPriceCache();
  const now = Date.now();
  const out = {};

  for (let i = 0; i < tickers.length; i++) {
    const t = tickers[i];
    if (!t.symbol) continue;
    const sym = t.symbol.toUpperCase();
    if (cache[sym] && (now - cache[sym].ts < CACHE_TTL_MS)) {
      out[sym] = cache[sym].data;
      continue;
    }
    try {
      showRecsStatus('info', `Fetching ${sym} (${i + 1}/${tickers.length})…`);
      const [quote, daily] = await Promise.all([fetchQuote(sym), fetchDailyBars(sym)]);
      const entry = { quote, daily };
      cache[sym] = { ts: now, data: entry };
      out[sym] = entry;
    } catch (e) {
      out[sym] = { error: e.message };
    }
    // Throttle for AV free tier (5/min = 12s; we use 13s safety)
    if (i < tickers.length - 1) await new Promise(r => setTimeout(r, 13000));
  }
  savePriceCache(cache);
  return out;
}

async function fetchQuote(symbol) {
  const url = `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${AV_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data['Note'] || data['Information']) throw new Error('AV rate limit');
  if (data['Error Message']) throw new Error('Invalid symbol');
  const q = data['Global Quote'];
  if (!q || !q['05. price']) throw new Error('No quote');
  return {
    price:    parseFloat(q['05. price']),
    open:     parseFloat(q['02. open']),
    high:     parseFloat(q['03. high']),
    low:      parseFloat(q['04. low']),
    prev:     parseFloat(q['08. previous close']),
    change:   parseFloat(q['09. change']),
    changePct: q['10. change percent'],
    volume:   parseInt(q['06. volume'], 10),
  };
}

async function fetchDailyBars(symbol) {
  const url = `${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${AV_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const series = data['Time Series (Daily)'];
  if (!series) return [];
  return Object.entries(series).slice(0, 30).map(([date, b]) => ({
    date,
    open:  parseFloat(b['1. open']),
    high:  parseFloat(b['2. high']),
    low:   parseFloat(b['3. low']),
    close: parseFloat(b['4. close']),
    volume: parseInt(b['5. volume'], 10),
  }));
}

function loadPriceCache() {
  try { return JSON.parse(localStorage.getItem(PRICE_CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function savePriceCache(c) { localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(c)); }

/* ═══════════════════════════════════════════════
   RENDER TABLE
   ═══════════════════════════════════════════════ */
function renderRecommendations(data, prices) {
  const el = document.getElementById('recsResult');
  const trades = data.trades || [];

  if (!trades.length) {
    el.innerHTML = `
      <div class="no-trades">
        <h3>${data.summary || 'No qualifying trades right now'}</h3>
        ${data.passed?.length ? `
          <div style="margin-top:14px;">
            <strong>Tickers analyzed but skipped:</strong>
            <ul class="passed-list">
              ${data.passed.map(p => `<li><strong>${p.ticker}:</strong> ${p.reason}</li>`).join('')}
            </ul>
          </div>` : ''}
      </div>`;
    return;
  }

  let html = `
    <div class="recs-summary">
      ${data.summary ? `<div class="summary-text">${data.summary}</div>` : ''}
      <div class="recs-meta">As of ${new Date().toLocaleString()} · ${trades.length} trade${trades.length===1?'':'s'}</div>
    </div>
    <div class="recs-tablewrap">
    <table class="rt">
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Direction</th>
          <th>Structure</th>
          <th>Strikes</th>
          <th>Expiration</th>
          <th>Contracts</th>
          <th>Max Risk</th>
          <th>Target</th>
          <th>R/R</th>
          <th>Entry Trigger</th>
          <th>Stop Trigger</th>
        </tr>
      </thead>
      <tbody>
        ${trades.map(t => `
          <tr>
            <td><strong>${t.ticker}</strong></td>
            <td><span class="dir-pill ${t.direction === 'LONG' ? 'long' : 'short'}">${t.direction === 'LONG' ? '↑ LONG' : '↓ SHORT'}</span></td>
            <td>${t.structure}</td>
            <td><code>${t.strikes}</code></td>
            <td>${t.expiration}</td>
            <td>${t.contracts ?? '—'}</td>
            <td><strong>$${t.maxRisk?.toLocaleString() ?? '—'}</strong></td>
            <td>$${t.target?.toLocaleString() ?? '—'}</td>
            <td><strong>${t.rr || '—'}</strong></td>
            <td>${t.entryTrigger || '—'}</td>
            <td>${t.stopTrigger || '—'}</td>
          </tr>
          <tr class="reasoning-row">
            <td colspan="11"><small><strong>Why:</strong> ${t.reasoning || ''} <em>· ${t.tradeStyle || ''} · ${t.zoneRow || ''} ${t.zoneSide || ''} zone</em></small></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    </div>
    ${data.passed?.length ? `
      <details style="margin-top:18px;">
        <summary style="cursor:pointer; font-weight:600; color:var(--text-muted);">${data.passed.length} ticker${data.passed.length===1?'':'s'} skipped (click to expand)</summary>
        <ul class="passed-list">
          ${data.passed.map(p => `<li><strong>${p.ticker}:</strong> ${p.reason}</li>`).join('')}
        </ul>
      </details>` : ''}
  `;
  el.innerHTML = html;
}
