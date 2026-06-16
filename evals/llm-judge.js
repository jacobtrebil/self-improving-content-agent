// LLM-as-judge — scores a carousel spec on subjective quality dimensions using a
// DIFFERENT model than the one that wrote it (generator is Opus via the agent;
// judge defaults to Sonnet) to avoid a model grading its own work.
//
// No API key required: we shell out to the headless Claude Code CLI
//   claude -p <prompt> --model <judge> --output-format json
// whose JSON envelope hands back the model's text (`result`) plus real token
// usage and `total_cost_usd` — so judge spans carry true cost/token data.
//
// judgeSpec(spec, opts) resolves to:
//   { skipped:false, scores:{...1-5}, rationales:{...}, overall, model,
//     tokensIn, tokensOut, costUsd, raw }
// or { skipped:true, reason, costUsd } if the CLI isn't usable.

const { execFile } = require("child_process");

const DIMENSIONS = [
  ["hook_strength", "Would the cover stop a scroll? Specific, contrarian, concrete payoff."],
  ["clarity", "Is each slide one clear idea a reader could act on this week?"],
  ["audience_fit", "Right for 20–35, busy, tired-by-3pm, health-curious but overwhelmed?"],
  ["novelty", "Fresh angle, or generic advice they've seen a hundred times?"],
  ["brand_fit", "Vibe Health voice: plain, hedged health claims, no AI-cringe, real CTA?"],
  ["predicted_performance", "Your bet on saves/shares relative to a typical health carousel."],
];

const BRAND = `Vibe Health is an AI health coach app (vibehealthapp.com) that scores sleep,
food, water and steps into one daily Health Score. Voice: plain, direct, native to
TikTok/IG, mildly contrarian, never hypey ("unlock/elevate/game-changer" are banned),
health claims are hedged ("may help", "can support"), never guaranteed.`;

function deckToText(spec) {
  const slides = (spec.slides || [])
    .map((s, i) => {
      if (s.type === "cover") return `Slide ${i + 1} (cover): ${s.title}\n  sub: ${s.sub}`;
      if (s.type === "cta") return `Slide ${i + 1} (cta): ${s.title}\n  body: ${s.body}\n  button: ${s.button}`;
      return `Slide ${i + 1} (content): [${s.kicker}] ${s.title}\n  body: ${s.body}`;
    })
    .join("\n");
  return `KEY: ${spec.key}\nTOPIC/EYEBROW: ${spec.eyebrow}\n\n${slides}\n\nCAPTION:\n${spec.caption}\n\nHASHTAGS: ${(spec.hashtags || []).join(" ")}`;
}

function buildPrompt(spec, audience) {
  const dims = DIMENSIONS.map(([k, d]) => `- ${k}: ${d}`).join("\n");
  return `You are a senior short-form content editor grading a health carousel for Instagram/TikTok.

BRAND:
${BRAND}
${audience ? `\nTARGET AUDIENCE: ${audience}\n` : ""}
Grade the deck below on each dimension from 1 (poor) to 5 (excellent):
${dims}

DECK:
${deckToText(spec)}

Respond with ONLY a JSON object, no prose, no markdown fences, in exactly this shape:
{"hook_strength":{"score":N,"why":"..."},"clarity":{"score":N,"why":"..."},"audience_fit":{"score":N,"why":"..."},"novelty":{"score":N,"why":"..."},"brand_fit":{"score":N,"why":"..."},"predicted_performance":{"score":N,"why":"..."}}
Each "why" is one short sentence. Be a tough but fair grader.`;
}

// Pull the first balanced {...} object out of model text (handles stray prose/fences).
function extractJson(text) {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function judgeSpec(spec, opts = {}) {
  const model = opts.model || process.env.JUDGE_MODEL || "sonnet";
  const prompt = buildPrompt(spec, opts.audience);
  return new Promise((resolve) => {
    execFile(
      "claude",
      ["-p", prompt, "--model", model, "--output-format", "json"],
      { maxBuffer: 1e8, timeout: opts.timeoutMs || 180000 },
      (err, stdout) => {
        if (err && !stdout) return resolve({ skipped: true, reason: `claude CLI failed: ${err.message}`, costUsd: null });
        let env;
        try {
          env = JSON.parse(stdout);
        } catch {
          return resolve({ skipped: true, reason: "could not parse CLI envelope", costUsd: null, raw: stdout.slice(0, 500) });
        }
        const scoresObj = extractJson(env.result || "");
        if (!scoresObj) {
          return resolve({ skipped: true, reason: "judge did not return JSON scores", costUsd: env.total_cost_usd ?? null, raw: env.result });
        }
        const scores = {};
        const rationales = {};
        for (const [k] of DIMENSIONS) {
          const v = scoresObj[k] || {};
          scores[k] = typeof v.score === "number" ? v.score : null;
          rationales[k] = v.why || null;
        }
        const vals = Object.values(scores).filter((n) => typeof n === "number");
        const overall = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
        // resolve the concrete model id from per-model usage when available
        const resolvedModel = env.modelUsage ? Object.keys(env.modelUsage).find((m) => m.includes("sonnet") || m.includes(model)) || model : model;
        resolve({
          skipped: false,
          scores,
          rationales,
          overall,
          model: resolvedModel,
          tokensIn: env.usage ? (env.usage.input_tokens || 0) + (env.usage.cache_read_input_tokens || 0) + (env.usage.cache_creation_input_tokens || 0) : null,
          tokensOut: env.usage ? env.usage.output_tokens : null,
          costUsd: env.total_cost_usd ?? null,
          raw: scoresObj,
        });
      }
    );
  });
}

module.exports = { judgeSpec, DIMENSIONS, buildPrompt };
