#!/usr/bin/env node
// Structural validator for the brand-carousel format (theme "brand"), which
// build.js/validate.js don't handle. Checks /formats/brand-carousel/validation.md
// hard-fails: slide structure + word/highlight limits, screens (no button), a
// cover_query, NO em dashes, 10 hashtags, etc. Passing specs -> approved/.
//
// Usage: node formats/validate-brand.js campaigns/<campaign-dir>

const fs = require("fs");
const path = require("path");
const REPO = path.join(__dirname, "..");
const camp = path.resolve(REPO, process.argv[2] || "");
const genDir = path.join(camp, "generated");
const okDir = path.join(camp, "approved");
const badDir = path.join(camp, "rejected");
if (!fs.existsSync(genDir)) { console.error(`no generated/ in ${process.argv[2]}`); process.exit(1); }
fs.mkdirSync(okDir, { recursive: true }); fs.mkdirSync(badDir, { recursive: true });

const norm = (s) => String(s == null ? "" : s).replace(/\*/g, "").replace(/\s+/g, " ").trim();
const words = (s) => norm(s).split(" ").filter(Boolean).length;
const highlights = (s) => (String(s).match(/\*[^*]+\*/g) || []).length;
const hasEmDash = (s) => /—/.test(String(s == null ? "" : s));
const asteriskBalanced = (s) => ((String(s).match(/\*/g) || []).length % 2) === 0;

function validate(spec) {
  const e = [];
  if (!/^[0-9]{2,3}-[a-z0-9-]+$/.test(spec.key || "")) e.push("bad key");
  if (spec.theme !== "brand") e.push("theme!=brand");
  if (!spec.eyebrow || words(spec.eyebrow) > 2) e.push("eyebrow missing/>2 words");
  if (spec.bg_prompts) e.push("must not have bg_prompts (use cover_query)");
  if (!spec.cover_query || words(spec.cover_query) < 1) e.push("missing cover_query");
  if (!spec.youtube_title) e.push("missing youtube_title");
  if (!Array.isArray(spec.hashtags) || spec.hashtags.length !== 10) e.push("hashtags!=10");
  else if (spec.hashtags[9] !== "#vibehealthapp") e.push("last hashtag != #vibehealthapp");
  const cap = typeof spec.caption === "string" ? spec.caption : "";
  if (!cap) e.push("missing caption");
  else if (cap.split(/\n\s*\n/).filter((p) => p.trim()).length !== 3) e.push("caption != 3 paragraphs");

  const slides = Array.isArray(spec.slides) ? spec.slides : [];
  if (slides.length < 6 || slides.length > 8) e.push(`slides=${slides.length} (want 7)`);
  if (slides[0] && slides[0].type !== "cover") e.push("slide 1 != cover");
  if (slides.length && slides[slides.length - 1].type !== "cta") e.push("last slide != cta");

  // em dashes anywhere in copy
  const allText = [];
  slides.forEach((s) => ["title", "sub", "kicker", "body", "cta_text", "tag"].forEach((k) => s[k] && allText.push(s[k])));
  allText.push(cap, spec.youtube_title);
  if (allText.some(hasEmDash)) e.push("contains em dash (—)");

  slides.forEach((s, i) => {
    const tag = `slide${i + 1}(${s.type})`;
    if (s.type === "cover") {
      if (words(s.title) > 10) e.push(`${tag} title >10 words`);
      if (highlights(s.title) > 1) e.push(`${tag} >1 highlight`);
      if (!s.sub) e.push(`${tag} missing sub`);
      if (!s.bg || !/^ai-bg\/\d+-cover\.png$/.test(s.bg)) e.push(`${tag} bad/missing bg`);
    } else if (s.type === "cta") {
      if (words(s.title) > 8) e.push(`${tag} title >8 words`);
      if (highlights(s.title) > 1) e.push(`${tag} >1 highlight`);
      if (words(s.body) > 30) e.push(`${tag} body >30 words`);
      if (s.button) e.push(`${tag} must not have button`);
      const sc = Array.isArray(s.screens) ? s.screens : [];
      if (sc.length < 1 || sc.length > 2 || !sc.every((x) => ["plan", "score"].includes(x))) e.push(`${tag} bad screens`);
      if (!s.cta_text) e.push(`${tag} missing cta_text`);
    } else if (s.type === "content") {
      if (words(s.kicker) > 3) e.push(`${tag} kicker >3 words`);
      if (words(s.title) > 6) e.push(`${tag} title >6 words`);
      if (words(s.body) > 25) e.push(`${tag} body >25 words`);
      if (highlights(s.body) > 1) e.push(`${tag} body >1 highlight`);
    } else e.push(`${tag} unknown type`);
    // asterisk balance + highlight phrase length on any field
    ["title", "body", "sub"].forEach((k) => {
      if (s[k] != null) {
        if (!asteriskBalanced(s[k])) e.push(`${tag} ${k} unbalanced *`);
        (String(s[k]).match(/\*([^*]+)\*/g) || []).forEach((m) => { if (words(m) > 5) e.push(`${tag} ${k} highlight >5 words`); });
      }
    });
  });
  return e;
}

let pass = 0, fail = 0;
for (const f of fs.readdirSync(genDir).filter((x) => x.endsWith(".json")).sort()) {
  let spec;
  try { spec = JSON.parse(fs.readFileSync(path.join(genDir, f), "utf8")); }
  catch (err) { console.log(`✗ ${f}: invalid JSON (${err.message})`); fail++; continue; }
  const errs = validate(spec);
  if (errs.length === 0) {
    fs.copyFileSync(path.join(genDir, f), path.join(okDir, f));
    console.log(`✓ ${f}`); pass++;
  } else {
    fs.copyFileSync(path.join(genDir, f), path.join(badDir, f));
    console.log(`✗ ${f}`); errs.forEach((x) => console.log(`     - ${x}`)); fail++;
  }
}
console.log(`\n${pass} passed → approved/   ${fail} failed → rejected/`);
process.exit(fail ? 1 : 0);
