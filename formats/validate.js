#!/usr/bin/env node
// Validate a campaign's generated/ carousel specs against the format hard-fails
// (see /formats/<format>/validation.md). Passing specs are copied to approved/.
//
// Usage:  node formats/validate.js campaigns/<campaign-dir>
//
// Covers health-carousel + looksmax-carousel (shared schema). Reel specs are
// reported as "manual review" — their schema differs (see before-and-after-reels).
//
// UNIQUENESS: every spec is also checked against the corpus of previously-made
// carousels — vibe-carousels/build.js decks + every OTHER campaign's approved/
// specs + this batch's siblings. A spec fails if it reuses a cover hook or its
// copy is a near-duplicate of a prior deck in the same format (see DUP_THRESHOLD).

const fs = require("fs");
const path = require("path");

const REPO = path.join(__dirname, "..");
const dirArg = process.argv[2];
if (!dirArg) {
  console.error("usage: node formats/validate.js campaigns/<campaign-dir>");
  process.exit(1);
}
const camp = path.resolve(REPO, dirArg);
const genDir = path.join(camp, "generated");
const okDir = path.join(camp, "approved");
const badDir = path.join(camp, "rejected");
if (!fs.existsSync(genDir)) {
  console.error(`no generated/ in ${dirArg}`);
  process.exit(1);
}
fs.mkdirSync(okDir, { recursive: true });
fs.mkdirSync(badDir, { recursive: true });

const norm = (s) => String(s || "").replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const words = (s) => norm(s).split(" ").filter(Boolean).length;
const highlights = (s) => (String(s).match(/\*[^*]+\*/g) || []).length;
const FORMAT_OF = { health: "health-carousel", looksmax: "looksmax-carousel" };

// ---------------------------------------------------------------------------
// Uniqueness — no carousel may duplicate a previously-made one in the format.
// ---------------------------------------------------------------------------
// word-bigram Jaccard at/above which two decks count as "the same". Calibrated:
// the most-similar DISTINCT decks in the corpus (two sleep decks) overlap ~18%,
// everything else <8%, so 0.40 leaves a wide margin while still catching
// near-copies and heavily-reworded duplicates.
const DUP_THRESHOLD = 0.4;

const deckHook = (spec) => norm((spec.slides && spec.slides[0] && spec.slides[0].title) || "");
const deckText = (spec) =>
  norm((spec.slides || []).flatMap((x) => [x.title, x.sub, x.body]).filter(Boolean).join(" "));

