/* ═══════════════════════════════════════════════
   Netlify Function · Parse OTA Zones Screenshot
   Uses Anthropic Claude Vision to extract zones
   ═══════════════════════════════════════════════ */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5-20250929';

const SYSTEM_PROMPT = `You are an OCR parser for the OTA (Online Trading Academy) Supply and Demand Zones grid.

The grid layout:
- Each COLUMN represents a ticker (e.g. NQ, ES, RTY, YM, GC, SI, HG, CL, NG, QQQ, SPY, IWM, TLT, GLD, etc.)
- 6 zone ROWS:
  - Rows 1-3 = SUPPLY ZONES (red shades, above current price). Row 1 = top supply, Row 2 = middle supply, Row 3 = bottom supply.
  - Then a CURRENT PRICE band (yellow/highlighted) - extract these too.
  - Rows 4-6 = DEMAND ZONES (green shades, below current price). Row 4 = top demand, Row 5 = middle demand, Row 6 = bottom demand.

Each zone cell contains TWO numbers stacked vertically:
- Top number = PROXIMAL price
- Bottom number = DISTAL price
- A dash "-" means no zone exists for that ticker at that row.

CURRENT PRICE cells also contain two numbers (high/low of price band).

RULES:
- For SUPPLY zones: proximal is LOWER, distal is HIGHER (zones above price).
- For DEMAND zones: proximal is HIGHER, distal is LOWER (zones below price).
- All numbers are decimal prices (e.g. 4552.50, 28897.00, 716.99).
- Extract every ticker column you can read.

Return ONLY valid JSON, no prose, in this exact shape:

{
  "extractedDate": "YYYY-MM-DD",
  "tickers": [
    {
      "symbol": "NQ",
      "currentPriceHigh": 28897.00,
      "currentPriceLow": 28831.50,
      "supply": {
        "top":    { "proximal": null, "distal": null },
        "middle": { "proximal": null, "distal": null },
        "bottom": { "proximal": null, "distal": null }
      },
      "demand": {
        "top":    { "proximal": 27674.50, "distal": 27536.25 },
        "middle": { "proximal": 26776.75, "distal": 26535.00 },
        "bottom": { "proximal": null, "distal": null }
      }
    }
  ]
}

Use null when a cell is blank or just "-". Do not invent numbers.`;

exports.handler = async function(event) {
  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'POST only' }) };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500, headers: cors,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured in Netlify environment variables.' }),
    };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const imageData = body.image; // expect base64 data URL or raw base64
  if (!imageData) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing image' }) };

  // Strip data URL prefix if present
  const match = /^data:(image\/[\w+]+);base64,(.+)$/.exec(imageData);
  const mediaType = match ? match[1] : 'image/png';
  const b64 = match ? match[2] : imageData;

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
            { type: 'text',  text: 'Extract all tickers and their zones from this OTA grid. Return ONLY the JSON, no prose.' },
          ],
        }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { statusCode: res.status, headers: cors, body: JSON.stringify({ error: 'Anthropic API error', detail: errText }) };
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';

    // Pull JSON object out of the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'No JSON found in model output', raw: text }) };
    }
    const parsed = JSON.parse(jsonMatch[0]);

    return { statusCode: 200, headers: cors, body: JSON.stringify(parsed) };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
