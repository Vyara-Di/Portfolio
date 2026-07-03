# Asset Manifest — Images & Videos

Every file the portfolio loads. Drop these into the paths below exactly as named — filenames are resolved in code, so spelling and folder must match.

**Totals:** 71 images · 4 videos · **75 files** (excludes Google-Fonts requests and the two Three.js CDN scripts).

## How paths resolve

```
Per-project image →  images/{slug}/{name}.jpg
Per-project video →  images/{slug}/{name}.mp4
```
`{slug}` comes from the `projectSlugs` map in `index.html`. The `seed` and `imgs` fields in the
project JSON (e.g. `compora44`) are **legacy and unused** — do not name files after them.

## Global assets

| Path | Role |
| --- | --- |
| `assets/sculpture.glb` | Three.js hero sculpture model (site root, relative path) |
| `images/fav-icon.png` | Browser favicon |
| `images/og-preview.jpg` | Open Graph / social share preview (1200x630 recommended) |
| `images/main/studio-portrait.jpg` | Studio / about section portrait (4:5) |

> `images/og-preview.jpg` is referenced by the `og:image` meta tag. Replace the absolute URL in
> `index.html` (currently `https://yourdomain.com/...`) with your real domain when you deploy.

## Per-project assets

Every project needs `hero.jpg` (full-bleed detail header) and `card.jpg` (home-grid thumbnail); both are listed.

### LG Electronics — *Brand Design*
`images/lg-electronics/`

**Images (9)**

- `hero.jpg`
- `card.jpg`
- `gallery-1.jpg`
- `gallery-2.jpg`
- `outcome-1.jpg`
- `outcome-2.jpg`
- `outcome-3.jpg`
- `parallax.jpg`
- `reflection.jpg`

**Videos (4)** — autoplay · muted · looped · `playsinline`

- `reel.mp4`
- `bento-1.mp4`
- `bento-2.mp4`
- `bento-3.mp4`

### My Market — *Brand Identity*
`images/my-market/`

**Images (15)**

- `hero.jpg`
- `card.jpg`
- `bento-1.jpg`
- `bento-2.jpg`
- `bento-3.jpg`
- `challenge.jpg`
- `approach-1.jpg`
- `approach-2.jpg`
- `approach-3.jpg`
- `approach-4.jpg`
- `parallax.jpg`
- `bento-extra-1.jpg`
- `bento-extra-2.jpg`
- `bento-extra-3.jpg`
- `reflection-1.jpg`

### Smart Point — *Brand Design*
`images/smart-point/`

**Images (9)**

- `hero.jpg`
- `card.jpg`
- `bento-1.jpg`
- `bento-2.jpg`
- `bento-3.jpg`
- `approach-1.jpg`
- `approach-2.jpg`
- `approach-3.jpg`
- `outcome-1.jpg`

### Reverto Winery — *Packaging*
`images/reverto-winery/`

**Images (12)**

- `hero.jpg`
- `card.jpg`
- `bento-1.jpg`
- `bento-2.jpg`
- `bento-3.jpg`
- `challenge.jpg`
- `gallery-1.jpg`
- `gallery-2.jpg`
- `outcome-1.jpg`
- `outcome-2.jpg`
- `parallax.jpg`
- `reflection.jpg`

### Crea Bakery — *Brand Identity*
`images/crea-bakery/`

**Images (10)**

- `hero.jpg`
- `card.jpg`
- `bento-1.jpg`
- `bento-2.jpg`
- `bento-3.jpg`
- `challenge.jpg`
- `gallery-1.jpg`
- `gallery-2.jpg`
- `outcome-1.jpg`
- `outcome-2.jpg`

### Maynooth Furniture — *Art Direction*
`images/maynooth-furniture/`

**Images (12)**

- `hero.jpg`
- `card.jpg`
- `bento-1.jpg`
- `bento-2.jpg`
- `bento-3.jpg`
- `gallery-1.jpg`
- `gallery-2.jpg`
- `mockup.jpg`
- `outcome-1.jpg`
- `outcome-2.jpg`
- `outcome-3.jpg`
- `parallax.jpg`

## Notes

- **Only LG Electronics uses video.** Every other project is image-only.
- `bento-*` cells in LG are **videos** (`.mp4`); in all other projects `bento-*` are **images** (`.jpg`).
- Missing files show as broken images — there is no production placeholder fallback.
- Recommended: optimized JPG (or WebP if you also swap the `.jpg` references in code); video as small H.264 MP4 loops for reliable mobile autoplay.
- `card.jpg`: the home grid assigns varied aspect ratios via CSS, so supply a tall-ish source (≥ 4:5) and let `object-fit:cover` crop.
