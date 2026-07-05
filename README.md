# vyara.design

Vyara Dimitrova's portfolio. A single static HTML file — no build step, no
framework, no bundler. Three.js and Google Fonts load from CDN at runtime;
everything else is plain HTML/CSS/JS in `index.html`.

## Structure

```
.
├── index.html              ← the entire site
├── CNAME                    ← custom domain for GitHub Pages (vyara.design)
├── robots.txt
├── sitemap.xml
├── assets/
│   ├── sculpture.glb                 ← 3D hero model (NOT included — see below)
│   └── Vyara-Dimitrova_CV.html       ← printable CV page (NOT included — see below)
└── images/
    ├── fav-icon.png / og-preview.jpg  ← NOT included — see below
    ├── main/studio-portrait.jpg
    ├── lg-electronics/
    ├── my-market/
    ├── smart-point/
    ├── reverto-winery/
    ├── crea-bakery/
    └── maynooth-furniture/
```

## ⚠️ Before you push this live

This export only contains the code. The actual photos, video clips, the 3D
model, the favicon/social-preview images, and the CV file are **not** in
this environment, so the folders above are currently empty (just holding
`.gitkeep` placeholders so Git tracks them). Drop your real files into the
exact paths below — filenames matter, the site builds `<img>`/`<video>` src
attributes from these strings directly.

### Site-wide

| Path | Used for |
|---|---|
| `images/fav-icon.png` | favicon + Apple touch icon |
| `images/og-preview.jpg` | social share preview (LinkedIn/X/Slack) — ideally 1200×630 |
| `images/main/studio-portrait.jpg` | About section photo |
| `assets/sculpture.glb` | the 3D hero model (glTF binary) |
| `assets/Vyara-Dimitrova_CV.html` | the printable CV page linked from Contact/footer |

### Per project (all `.jpg` unless noted)

Every project needs a `card.jpg` (grid thumbnail) and `hero.jpg` (case-study
header), plus whichever of the below its layout actually uses:

| Folder | Files |
|---|---|
| `images/lg-electronics/` | `card`, `hero`, `gallery-1`, `gallery-2`, `outcome-1`, `outcome-2`, `outcome-3`, `parallax`, `reflection` — **plus videos**: `reel.mp4`, `bento-1.mp4`, `bento-2.mp4`, `bento-3.mp4` |
| `images/my-market/` | `card`, `hero`, `approach-1..4`, `bento-1..3`, `bento-extra-1..3`, `challenge`, `gallery-1`, `gallery-2`, `outcome-1..3`, `parallax`, `reflection-1` |
| `images/smart-point/` | `card`, `hero`, `approach-1..3`, `bento-1..3`, `outcome-1` |
| `images/reverto-winery/` | `card`, `hero`, `bento-1..3`, `challenge`, `gallery-1`, `gallery-2`, `outcome-1..2`, `parallax`, `reflection` |
| `images/crea-bakery/` | `card`, `hero`, `bento-1..3`, `challenge`, `gallery-1`, `gallery-2`, `outcome-1..2` |
| `images/maynooth-furniture/` | `card`, `hero`, `bento-1..3`, `gallery-1`, `gallery-2`, `mockup`, `outcome-1..3`, `parallax` |

If a file is missing, `enhanceImages()` in the site's JS already hides the
broken `<img>` gracefully (the container keeps its background instead of
showing a broken-image icon) — so a missing asset won't break the layout,
it'll just be blank.

## Deploy via GitHub Pages (custom domain)

1. Create a new repo on GitHub (public, any name — e.g. `vyara-portfolio`).
2. Push this folder as its contents:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. In the repo → **Settings → Pages** → Source: `Deploy from a branch` →
   Branch: `main`, folder `/ (root)` → Save.
4. Because this repo includes a `CNAME` file, GitHub Pages will serve the
   site at **vyara.design** once your DNS is pointed at GitHub Pages
   (an `A`/`ALIAS` record to GitHub's Pages IPs, or a `CNAME` record from
   `www` to `<your-username>.github.io` — see GitHub's "Managing a custom
   domain" docs for the exact records).
5. Until DNS/HTTPS provisioning finishes, the site is also reachable at
   `https://<your-username>.github.io/<repo-name>/` — note that URL won't
   match the canonical/OG tags baked into `index.html` (those point at
   `https://vyara.design/`), so social previews will look correct only once
   the custom domain is live.

## Deploy via GitHub Pages (no custom domain)

Don't want to use vyara.design yet? Delete the `CNAME` file and the site
will serve at `https://<your-username>.github.io/<repo-name>/` instead. You
should also update the `canonical`, `og:url`, and `og:image`/`twitter:image`
URLs in `index.html`'s `<head>` to match, or social previews and search
indexing will point at the wrong address.

**Also note:** the three "CV" links in `index.html` point to
`/assets/Vyara-Dimitrova_CV.html` (an absolute, domain-root path). That's
correct once the custom domain is live, but under a project-pages subpath
like `.github.io/<repo-name>/` it resolves to `.github.io/assets/...` and
404s. If you're deploying without the custom domain, change those three
`href`s to the relative path `assets/Vyara-Dimitrova_CV.html` instead.

## Local preview

No build step needed — just serve the folder over HTTP (opening
`index.html` directly with `file://` will break the favicon/CDN font
preconnects and some relative asset paths). Any static server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```
