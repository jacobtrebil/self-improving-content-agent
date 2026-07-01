#!/usr/bin/env node
// Pull a REAL royalty-free photo for EVERY gym-carousel slide from Openverse
// (CC0 / public-domain, no API key, no attribution, $0), into vibe-carousels/<slide.img>.
// Each slide spec has `img` (ai-bg/<NN>-<SS>.png) + `img_query` (a short stock search).
//
// Usage:
//   node vibe-carousels/gen-gym-images.js                 # all gym examples + campaign decks
//   node vibe-carousels/gen-gym-images.js campaigns/<dir> # one campaign's approved gym decks
//   node vibe-carousels/gen-gym-images.js --force         # re-fetch existing images

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO = path.join(__dirname, "..");
const UA = "vibe-health-carousels/1.0 (jacobtrebil@gmail.com)";
const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const onlyCamp = args.find((a) => !a.startsWith("--"));

const nap = (sec) => { try { execFileSync("sleep", [String(sec)]); } catch {} };
// Real photos from Wikimedia Commons (keyless, generous limits, freely-licensed).
function fetchPhoto(query) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=15&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=1200`;
  let j = null;
  for (let a = 1; a <= 5 && !j; a++) {
    try { j = JSON.parse(execFileSync("curl", ["-fsSL", "--max-time", "30", "-H", `User-Agent: ${UA}`, api], { encoding: "utf8", maxBuffer: 1e8 })); }
    catch (e) { if (a === 5) return null; nap(a * 4); }
  }
  const pages = (j.query && j.query.pages) ? Object.values(j.query.pages) : [];
  const cand = pages
    .map((p) => p.imageinfo && p.imageinfo[0])
    .filter((ii) => ii && /jpeg|png/.test(ii.mime || "") && (ii.width || 0) >= 800 && (ii.height || 0) >= (ii.width || 0) * 0.7)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const pick = cand[0];
  return pick ? { url: pick.thumburl || pick.url, source: "wikimedia", license: "commons" } : null;
}

function gather() {
  const specs = [];
  if (!onlyCamp) {
    const exDir = path.join(REPO, "formats", "gym-carousel", "examples");
    if (fs.existsSync(exDir))
      for (const f of fs.readdirSync(exDir).filter((x) => /^good-.*\.json$/.test(x)))
        specs.push(JSON.parse(fs.readFileSync(path.join(exDir, f), "utf8")));
  }
  const camps = onlyCamp ? [path.resolve(REPO, onlyCamp)] : fs.existsSync(path.join(REPO, "campaigns")) ? fs.readdirSync(path.join(REPO, "campaigns")).map((c) => path.join(REPO, "campaigns", c)) : [];
  for (const camp of camps) {
    const appr = path.join(camp, "approved");
    if (!fs.existsSync(appr)) continue;
    for (const f of fs.readdirSync(appr).filter((x) => x.endsWith(".json"))) {
      try { const s = JSON.parse(fs.readFileSync(path.join(appr, f), "utf8")); if (s.theme === "gym") specs.push(s); } catch {}
    }
  }
  return specs;
}

let ok = 0, fail = 0; const seen = new Set();
for (const spec of gather()) {
  if (seen.has(spec.key)) continue; seen.add(spec.key);
  for (const s of spec.slides) {
    const q = s.img_query || s.img_prompt;
    if (!s.img || !q) continue;
    const out = path.join(REPO, "vibe-carousels", s.img);
    const name = path.basename(s.img, ".png");
    if (fs.existsSync(out) && !FORCE) { console.log(`skip ${name} (exists)`); continue; }
    nap(4); // pace requests so we don't trip Openverse's anonymous rate limit
    const pick = fetchPhoto(q);
    if (!pick) { console.log(`✗ ${name}: no CC0 photo for "${q}"`); fail++; continue; }
    try {
      execFileSync("curl", ["-fsSL", "--max-time", "60", "-H", `User-Agent: ${UA}`, pick.url, "-o", out + ".raw"], { stdio: "ignore" });
      execFileSync("sips", ["-s", "format", "png", "--resampleWidth", "1200", out + ".raw", "--out", out], { stdio: "ignore" });
      fs.unlinkSync(out + ".raw");
      console.log(`✓ ${name}  [${pick.source}/${pick.license}]  "${(pick.title || "").slice(0, 36)}"`);
      ok++;
    } catch (e) { console.log(`✗ ${name}: download/convert failed`); fail++; }
  }
}
console.log(`\ngym photos: ${ok} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
