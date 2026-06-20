#!/usr/bin/env node
// Free fallback for gen-bg-from-specs.js: generate the cover/cta AI backgrounds
// for a campaign's approved carousel specs via Pollinations (no API key, $0),
// into vibe-carousels/ai-bg/<NN>-cover|cta.png. Same bg_prompts, same house
// style. Skips files that already exist. Use when Higgsfield credits are out.
//
// Usage:  node vibe-carousels/gen-bg-pollinations.js campaigns/<campaign-dir>

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO = path.join(__dirname, "..");
const camp = path.resolve(REPO, process.argv[2] || "");
const approved = path.join(camp, "approved");
const aiBg = path.join(__dirname, "ai-bg");
if (!fs.existsSync(approved)) { console.error(`no approved/ in ${process.argv[2]}`); process.exit(1); }
fs.mkdirSync(aiBg, { recursive: true });

const stableSeed = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 100000; };

const jobs = [];
for (const f of fs.readdirSync(approved).filter((x) => x.endsWith(".json"))) {
  const s = JSON.parse(fs.readFileSync(path.join(approved, f), "utf8"));
  const nn = String(s.key).slice(0, 2);
  for (const which of ["cover", "cta"]) {
    const out = path.join(aiBg, `${nn}-${which}.png`);
    const prompt = s.bg_prompts && s.bg_prompts[which];
    if (!prompt) continue;
    if (fs.existsSync(out)) { console.log(`skip ${nn}-${which} (exists)`); continue; }
    jobs.push({ name: `${nn}-${which}`, prompt, out, seed: stableSeed(`${nn}-${which}`) });
  }
}
console.log(`${jobs.length} background(s) to generate via Pollinations\n`);

function fetchOne(job) {
  const enc = encodeURIComponent(job.prompt);
  const url = `https://image.pollinations.ai/prompt/${enc}?width=1080&height=1440&nologo=true&model=flux&seed=${job.seed}`;
  const tmp = `${job.out}.raw`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      execFileSync("curl", ["-fsSL", "--max-time", "120", url, "-o", tmp], { stdio: "ignore" });
      const sz = fs.statSync(tmp).size;
      if (sz < 5000) throw new Error(`tiny file (${sz}b)`);
      // Convert to PNG and resize PROPORTIONALLY to ~1080 wide (never force an
      // exact W×H — that stretches/squeezes the image). The renderer uses
      // background-size:cover, which crops to fit without distortion.
      execFileSync("sips", ["-s", "format", "png", "--resampleWidth", "1080", tmp, "--out", job.out], { stdio: "ignore" });
      fs.unlinkSync(tmp);
      return true;
    } catch (e) {
      if (attempt === 4) { try { fs.existsSync(tmp) && fs.unlinkSync(tmp); } catch {} return false; }
    }
  }
}

const CONC = 3;
let done = 0, fail = 0;
(async () => {
  const queue = [...jobs];
  async function worker() {
    while (queue.length) {
      const job = queue.shift();
      const ok = await Promise.resolve().then(() => fetchOne(job));
      if (ok) { console.log(`✓ ${job.name}`); done++; } else { console.log(`✗ ${job.name}`); fail++; }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log(`\nbackgrounds: ${done} ok, ${fail} failed, ${jobs.length} attempted`);
  process.exit(fail ? 1 : 0);
})();
