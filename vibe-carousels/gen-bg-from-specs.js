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
const { Tracer } = require("../observability/tracer");

const REPO = path.join(__dirname, "..");
const camp = path.resolve(REPO, process.argv[2] || "");
const approved = path.join(camp, "approved");
const aiBg = path.join(__dirname, "ai-bg");
if (!fs.existsSync(approved)) {
  console.error(`no approved/ in ${process.argv[2]}`);
  process.exit(1);
}
fs.mkdirSync(aiBg, { recursive: true });

// Trace this run; spans land in traces/ and campaigns/<camp>/traces/.
const tracer = new Tracer({
  campaignId: path.basename(camp),
  metadata: { step: "gen-bg-from-specs" },
});

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
    jobs.push({ name: `${num}-${which}`, prompt, out, which, format: s.format || null });
  }
}
console.log(`${jobs.length} background(s) to generate\n`);

const CONC = 4;
let done = 0,
  fail = 0;

// Fire the Higgsfield generate + download; resolves with the image url or
// throws on failure so the surrounding span records status="error".
function generate(job) {
  return new Promise((resolve, reject) => {
    execFile(
      "higgsfield",
      ["generate", "create", "gpt_image_2", "--prompt", job.prompt,
       "--aspect_ratio", "3:4", "--resolution", "2k", "--quality", "high", "--wait", "--json"],
      { maxBuffer: 1e8 },
      (err, stdout) => {
        let url = "";
        try { url = (JSON.parse(stdout)[0] || {}).result_url || ""; } catch {}
        if (!url) return reject(new Error("no url (credits/error)"));
        execFile("curl", ["-fsSL", url, "-o", job.out], (e2) => {
          if (e2) return reject(new Error("download failed"));
          resolve(url);
        });
      }
    );
  });
}

// One traced span per background. Swallows the error after tracing so a single
// failed job doesn't abort the rest of the batch (matches prior behavior).
function run(job) {
  return tracer
    .span(
      `generate_bg.${job.name}`,
      async (span) => {
        span.input = job.prompt;
        span.model = "gpt_image_2";
        span.config = { aspect_ratio: "3:4", resolution: "2k", quality: "high" };
        span.promptVersion = "health-carousel/prompt.md#bg_prompts";
        const url = await generate(job);
        span.output = url;
        span.artifacts = [
          { label: "image", url },
          { label: "file", path: path.relative(REPO, job.out) },
        ];
        console.log(`✓ ${job.name}`);
        done++;
        return url;
      },
      { metadata: { which: job.which, format: job.format } }
    )
    .catch((err) => {
      console.log(`✗ ${job.name}: ${err.message}`);
      fail++;
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
  const s = tracer.summary();
  console.log(`trace ${s.traceId}: ${s.spans} span(s), $${s.costUsd} → ${s.files.map((f) => path.relative(REPO, f)).join(", ")}`);
})();
