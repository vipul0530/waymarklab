/* ═══════════════════════════════════════════════
   Alpha Vantage API Integration
   Key: QARQRPK3ZWG2ZY4J
   ═══════════════════════════════════════════════ */

const AV_KEY = 'QARQRPK3ZWG2ZY4J';
const AV_BASE = 'https://www.alphavantage.co/query';

async function fetchTicker() {
  const ticker = document.getElementById('tickerInput').value.trim().toUpperCase();
  if (!ticker) { alert('Enter a ticker symbol.'); return; }

  const btn = document.getElementById('fetchBtn');
  btn.disabled = true;
  btn.innerHTML = 'Fetching <span class="spinner"></span>';

  try {
    // Fetch quote and overview in parallel
    const [quoteData, overviewData] = await Promise.all([
      fetchQuote(ticker),
      fetchOverview(ticker)
    ]);

    displayTickerData(ticker, quoteData, overviewData);
    runDecisionMatrix();
    updateOptionsParams();
    calcSizing();
  } catch (e) {
    showTickerError(e.message || 'Failed to fetch data.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Fetch Data';
  }
}

async function fetchQuote(symbol) {
  const url = `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${AV_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data['Note']) throw new Error('API rate limit reached. Wait 1 min and retry.');
  if (data['Error Message']) throw new Error('Invalid ticker symbol.');
  const q = data['Global Quote'];
  if (!q || !q['05. price']) throw new Error('No quote data returned.');
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

async function fetchOverview(symbol) {
  const url = `${AV_BASE}?function=OVERVIEW&symbol=${symbol}&apikey=${AV_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return {};
  const data = await res.json();
  return {
    name:           data['Name'] || symbol,
    sector:         data['Sector'] || '—',
    marketCap:      data['MarketCapitalization'] || null,
    pe:             data['PERatio'] || '—',
    eps:            data['EPS'] || '—',
    dividendYield:  data['DividendYield'] || '0',
    week52High:     parseFloat(data['52WeekHigh']) || null,
    week52Low:      parseFloat(data['52WeekLow']) || null,
    beta:           data['Beta'] || '—',
    earningsDate:   data['NextEarningsDate'] || null,
  };
}

function displayTickerData(symbol, quote, overview) {
  const el = document.getElementById('tickerResult');
  el.classList.remove('hidden');

  const isUp = quote.change >= 0;
  const dirClass = isUp ? 'up' : 'down';
  const dirIcon = isUp ? '▲' : '▼';

  // Earnings check
  let earningsInfo = '—';
  let earningsDays = null;
  if (overview.earningsDate) {
    const days = Math.round((new Date(overview.earningsDate) - new Date()) / 86400000);
    earningsDays = days;
    earningsInfo = `${overview.earningsDate} (${days}d away)`;
    const earningsGroup = document.querySelector('[data-group="earnings"]');
    // Auto-set earnings toggle
    const yesBtn = document.querySelector('[data-group="earnings"][data-val="yes"]');
    const noBtn  = document.querySelector('[data-group="earnings"][data-val="no"]');
    if (days > 30) {
      yesBtn.classList.add('active'); noBtn.classList.remove('active');
      STATE.preChecks.earnings = 'yes';
      document.getElementById('earnings-hint').textContent = `✓ ${days} days — safe to trade`;
    } else {
      noBtn.classList.add('active'); yesBtn.classList.remove('active');
      STATE.preChecks.earnings = 'no';
      document.getElementById('earnings-hint').textContent = `⚠ Only ${days} days — consider waiting`;
    }
    checkPreChecks();
  }

  // 52-week curve position (rough)
  let curveHint = '';
  if (overview.week52High && overview.week52Low) {
    const range = overview.week52High - overview.week52Low;
    const pos = range > 0 ? (quote.price - overview.week52Low) / range : 0.5;
    if (pos >= 0.67) curveHint = 'High on 52W curve — consider SZ';
    else if (pos <= 0.33) curveHint = 'Low on 52W curve — consider DZ';
    else curveHint = 'Middle of 52W curve';
  }

  // ATR approximation (high - low of day as rough proxy)
  const dayRange = (quote.high - quote.low).toFixed(2);

  el.innerHTML = `
    <div class="data-item">
      <span class="data-label">Symbol</span>
      <span class="data-value neutral">${symbol}</span>
    </div>
    <div class="data-item">
      <span class="data-label">Price</span>
      <span class="data-value ${dirClass}">$${quote.price.toFixed(2)}</span>
    </div>
    <div class="data-item">
      <span class="data-label">Change</span>
      <span class="data-value ${dirClass}">${dirIcon} ${quote.changePct}</span>
    </div>
    <div class="data-item">
      <span class="data-label">Day Range</span>
      <span class="data-value">$${quote.low.toFixed(2)} – $${quote.high.toFixed(2)}</span>
    </div>
    <div class="data-item">
      <span class="data-label">Day Range (dATR proxy)</span>
      <span class="data-value">$${dayRange}</span>
    </div>
    <div class="data-item">
      <span class="data-label">Volume</span>
      <span class="data-value">${(quote.volume/1e6).toFixed(2)}M</span>
    </div>
    <div class="data-item">
      <span class="data-label">52W High / Low</span>
      <span class="data-value">$${overview.week52High?.toFixed(2) || '—'} / $${overview.week52Low?.toFixed(2) || '—'}</span>
    </div>
    <div class="data-item">
      <span class="data-label">52W Curve Position</span>
      <span class="data-value neutral" style="font-size:13px">${curveHint}</span>
    </div>
    <div class="data-item">
      <span class="data-label">Company</span>
      <span class="data-value" style="font-size:13px">${overview.name}</span>
    </div>
    <div class="data-item">
      <span class="data-label">Sector</span>
      <span class="data-value" style="font-size:13px">${overview.sector}</span>
    </div>
    <div class="data-item">
      <span class="data-label">Beta</span>
      <span class="data-value">${overview.beta}</span>
    </div>
    <div class="data-item">
      <span class="data-label">Next Earnings</span>
      <span class="data-value" style="font-size:12px;color:${earningsDays && earningsDays <= 30 ? 'var(--red)' : 'var(--green)'}">${earningsInfo}</span>
    </div>
  `;

  // Populate entry price from current price
  document.getElementById('entryPrice').value = quote.price.toFixed(2);
  STATE.ticker = symbol;
  STATE.quote = quote;
  STATE.overview = overview;
  calcSizing();
}

function showTickerError(msg) {
  const el = document.getElementById('tickerResult');
  el.classList.remove('hidden');
  el.innerHTML = `<div style="color:var(--red);font-weight:600;">⚠ ${msg}</div>`;
}
