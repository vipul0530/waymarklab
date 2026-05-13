/* ═══════════════════════════════════════════════
   Trade Recommendations — Multi-Timeframe Edition
   1. For each saved ticker: fetch quote (1 call)
   2. Smart-filter to tickers within 5% of any zone
   3. For those: fetch daily, weekly, 1H, 15min bars (4 calls each)
   4. Aggressive timeframe-based caching
   5. Send everything to Claude → trade table
   ═══════════════════════════════════════════════ */

const AV_KEY = 'QARQRPK3ZWG2ZY4J';
const AV_BASE = 'https://www.alphavantage.co/query';

const CACHE_KEY = 'ota_av_cache_v3';
const TTL = {
  quote:    5  * 60 * 1000,   // 5 min
  intraday15: 15 * 60 * 1000, // 15 min
  intraday60: 60 * 60 * 1000, // 1 hour
  daily:    24 * 60 * 60 * 1000, // 24 hours
  weekly:   24 * 60 * 60 * 1000, // 24 hours
};
const NEAR_ZONE_PCT = 5; // within 5% of nearest zone = "actionable"
const AV_THROTTLE_MS = 13000; // 5 calls/min free tier

let _avCallCount = 0;

async function getRecommendations() {
  const zones = getLatestZones();
  if (!zones || !zones.tickers?.length) {
    showRecsStatus('error', 'No zones saved. Go to Tab 1, paste your screenshot, and save first.');
    return;
  }

  const btn = document.getElementById('getRecsBtn');
  btn.disabled = true;
  btn.innerHTML = 'Working <span class="spinner"></span>';
  _avCallCount = 0;

  try {
    const tickers = zones.tickers.filter(t => t.symbol);

    // ─── Step 1: Get quotes for all tickers (cached) ───
    showRecsStatus('info', `Step 1/3 · Fetching live prices for ${tickers.length} tickers via Alpha Vantage…`);
    const quotes = {};
    for (let i = 0; i < tickers.length; i++) {
      const sym = tickers[i].symbol.toUpperCase();
      try {
        showRecsStatus('info', `Step 1/3 · Quote ${i+1}/${tickers.length}: ${sym} <span class="api-counter">[${_avCallCount} live calls]</span>`);
        quotes[sym] = await cachedFetch('quote', sym, () => fetchQuote(sym));
      } catch (e) {
        quotes[sym] = { error: e.message };
      }
    }

    // ─── Step 2: Filter to "actionable" tickers (price near any zone) ───
    const actionable = filterNearZone(tickers, quotes);
    if (!actionable.length) {
      showRecsStatus('warn', `⚠ No tickers have price within ${NEAR_ZONE_PCT}% of any zone. Nothing to trade right now.`);
      renderRecommendations({
        summary: `No tickers have price within ${NEAR_ZONE_PCT}% of any saved zone.`,
        trades: [],
        passed: tickers.map(t => ({
          ticker: t.symbol,
          reason: quotes[t.symbol]?.error
            ? `AV error: ${quotes[t.symbol].error}`
            : `Current price not within ${NEAR_ZONE_PCT}% of any zone`,
        })),
      }, quotes);
      return;
    }

    // ─── Step 3: Fetch multi-timeframe bars for actionable tickers only ───
    showRecsStatus('info', `Step 2/3 · ${actionable.length} ticker(s) within ${NEAR_ZONE_PCT}% of a zone. Fetching multi-timeframe bars…`);
    const bars = {};
    for (let i = 0; i < actionable.length; i++) {
      const t = actionable[i];
      const sym = t.symbol.toUpperCase();
      // Decide which timeframes are needed based on which row positions are close
      const needed = neededTimeframes(t, quotes[sym].price);
      bars[sym] = {};
      for (const tf of needed) {
        try {
          showRecsStatus('info', `Step 2/3 · ${sym} ${tf} (${i+1}/${actionable.length}) <span class="api-counter">[${_avCallCount} live calls]</span>`);
          bars[sym][tf] = await cachedFetch(tf, sym, () => fetchBars(sym, tf));
        } catch (e) {
          bars[sym][tf] = { error: e.message };
        }
      }
    }

    // ─── Step 4: Send everything to Claude ───
    showRecsStatus('info', `Step 3/3 · 🧠 Claude is analyzing ${actionable.length} actionable setup(s)…`);
    const accountSize = parseFloat(document.getElementById('acctSize').value) || 50000;
    const riskPct     = parseFloat(document.getElementById('riskPctRec').value) || 2;

    const payload = {
      zones: { ...zones, tickers: actionable },     // only send actionable ticker zones
      quotes,
      bars,
      skippedTickers: tickers
        .filter(t => !actionable.find(a => a.symbol === t.symbol))
        .map(t => ({ symbol: t.symbol, reason: quotes[t.symbol]?.error || `>${NEAR_ZONE_PCT}% from any zone` })),
      accountSize,
      riskPct,
    };

    const res = await fetch('/.netlify/functions/recommend-trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Server error' }));
      throw new Error(err.error + (err.detail ? ' — ' + String(err.detail).slice(0, 200) : ''));
    }
    const data = await res.json();
    renderRecommendations(data, quotes);
    showRecsStatus('success', `✓ Done — ${data.trades?.length || 0} trade(s) recommended · ${_avCallCount} live AV calls used`);
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
   FILTERING — only tickers near zones get full data
   ═══════════════════════════════════════════════ */
