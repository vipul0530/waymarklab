/* ═══════════════════════════════════════════════
   OTA Trade Calculator — Rules Engine
   Core Strategy + Options Blueprint
   ═══════════════════════════════════════════════ */

/* ── GLOBAL STATE ── */
const STATE = {
  ticker:   null,
  quote:    null,
  overview: null,

  // Core Strategy
  curve:  'high',
  trend:  'sideways',
  zone:   'demand',

  // Odds Enhancers
  oe: {
    strength:  0,
    time:      0,
    freshness: 0,
    oe_trend:  0,
    oe_curve:  0,
    profit:    0,
  },

  // IV
  iv: null,

  // Pre-checks
  preChecks: {
    earnings: 'yes',
    liquid:   'yes',
    datr:     'yes',
  },
};

/* ══════════════════════════════════════════════════════════════════
   DECISION MATRIX (from OTA Core Strategy Reference Guide)
   Zone × ITF Trend × HTF Curve → action
   ══════════════════════════════════════════════════════════════════ */
const DECISION_MATRIX = {
  supply: {
    downtrend: { high: 'SHORT', middle: 'SHORT', low: 'SHORT_XLT' },
    sideways:  { high: 'SHORT', middle: 'SHORT', low: 'NO_ACTION' },
    uptrend:   { high: 'SHORT_XLT', middle: 'NO_ACTION', low: 'NO_ACTION' },
  },
  demand: {
    downtrend: { high: 'NO_ACTION', middle: 'NO_ACTION', low: 'LONG_XLT' },
    sideways:  { high: 'NO_ACTION', middle: 'LONG', low: 'LONG' },
    uptrend:   { high: 'LONG_XLT',  middle: 'LONG', low: 'LONG' },
  },
};

/* ══════════════════════════════════════════════════════════════════
   STRATEGY SELECTION MATRIX
   Zone × IV Gauge → recommended strategies
   ══════════════════════════════════════════════════════════════════ */