function shingles(text, n = 2) {
  const w = text.split(" ").filter(Boolean);
  const set = new Set();
  if (w.length < n) {
    if (w.length) set.add(w.join(" "));
    return set;
  }
  for (let i = 0; i + n <= w.length; i++) set.add(w.slice(i, i + n).join(" "));
  return set;
}
function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// vibe-carousels/build.js decks → corpus entries (format "*" = applies to all)
function loadBuildDecks() {
  const js = fs.readFileSync(path.join(REPO, "vibe-carousels", "build.js"), "utf8");
  const heads = [...js.matchAll(/"(\d{2}-[a-z0-9-]+)":\s*\{/g)].map((m) => ({ key: m[1], at: m.index }));
  const out = [];
  for (let i = 0; i < heads.length; i++) {
    const block = js.slice(heads[i].at, i + 1 < heads.length ? heads[i + 1].at : js.length);
    const strs = [...block.matchAll(/\b(?:title|sub|body):\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
    if (!strs.length) continue;
    out.push({ key: heads[i].key, source: "build.js", format: "*", hook: norm(strs[0]), text: norm(strs.join(" ")) });
  }
  return out;
}

// every OTHER campaign's approved/ specs → corpus entries
function loadCampaignDecks(excludeDir) {
  const root = path.join(REPO, "campaigns");
  const out = [];
  if (!fs.existsSync(root)) return out;
  for (const d of fs.readdirSync(root)) {
    const appr = path.join(root, d, "approved");
    if (path.resolve(root, d) === path.resolve(excludeDir)) continue;
    if (!fs.existsSync(appr) || !fs.statSync(appr).isDirectory()) continue;
    for (const f of fs.readdirSync(appr)) {
      if (!f.endsWith(".json")) continue;
      try {
        const sp = JSON.parse(fs.readFileSync(path.join(appr, f), "utf8"));
        if (!sp.slides) continue;
        out.push({
          key: sp.key || f.replace(/\.json$/, ""),
          source: `campaigns/${d}`,
          format: FORMAT_OF[sp.theme] || "*",
          hook: deckHook(sp),
          text: deckText(sp),
        });
      } catch {
        /* skip unparseable prior spec */
      }
    }
  }
  return out;
}

// Compare a spec to the prior corpus. Same-format decks (and build.js decks,
// format "*") count; a prior entry with the SAME key is an update, not a dup.
function uniquenessErrors(spec, prior) {
  const e = [];
  const fmt = FORMAT_OF[spec.theme] || "*";
  const hook = deckHook(spec);
  const sh = shingles(deckText(spec));
  const scoped = prior.filter((p) => p.key !== spec.key && (p.format === fmt || p.format === "*"));

  const hookHit = scoped.find((p) => p.hook && p.hook === hook);
  if (hookHit) e.push(`cover hook reuses ${hookHit.key} (${hookHit.source}): "${spec.slides[0].title}"`);

  let best = null,
    bestSim = 0;
  for (const p of scoped) {
    const sim = jaccard(sh, shingles(p.text));
    if (sim > bestSim) {
      bestSim = sim;
      best = p;
    }
  }
  if (best && bestSim >= DUP_THRESHOLD)
    e.push(
      `near-duplicate of ${best.key} (${best.source}) — ${(bestSim * 100).toFixed(0)}% content overlap (limit ${(
        DUP_THRESHOLD * 100
      ).toFixed(0)}%)`
    );
  return e;
}

function validate(spec, prior) {
  const e = [];
  const fmt = FORMAT_OF[spec.theme];
  if (spec.theme === "before-after-reel") return ["__REEL__"];
  if (!fmt) e.push(`theme must be health|looksmax (got ${spec.theme})`);
  if (!/^[0-9]{2}-[a-z0-9-]+$/.test(spec.key || "")) e.push(`bad key: ${spec.key}`);

  const s = spec.slides || [];
  if (s.length !== 7) e.push(`need 7 slides, got ${s.length}`);
  const types = s.map((x) => x.type);
  if (types[0] !== "cover") e.push("slide 1 must be cover");
  if (types[6] !== "cta") e.push("slide 7 must be cta");
  if (types.slice(1, 6).some((t) => t !== "content")) e.push("slides 2-6 must be content");

  const num = (spec.key || "").slice(0, 2);
  const c = s[0] || {};
  if (words(c.title) > 9) e.push(`cover title >9 words: "${c.title}"`);
  if (highlights(c.title) !== 1) e.push(`cover title needs exactly 1 *highlight*: "${c.title}"`);
  if (!c.sub) e.push("cover missing sub");
  if (c.bg !== `ai-bg/${num}-cover.png`) e.push(`cover bg should be ai-bg/${num}-cover.png (got ${c.bg})`);

  for (let i = 1; i <= 5; i++) {
    const x = s[i] || {};
    const tag = `content[${i}]`;
    if (words(x.kicker) > 3) e.push(`${tag} kicker >3 words: "${x.kicker}"`);
    if (words(x.title) > 6) e.push(`${tag} title >6 words: "${x.title}"`);
    if (words(x.body) > 25) e.push(`${tag} body >25 words: "${x.body}"`);
    if (highlights(x.body) !== 1) e.push(`${tag} body needs exactly 1 *highlight*: "${x.body}"`);
  }

  const t = s[6] || {};
  if (words(t.title) > 8) e.push(`cta title >8 words: "${t.title}"`);
  if (highlights(t.title) !== 1) e.push(`cta title needs exactly 1 *highlight*: "${t.title}"`);
  if (words(t.body) > 30) e.push(`cta body >30 words`);
  if (!/vibe health/i.test(t.body || "")) e.push("cta body must name Vibe Health");
  if (t.button !== "Download Vibe Health →") e.push(`cta button must be exactly "Download Vibe Health →"`);
  if (!t.tag || t.tag !== t.tag.toLowerCase()) e.push(`cta tag must be lowercase: "${t.tag}"`);
  if (t.bg !== `ai-bg/${num}-cta.png`) e.push(`cta bg should be ai-bg/${num}-cta.png (got ${t.bg})`);

  if (!/→ link in bio/.test(spec.caption || "")) e.push('caption must end with "→ link in bio"');
  if ((spec.caption || "").split(/\n\n/).filter(Boolean).length < 3) e.push("caption needs 3 paragraphs");
  if (!Array.isArray(spec.hashtags) || spec.hashtags.length !== 10) e.push("need exactly 10 hashtags");
  else {
    if (spec.hashtags[9] !== "#vibehealthapp") e.push("last hashtag must be #vibehealthapp");
    if (spec.hashtags.some((h) => !h.startsWith("#"))) e.push("hashtags must start with #");
  }
  if (!spec.youtube_title) e.push("missing youtube_title");
  if (!spec.bg_prompts || !spec.bg_prompts.cover || !spec.bg_prompts.cta)
    e.push("bg_prompts needs cover + cta");

  // uniqueness vs every previously-made carousel in the same format
  e.push(...uniquenessErrors(spec, prior || []));
  return e;
}

// Prior corpus (built once) + this batch's siblings (added per-file below).
const buildDecks = loadBuildDecks();
const campaignDecks = loadCampaignDecks(camp);
const siblingDeck = (f, sp) => ({
  key: sp.key || f.replace(/\.json$/, ""),
  source: "this batch",
  format: FORMAT_OF[sp.theme] || "*",
  hook: deckHook(sp),
  text: deckText(sp),
});

const files = fs.readdirSync(genDir).filter((f) => f.endsWith(".json")).sort();
// pre-parse the batch so each spec can be compared against its siblings
const batch = {};
for (const f of files) {
  try {
    batch[f] = JSON.parse(fs.readFileSync(path.join(genDir, f), "utf8"));
  } catch {
    batch[f] = undefined;
  }
}

let pass = 0,
  fail = 0,
  reels = 0;
for (const f of files) {
  let spec = batch[f];
  if (spec === undefined) {
    try {
      spec = JSON.parse(fs.readFileSync(path.join(genDir, f), "utf8"));
    } catch (err) {
      console.log(`✗ ${f}: invalid JSON — ${err.message}`);
      fail++;
      continue;
    }
  }
  const siblings = files
    .filter((g) => g !== f && batch[g] && batch[g].slides)
    .map((g) => siblingDeck(g, batch[g]));
  const prior = buildDecks.concat(campaignDecks, siblings);

  const errs = validate(spec, prior);
  if (errs[0] === "__REEL__") {
    console.log(`• ${f}: reel spec — manual review (see before-and-after-reels/validation.md)`);
    reels++;
    continue;
  }
  if (errs.length === 0) {
    fs.copyFileSync(path.join(genDir, f), path.join(okDir, f));
    console.log(`✓ ${f}`);
    pass++;
  } else {
    fs.copyFileSync(path.join(genDir, f), path.join(badDir, f));
    console.log(`✗ ${f}`);
    errs.forEach((x) => console.log(`     - ${x}`));
    fail++;
  }
}
console.log(`\n${pass} passed → approved/   ${fail} failed → rejected/   ${reels} reels skipped`);
process.exit(fail ? 1 : 0);
