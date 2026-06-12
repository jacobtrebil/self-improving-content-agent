// Parse CAPTIONS.md for decks 14-23 and emit /tmp/posts2.json:
// [{ dir, date, title, content }]  — content = caption body + blank line + hashtags.
// Evening slots = 7 PM CDT = next-day 00:00Z (the noon series sits at 17:00Z).
const fs = require("fs");

// deck number -> [dir, evening date (UTC), YouTube title]
const META = {
  14: ["14-sharpen-jawline",    "2026-06-11T00:00:00Z", "Sharpen Your Jawline — No Surgery Needed"],
  15: ["15-clear-skin-kitchen", "2026-06-12T00:00:00Z", "Clear Skin Starts in Your Kitchen"],
  16: ["16-under-eye-bags",     "2026-06-13T00:00:00Z", "Kill Your Under-Eye Bags"],
  17: ["17-looksmax-hair",      "2026-06-14T00:00:00Z", "Looksmax Your Hair"],
  18: ["18-leaner-face",        "2026-06-15T00:00:00Z", "How to Get a Leaner Face"],
  19: ["19-stand-taller",       "2026-06-16T00:00:00Z", "Stand Taller — The Instant Looksmax"],
  20: ["20-beauty-sleep",       "2026-06-17T00:00:00Z", "Beauty Sleep Is Actually Real"],
  21: ["21-debloat-face",       "2026-06-18T00:00:00Z", "Debloat Your Face in 3 Days"],
  22: ["22-glow-from-within",   "2026-06-19T00:00:00Z", "Real Glow Comes From Within"],
  23: ["23-looksmax-tier-list", "2026-06-20T00:00:00Z", "The Looksmaxing Tier List"],
};

const md = fs.readFileSync(__dirname + "/CAPTIONS.md", "utf8");
// split into per-deck sections on the "## N · ..." headers
const sections = md.split(/\n## /).map(s => "## " + s);

const posts = [];
for (const num of Object.keys(META).map(Number).sort((a, b) => a - b)) {
  const [dir, date, title] = META[num];
  const sec = sections.find(s => new RegExp(`^## ${num} `).test(s));
  if (!sec) { console.error(`! no section for deck ${num}`); continue; }
  const cap = sec.match(/\*\*Caption:\*\*\s*\n([\s\S]*?)\n\*\*Hashtags:\*\*/);
  const tags = sec.match(/\*\*Hashtags:\*\*\s*\n(#[^\n]*)/);
  if (!cap || !tags) { console.error(`! could not parse deck ${num}`); continue; }
  const content = cap[1].trim() + "\n\n" + tags[1].trim();
  posts.push({ dir, date, title, content });
}

fs.writeFileSync("/tmp/posts2.json", JSON.stringify({ posts }, null, 2));
console.log(`wrote /tmp/posts2.json with ${posts.length} posts`);
for (const p of posts) console.log(`  ${p.dir}  ${p.date.slice(0,10)}  "${p.title}"`);
