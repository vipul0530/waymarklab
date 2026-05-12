/* ═══════════════════════════════════════════════
   Zones Tab — Paste → Vision Parse → Edit → Save
   ═══════════════════════════════════════════════ */

const ZONES_STORAGE_KEY = 'ota_zones_v1';
let pastedImage = null;       // data URL
let extractedZones = null;    // parsed object

/* ── TAB SWITCHER ── */
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${name}`));
  if (name === 'monitor') renderMonitor();
  if (name === 'zones') renderSavedZones();
}

/* ── PASTE HANDLER ── */
window.addEventListener('paste', (e) => {
  const zonesTab = document.getElementById('tab-zones');
  if (!zonesTab.classList.contains('active')) return;
  const items = e.clipboardData?.items || [];
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      readImage(blob);
      e.preventDefault();
      return;
    }
  }
});

/* ── DRAG-DROP & CLICK FALLBACK ── */
document.addEventListener('DOMContentLoaded', () => {
  const zone = document.getElementById('pasteZone');
  const fileInput = document.getElementById('fileInput');
  if (!zone) return;
  zone.addEventListener('click', () => fileInput.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) readImage(file);
  });
  fileInput.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) readImage(file);
  });
  renderSavedZones();
});

function readImage(blob) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    pastedImage = ev.target.result;
    document.getElementById('previewImg').src = pastedImage;
    document.getElementById('previewWrap').classList.remove('hidden');
    document.getElementById('parseStatus').classList.add('hidden');
  };
  reader.readAsDataURL(blob);
}

function clearScreenshot() {
  pastedImage = null;
  extractedZones = null;
  document.getElementById('previewWrap').classList.add('hidden');
  document.getElementById('zonesEditor').classList.add('hidden');
  document.getElementById('parseStatus').classList.add('hidden');
  document.getElementById('previewImg').src = '';
  document.getElementById('fileInput').value = '';
}

/* ── VISION PARSE ── */
async function parseScreenshot() {
  if (!pastedImage) return;
  const btn = document.getElementById('parseBtn');
  const status = document.getElementById('parseStatus');
  btn.disabled = true;
  btn.innerHTML = 'Parsing <span class="spinner"></span>';
  status.classList.remove('hidden');
  status.className = 'parse-status info';
  status.textContent = 'Sending screenshot to Claude Vision…';

  try {
    const res = await fetch('/.netlify/functions/parse-zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: pastedImage }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Server error' }));
      throw new Error(err.error + (err.detail ? ' — ' + err.detail.slice(0, 200) : ''));
    }
    const data = await res.json();
    extractedZones = data;
    extractedZones.extractedDate = data.extractedDate || new Date().toISOString().slice(0, 10);
    renderZonesEditor(extractedZones);
    status.className = 'parse-status success';
    status.textContent = `✓ Parsed ${data.tickers?.length || 0} tickers. Review below, edit if needed, then Save.`;
  } catch (e) {
    status.className = 'parse-status error';
    status.innerHTML = `⚠ ${e.message}<br><small>If this is the first run, set <code>ANTHROPIC_API_KEY</code> in Netlify → Site settings → Environment variables.</small>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Parse Zones with Claude Vision';
  }
}