const STRATEGY_MATRIX = {
  demand: {
    1: {
      type: 'DEBIT (Buy)',
      color: 'green',
      primary: 'Long Call (+C)',
      primaryDetail: 'Buy to Open · ATM/ITM · 90+ days · Delta > +0.50 · Strike AOB DZ stop loss',
      spread: 'Bull Call Spread (+C / -C)',
      spreadDetail: 'Anchor: Long Call AOB · Offset: Short Call AOA · Net Delta ≥ +0.25 · 90+ days',
      expiration: '90+ days',
      anchor: 'Long Call (AOB Demand)',
      strike: 'First strike At-or-Below DZ stop loss',
      delta: 'Long: > +0.50 · Spread: Net ≥ +0.25',
      timing_in: 'Buy to Open when Stock is at Entry',
      timing_out: 'Sell to Close: Stock hits Stop · Stock reaches Target · 60 Days remaining · IV changes',
    },
    2: {
      type: 'DEBIT (Buy)',
      color: 'green',
      primary: 'Long Call (+C)',
      primaryDetail: 'Buy to Open · ATM/ITM · 90+ days · Net Delta ≥ +0.25 · Strike AOB DZ stop loss',
      spread: 'Bull Call Spread (+C / -C)',
      spreadDetail: 'Anchor: Long Call AOB · Offset: Short Call AOA · Net Delta ≥ +0.25 · 90+ days',
      expiration: '90+ days',
      anchor: 'Long Call (AOB Demand)',
      strike: 'First strike At-or-Below DZ stop loss',
      delta: 'Net Delta ≥ +0.25',
      timing_in: 'Buy to Open when Stock is at Entry',
      timing_out: 'Sell to Close: Stock hits Stop · Stock reaches Target · 60 Days remaining · IV changes',
    },
    3: null, // IV3 = Fair — no clear edge, wait
    4: {
      type: 'CREDIT (Sell)',
      color: 'yellow',
      primary: 'Bull Put Spread — Directional (-P / +P)',
      primaryDetail: 'Sell to Open at Entry · OTM 60 days or less · Net Delta ≥ +0.25 · Net Premium ≥ $0.50',
      spread: 'Bull Put Spread — Non-Directional (-P / +P)',
      spreadDetail: 'Sell above DZ · Vega ≈ ½ Anchor Vega · Net Premium ≥ $0.50 · Reward:Risk ≥ 1:1',
      expiration: '60 days or less',
      anchor: 'Short Put (AOB Demand)',
      strike: 'First strike At-or-Below DZ stop loss',
      delta: 'Directional: Net +0.25 to +0.50 · Non-Dir: Vega ≈ ½ Anchor Vega',
      timing_in: 'Sell to Open at Entry · Net Premium ≥ $50',
      timing_out: 'Buy to Close: Stock hits Stop · Stock reaches Target · Short Unit ≤ $0.05 · IV changes',
    },
    5: {
      type: 'CREDIT (Sell)',
      color: 'yellow',
      primary: 'Bull Put Spread — Directional (-P / +P)',
      primaryDetail: 'Sell to Open at Entry · OTM 60 days or less · Net Delta ≥ +0.25 · Net Premium ≥ $0.50',
      spread: 'Bull Put Spread — Non-Directional (-P / +P)',
      spreadDetail: 'Sell above DZ · Vega ≈ ½ Anchor Vega · Net Premium ≥ $0.50 · Reward:Risk ≥ 1:1',
      expiration: '60 days or less',
      anchor: 'Short Put (AOB Demand)',
      strike: 'First strike At-or-Below DZ stop loss',
      delta: 'Directional: Net +0.25 to +0.50 · Non-Dir: Vega ≈ ½ Anchor Vega',
      timing_in: 'Sell to Open at Entry · Net Premium ≥ $50',
      timing_out: 'Buy to Close: Stock hits Stop · Stock reaches Target · Short Unit ≤ $0.05 · IV changes',
    },
  },
  supply: {
    1: {
      type: 'DEBIT (Buy)',
      color: 'red',
      primary: 'Long Put (+P)',
      primaryDetail: 'Buy to Open · ATM/ITM · 90+ days · Delta < -0.50 · Strike AOA SZ stop loss',
      spread: 'Bear Put Spread (+P / -P)',
      spreadDetail: 'Anchor: Long Put AOA · Offset: Short Put AOB · Net Delta ≤ -0.25 · 90+ days',
      expiration: '90+ days',
      anchor: 'Long Put (AOA Supply)',
      strike: 'First strike At-or-Above SZ stop loss',
      delta: 'Long: < -0.50 · Spread: Net ≤ -0.25',
      timing_in: 'Buy to Open when Stock is at Entry',
      timing_out: 'Sell to Close: Stock hits Stop · Stock reaches Target · 60 Days remaining · IV changes',
    },
    2: {
      type: 'DEBIT (Buy)',
      color: 'red',
      primary: 'Long Put (+P)',
      primaryDetail: 'Buy to Open · ATM/ITM · 90+ days · Net Delta ≤ -0.25 · Strike AOA SZ stop loss',
      spread: 'Bear Put Spread (+P / -P)',
      spreadDetail: 'Anchor: Long Put AOA · Offset: Short Put AOB · Net Delta ≤ -0.25 · 90+ days',
      expiration: '90+ days',
      anchor: 'Long Put (AOA Supply)',
      strike: 'First strike At-or-Above SZ stop loss',
      delta: 'Net Delta ≤ -0.25',
      timing_in: 'Buy to Open when Stock is at Entry',
      timing_out: 'Sell to Close: Stock hits Stop · Stock reaches Target · 60 Days remaining · IV changes',
    },
    3: null,
    4: {
      type: 'CREDIT (Sell)',
      color: 'yellow',
      primary: 'Bear Call Spread — Directional (-C / +C)',
      primaryDetail: 'Sell to Open at Entry · OTM 60 days or less · Net Delta ≤ -0.25 · Net Premium ≥ $0.50',
      spread: 'Bear Call Spread — Non-Directional (-C / +C)',
      spreadDetail: 'Sell below SZ · Vega ≈ ½ Anchor Vega · Net Premium ≥ $0.50 · Reward:Risk ≥ 1:1',
      expiration: '60 days or less',
      anchor: 'Short Call (AOA Supply)',
      strike: 'First strike At-or-Above SZ stop loss',
      delta: 'Directional: Net -0.25 to -0.50 · Non-Dir: Vega ≈ ½ Anchor Vega',
      timing_in: 'Sell to Open at Entry · Net Premium ≥ $50',
      timing_out: 'Buy to Close: Stock hits Stop · Stock reaches Target · Short Unit ≤ $0.05 · IV changes',
    },
    5: {
      type: 'CREDIT (Sell)',
      color: 'yellow',
      primary: 'Bear Call Spread — Directional (-C / +C)',
      primaryDetail: 'Sell to Open at Entry · OTM 60 days or less · Net Delta ≤ -0.25 · Net Premium ≥ $0.50',
      spread: 'Bear Call Spread — Non-Directional (-C / +C)',
      spreadDetail: 'Sell below SZ · Vega ≈ ½ Anchor Vega · Net Premium ≥ $0.50 · Reward:Risk ≥ 1:1',
      expiration: '60 days or less',
      anchor: 'Short Call (AOA Supply)',
      strike: 'First strike At-or-Above SZ stop loss',
      delta: 'Directional: Net -0.25 to -0.50 · Non-Dir: Vega ≈ ½ Anchor Vega',
      timing_in: 'Sell to Open at Entry · Net Premium ≥ $50',
      timing_out: 'Buy to Close: Stock hits Stop · Stock reaches Target · Short Unit ≤ $0.05 · IV changes',
    },
  },
};

