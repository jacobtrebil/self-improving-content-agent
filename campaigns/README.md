# Campaigns

Every generation request ("generate N posts in format X") gets its own
campaign folder here. A campaign is the unit of work: a brief, the specs it
produces, where they are in the review→render→schedule lifecycle, and the
results that come back.

## Naming

```
campaigns/<YYYY-MM-DD>-<slug>-batch-<NNN>/
```

- `YYYY-MM-DD` — date the campaign was created
- `slug` — short kebab description (e.g. `looksmax-transformation`)
- `NNN` — zero-padded batch number, auto-incremented for the same date+slug

Example: `2026-06-13-looksmax-transformation-batch-001`

## Structure

```
2026-06-13-looksmax-transformation-batch-001/
  brief.md          what this batch is, the items to generate, channels, constraints
  generated/        raw specs, one JSON per post (per /formats/<format>/schema.yaml)
  approved/         specs that passed validation + human review — ready to render
  rendered/         build outputs (PNG/MP4/HTML) — media is gitignored, regenerable
  rejected/         specs that failed validation/review, kept for learning
  scheduled.tsv     log of scheduled posts: key · date · platform · post_id  (gitignored — has IDs)
  results.tsv       performance pulled from the dashboard: key · format · account · date · views · likes · reach · pulled_at
```

## Lifecycle

1. **Create** — `campaigns/new-campaign.sh <format> <slug> [--count N]` scaffolds the folder.
2. **Brief** — fill in `brief.md`: goal, the N items, channels, cadence.
3. **Generate** — write one spec per item into `generated/` using
   `/formats/<format>/prompt.md` + `schema.yaml`.
4. **Validate & review** — check each against `/formats/<format>/validation.md`.
   Passing specs move to `approved/`; failing ones to `rejected/`.
5. **Render** — build media from `approved/` into `rendered/` (gitignored).
6. **Schedule** — only on explicit human approval; log post IDs to `scheduled.tsv`.
7. **Measure** — `node dashboard/build.js`; record per-post metrics in `results.tsv`.

## What's committed

- **Committed:** `brief.md`, `generated/`, `approved/`, `rejected/`, `results.tsv`
  (the briefs, specs, decisions, and metric history — no secrets).
- **Gitignored:** all media in `rendered/` (covered by the media globs) and
  `scheduled.tsv` (contains live Postiz post IDs).
