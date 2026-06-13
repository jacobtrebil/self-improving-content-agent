// Maps a live Postiz post to one of the content formats in /formats.
//
// Source of truth for carousels is vibe-carousels/CAPTIONS.md: each deck's
// caption body is distinctive, so we match a post's caption against it and use
// the deck number to pick the format. Reels (transformation videos) aren't in
// CAPTIONS.md, so they're caught by a keyword rule first.
//
// Deck → format ranges (how the campaigns were actually built):
//   01–02, 14–23  → looksmax-carousel
//   03–13         → health-carousel
//   reels         → before-and-after-reels
const fs = require("fs");
const path = require("path");

const REPO = path.join(__dirname, "..");
const CAPTIONS = path.join(REPO, "vibe-carousels", "CAPTIONS.md");

// Transformation / before-after reels — captions never overlap the carousels.
const REEL_RE =
  /(transform your physique|unleash the beast|build raw strength|day 1.*day 90|90 days later|same (guy|person)\.? new habits)/i;

function stripHtml(t) {
  return String(t || "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ");
}
function norm(t) {
  return stripHtml(t).replace(/\s+/g, " ").trim().toLowerCase();
}

// Parse CAPTIONS.md → [{ num, title, theme, firstLine }]
function parseDecks() {
  if (!fs.existsSync(CAPTIONS)) return [];
  const md = fs.readFileSync(CAPTIONS, "utf8");
  const decks = [];
  for (const sec of md.split(/\n## /).slice(1)) {
    const head = sec.match(/^(\d+) · "(.+?)" \((.+?)\)/);
    if (!head) continue;
    const cap = sec.match(/\*\*Caption:\*\*\s*\n([\s\S]*?)\n\*\*Hashtags/);
    const firstLine = cap ? cap[1].trim().split("\n")[0].trim() : "";
    decks.push({ num: +head[1], title: head[2], theme: head[3], firstLine });
  }
  return decks;
}

function deckFormat(num) {
  return num >= 3 && num <= 13 ? "health-carousel" : "looksmax-carousel";
}

const FORMATS = ["health-carousel", "looksmax-carousel", "before-and-after-reels"];

// classify(content, decks?) → { format, deck, theme } | { format:"unknown", ... }
function classify(content, decks = parseDecks()) {
  const c = norm(content);
  if (REEL_RE.test(c)) {
    return { format: "before-and-after-reels", deck: "reel", theme: "transformation" };
  }
  const hit = decks.find(
    (d) => d.firstLine && c.startsWith(norm(d.firstLine).slice(0, 38))
  );
  if (hit) {
    return { format: deckFormat(hit.num), deck: hit.num, theme: hit.theme };
  }
  return { format: "unknown", deck: null, theme: null };
}

module.exports = { parseDecks, classify, FORMATS, stripHtml, norm };
