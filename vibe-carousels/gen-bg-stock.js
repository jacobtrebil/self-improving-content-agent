#!/usr/bin/env node
// Brand-carousel cover images from REAL royalty-free photos — no API key, $0.
// Pulls CC0 / public-domain photos (no attribution required) from the Openverse
// API using each brand deck's `cover_query`, into vibe-carousels/ai-bg/<NN>-cover.png.
// build_brand.js shows the photo in the cover's top band (landscape-friendly).
//
// Usage:
//   node vibe-carousels/gen-bg-stock.js                 # all brand examples + campaign decks
//   node vibe-carousels/gen-bg-stock.js campaigns/<dir> # just one campaign's approved brand decks
//   node vibe-carousels/gen-bg-stock.js --force         # re-fetch even if a cover exists

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO = path.join(__dirname, "..");
const aiBg = path.join(__dirname, "ai-bg");
fs.mkdirSync(aiBg, { recursive: true });
const UA = "vibe-health-carousels/1.0 (jacobtrebil@gmail.com)";
const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const onlyCamp = args.find((a) => !a.startsWith("--"));

// CC0 + Public Domain Mark only => commercial use with NO attribution required.
function fetchPhoto(query) {
  const api = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license=cc0,pdm&size=large&page_size=20&mature=false`;
  let j = null;
  for (let attempt = 1; attempt <= 4 && !j; attempt++) {
    try { j = JSON.parse(execFileSync("curl", ["-fsSL", "--max-time", "30", "-H", `User-Agent: ${UA}`, api], { encoding: "utf8", maxBuffer: 1e8 })); }
    catch (e) { if (attempt === 4) return null; } // 403 = anonymous rate limit; retry
  }
  // prefer curated sources (nicer photos) over documentary ones, require decent size
  const order = { stocksnap: 0, rawpixel: 1, flickr: 2, wikimedia: 3 };
  const usable = (j.results || []).filter((r) => r.url && (r.width || 0) >= 1000)
    .sort((a, b) => (order[a.source] ?? 9) - (order[b.source] ?? 9));
  return usable[0] || null;
}

function gather() {
  const specs = [];
  if (!onlyCamp) {
    const exDir = path.join(REPO, "formats", "brand-carousel", "examples");
    if (fs.existsSync(exDir))
      for (const f of fs.readdirSync(exDir).filter((x) => /^good-.*\.json$/.test(x)))
        specs.push(JSON.parse(fs.readFileSync(path.join(exDir, f), "utf8")));
  }
  const camps = onlyCamp ? [path.resolve(REPO, onlyCamp)] : fs.existsSync(path.join(REPO, "campaigns")) ? fs.readdirSync(path.join(REPO, "campaigns")).map((c) => path.join(REPO, "campaigns", c)) : [];
  for (const camp of camps) {
    const appr = path.join(camp, "approved");
    if (!fs.existsSync(appr)) continue;
    for (const f of fs.readdirSync(appr).filter((x) => x.endsWith(".json"))) {
      try { const s = JSON.parse(fs.readFileSync(path.join(appr, f), "utf8")); if (["brand", "health", "looksmax"].includes(s.theme)) specs.push(s); } catch {}
    }
  }
  return specs;
}

let ok = 0, fail = 0;
for (const spec of gather()) {
  const nn = (String(spec.key).match(/^\d+/) || ["?"])[0]; // full numeric prefix (2 or 3 digits)
  // Brand decks only need a cover photo (CTA = product screenshots). The stark
  // health/looksmax formats put a photo on BOTH the cover and the CTA, so fetch
  // each `<which>_query` that's present.
  const targets = [{ which: "cover", q: spec.cover_query }];
  if (spec.theme !== "brand") targets.push({ which: "cta", q: spec.cta_query });
  for (const { which, q } of targets) {
    const out = path.join(aiBg, `${nn}-${which}.png`);
    if (!q) { console.log(`skip ${nn}-${which} (no ${which}_query)`); continue; }
    if (fs.existsSync(out) && !FORCE) { console.log(`skip ${nn}-${which} (exists; --force to refetch)`); continue; }
    const pick = fetchPhoto(q);
    if (!pick) { console.log(`✗ ${nn}-${which}: no CC0 photo for "${q}"`); fail++; continue; }
    try {
      execFileSync("curl", ["-fsSL", "--max-time", "60", "-H", `User-Agent: ${UA}`, pick.url, "-o", out + ".raw"], { stdio: "ignore" });
      // proportional resize only (never force aspect — the renderer crops with cover)
      execFileSync("sips", ["-s", "format", "png", "--resampleWidth", "1200", out + ".raw", "--out", out], { stdio: "ignore" });
      fs.unlinkSync(out + ".raw");
      console.log(`✓ ${nn}-${which}  [${pick.source}/${pick.license}, no attribution]  "${(pick.title || "").slice(0, 40)}"`);
      ok++;
    } catch (e) { console.log(`✗ ${nn}-${which}: download/convert failed (${e.message})`); fail++; }
  }
}
console.log(`\ncovers: ${ok} ok, ${fail} failed`);
