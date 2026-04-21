/**
 * Wardrobe Manager — Netlify Function v2
 * Handles all API routes: auth, items CRUD, photo storage, AI analysis, CSV import
 *
 * Netlify Blobs stores used:
 *   "wardrobe"        key="catalog"  → JSON array of all catalog items
 *   "wardrobe-photos" key=<itemId>   → binary photo, content-type in metadata
 */

import { getStore } from "@netlify/blobs";
import Anthropic from "@anthropic-ai/sdk";

// ─── Constants ────────────────────────────────────────────────────────────────

const PASS = process.env.WARDROBE_PASSWORD;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Wardrobe-Password",
};

const CATEGORIES = [
  "Tops", "Bottoms", "Outerwear", "Shoes", "Accessories",
  "Activewear", "Formalwear", "Underwear", "Swimwear", "Sleepwear", "Other",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function checkAuth(req, url) {
  if (!PASS) return true; // no password configured → open (misconfiguration warning in console)
  const header = req.headers.get("x-wardrobe-password");
  const query  = url.searchParams.get("pw");
  return header === PASS || query === PASS;
}

async function getCatalog() {
  const store = getStore("wardrobe");
  const data = await store.get("catalog", { type: "json" });
  return Array.isArray(data) ? data : [];
}

async function saveCatalog(items) {
  const store = getStore("wardrobe");
  await store.setJSON("catalog", items);
}

// Basic CSV parser — handles quoted fields with embedded commas/newlines
function parseCSVLine(line) {
  const vals = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) {
      vals.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  vals.push(cur.trim());
  return vals;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z]/g, ""));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
    rows.push(row);
  }
  return { headers, rows };
}

function pick(row, ...keys) {
  for (const k of keys) {
    const v = row[k.toLowerCase().replace(/[^a-z]/g, "")];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

async function handleAuth(req) {
  const pw = req.headers.get("x-wardrobe-password");
  if (!PASS) return json({ ok: true, warning: "WARDROBE_PASSWORD not set — app is unprotected" });
  if (pw === PASS) return json({ ok: true });
  return json({ error: "Invalid password" }, 401);
}

async function handleListItems() {
  const items = await getCatalog();
  return json(items);
}

async function handleGetItem(id) {
  const items = await getCatalog();
  const item = items.find(i => i.id === id);
  if (!item) return json({ error: "Item not found" }, 404);
  return json(item);
}

async function handleCreateItem(req) {
  const contentType = req.headers.get("content-type") || "";
  let body, photoBuffer, photoContentType;

  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    body = JSON.parse(fd.get("meta") || "{}");
    const file = fd.get("photo");
    if (file && file.size > 0) {
      photoBuffer = Buffer.from(await file.arrayBuffer());
      photoContentType = file.type || "image/jpeg";
    }
  } else {
    body = await req.json();
  }

  if (!body.id) return json({ error: "Item ID is required" }, 400);

  const items = await getCatalog();
  if (items.some(i => i.id === body.id)) {
    return json({ error: `ID "${body.id}" already exists` }, 409);
  }

  const now = new Date().toISOString();
  const item = {
    id: body.id,
    name: body.name || "",
    category: body.category || "Other",
    description: body.description || "",
    brand: body.brand || "",
    size: body.size || "",
    color: body.color || "",
    bestUse: body.bestUse || "",
    hasPhoto: false,
    createdAt: now,
    updatedAt: now,
  };

  if (photoBuffer) {
    const ps = getStore("wardrobe-photos");
    await ps.set(body.id, photoBuffer, { metadata: { contentType: photoContentType } });
    item.hasPhoto = true;
  }

  items.push(item);
  await saveCatalog(items);
  return json(item, 201);
}

async function handleUpdateItem(id, req) {
  const contentType = req.headers.get("content-type") || "";
  let body, photoBuffer, photoContentType;

  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    body = JSON.parse(fd.get("meta") || "{}");
    const file = fd.get("photo");
    if (file && file.size > 0) {
      photoBuffer = Buffer.from(await file.arrayBuffer());
      photoContentType = file.type || "image/jpeg";
    }
  } else {
    body = await req.json();
  }

  const items = await getCatalog();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return json({ error: "Item not found" }, 404);

  const oldItem = items[idx];
  const newId = (body.id || id).trim();

  // Reject ID collision (another item already has newId)
  if (newId !== id && items.some((it, j) => j !== idx && it.id === newId)) {
    return json({ error: `ID "${newId}" already exists` }, 409);
  }

  const ps = getStore("wardrobe-photos");

  // New photo uploaded
  if (photoBuffer) {
    if (newId !== id && oldItem.hasPhoto) {
      await ps.delete(id).catch(() => {});
    }
    await ps.set(newId, photoBuffer, { metadata: { contentType: photoContentType } });
    body.hasPhoto = true;
  } else if (newId !== id && oldItem.hasPhoto) {
    // ID changed — move photo blob to new key
    const existing = await ps.get(id, { type: "arrayBuffer" });
    const meta = await ps.getMetadata(id).catch(() => null);
    if (existing) {
      await ps.set(newId, Buffer.from(existing), {
        metadata: meta?.metadata || { contentType: "image/jpeg" },
      });
      await ps.delete(id).catch(() => {});
    }
    body.hasPhoto = true;
  }

  // Handle explicit photo removal
  if (body.removePhoto) {
    await ps.delete(id).catch(() => {});
    body.hasPhoto = false;
    delete body.removePhoto;
  }

  const updated = {
    ...oldItem,
    ...body,
    id: newId,
    createdAt: oldItem.createdAt,
    updatedAt: new Date().toISOString(),
  };

  items[idx] = updated;
  await saveCatalog(items);
  return json(updated);
}

