# Wardrobe Manager — Deployment Guide

## What's in this folder

```
wardrobe/
├── index.html                      ← SPA frontend
├── netlify.toml                    ← Netlify build config
├── package.json                    ← npm dependencies (for functions)
└── netlify/
    └── functions/
        └── wardrobe-api.mjs        ← Serverless backend (CRUD, AI, photos)
```

---

## Step 1 — Push to GitHub

This folder lives at `/wardrobe/` inside the `vipul0530/waymarklab` repo.

```bash
# From the repo root
git add wardrobe/
git commit -m "Add wardrobe manager"
git push
```

---

## Step 2 — Create a new Netlify site (or link existing)

> The wardrobe app needs its own Netlify site config so it can use
> Netlify Functions and Blobs. The easiest way is a **new site** pointing
> to a sub-directory of the same repo.

1. Go to **app.netlify.com → Add new site → Import an existing project**
2. Connect to **GitHub → vipul0530/waymarklab**
3. Set build settings:

   | Setting            | Value                  |
   |--------------------|------------------------|
   | Base directory     | `wardrobe`             |
   | Build command      | *(leave blank)*        |
   | Publish directory  | `.`                    |
   | Functions directory| `netlify/functions`    |

4. Click **Deploy site**

Netlify will assign a URL like `https://random-name.netlify.app`.

---

## Step 3 — Set environment variables

In your new Netlify site: **Site configuration → Environment variables → Add variable**

| Variable             | Value                                         |
|----------------------|-----------------------------------------------|
| `WARDROBE_PASSWORD`  | A password of your choice (e.g. `MyWardrobe!`) |
| `ANTHROPIC_API_KEY`  | Your key from console.anthropic.com            |

> **Note:** `ANTHROPIC_API_KEY` is for the Anthropic API — separate from
> your Claude.ai subscription. Get a key at console.anthropic.com → API Keys.
> The wardrobe uses `claude-haiku-4-5` which costs ~$0.001 per photo analysis.

Trigger a redeploy after adding the variables:
**Deploys → Trigger deploy → Deploy site**

---

## Step 4 — Point waymarklab.com/wardrobe to the new site (optional)

To serve the wardrobe at `waymarklab.com/wardrobe`, add a proxy redirect
in the **main site's** `netlify.toml`:

```toml
[[redirects]]
  from   = "/wardrobe/*"
  to     = "https://YOUR-WARDROBE-SITE.netlify.app/:splat"
  status = 200
  force  = true
```

Replace `YOUR-WARDROBE-SITE` with the Netlify subdomain assigned in Step 2.

Alternatively, set a **custom domain** on the wardrobe Netlify site directly:
`wardrobe.waymarklab.com` (requires a CNAME record in DNS).

---

## CSV Import format

The import accepts any CSV with these column names (case-insensitive):

| Column       | Required | Notes                                         |
|--------------|----------|-----------------------------------------------|
| `id`         | ✅ Yes   | Your item ID (e.g. `SHIRT001`)               |
| `name`       | No       | Display name                                  |
| `category`   | No       | Tops, Bottoms, Outerwear, Shoes, Accessories, Activewear, Formalwear, Underwear, Swimwear, Sleepwear, Other |
| `brand`      | No       |                                               |
| `size`       | No       |                                               |
| `color`      | No       |                                               |
| `description`| No       |                                               |
| `best_use`   | No       | Comma-separated occasions                    |

Example:
```csv
id,name,category,brand,size,color,best_use
SHIRT001,Blue Oxford Shirt,Tops,Ralph Lauren,M,Navy Blue,"Business Casual, Smart Casual"
JEANS001,Slim Dark Jeans,Bottoms,Levi's,32x30,Dark Indigo,Casual
```

Items whose ID already exists are skipped (safe to re-import).

---

## Storage

- **Photos** → Netlify Blobs store `wardrobe-photos` (binary, unlimited on free plan)
- **Catalog** → Netlify Blobs store `wardrobe`, key `catalog` (JSON array)
- No external database required

## API endpoints (all require `X-Wardrobe-Password` header)

| Method | Path                              | Purpose              |
|--------|-----------------------------------|----------------------|
| POST   | `/api/wardrobe/auth`              | Verify password      |
| GET    | `/api/wardrobe/items`             | List all items       |
| POST   | `/api/wardrobe/items`             | Create item          |
| GET    | `/api/wardrobe/items/:id`         | Get single item      |
| PUT    | `/api/wardrobe/items/:id`         | Update item          |
| DELETE | `/api/wardrobe/items/:id`         | Delete item          |
| POST   | `/api/wardrobe/items/bulk-delete` | Delete multiple      |
| GET    | `/api/wardrobe/photo/:id?pw=...`  | Serve photo          |
| POST   | `/api/wardrobe/analyze`           | AI photo analysis    |
| POST   | `/api/wardrobe/import`            | Import CSV           |
