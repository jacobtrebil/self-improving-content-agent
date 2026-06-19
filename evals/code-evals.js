// Code-based evals — deterministic, fast structural checks on a carousel spec.
// Pure functions only (no fs / no network), so they're cheap to run every time
// and trivial to unit-test. Mirrors the hard structural expectations in
// /formats/health-carousel/schema.yaml + validation.md, framed as scored evals.
//
// Each check returns { name, pass, score (0..1), detail }.
// runCodeEvals(spec) aggregates them.

// House background style differs by format: health uses a "photograph" prefix,
// looksmax uses a "beauty portrait" prefix (see each format's prompt.md). Both
// share this leading stem, which is enough to confirm the house monochrome style.
const HOUSE_PREFIX = "Black-and-white cinematic editorial";
const VALID_THEMES = ["health", "looksmax"];
const CTA_BUTTON = "Download Vibe Health →";
const CAPTION_MAX = 2200; // TikTok caption cap (conservative shared limit across TikTok + YouTube)
const hasHighlight = (s) => typeof s === "string" && /\*[^*]+\*/.test(s);
const slidesOf = (spec) => (Array.isArray(spec.slides) ? spec.slides : []);

// 1. Slide count — 7 (1 cover + 5 content + 1 cta), or 9 for a list deck.
function slideCount(spec) {
  const n = slidesOf(spec).length;
  const pass = n === 7 || n === 9;
  return { name: "slide_count", pass, score: pass ? 1 : 0, detail: `${n} slides (want 7 or 9)` };
}

// 2. Has a real hook — first slide is a cover with a highlighted title and a sub.
function hasHook(spec) {
  const cover = slidesOf(spec)[0];
  const ok = !!cover && cover.type === "cover" && hasHighlight(cover.title) && !!(cover.sub || "").trim();
  return {
    name: "has_hook",
    pass: ok,
    score: ok ? 1 : 0,
    detail: ok ? `"${String(cover.title).slice(0, 50)}"` : "missing cover/title-highlight/sub",
  };
}

// 3. Has a CTA — last slide is a cta with the exact brand button.
function hasCta(spec) {
  const last = slidesOf(spec).slice(-1)[0];
  const ok = !!last && last.type === "cta" && last.button === CTA_BUTTON && hasHighlight(last.title);
  return {
    name: "has_cta",
    pass: ok,
    score: ok ? 1 : 0,
    detail: ok ? "cta + exact button" : `button must be "${CTA_BUTTON}" + highlighted title`,
  };
}

// 4. Caption under limit — present, 3 paragraphs, within the platform char cap.
function captionUnderLimit(spec) {
  const cap = typeof spec.caption === "string" ? spec.caption : "";
  const paras = cap.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const len = cap.length;
  const pass = len > 0 && len <= CAPTION_MAX && paras === 3;
  return {
    name: "caption_under_limit",
    pass,
    score: pass ? 1 : 0,
    detail: `${len}/${CAPTION_MAX} chars, ${paras} paragraphs (want 3)`,
  };
}

// 5. Follows JSON schema — required fields + shapes the renderer depends on.
function followsJsonSchema(spec) {
  const problems = [];
  if (!/^[0-9]{2}-[a-z0-9-]+$/.test(spec.key || "")) problems.push("key");
  if (!VALID_THEMES.includes(spec.theme)) problems.push(`theme not in ${VALID_THEMES.join("/")}`);
  if (!spec.eyebrow) problems.push("eyebrow");
  if (!Array.isArray(spec.hashtags) || spec.hashtags.length !== 10) problems.push("hashtags!=10");
  else if (spec.hashtags[spec.hashtags.length - 1] !== "#vibehealthapp") problems.push("last hashtag");
  if (!spec.youtube_title) problems.push("youtube_title");
  if (!spec.bg_prompts || !spec.bg_prompts.cover || !spec.bg_prompts.cta) problems.push("bg_prompts");
  const types = slidesOf(spec).map((s) => s.type);
  if (types[0] !== "cover" || types[types.length - 1] !== "cta") problems.push("slide order");
  const pass = problems.length === 0;
  return { name: "follows_json_schema", pass, score: pass ? 1 : 0, detail: pass ? "ok" : problems.join(", ") };
}

// 6. Has required image prompts — cover + cta, in the house monochrome style.
function hasImagePrompts(spec) {
  const bp = spec.bg_prompts || {};
  const okCover = typeof bp.cover === "string" && bp.cover.includes(HOUSE_PREFIX);
  const okCta = typeof bp.cta === "string" && bp.cta.includes(HOUSE_PREFIX);
  const pass = okCover && okCta;
  return {
    name: "has_image_prompts",
    pass,
    score: pass ? 1 : 0,
    detail: pass ? "cover+cta, house style" : `cover:${okCover ? "ok" : "✗"} cta:${okCta ? "ok" : "✗"}`,
  };
}

const CHECKS = [slideCount, hasHook, hasCta, captionUnderLimit, followsJsonSchema, hasImagePrompts];

function runCodeEvals(spec) {
  const results = CHECKS.map((fn) => fn(spec));
  const passed = results.filter((r) => r.pass).length;
  return {
    results,
    passed,
    total: results.length,
    pass: passed === results.length,
    score: Math.round((passed / results.length) * 100) / 100,
  };
}

module.exports = {
  runCodeEvals,
  slideCount,
  hasHook,
  hasCta,
  captionUnderLimit,
  followsJsonSchema,
  hasImagePrompts,
};
