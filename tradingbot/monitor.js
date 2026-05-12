/* ═══════════════════════════════════════════════
   Live Monitor — Polls Alpha Vantage, ranks by distance to zone
   ═══════════════════════════════════════════════ */

const PRICE_CACHE_KEY = 'ota_price_cache_v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

function renderMonitor() {
  const zones = getLatestZones();
  const wrap = document.getElementById('monitorTable');
  if (!zones || !zones.tickers?.length) {
    wrap.innerHTML = '<p class="muted">Save zones in Tab 1 first, then return here.</p>';
    return;
  }
  // Render structure with cached prices if available
  const cache = loadPriceCache();
  const rows = buildMonitorRows(zones.tickers, cache);
  wrap.innerHTML = renderMonitorTable(rows, zones.extractedDate);
}

async function refreshMonitor() {
  const zones = getLatestZones();
  if (!zones || !zones.tickers?.length) return;
  const btn = document.getElementById('refreshBtn');
  btn.disabled = true;
  btn.innerHTML = 'Fetching <span class="spinner"></span>';
  const alertEl = document.getElementById('monitorAlert');
  alertEl.classList.add('hidden');

  const cache = loadPriceCache();
  const now = Date.now();
  const tickers = zones.tickers.filter(t => t.symbol);
  let errors = [];
  let fetched = 0;

  for (const t of tickers) {
    const sym = t.symbol.toUpperCase();
    if (cache[sym] && (now - cache[sym].ts < CACHE_TTL_MS)) continue;
    try {
      const q = await fetchQuote(sym);
      cache[sym] = { price: q.price, ts: now, change: q.change, changePct: q.changePct };
      fetched++;
    } catch (e) {
      errors.push(`${sym}: ${e.message}`);
    }
    // throttle ~5/min to respect Alpha Vantage free tier
    await new Promise(r => setTimeout(r, 13000));
  }

  savePriceCache(cache);
  btn.disabled = false;
  btn.innerHTML = '↻ Refresh Prices';

  if (errors.length) {
    alertEl.classList.remove('hidden');
    alertEl.className = 'alert warn';
    alertEl.innerHTML = `Fetched ${fetched}/${tickers.length}. Issues: ${errors.slice(0,3).join(' · ')}`;
  }
  renderMonitor();
}