async function handleDeleteItem(id) {
  const items = await getCatalog();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return json({ error: "Item not found" }, 404);

  if (items[idx].hasPhoto) {
    await getStore("wardrobe-photos").delete(id).catch(() => {});
  }

  items.splice(idx, 1);
  await saveCatalog(items);
  return json({ ok: true });
}

async function handleBulkDelete(req) {
  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return json({ error: "No IDs provided" }, 400);
  }

  let items = await getCatalog();
  const ps = getStore("wardrobe-photos");

  await Promise.allSettled(
    ids.filter(id => items.find(i => i.id === id)?.hasPhoto).map(id => ps.delete(id))
  );

  const before = items.length;
  items = items.filter(i => !ids.includes(i.id));
  await saveCatalog(items);
  return json({ ok: true, deleted: before - items.length });
}

async function handleGetPhoto(id) {
  const ps = getStore("wardrobe-photos");
  const data = await ps.get(id, { type: "arrayBuffer" });
  if (!data) return new Response("Photo not found", { status: 404, headers: CORS });

  const meta = await ps.getMetadata(id).catch(() => null);
  const ct = meta?.metadata?.contentType || "image/jpeg";

  return new Response(data, {
    status: 200,
    headers: {
      ...CORS,
      "Content-Type": ct,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

async function handleAnalyze(req) {
  const fd = await req.formData();
  const file = fd.get("photo");
  if (!file || file.size === 0) return json({ error: "No photo provided" }, 400);

  const buf = Buffer.from(await file.arrayBuffer());
  const b64 = buf.toString("base64");
  const mediaType = (file.type || "image/jpeg");

  const prompt = `You are a wardrobe cataloging assistant. Analyze this clothing item photo and respond with ONLY a valid JSON object — no markdown, no explanation, no code fences.

{
  "suggestedId": "e.g. TOP001 — 2-4 uppercase letters for category abbreviation + 3-digit number",
  "name": "concise item name, e.g. 'Navy Crew Neck Sweater'",
  "category": "exactly one of: Tops, Bottoms, Outerwear, Shoes, Accessories, Activewear, Formalwear, Underwear, Swimwear, Sleepwear, Other",
  "description": "1-2 sentence description including style, fabric cues, fit, and notable details",
  "brand": "brand name if visible on item or tag, otherwise empty string",
  "size": "size if label is visible, otherwise empty string",
  "color": "primary color(s), e.g. 'Navy Blue' or 'Black and White Stripe'",
  "bestUse": "comma-separated occasions, e.g. 'Casual, Weekend' or 'Business Casual, Smart Casual'"
}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const raw = msg.content[0].text.trim();
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const analysis = JSON.parse(cleaned);
    return json(analysis);
  } catch (err) {
    console.error("Analyze error:", err);
    return json({ error: "AI analysis failed: " + err.message }, 500);
  }
}

async function handleImport(req) {
  const fd = await req.formData();
  const file = fd.get("csv");
  if (!file) return json({ error: "No CSV file provided" }, 400);

  const text = await file.text();
  const { rows } = parseCSV(text);
  if (!rows || rows.length === 0) return json({ error: "CSV is empty or has no data rows" }, 400);

  const existing = await getCatalog();
  const existingIds = new Set(existing.map(i => i.id));

  const imported = [];
  const skipped  = [];
  const errors   = [];
  const now = new Date().toISOString();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const id = pick(row, "id", "itemid", "item_id", "itemId") || pick(row, "sku");

    if (!id) { errors.push(`Row ${i + 2}: missing ID`); continue; }
    if (existingIds.has(id)) { skipped.push(id); continue; }

    const cat = pick(row, "category", "cat");
    imported.push({
      id,
      name:        pick(row, "name", "itemname", "item_name", "title"),
      category:    CATEGORIES.includes(cat) ? cat : (cat || "Other"),
      description: pick(row, "description", "desc", "notes"),
      brand:       pick(row, "brand"),
      size:        pick(row, "size"),
      color:       pick(row, "color", "colour"),
      bestUse:     pick(row, "bestuse", "best_use", "occasion", "occasions", "use"),
      hasPhoto:    false,
      createdAt:   now,
      updatedAt:   now,
    });
    existingIds.add(id);
  }

  if (imported.length > 0) {
    await saveCatalog([...existing, ...imported]);
  }

  return json({ imported: imported.length, skipped: skipped.length, errors, skippedIds: skipped });
}

// ─── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS });
  }

  const url  = new URL(req.url);
  const path = url.pathname;
  const m    = req.method;

  try {
    // Auth — no password required to check the password itself
    if (path === "/api/wardrobe/auth" && m === "POST") {
      return await handleAuth(req);
    }

    // All other endpoints require authentication
    if (!checkAuth(req, url)) {
      return json({ error: "Unauthorized" }, 401);
    }

    // GET photo (password via query param so <img> tags work)
    const photoMatch = path.match(/^\/api\/wardrobe\/photo\/(.+)$/);
    if (photoMatch && m === "GET") {
      return await handleGetPhoto(decodeURIComponent(photoMatch[1]));
    }

    // POST analyze
    if (path === "/api/wardrobe/analyze" && m === "POST") {
      return await handleAnalyze(req);
    }

    // POST import
    if (path === "/api/wardrobe/import" && m === "POST") {
      return await handleImport(req);
    }

    // POST bulk-delete
    if (path === "/api/wardrobe/items/bulk-delete" && m === "POST") {
      return await handleBulkDelete(req);
    }

    // /items collection
    if (path === "/api/wardrobe/items") {
      if (m === "GET")  return await handleListItems();
      if (m === "POST") return await handleCreateItem(req);
    }

    // /items/:id
    const itemMatch = path.match(/^\/api\/wardrobe\/items\/([^/]+)$/);
    if (itemMatch) {
      const id = decodeURIComponent(itemMatch[1]);
      if (m === "GET")    return await handleGetItem(id);
      if (m === "PUT")    return await handleUpdateItem(id, req);
      if (m === "DELETE") return await handleDeleteItem(id);
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("Wardrobe API error:", err);
    return json({ error: err.message || "Internal server error" }, 500);
  }
}

export const config = {
  path: "/api/wardrobe/*",
};
