// Generates 9:16 HTML slides for the GYM-BRO carousel format (theme "gym").
// TikTok-caption style: white text with a black outline, kept small. Slide 1 is
// an avatar photo (from assets/avatar, copied into ai-bg). Content slides 2-6 are
// plain black with text only (no image). The LAST slide reuses the professional
// brand-account close (real app screenshots as phone mockups). Output:
// vibe-carousels/<key>/slide-NN-tt.html.

const fs = require("fs");
const path = require("path");

const W = 1080, H = 1920, SUF = "-tt";
const REPO = path.join(__dirname, "..");

// brand-account close assets (shared with build_brand.js)
const SCREENS = { plan: "../brand-assets/plan.png", score: "../brand-assets/score.png" };
const LOGO = "../brand-assets/logo.webp";
const GREEN = "#22c55e", GREEN_DK = "#15803d", INK = "#06230f";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=TikTok+Sans:wght@500;700;800;900&family=Fraunces:opsz,wght@9..144,500&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;background:#000}
.slide{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:#000;
  display:flex;flex-direction:column;justify-content:center;align-items:center;padding:120px 96px;
  font-family:'TikTok Sans','Helvetica Neue',Arial,system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;text-align:center}
.bg{position:absolute;inset:0;background-size:cover;background-position:center 22%;z-index:0}
.scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(0,0,0,0.15) 0%,rgba(0,0,0,0) 38%,rgba(0,0,0,0.45) 100%)}
.slide>*:not(.bg):not(.scrim):not(.swipe){position:relative;z-index:2}
/* TikTok white text with a solid black outline */
.tt{font-weight:800;line-height:1.06;letter-spacing:-0.5px;color:#fff;
  text-shadow:-3px -3px 0 #000,3px -3px 0 #000,-3px 3px 0 #000,3px 3px 0 #000,-4px 0 0 #000,4px 0 0 #000,0 -4px 0 #000,0 4px 0 #000,0 5px 14px rgba(0,0,0,0.5)}
.h{font-size:70px}
.kicker{font-size:30px;font-weight:900;letter-spacing:2px;text-transform:uppercase;margin-bottom:18px}
.stat{font-size:150px;font-weight:900;line-height:0.9;margin-bottom:8px}
.sub{font-size:38px;font-weight:700;line-height:1.25;margin-top:22px;max-width:840px}
.hl{color:#fff}
.swipe{position:absolute;left:0;right:0;bottom:90px;z-index:2;font-size:32px;font-weight:900}

/* LAST slide: professional brand-account close */
.slide.close{background:#000;color:#fff;text-align:center;justify-content:center}
.close .eyebrow,.close .ch,.close .cbody,.close .ctatext{font-family:'TikTok Sans','Helvetica Neue',Arial,system-ui,sans-serif;color:#fff}
.close .eyebrow{font-size:28px;font-weight:900;letter-spacing:4px;text-transform:uppercase;margin-bottom:14px}
.close .ch{font-weight:800;font-size:74px;line-height:1.06;letter-spacing:-0.5px;max-width:880px}
.close .cbody{font-size:36px;font-weight:700;line-height:1.26;max-width:780px;margin-top:20px}
.close .phones{display:flex;justify-content:center;align-items:flex-end;margin:30px 0 8px}
.close .phone{width:332px;border-radius:46px;overflow:hidden;background:#fff;box-shadow:0 40px 90px rgba(0,0,0,0.55),0 0 0 2px rgba(255,255,255,0.08)}
.close .phone img{width:100%;display:block}
.close .phone.back{transform:rotate(7deg) translateY(26px)}
.close .phone.front{transform:rotate(-5deg);margin-left:-70px}
.close .phone.solo{width:392px;transform:rotate(-2deg)}
.close .clogo{height:54px;margin-top:8px;filter:brightness(0) invert(1)}
.close .ctatext{font-size:34px;font-weight:900;margin-top:16px}
.close .hl{color:#fff}
`;

const hl = (t) => String(t).replace(/\*(.+?)\*/g, '<span class="hl">$1</span>');
const clean = (t) => String(t).replace(/\s*—\s*/g, ", ");

function doc(cls, inner, img) {
  const layers = `${img ? `<div class="bg" style="background-image:url('${img}')"></div><div class="scrim"></div>` : ""}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="slide ${cls}">${layers}${inner}</div></body></html>`;
}

function cover({ title, sub, img }) {
  return doc("cover", `
    <div>
      <h1 class="tt h" style="font-size:78px">${hl(title)}</h1>
      ${sub ? `<p class="tt sub">${hl(sub)}</p>` : ""}
    </div>
    <div class="tt swipe">Swipe →</div>
  `, img);
}

function content({ kicker, stat, title, body }) {
  return doc("content", `
    <div>
      ${kicker ? `<div class="tt kicker">${kicker}</div>` : ""}
      ${stat ? `<div class="tt stat">${stat}</div>` : ""}
      <h2 class="tt h">${hl(title)}</h2>
      ${body ? `<p class="tt sub">${hl(body)}</p>` : ""}
    </div>
  `, null);
}

function phoneHtml(screens) {
  const keys = (screens || []).filter((s) => SCREENS[s]).slice(0, 2);
  if (keys.length <= 1) return `<div class="phones"><div class="phone solo"><img src="${SCREENS[keys[0] || "plan"]}"></div></div>`;
  return `<div class="phones"><div class="phone back"><img src="${SCREENS[keys[1]]}"></div><div class="phone front"><img src="${SCREENS[keys[0]]}"></div></div>`;
}

function cta({ title, body, screens, cta_text }) {
  return doc("close", `
    <div class="eyebrow">Vibe Health</div>
    <h1 class="ch">${hl(clean(title))}</h1>
    ${body ? `<p class="cbody">${hl(clean(body))}</p>` : ""}
    ${phoneHtml(screens)}
    <img class="clogo" src="${LOGO}">
    <div class="ctatext">${clean(cta_text || "search ‘Vibe Health’ on the App Store")}</div>
  `, null);
}

function specToSlides(spec) {
  return spec.slides.map((s) => {
    if (s.type === "cover") return cover({ title: s.title, sub: s.sub, img: s.img ? `../${s.img}` : null });
    if (s.type === "cta") return cta({ title: s.title, body: s.body, screens: s.screens, cta_text: s.cta_text });
    return content({ kicker: s.kicker, stat: s.stat, title: s.title, body: s.body });
  });
}

const specs = [];
const exDir = path.join(REPO, "formats", "gym-carousel", "examples");
if (fs.existsSync(exDir))
  for (const f of fs.readdirSync(exDir).filter((x) => /^good-.*\.json$/.test(x)))
    specs.push(JSON.parse(fs.readFileSync(path.join(exDir, f), "utf8")));
const campRoot = path.join(REPO, "campaigns");
if (fs.existsSync(campRoot))
  for (const camp of fs.readdirSync(campRoot)) {
    const appr = path.join(campRoot, camp, "approved");
    if (!fs.existsSync(appr)) continue;
    for (const f of fs.readdirSync(appr).filter((x) => x.endsWith(".json"))) {
      try { const s = JSON.parse(fs.readFileSync(path.join(appr, f), "utf8")); if (s.theme === "gym") specs.push(s); } catch {}
    }
  }

let count = 0; const seen = new Set();
for (const spec of specs) {
  if (seen.has(spec.key)) continue; seen.add(spec.key);
  const dir = path.join(__dirname, spec.key);
  fs.mkdirSync(dir, { recursive: true });
  specToSlides(spec).forEach((h, i) => fs.writeFileSync(path.join(dir, `slide-${String(i + 1).padStart(2, "0")}${SUF}.html`), h));
  console.log(`${spec.key}: ${spec.slides.length} slides (gym)`);
  count += spec.slides.length;
}
console.log(`done — ${count} gym slide(s) from ${seen.size} deck(s)`);