/* ── EDITABLE GRID ── */
function renderZonesEditor(data) {
  const grid = document.getElementById('zonesGrid');
  const meta = document.getElementById('zonesMeta');
  meta.textContent = `· ${data.tickers.length} tickers · ${data.extractedDate}`;
  document.getElementById('zonesEditor').classList.remove('hidden');

  let html = `
    <table class="zt">
      <thead>
        <tr>
          <th>Ticker</th>
          <th class="sup">Supply Top<br/><small>prox / distal</small></th>
          <th class="sup">Supply Mid<br/><small>prox / distal</small></th>
          <th class="sup">Supply Bot<br/><small>prox / distal</small></th>
          <th class="cp">Current Price<br/><small>high / low</small></th>
          <th class="dem">Demand Top<br/><small>prox / distal</small></th>
          <th class="dem">Demand Mid<br/><small>prox / distal</small></th>
          <th class="dem">Demand Bot<br/><small>prox / distal</small></th>
          <th></th>
        </tr>
      </thead>
      <tbody>`;

  data.tickers.forEach((t, idx) => {
    html += `<tr data-idx="${idx}">
      <td><input class="zt-input zt-sym" value="${t.symbol || ''}" data-f="symbol"/></td>
      ${zoneCell(t.supply?.top, idx, 'supply', 'top')}
      ${zoneCell(t.supply?.middle, idx, 'supply', 'middle')}
      ${zoneCell(t.supply?.bottom, idx, 'supply', 'bottom')}
      ${cpCell(t, idx)}
      ${zoneCell(t.demand?.top, idx, 'demand', 'top')}
      ${zoneCell(t.demand?.middle, idx, 'demand', 'middle')}
      ${zoneCell(t.demand?.bottom, idx, 'demand', 'bottom')}
      <td><button class="btn-icon" onclick="removeRow(${idx})" title="Remove">✕</button></td>
    </tr>`;
  });

  html += `</tbody></table>
    <div class="zt-actions"><button class="btn btn-secondary" onclick="addRow()">+ Add Ticker Row</button></div>`;
  grid.innerHTML = html;
  validateAllRows();
}

function zoneCell(z, idx, side, row) {
  const p = z?.proximal ?? '';
  const d = z?.distal ?? '';
  return `<td class="zt-cell ${side}">
    <input class="zt-input zt-num" type="number" step="0.01" value="${p}" data-idx="${idx}" data-side="${side}" data-row="${row}" data-field="proximal" oninput="updateZone(this)"/>
    <input class="zt-input zt-num" type="number" step="0.01" value="${d}" data-idx="${idx}" data-side="${side}" data-row="${row}" data-field="distal"   oninput="updateZone(this)"/>
  </td>`;
}

function cpCell(t, idx) {
  return `<td class="zt-cell cp">
    <input class="zt-input zt-num" type="number" step="0.01" value="${t.currentPriceHigh ?? ''}" data-idx="${idx}" data-cp="high" oninput="updateCP(this)"/>
    <input class="zt-input zt-num" type="number" step="0.01" value="${t.currentPriceLow ?? ''}"  data-idx="${idx}" data-cp="low"  oninput="updateCP(this)"/>
  </td>`;
}

function updateZone(input) {
  const { idx, side, row, field } = input.dataset;
  const v = input.value === '' ? null : parseFloat(input.value);
  if (!extractedZones.tickers[idx][side]) extractedZones.tickers[idx][side] = {};
  if (!extractedZones.tickers[idx][side][row]) extractedZones.tickers[idx][side][row] = { proximal: null, distal: null };
  extractedZones.tickers[idx][side][row][field] = v;
  validateRow(idx);
}

function updateCP(input) {
  const { idx } = input.dataset;
  const v = input.value === '' ? null : parseFloat(input.value);
  extractedZones.tickers[idx][input.dataset.cp === 'high' ? 'currentPriceHigh' : 'currentPriceLow'] = v;
  validateRow(idx);
}

function addRow() {
  extractedZones.tickers.push({
    symbol: '', currentPriceHigh: null, currentPriceLow: null,
    supply: { top: {}, middle: {}, bottom: {} },
    demand: { top: {}, middle: {}, bottom: {} },
  });
  renderZonesEditor(extractedZones);
}
function removeRow(idx) {
  extractedZones.tickers.splice(idx, 1);
  renderZonesEditor(extractedZones);
}

