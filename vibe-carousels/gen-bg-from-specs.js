#!/usr/bin/env node
// Generate the cover/cta AI backgrounds for a campaign's approved carousel specs
// via Higgsfield (GPT Image 2), into vibe-carousels/ai-bg/<NN>-cover|cta.png.
// Reads bg_prompts.cover / bg_prompts.cta from each approved/*.json. Skips files
// that already exist. Runs a few jobs concurrently.
//
// Usage:  node vibe-carousels/gen-bg-from-specs.js campaigns/<campaign-dir>

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const REPO = path.join(__dirname, "..");
const camp = path.resolve(REPO, process.argv[2] || "");
const approved = path.join(camp, "approved");
const aiBg = path.join(__dirname, "ai-bg");
if (!fs.existsSync(approved)) {
  console.error(`no approved/ in ${process.argv[2]}`);
  process.exit(1);
}
fs.mkdirSync(aiBg, { recursive: true });

const jobs = [];
for (const f of fs.readdirSync(approved).filter((x) => x.endsWith(".json"))) {
  const s = JSON.parse(fs.readFileSync(path.join(approved, f), "utf8"));
  const num = String(s.key).slice(0, 2);
  for (const which of ["cover", "cta"]) {
    const out = path.join(aiBg, `${num}-${which}.png`);
    const prompt = s.bg_prompts && s.bg_prompts[which];
    if (!prompt) continue;
    if (fs.existsSync(out)) {
      console.log(`skip ${num}-${which} (exists)`);
      continue;
    }
    jobs.push({ name: `${num}-${which}`, prompt, out });
  }
}
console.log(`${jobs.length} background(s) to generate\n`);

const CONC = 4;
let done = 0,
  fail = 0;

function run(job) {
  return new Promise((res) => {
    execFile(
      "higgsfield",
      ["generate", "create", "gpt_image_2", "--prompt", job.prompt,
       "--aspect_ratio", "3:4", "--resolution", "2k", "--quality", "high", "--wait", "--json"],
      { maxBuffer: 1e8 },
      (err, stdout) => {
        let url = "";
        try { url = (JSON.parse(stdout)[0] || {}).result_url || ""; } catch {}
        if (!url) { console.log(`✗ ${job.name}: no url (credits/error)`); fail++; return res(); }
        execFile("curl", ["-fsSL", url, "-o", job.out], (e2) => {
          if (e2) { console.log(`✗ ${job.name}: download failed`); fail++; }
          else { console.log(`✓ ${job.name}`); done++; }
          res();
        });
      }
    );
  });
}

(async () => {
  const running = [];
  for (const job of jobs) {
    const p = run(job).then(() => running.splice(running.indexOf(p), 1));
    running.push(p);
    if (running.length >= CONC) await Promise.race(running);
  }
  await Promise.all(running);
  console.log(`\nbackgrounds: ${done} ok, ${fail} failed, ${jobs.length} attempted`);
})();