function filterNearZone(tickers, quotes) {
  return tickers.filter(t => {
    const sym = t.symbol.toUpperCase();
    const q = quotes[sym];
    if (!q || q.error) return false;
    return nearestZonePct(t, q.price) <= NEAR_ZONE_PCT;
  });
}

function nearestZonePct(t, price) {
  let nearest = Infinity;
  ['top','middle','bottom'].forEach(row => {
    [t.supply?.[row]?.proximal, t.demand?.[row]?.proximal].forEach(p => {
      if (p != null) nearest = Math.min(nearest, Math.abs((p - price) / price) * 100);
    });
  });
  return nearest;
}

/* For each ticker, only fetch the timeframes for rows that have a near-by zone.
   - Top SZ / Bot DZ → daily + weekly
   - Mid SZ / Mid DZ → 60min
   - Bot SZ / Top DZ → 15min + 60min
   - Daily always fetched for trend/ATR */
function neededTimeframes(t, price) {
  const tfs = new Set(['daily']); // always need daily for trend/ATR
  ['top','middle','bottom'].forEach(row => {
    const sup = t.supply?.[row]?.proximal;
    const dem = t.demand?.[row]?.proximal;
    const closeSup = sup != null && Math.abs((sup - price) / price) * 100 <= NEAR_ZONE_PCT;
    const closeDem = dem != null && Math.abs((dem - price) / price) * 100 <= NEAR_ZONE_PCT;
    if (!closeSup && !closeDem) return;
    if (row === 'top' && closeSup)  { tfs.add('weekly'); }
    if (row === 'middle')            { tfs.add('intraday60'); }
    if (row === 'bottom' && closeSup) { tfs.add('intraday15'); tfs.add('intraday60'); }
    if (row === 'top' && closeDem)    { tfs.add('intraday15'); tfs.add('intraday60'); }
    if (row === 'bottom' && closeDem) { tfs.add('weekly'); }
  });
  return Array.from(tfs);
}

/* ═══════════════════════════════════════════════
   ALPHA VANTAGE — cache + throttle
   ═══════════════════════════════════════════════ */
function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function saveCache(c) { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); }

async function cachedFetch(kind, symbol, fetchFn) {
  const cache = loadCache();
  const key = `${kind}::${symbol}`;
  const ttl = TTL[kind] || 5 * 60 * 1000;
  const now = Date.now();
  if (cache[key] && (now - cache[key].ts < ttl)) {
    return cache[key].data;
  }
  const data = await throttledCall(fetchFn);
  cache[key] = { ts: now, data };
  saveCache(cache);
  return data;
}

async function throttledCall(fn) {
  const data = await fn();
  _avCallCount++;
  await new Promise(r => setTimeout(r, AV_THROTTLE_MS));
  return data;
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

async function fetchBars(symbol, kind) {
  let url, key;
  if (kind === 'daily')      { url = `${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${AV_KEY}`; key = 'Time Series (Daily)'; }
  else if (kind === 'weekly') { url = `${AV_BASE}?function=TIME_SERIES_WEEKLY&symbol=${symbol}&apikey=${AV_KEY}`; key = 'Weekly Time Series'; }
  else if (kind === 'intraday60') { url = `${AV_BASE}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=60min&outputsize=compact&apikey=${AV_KEY}`; key = 'Time Series (60min)'; }
  else if (kind === 'intraday15') { url = `${AV_BASE}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=15min&outputsize=compact&apikey=${AV_KEY}`; key = 'Time Series (15min)'; }
  else throw new Error(`Unknown kind: ${kind}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data['Note'] || data['Information']) throw new Error('AV rate limit');
  const series = data[key];
  if (!series) return [];

  // Limit bars to keep payload manageable
  const limit = kind === 'weekly' ? 12 : kind === 'daily' ? 30 : 50;
  return Object.entries(series).slice(0, limit).map(([date, b]) => ({
    date,
    open:  parseFloat(b['1. open']),
    high:  parseFloat(b['2. high']),
    low:   parseFloat(b['3. low']),
    close: parseFloat(b['4. close']),
  }));
}

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