/* ── VALIDATION ── */
function validateAllRows() {
  extractedZones.tickers.forEach((_, i) => validateRow(i));
}
function validateRow(idx) {
  const t = extractedZones.tickers[idx];
  const row = document.querySelector(`tr[data-idx="${idx}"]`);
  if (!row) return;
  let issues = [];
  const cpHigh = t.currentPriceHigh, cpLow = t.currentPriceLow;
  const cpMid = cpHigh && cpLow ? (cpHigh + cpLow) / 2 : null;

  ['top', 'middle', 'bottom'].forEach(r => {
    const sup = t.supply?.[r];
    if (sup && sup.proximal != null && sup.distal != null) {
      if (sup.proximal >= sup.distal) issues.push(`SZ ${r}: proximal should be < distal`);
      if (cpMid && sup.proximal < cpMid) issues.push(`SZ ${r}: should be above current price`);
    }
    const dem = t.demand?.[r];
    if (dem && dem.proximal != null && dem.distal != null) {
      if (dem.proximal <= dem.distal) issues.push(`DZ ${r}: proximal should be > distal`);
      if (cpMid && dem.proximal > cpMid) issues.push(`DZ ${r}: should be below current price`);
    }
  });

  row.classList.toggle('has-warning', issues.length > 0);
  row.title = issues.join('\n');
}

/* ── SAVE / LOAD ── */
function saveZones() {
  if (!extractedZones) return;
  const all = loadAllSavedZones();
  const date = extractedZones.extractedDate || new Date().toISOString().slice(0, 10);
  all[date] = extractedZones;
  localStorage.setItem(ZONES_STORAGE_KEY, JSON.stringify(all));
  renderSavedZones();
  alert(`Saved zones for ${date}. ${extractedZones.tickers.length} tickers stored.`);
}

function loadAllSavedZones() {
  try { return JSON.parse(localStorage.getItem(ZONES_STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function getLatestZones() {
  const all = loadAllSavedZones();
  const dates = Object.keys(all).sort().reverse();
  return dates.length ? all[dates[0]] : null;
}

function renderSavedZones() {
  const el = document.getElementById('savedZonesList');
  if (!el) return;
  const all = loadAllSavedZones();
  const dates = Object.keys(all).sort().reverse();
  if (!dates.length) {
    el.innerHTML = '<p class="muted">No zones saved yet. Paste a screenshot above to begin.</p>';
    return;
  }
  el.innerHTML = dates.map(d => {
    const z = all[d];
    return `<div class="saved-row">
      <div><strong>${d}</strong> · ${z.tickers.length} tickers (${z.tickers.map(t => t.symbol).filter(Boolean).join(', ')})</div>
      <div class="saved-actions">
        <button class="btn btn-secondary" onclick="loadSaved('${d}')">Load</button>
        <button class="btn-icon" onclick="deleteSaved('${d}')" title="Delete">✕</button>
      </div>
    </div>`;
  }).join('');
}

function loadSaved(date) {
  const all = loadAllSavedZones();
  extractedZones = all[date];
  renderZonesEditor(extractedZones);
  document.getElementById('zonesEditor').scrollIntoView({ behavior: 'smooth' });
}

function deleteSaved(date) {
  if (!confirm(`Delete zones for ${date}?`)) return;
  const all = loadAllSavedZones();
  delete all[date];
  localStorage.setItem(ZONES_STORAGE_KEY, JSON.stringify(all));
  renderSavedZones();
}

/* ── ROW-POSITION → TRADE TYPE MAPPING ── */
const ROW_TRADE_MAP = {
  supply: {
    top:    { direction: 'SHORT', style: 'Passive Long-Term SELL',   timeframe: 'Daily–Weekly',     hold: 'Weeks–months', expiration: '60–90+ days' },
    middle: { direction: 'SHORT', style: 'Weekly Swing SELL',         timeframe: '1H–4H',            hold: '3–10 days',    expiration: '2–4 weeks' },
    bottom: { direction: 'SHORT', style: 'Daily SHORT (intraday)',    timeframe: '15min–1H',         hold: 'Hours–1–3 days', expiration: 'Weekly' },
  },
  demand: {
    top:    { direction: 'LONG',  style: 'Daily LONG (intraday)',     timeframe: '15min–1H',         hold: 'Hours–1–3 days', expiration: 'Weekly' },
    middle: { direction: 'LONG',  style: 'Weekly Swing LONG',          timeframe: '1H–4H',            hold: '3–10 days',    expiration: '2–4 weeks' },
    bottom: { direction: 'LONG',  style: 'Passive Long-Term LONG',     timeframe: 'Daily–Weekly',     hold: 'Weeks–months', expiration: '60–90+ days' },
  },
};
