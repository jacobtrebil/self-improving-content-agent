# Content Harness Instructions

This repo generates Vibe Health short-form content for TikTok, Instagram Reels, YouTube Shorts, and carousel posts.

# Core workflow 

For any generation task: 

1. Read the relevant format folder in `/formats`.
2. Read the the campaign brief in `/campaigns/<campaign>/brief.md`.
3. Generate structured content into the campaign's `generated/` folder. 
4. Run validation before rendering. 
5. Render only after validation passes. 
6. Do not schedule posts unless explicitly asked. 

# Source of truth 

- Brand rules: `/config/brand.yaml`
- Platform contraints: `/config/platforms.yaml`
- Format definitions: `/formats/<format>/format.md`
- Campaign-specific goals: `/campaigns/<campaign>/`

# Media & IDs are never committed

- All media (PNG/MP4/MOV/WEBP) is gitignored. Bulk assets and finished renders
  live in `../slideshows-media/`, reached via gitignored symlinks
  (`Vibe Health Assets/`, `vibe-carousels/reels`, `vibe-carousels/shorts`).
  Render outputs next to deck HTML are local-only and regenerable.
- Postiz channel IDs live only in `config/posting.local.yaml` (gitignored).
  In scripts, resolve them with `vibe-carousels/channel_id.sh` — never hardcode
  an integration or post id in a tracked file.

## Rules

- Do not make unsupported medical claims.
- Keep hooks short and native to TikTok/IG.
- Favor curiosity, transformation, and concrete visual payoff.
- Never reuse the exact same hook twice in one campaign.
- Avoid cringe AI-sounding phrasing.
- Use plain language.
- For health content, use “may help,” “can support,” or “designed to,” not guaranteed outcomes.

# Before finishing 

Then summarize:
- Files changed
- Posts generated
- Any validation failures
- Next recommended action