function loadPriceCache() {
  try { return JSON.parse(localStorage.getItem(PRICE_CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function savePriceCache(c) { localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(c)); }

/* ── BUILD ROWS ── */
function buildMonitorRows(tickers, cache) {
  const rows = [];
  for (const t of tickers) {
    if (!t.symbol) continue;
    const sym = t.symbol.toUpperCase();
    const cached = cache[sym];
    const livePrice = cached?.price ?? null;
    const refPrice = livePrice ?? avgCP(t);
    if (!refPrice) continue;

    // Find nearest zones
    const setups = [];
    ['top','middle','bottom'].forEach(row => {
      const sup = t.supply?.[row];
      if (sup?.proximal != null) {
        const dist = sup.proximal - refPrice;
        const distPct = (dist / refPrice) * 100;
        setups.push({
          symbol: sym, side: 'supply', row,
          proximal: sup.proximal, distal: sup.distal,
          distance: dist, distancePct: distPct,
          ...ROW_TRADE_MAP.supply[row],
        });
      }
      const dem = t.demand?.[row];
      if (dem?.proximal != null) {
        const dist = refPrice - dem.proximal;
        const distPct = (dist / refPrice) * 100;
        setups.push({
          symbol: sym, side: 'demand', row,
          proximal: dem.proximal, distal: dem.distal,
          distance: dist, distancePct: distPct,
          ...ROW_TRADE_MAP.demand[row],
        });
      }
    });

    // Closest zone above and below
    const upSetups = setups.filter(s => s.side === 'supply' && s.distance > 0).sort((a,b) => a.distance - b.distance);
    const dnSetups = setups.filter(s => s.side === 'demand' && s.distance > 0).sort((a,b) => a.distance - b.distance);

    rows.push({
      symbol: sym,
      livePrice, cached,
      nearestUp: upSetups[0] || null,
      nearestDn: dnSetups[0] || null,
      allSetups: setups,
      ticker: t,
    });
  }
  // Sort by closest zone-distance overall
  rows.sort((a, b) => {
    const aMin = Math.min(a.nearestUp?.distancePct ?? Infinity, a.nearestDn?.distancePct ?? Infinity);
    const bMin = Math.min(b.nearestUp?.distancePct ?? Infinity, b.nearestDn?.distancePct ?? Infinity);
    return aMin - bMin;
  });
  return rows;
}

function avgCP(t) {
  if (t.currentPriceHigh && t.currentPriceLow) return (t.currentPriceHigh + t.currentPriceLow) / 2;
  return t.currentPriceHigh || t.currentPriceLow || null;
}

/* ── RENDER TABLE ── */
function renderMonitorTable(rows, date) {
  if (!rows.length) return '<p class="muted">No tickers to monitor.</p>';

  return `
    <div class="monitor-meta">Zones from: <strong>${date}</strong> · Click any row to load into Trade Setup →</div>
    <div class="monitor-tablewrap">
    <table class="mt">
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Price</th>
          <th>Updated</th>
          <th class="sup">Nearest Supply (↑)</th>
          <th>Dist</th>
          <th class="dem">Nearest Demand (↓)</th>
          <th>Dist</th>
          <th>All Setups</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => renderMonitorRow(r)).join('')}
      </tbody>
    </table>
    </div>
  `;
}

function renderMonitorRow(r) {
  const priceCell = r.livePrice
    ? `<strong>$${r.livePrice.toFixed(2)}</strong> ${r.cached?.change >= 0 ? '<span class="up">▲</span>' : '<span class="dn">▼</span>'} <small>${r.cached?.changePct || ''}</small>`
    : '<span class="muted">— (refresh)</span>';

  const updated = r.cached?.ts ? new Date(r.cached.ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—';

  const supCell = r.nearestUp
    ? `<div class="setup-pill sup ${highlightClass(r.nearestUp)}" onclick='loadToSetup(${JSON.stringify(r.nearestUp).replace(/'/g,"&apos;")})'>
         <strong>${r.nearestUp.row} SZ</strong> · ${r.nearestUp.proximal.toFixed(2)}
         <small>${r.nearestUp.style}</small>
       </div>`
    : '<span class="muted">—</span>';

  const supDist = r.nearestUp ? `<span class="${distClass(r.nearestUp.distancePct)}">${r.nearestUp.distancePct.toFixed(2)}%</span>` : '—';

  const demCell = r.nearestDn
    ? `<div class="setup-pill dem ${highlightClass(r.nearestDn)}" onclick='loadToSetup(${JSON.stringify(r.nearestDn).replace(/'/g,"&apos;")})'>
         <strong>${r.nearestDn.row} DZ</strong> · ${r.nearestDn.proximal.toFixed(2)}
         <small>${r.nearestDn.style}</small>
       </div>`
    : '<span class="muted">—</span>';

  const demDist = r.nearestDn ? `<span class="${distClass(r.nearestDn.distancePct)}">${r.nearestDn.distancePct.toFixed(2)}%</span>` : '—';

  const allCount = r.allSetups.length;

  return `<tr>
    <td><strong>${r.symbol}</strong></td>
    <td>${priceCell}</td>
    <td><small>${updated}</small></td>
    <td>${supCell}</td>
    <td>${supDist}</td>
    <td>${demCell}</td>
    <td>${demDist}</td>
    <td><small>${allCount} zones</small></td>
  </tr>`;
}

function distClass(pct) {
  if (pct < 1) return 'dist-hot';
  if (pct < 3) return 'dist-warm';
  return 'dist-cold';
}
function highlightClass(setup) {
  if (setup.distancePct < 1) return 'hot';
  if (setup.distancePct < 3) return 'warm';
  return '';
}

/* ── LOAD TO SETUP TAB ── */
function loadToSetup(setup) {
  switchTab('setup');
  const direction = setup.direction;
  const stop = setup.side === 'supply' ? setup.distal : setup.distal;
  const stopSize = Math.abs(setup.proximal - setup.distal);

  // Pre-fill Trade Setup card
  const header = document.getElementById('setupHeader');
  const content = document.getElementById('setupContent');
  content.classList.remove('hidden');

  header.innerHTML = `
    <div class="setup-card">
      <div class="setup-card-row">
        <div><span class="data-label">Ticker</span><div class="data-value neutral">${setup.symbol}</div></div>
        <div><span class="data-label">Direction</span><div class="data-value ${direction === 'LONG' ? 'up' : 'down'}">${direction === 'LONG' ? '↑ LONG' : '↓ SHORT'}</div></div>
        <div><span class="data-label">Zone Type</span><div class="data-value">${setup.row.toUpperCase()} ${setup.side === 'supply' ? 'SUPPLY' : 'DEMAND'}</div></div>
        <div><span class="data-label">Trade Style</span><div class="data-value" style="font-size:14px">${setup.style}</div></div>
        <div><span class="data-label">Chart TF</span><div class="data-value" style="font-size:14px">${setup.timeframe}</div></div>
        <div><span class="data-label">Hold</span><div class="data-value" style="font-size:14px">${setup.hold}</div></div>
        <div><span class="data-label">Expiration</span><div class="data-value" style="font-size:14px">${setup.expiration}</div></div>
      </div>
      <div class="setup-card-row">
        <div><span class="data-label">Entry (Proximal)</span><div class="data-value neutral">$${setup.proximal.toFixed(2)}</div></div>
        <div><span class="data-label">Stop (Beyond Distal)</span><div class="data-value down">$${setup.distal.toFixed(2)}</div></div>
        <div><span class="data-label">Stop Size</span><div class="data-value">$${stopSize.toFixed(2)}</div></div>
        <div><span class="data-label">Distance to Price</span><div class="data-value">${setup.distancePct.toFixed(2)}%</div></div>
      </div>
    </div>
  `;

  // Pre-fill sizing inputs
  document.getElementById('entryPrice').value = setup.proximal.toFixed(2);
  document.getElementById('stopSize').value   = stopSize.toFixed(2);
  // Suggest target ~3x stop for opposite side
  const target = setup.side === 'supply'
    ? setup.proximal - stopSize * 3
    : setup.proximal + stopSize * 3;
  document.getElementById('targetPrice').value = target.toFixed(2);

  // Auto-select Demand/Supply on Core Strategy
  const zoneSide = setup.side === 'supply' ? 'supply' : 'demand';
  const zoneBtn = document.querySelector(`[data-group="zone"][data-val="${zoneSide}"]`);
  if (zoneBtn) setChoice(zoneBtn, 'zone');

  calcSizing();
  if (typeof runDecisionMatrix === 'function') runDecisionMatrix();
}