/* ══════════════════════════════════════════════════════════════════
   TOGGLE / CHOICE HANDLERS
   ══════════════════════════════════════════════════════════════════ */
function setToggle(btn, group) {
  document.querySelectorAll(`[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  STATE.preChecks[group] = btn.dataset.val;
  checkPreChecks();
  updateOptionsParams();
}

function setChoice(btn, group) {
  document.querySelectorAll(`[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  STATE[group] = btn.dataset.val;
  runDecisionMatrix();
  updateOptionsParams();
}

function setOE(btn, key, val) {
  document.querySelectorAll(`[data-oe="${key}"]`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  STATE.oe[key] = val;
  calcOEScore();
}

function setIV(level) {
  STATE.iv = level;
  document.querySelectorAll('.iv-section').forEach(s => s.classList.remove('selected'));
  document.querySelectorAll(`.iv${level}`).forEach(s => s.classList.add('selected'));

  const labels = {
    1: 'IV1 — Very Deflated · Premium cheap → BUY (Debit Strategy)',
    2: 'IV2 — Deflated · Premium low → BUY (Debit Strategy)',
    3: 'IV3 — Fair · Neutral · Consider waiting for IV4/5 to sell or IV1/2 to buy',
    4: 'IV4 — Inflated · Premium expensive → SELL (Credit Strategy)',
    5: 'IV5 — Very Inflated · Premium very expensive → SELL (Credit Strategy)',
  };
  document.getElementById('ivTypeLabel').textContent = labels[level];
  updateOptionsParams();
}

/* ══════════════════════════════════════════════════════════════════
   PRE-CHECKS
   ══════════════════════════════════════════════════════════════════ */
function checkPreChecks() {
  const el = document.getElementById('preCheckAlert');
  const failures = [];

  if (STATE.preChecks.earnings === 'no')
    failures.push('⚠ Earnings within 30 days — PASS on this trade or wait for earnings announcement.');
  if (STATE.preChecks.liquid === 'no')
    failures.push('⚠ Options not liquid (OI < 10,000 or slippage too high) — PASS on this trade.');

  if (failures.length) {
    el.classList.remove('hidden');
    el.innerHTML = failures.join('<br/>');
  } else {
    el.classList.add('hidden');
  }
}

/* ══════════════════════════════════════════════════════════════════
   DECISION MATRIX
   ══════════════════════════════════════════════════════════════════ */
function runDecisionMatrix() {
  const { zone, trend, curve } = STATE;
  const action = DECISION_MATRIX[zone]?.[trend]?.[curve] ?? 'NO_ACTION';
  STATE.action = action;
  renderDecisionBox(action, zone, trend, curve);
  updateOptionsParams();
}

function renderDecisionBox(action, zone, trend, curve) {
  const el = document.getElementById('decisionResult');
  el.className = 'decision-box';

  const isXLT = action.includes('XLT');
  const base = action.replace('_XLT', '');

  let cls, label, detail;
  switch (base) {
    case 'LONG':
      cls = 'long'; label = '↑ LONG';
      detail = `Demand Zone (Buy) · ITF ${capitalize(trend)} · HTF Curve ${capitalize(curve)}`;
      break;
    case 'SHORT':
      cls = 'short'; label = '↓ SHORT';
      detail = `Supply Zone (Sell) · ITF ${capitalize(trend)} · HTF Curve ${capitalize(curve)}`;
      break;
    default:
      cls = 'no-action'; label = '— NO ACTION';
      detail = `Zone/Trend/Curve combination does not qualify for a trade.`;
  }

  if (isXLT) cls = 'xlt';
  el.classList.add(cls);

  const xltBadge = isXLT
    ? `<span class="badge badge-xlt">XLT Track · Profit Zone ≥ 5:1 required</span>`
    : '';

  el.innerHTML = `
    <div>
      <span class="decision-label ${cls}">${label}</span>
      ${xltBadge}
    </div>
    <div class="decision-detail">${detail}</div>
  `;
}

/* ══════════════════════════════════════════════════════════════════
   ODDS ENHANCERS SCORING
   ══════════════════════════════════════════════════════════════════ */
function calcOEScore() {
  const { oe } = STATE;
  const total = Object.values(oe).reduce((s, v) => s + parseFloat(v), 0);
  STATE.oeScore = total;

  document.getElementById('oeScore').textContent = total % 1 === 0 ? total : total.toFixed(1);

  const entryEl = document.getElementById('entryTypeResult');
  entryEl.className = 'entry-type';

  const isXLT = STATE.action?.includes('XLT');
  const profitScore = parseFloat(oe.profit);

  let entryType, cls;

  if (total >= 8.5) {
    entryType = '⬛ PROXIMAL LIMIT ENTRY — AT the zone';
    cls = 'proximal';
  } else if (total >= 7) {
    entryType = '🔷 CONFIRMATION ENTRY — IN the zone';
    cls = 'confirmation';
  } else if (isXLT && profitScore === 2 && total >= 7) {
    entryType = '🟣 XLT PASSIVE ENTRY — Profit Zone ≥ 5:1';
    cls = 'proximal';
  } else {
    entryType = '🚫 NO TRADE — Score below threshold (< 7/10)';
    cls = 'no-trade';
  }

  entryEl.classList.add(cls);
  entryEl.textContent = entryType;
  STATE.entryType = cls;

  updateOptionsParams();
}

/* ══════════════════════════════════════════════════════════════════
   STRATEGY SELECTION
   ══════════════════════════════════════════════════════════════════ */
function updateOptionsParams() {
  renderStrategyBox();
  renderOptionsParamsSection();
}

function renderStrategyBox() {
  const el = document.getElementById('strategyResult');
  const { zone, iv, preChecks } = STATE;

  if (!iv) { el.classList.add('hidden'); return; }
  if (preChecks.earnings === 'no' || preChecks.liquid === 'no') { el.classList.add('hidden'); return; }
  if (preChecks.datr === 'no') {
    el.classList.remove('hidden');
    el.innerHTML = `
      <div class="strategy-header" style="background:var(--text-muted);color:#000;">⏳ Wait — Set dATR Alert</div>
      <div class="strategy-body"><p>Price is not yet within 1 dATR of the zone. Set an alert 1 dATR away from the zone and wait before configuring the options trade.</p></div>`;
    return;
  }

  const strat = STRATEGY_MATRIX[zone]?.[iv];

  if (!strat) {
    el.classList.remove('hidden');
    el.innerHTML = `
      <div class="strategy-header" style="background:var(--text-muted);color:#000;">IV3 — Fair Volatility</div>
      <div class="strategy-body"><p class="muted">IV3 is neutral territory. Wait for IV to move toward 1/2 (buy debit) or 4/5 (sell credit) for a cleaner edge.</p></div>`;
    return;
  }

  const colorMap = { green: 'var(--green)', red: 'var(--red)', yellow: 'var(--accent)' };
  const headerColor = colorMap[strat.color] || 'var(--accent)';

  el.classList.remove('hidden');
  el.style.borderColor = headerColor;
  el.innerHTML = `
    <div class="strategy-header" style="background:${headerColor};">${strat.type} — IV${iv} · ${capitalize(zone)} Zone</div>
    <div class="strategy-body">
      <div class="strategy-cards">
        <div class="strategy-card">
          <h4>Primary Strategy</h4>
          <ul>
            <li><strong>${strat.primary}</strong></li>
            <li>${strat.primaryDetail}</li>
          </ul>
        </div>
        <div class="strategy-card">
          <h4>Spread Option</h4>
          <ul>
            <li><strong>${strat.spread}</strong></li>
            <li>${strat.spreadDetail}</li>
          </ul>
        </div>
        <div class="strategy-card">
          <h4>Parameters</h4>
          <ul>
            <li><strong>Expiration:</strong> ${strat.expiration}</li>
            <li><strong>Anchor Strike:</strong> ${strat.anchor}</li>
            <li><strong>Strike Rule:</strong> ${strat.strike}</li>
            <li><strong>Delta Rule:</strong> ${strat.delta}</li>
          </ul>
        </div>
        <div class="strategy-card">
          <h4>Timing</h4>
          <ul>
            <li><strong>Entry:</strong> ${strat.timing_in}</li>
            <li><strong>Exit:</strong> ${strat.timing_out}</li>
          </ul>
        </div>
      </div>
    </div>`;
}

function renderOptionsParamsSection() {
  const el = document.getElementById('optionsParams');
  const { zone, iv, action, oeScore, entryType } = STATE;
  const strat = iv ? STRATEGY_MATRIX[zone]?.[iv] : null;

  if (!iv || !action) {
    el.innerHTML = '<p class="muted">Complete Steps 1–4 to generate options parameters.</p>';
    return;
  }

  const isDebit = iv <= 2;
  const isNoTrade = entryType === 'no-trade';
  const actionBase = (action || '').replace('_XLT', '');

  el.innerHTML = `
    <div class="op-card">
      <h4>Phase 1 · Charting</h4>
      ${paramRow('Direction', actionBase === 'LONG' ? '↑ LONG (Bullish)' : actionBase === 'SHORT' ? '↓ SHORT (Bearish)' : '— No Action', actionBase === 'LONG' ? 'good' : actionBase === 'SHORT' ? 'bad' : '')}
      ${paramRow('Zone', capitalize(zone) + ' Zone')}
      ${paramRow('OE Score', (oeScore || 0) + ' / 10', parseFloat(oeScore) >= 8.5 ? 'good' : parseFloat(oeScore) >= 7 ? 'warn' : 'bad')}
      ${paramRow('Entry Type', entryType === 'proximal' ? 'Proximal — AT zone' : entryType === 'confirmation' ? 'Confirmation — IN zone' : 'NO TRADE', entryType === 'proximal' ? 'good' : entryType === 'confirmation' ? 'warn' : 'bad')}
      ${isNoTrade ? '<div style="color:var(--red);font-weight:700;margin-top:10px;">⛔ Score below threshold — DO NOT TRADE</div>' : ''}
    </div>

    <div class="op-card">
      <h4>Phase 2 · Strategy Setup</h4>
      ${paramRow('IV Level', iv ? `IV${iv} — ${['','Very Deflated','Deflated','Fair','Inflated','Very Inflated'][iv]}` : '—', iv && iv <= 2 ? 'good' : iv && iv >= 4 ? 'warn' : '')}
      ${paramRow('Trade Type', strat ? strat.type : '—')}
      ${paramRow('Primary Strategy', strat ? strat.primary : '—')}
      ${paramRow('Expiration', strat ? strat.expiration : '—')}
      ${paramRow('Anchor Strike', strat ? strat.anchor : '—')}
      ${paramRow('Delta Rule', strat ? strat.delta : '—')}
    </div>

    <div class="op-card">
      <h4>Phase 2 · Rules Checklist</h4>
      ${checkItem('Earnings > 30 days', STATE.preChecks.earnings === 'yes')}
      ${checkItem('Options liquid (OI ≥ 10,000)', STATE.preChecks.liquid === 'yes')}
      ${checkItem('Within 1 dATR of zone', STATE.preChecks.datr === 'yes')}
      ${checkItem('OE Score ≥ 7/10', parseFloat(oeScore) >= 7)}
      ${checkItem(isDebit ? 'Expiration ≥ 90 days' : 'Expiration ≤ 60 days', true)}
      ${checkItem('Net Premium ≥ $0.50 (credit only)', isDebit ? null : null)}
      ${checkItem('Stop loss price defined', true)}
    </div>

    <div class="op-card">
      <h4>Phase 4 · Order Alerts</h4>
      ${paramRow('Entry Alert (DZ)', 'Set alert $0.10 ABOVE entry price')}
      ${paramRow('Entry Alert (SZ)', 'Set alert $0.10 BELOW entry price')}
      ${paramRow('Stop Alert (DZ)', 'Set alert $0.10 ABOVE stop price')}
      ${paramRow('Stop Alert (SZ)', 'Set alert $0.10 BELOW stop price')}
      ${paramRow('Order Type', 'Market · Duration: Day')}
      ${paramRow('Exit — Credit', 'Buy to Close when short unit ≤ $0.05')}
    </div>
  `;
}

function paramRow(key, val, cls='') {
  return `<div class="params-row"><span class="params-key">${key}</span><span class="params-val ${cls}">${val}</span></div>`;
}
function checkItem(label, pass) {
  if (pass === null) return `<div class="params-row"><span class="params-key">☐ ${label}</span><span class="params-val" style="color:var(--text-muted)">Manual check</span></div>`;
  return `<div class="params-row"><span class="params-key">${pass ? '✅' : '❌'} ${label}</span><span class="params-val ${pass ? 'good' : 'bad'}">${pass ? 'Pass' : 'Fail'}</span></div>`;
}

/* ══════════════════════════════════════════════════════════════════
   POSITION SIZING
   OTA formula: Account × Risk% = Max Risk
   Max Contracts = Max Risk ÷ (Stop per share + B-A spread)
   ══════════════════════════════════════════════════════════════════ */
function calcSizing() {
  const account = parseFloat(document.getElementById('accountSize').value) || 0;
  const riskPct = parseFloat(document.getElementById('riskPct').value) || 2;
  const stopSize = parseFloat(document.getElementById('stopSize').value) || 0;
  const entryP = parseFloat(document.getElementById('entryPrice').value) || 0;
  const targetP = parseFloat(document.getElementById('targetPrice').value) || 0;
  const spread = parseFloat(document.getElementById('spreadCost').value) || 0;

  const maxRisk = account * (riskPct / 100);
  const stopTotal = stopSize + spread;
  const maxContracts = stopTotal > 0 ? Math.floor(maxRisk / (stopTotal * 100)) : 0;
  const conservativeContracts = stopTotal > 0 ? Math.floor((maxRisk * 0.5) / (stopTotal * 100)) : 0;
  const rr = stopSize > 0 ? ((targetP - entryP) / stopSize).toFixed(2) : '—';
  const reward = maxContracts * (targetP - entryP) * 100;
  const maxPositionRisk = maxContracts * stopTotal * 100;

  const el = document.getElementById('sizingResult');
  el.innerHTML = `
    <div class="sizing-card">
      <div class="s-label">Max Risk ($)</div>
      <div class="s-value">$${maxRisk.toLocaleString()}</div>
      <div class="s-sub">${account.toLocaleString()} × ${riskPct}%</div>
    </div>
    <div class="sizing-card">
      <div class="s-label">Max Contracts</div>
      <div class="s-value">${maxContracts}</div>
      <div class="s-sub">Full risk · Stop+Spread: $${stopTotal.toFixed(2)}</div>
    </div>
    <div class="sizing-card">
      <div class="s-label">Conservative (50%)</div>
      <div class="s-value">${conservativeContracts}</div>
      <div class="s-sub">50% of available risk</div>
    </div>
    <div class="sizing-card">
      <div class="s-label">R:R Ratio</div>
      <div class="s-value" style="color:${parseFloat(rr) >= 3 ? 'var(--green)' : parseFloat(rr) >= 1 ? 'var(--accent)' : 'var(--red)'}">${rr}:1</div>
      <div class="s-sub">${parseFloat(rr) >= 5 ? '✓ Excellent (≥5:1)' : parseFloat(rr) >= 3 ? '✓ Good (≥3:1)' : '⚠ Below 3:1'}</div>
    </div>
    <div class="sizing-card">
      <div class="s-label">Potential Reward</div>
      <div class="s-value" style="color:var(--green)">$${isNaN(reward) || reward <= 0 ? '—' : reward.toLocaleString()}</div>
      <div class="s-sub">At ${maxContracts} contracts</div>
    </div>
    <div class="sizing-card">
      <div class="s-label">Position Risk</div>
      <div class="s-value" style="color:var(--red)">$${isNaN(maxPositionRisk) ? '—' : maxPositionRisk.toLocaleString()}</div>
      <div class="s-sub">If stop is hit</div>
    </div>
  `;

  STATE.sizing = { maxRisk, maxContracts, conservativeContracts, rr, reward };
}

/* ══════════════════════════════════════════════════════════════════
   FULL TRADE SUMMARY
   ══════════════════════════════════════════════════════════════════ */
function generateSummary() {
  const el = document.getElementById('tradeSummary');
  const { ticker, quote, zone, trend, curve, action, oeScore, entryType, iv, sizing, preChecks, oe } = STATE;
  const strat = iv ? STRATEGY_MATRIX[zone]?.[iv] : null;
  const actionBase = (action || '').replace('_XLT', '');

  const isNoTrade = entryType === 'no-trade';
  const readyToTrade = !isNoTrade && actionBase !== 'NO_ACTION' && preChecks.earnings === 'yes' && preChecks.liquid === 'yes' && iv && iv !== 3;

  el.classList.remove('hidden');

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-size:20px;font-weight:900;color:var(--accent)">${ticker || '(No Ticker)'} — OTA Trade Plan</div>
        <div style="font-size:12px;color:var(--text-muted)">${dateStr}</div>
      </div>
      <div style="font-size:22px;font-weight:900;padding:10px 24px;border-radius:8px;
           background:${readyToTrade ? (actionBase === 'LONG' ? 'var(--green-dim)' : 'var(--red-dim)') : 'var(--bg3)'};
           color:${readyToTrade ? (actionBase === 'LONG' ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)'};
           border:2px solid ${readyToTrade ? (actionBase === 'LONG' ? 'var(--green)' : 'var(--red)') : 'var(--border)'}">
        ${readyToTrade ? (actionBase === 'LONG' ? '↑ LONG' : '↓ SHORT') : (actionBase === 'NO_ACTION' ? '— NO ACTION' : '⛔ NO TRADE')}
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-section">
        <h3>Core Strategy</h3>
        <div class="summary-row"><span class="key">Zone</span><span class="val ${zone === 'demand' ? 'green' : 'red'}">${capitalize(zone)} Zone</span></div>
        <div class="summary-row"><span class="key">ITF Trend</span><span class="val">${capitalize(trend)}</span></div>
        <div class="summary-row"><span class="key">HTF Curve</span><span class="val">${capitalize(curve)} on Curve</span></div>
        <div class="summary-row"><span class="key">Decision Matrix</span><span class="val ${actionBase === 'LONG' ? 'green' : actionBase === 'SHORT' ? 'red' : ''}">${action || '—'} ${action?.includes('XLT') ? '(XLT Track)' : ''}</span></div>
      </div>

      <div class="summary-section">
        <h3>Odds Enhancers</h3>
        <div class="summary-row"><span class="key">1. Strength</span><span class="val">${oe.strength}/2</span></div>
        <div class="summary-row"><span class="key">2. Time</span><span class="val">${oe.time}/1</span></div>
        <div class="summary-row"><span class="key">3. Freshness</span><span class="val">${oe.freshness}/2</span></div>
        <div class="summary-row"><span class="key">4. Trend</span><span class="val">${oe.oe_trend}/2</span></div>
        <div class="summary-row"><span class="key">5. Curve</span><span class="val">${oe.oe_curve}/1</span></div>
        <div class="summary-row"><span class="key">6. Profit Zone</span><span class="val">${oe.profit}/2</span></div>
        <div class="summary-row"><span class="key">TOTAL SCORE</span>
          <span class="val ${parseFloat(oeScore) >= 8.5 ? 'green' : parseFloat(oeScore) >= 7 ? 'yellow' : 'red'}">${oeScore || 0} / 10 — ${entryType === 'proximal' ? 'AT zone' : entryType === 'confirmation' ? 'IN zone' : 'NO TRADE'}</span></div>
      </div>

      <div class="summary-section">
        <h3>Options Strategy</h3>
        <div class="summary-row"><span class="key">IV Gauge</span><span class="val">${iv ? `IV${iv}` : '—'}</span></div>
        <div class="summary-row"><span class="key">Trade Type</span><span class="val">${strat ? strat.type : '—'}</span></div>
        <div class="summary-row"><span class="key">Primary</span><span class="val" style="font-size:12px">${strat ? strat.primary : '—'}</span></div>
        <div class="summary-row"><span class="key">Expiration</span><span class="val">${strat ? strat.expiration : '—'}</span></div>
        <div class="summary-row"><span class="key">Strike Rule</span><span class="val" style="font-size:12px">${strat ? strat.strike : '—'}</span></div>
        <div class="summary-row"><span class="key">Delta Rule</span><span class="val" style="font-size:12px">${strat ? strat.delta : '—'}</span></div>
      </div>

      <div class="summary-section">
        <h3>Position Sizing</h3>
        <div class="summary-row"><span class="key">Max Risk</span><span class="val yellow">$${sizing?.maxRisk?.toLocaleString() || '—'}</span></div>
        <div class="summary-row"><span class="key">Max Contracts</span><span class="val">${sizing?.maxContracts ?? '—'}</span></div>
        <div class="summary-row"><span class="key">Conservative</span><span class="val">${sizing?.conservativeContracts ?? '—'}</span></div>
        <div class="summary-row"><span class="key">R:R</span><span class="val ${parseFloat(sizing?.rr) >= 3 ? 'green' : 'red'}">${sizing?.rr || '—'}:1</span></div>
        <div class="summary-row"><span class="key">Potential Reward</span><span class="val green">$${sizing?.reward > 0 ? sizing.reward.toLocaleString() : '—'}</span></div>
      </div>
    </div>

    <div style="margin-top:20px;">
      <h3 style="font-size:14px;color:var(--accent);margin-bottom:10px;">Pre-Trade Checklist</h3>
      <ul class="checklist">
        <li class="${preChecks.earnings === 'yes' ? 'done' : ''}">Earnings > 30 days away</li>
        <li class="${preChecks.liquid === 'yes' ? 'done' : ''}">Options liquid (OI ≥ 10,000, slippage acceptable)</li>
        <li class="${preChecks.datr === 'yes' ? 'done' : ''}">Price within 1 dATR of zone</li>
        <li class="${parseFloat(oeScore) >= 7 ? 'done' : ''}">OE Score ≥ 7/10</li>
        <li class="${actionBase !== 'NO_ACTION' ? 'done' : ''}">Decision Matrix confirms action</li>
        <li class="${iv && iv !== 3 ? 'done' : ''}">IV Gauge confirms strategy (not IV3)</li>
        <li>Strike selected At-or-${zone === 'demand' ? 'Below DZ' : 'Above SZ'} stop loss</li>
        <li>Delta rule confirmed (${strat?.delta || 'check options chain'})</li>
        <li class="${iv && iv >= 4 ? 'done' : ''}">Net Premium ≥ $0.50 (credit trades only)</li>
        <li>Entry/stop alerts set ($0.10 ${zone === 'demand' ? 'above' : 'below'} price)</li>
        <li>Order staged (Market order · Day duration)</li>
      </ul>
    </div>

    <div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:8px;border:1px solid var(--border);">
      <div style="font-size:11px;color:var(--text-muted);">
        ⚠ For educational purposes only. This calculator implements OTA Core Strategy rules. Always follow your personal trade plan. Not financial advice.
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════ */
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

/* ── INIT ── */
(function init() {
  runDecisionMatrix();
  calcOEScore();
  calcSizing();
})();
