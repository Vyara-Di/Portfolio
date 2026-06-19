# Vyara Dimitrova — Portfolio

A single-file, dependency-light portfolio site for a brand & identity designer. All
markup, styles, and behaviour live in **`index.html`**; content is data-driven from one
JSON block; assets are loaded from a predictable `images/` folder structure.

- **Live entry point:** `index.html`
- **Design tokens reference:** `tokens.html` (open in a browser)
- **Asset checklist:** `ASSETS.md` and `assets.manifest.json`

---

## Quick start

There is no build step. It's a static site.

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static host works (Netlify, Vercel, GitHub Pages, S3, nginx). Just serve the folder.
The Three.js hero model is loaded with a **relative path** (`sculpture.glb`), so the site
must be served over HTTP(S) — opening `index.html` from `file://` will block the model and
some assets.

---

## Project structure

```
.
├── index.html                 # the entire site (HTML + CSS + JS)
├── sculpture.glb              # 3D hero model (Three.js, loaded at site root)
├── tokens.html                # design-token reference / styleguide
├── README.md                  # this file
├── ASSETS.md                  # human-readable image & video manifest
├── assets.manifest.json       # machine-readable manifest
└── images/
    ├── fav-icon.png
    ├── og-preview.jpg         # social share image (see Meta & SEO below)
    ├── main/
    │   └── studio-portrait.jpg
    ├── lg-electronics/
    ├── my-market/
    ├── smart-point/
    ├── reverto-winery/
    ├── crea-bakery/
    └── maynooth-furniture/
```

See **`ASSETS.md`** for the exact file list each project folder needs.

---

## Editing content

All project copy lives in **one place**: the JSON block in `index.html` with
`id="projData-json"`. The home-grid cards and the full project pages both read from it, so
they can never drift out of sync. Edit there and nowhere else.

Rules for that block (it is plain JSON):

- Apostrophes are safe — type them normally (`it's`, `don't`).
- To highlight a word in orange, wrap it: `<span class='o'>word</span>`.
- The only character you must escape inside text is a literal `"` → write `\"`.
- If the page renders blank, you almost certainly left a stray `"` — check the browser
  console for the `[projData] Invalid JSON` warning.

Each project object supports: `t` (title), `c` (category), `y` (year), `tag`, `brief`,
`challenge`, `approach`, `outcome`, `reflection`, `quote`, `tools[]`, and `steps[]`.

> **Legacy fields:** `seed` and `imgs` (e.g. `"compora44"`) are **not used** by the code.
> They don't control filenames or anything else. Real assets use semantic names — see below.

---

## How assets resolve

Project images and videos are built from the project's **slug**, not from the JSON
filenames:

```
images/{slug}/{name}.jpg     // projImg(slug, name)
images/{slug}/{name}.mp4     // projVid(slug, name)
```

Slugs are defined in the `projectSlugs` map in `index.html`:

| Project | Slug |
| --- | --- |
| LG Electronics | `lg-electronics` |
| My Market | `my-market` |
| Smart Point | `smart-point` |
| Reverto Winery | `reverto-winery` |
| Crea Bakery | `crea-bakery` |
| Maynooth Furniture | `maynooth-furniture` |

To add or swap an image, drop a correctly named file into the matching folder. To change
*which* image a section uses, edit the `I('name')` / `V('name')` call inside that project's
render branch in `openProject()`.

**Note:** only **LG Electronics** uses video. There, `bento-1/2/3` are `.mp4`; in every
other project the same `bento-*` names are `.jpg`.

---

## Layout system per project

`openProject(idx)` renders a shared hero + brief, then branches into a project-specific
visual layout:

- `idx === 0` → LG Electronics (motion-first: video reel + video bento + scrollable outcome cell)
- `idx === 1` → My Market (print/identity: full-bleed challenge image, 4-image approach grid)
- `idx === 2` → Smart Point (UI/kiosk)
- `idx === 3` → Reverto Winery (packaging; challenge and outcome share a wide visual)
- `idx === 4` → Crea Bakery (identity; two-square outcome, no reflection visuals)
- `d.isWeb` → Maynooth Furniture (website-aware layout)

The trailing `else` branch is an unreachable fallback for the current six-project dataset.

---

## Design tokens

Colours, type scale, spacing, motion easings, and component styles are defined as CSS
custom properties in the `:root` of `index.html`. Open **`tokens.html`** for a visual
reference, or read them directly:

| Token | Value | Use |
| --- | --- | --- |
| `--beige` | `#E9E1D4` | Page background |
| `--beige-lt` | `#F3EEE5` | Light surfaces, nav pill, cards |
| `--sand` | `#DCD0BD` | Muted placeholder surface |
| `--ink` | `#221E1A` | Primary text |
| `--ink-soft` | `#6B635A` | Secondary text, eyebrows |
| `--orange` | `#E5602B` | Accent / highlight |
| `--line` | `rgba(34,30,26,.14)` | Hairline borders |
| `--pad` | `clamp(20px,5vw,64px)` | Horizontal section padding |
| `--ease` | `cubic-bezier(.22,.61,.36,1)` | Standard easing |
| `--ease-io` | `cubic-bezier(.65,.05,.36,1)` | In-out easing for reveals |

**Type:** Urbanist (Google Fonts), weights 200–900. Body is 400 / line-height 1.55.
Display headings use 800–900 with tight negative tracking; eyebrows and labels use 600
uppercase with wide tracking.

---

## Meta & SEO

The `<head>` includes a description plus Open Graph and Twitter Card tags. Before going
live, replace the placeholder domain in `index.html`:

```html
<meta property="og:image" content="https://yourdomain.com/images/og-preview.jpg">
<meta property="og:url"   content="https://yourdomain.com">
```

Point these at your real domain and make sure `images/og-preview.jpg` exists
(1200×630 is the recommended share size).

---

## Behaviour & progressive enhancement

- **Reduced motion:** all major animations are gated behind
  `prefers-reduced-motion`. Reveals fall back to instant visibility.
- **Custom cursor & magnetic buttons:** enabled only on fine pointers (desktop).
- **Loader, lightbox, project overlay, marquee, scroll progress, nav active-state** are
  all self-contained in the single script at the bottom of `index.html`.
- **Three.js hero sculpture** (`three@0.128.0` + `GLTFLoader`, from jsDelivr) renders
  `sculpture.glb`. If the model fails to load, the rest of the page still works.

---

## Responsive breakpoints

`900px` (layout simplifications) and `620px` (single-column collapses for the bento /
grid sections). Test project overlays at both widths after layout edits.

---

## Editing checklist

- [ ] Copy changes go in the `projData-json` block only.
- [ ] New images named semantically and placed in `images/{slug}/` (see `ASSETS.md`).
- [ ] Updated `og:url` / `og:image` to the real domain.
- [ ] Verified the page over HTTP (not `file://`) so `sculpture.glb` loads.
- [ ] Checked the console for the `[projData] Invalid JSON` warning after copy edits.
