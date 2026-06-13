# Performance dashboard

Pulls post + analytics data from Postiz, maps every post to a content format
(`/formats`), and segments performance across **formats** and **accounts**.

## Run

```bash
node dashboard/build.js            # 30-day window (default)
node dashboard/build.js --days 90  # widen the lookback
open dashboard/dashboard.html      # the visual dashboard
```

Auth comes from the `postiz` CLI (`~/.postiz/credentials.json`); no keys live
in this repo. Each run prints a terminal summary and writes:

| Output | Committed? | What |
|--------|-----------|------|
| `dashboard/dashboard.html` | no (gitignored) | self-contained visual dashboard |
| `dashboard/data/computed.json` | no | aggregated stats (formats, accounts, matrix, top posts) |
| `dashboard/data/raw-*.json` | no | raw Postiz dumps (contain channel/post IDs) |

## What it tracks

- **By format** — posts, published/queued counts, and summed views / likes /
  reach with a views-per-post average. Formats are
  `health-carousel`, `looksmax-carousel`, `before-and-after-reels`.
- **By account** — per channel: posts, post-level views/likes, audience
  (followers, or net subscribers for YouTube), and account-level views.
- **Format × account matrix** — posts and views per cell.
- **Top published posts** — ranked by views, linking to the live post.

## How posts are classified

`classify.js` maps a post → format from its caption:

1. Transformation/reel keywords → `before-and-after-reels`.
2. Otherwise the caption is matched against `vibe-carousels/CAPTIONS.md`
   (each deck's caption is distinctive) and the deck number picks the format
   (03–13 → health, 01–02 & 14–23 → looksmax).

If new decks are added, keep `CAPTIONS.md` current and the classifier follows.
Run `node -e "console.log(require('./dashboard/classify').classify('<caption>'))"`
to spot-check a single post.

## Honest caveats (also shown in the dashboard footer)

- **Per-post metrics exist only for published Instagram & YouTube posts.**
  TikTok exposes no per-post analytics through this API, so TikTok appears in
  inventory and account-level growth (followers, account views) but not in
  per-post view/like sums.
- Most content is still **queued** (future-dated); per-format totals climb as
  it publishes.
- YouTube reports **net subscribers** (gained − lost) and retention, not an
  absolute follower count — the audience column reflects that.
