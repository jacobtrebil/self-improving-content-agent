#!/usr/bin/env node
// Validate a campaign's generated/ carousel specs against the format hard-fails
// (see /formats/<format>/validation.md). Passing specs are copied to approved/.
//
// Usage:  node formats/validate.js campaigns/<campaign-dir>
//
// Covers health-carousel + looksmax-carousel (shared schema). Reel specs are
// reported as "manual review" — their schema differs (see before-and-after-reels).

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

// existing cover hooks (for reuse check)
const buildJs = fs.readFileSync(path.join(REPO, "vibe-carousels", "build.js"), "utf8");
const norm = (s) => s.replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const existingHooks = new Set(
  (buildJs.match(/title: "([^"]+)"/g) || []).map((m) => norm(m.slice(8, -1)))
);

const words = (s) => norm(s).split(" ").filter(Boolean).length;
const highlights = (s) => (String(s).match(/\*[^*]+\*/g) || []).length;
const FORMAT_OF = { health: "health-carousel", looksmax: "looksmax-carousel" };

function validate(spec) {
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
  if (c.title && existingHooks.has(norm(c.title))) e.push(`cover hook reuses an existing deck: "${c.title}"`);

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
  return e;
}

const files = fs.readdirSync(genDir).filter((f) => f.endsWith(".json")).sort();
let pass = 0,
  fail = 0,
  reels = 0;
for (const f of files) {
  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(path.join(genDir, f), "utf8"));
  } catch (err) {
    console.log(`✗ ${f}: invalid JSON — ${err.message}`);
    fail++;
    continue;
  }
  const errs = validate(spec);
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
