// Generates 9:16 HTML slides for the BRAND carousel format (main Vibe Health
// TikTok): premium white/mint + deep-green serif, ending on real product
// screenshots instead of a button. Separate from build.js (which is the stark
// black-&-white health/looksmax renderer). Output: vibe-carousels/<key>/
// slide-NN-tt.html, screenshotted to PNG by render.sh.
//
// Reads theme:"brand" specs from formats/brand-carousel/examples/ + every
// campaigns/<camp>/approved/. No AI backgrounds — visuals are brand design +
// app screenshots copied from "Vibe Health Assets/".

const fs = require("fs");
const path = require("path");

const HANDLE = "@vibehealthapp";
const W = 1080, H = 1920, SUF = "-tt";
const REPO = path.join(__dirname, "..");

// --- assets: copy real product screenshots + logo into a space-free folder ---
const ASSETS_SRC = path.join(REPO, "Vibe Health Assets");
const BRAND_DIR = path.join(__dirname, "brand-assets");
fs.mkdirSync(BRAND_DIR, { recursive: true });
const ASSET_MAP = {
  "plan.png": "app-screen.png",        // Today's Plan home screen
  "score.png": "sharable-screen.png",  // Health Wrapped score card
  "logo.webp": "vibe-health-logo.webp",
};
for (const [dst, src] of Object.entries(ASSET_MAP)) {
  const s = path.join(ASSETS_SRC, src), d = path.join(BRAND_DIR, dst);
  try { if (fs.existsSync(s) && !fs.existsSync(d)) fs.copyFileSync(s, d); }
  catch (e) { console.error(`asset copy failed ${src}: ${e.message}`); }
}
const SCREENS = { plan: "../brand-assets/plan.png", score: "../brand-assets/score.png" };
const LOGO = "../brand-assets/logo.webp";

// --- design system ---------------------------------------------------------
const GREEN = "#22c55e", GREEN_DK = "#15803d", INK = "#06230f", DEEP = "#0e3b24";
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px}
.serif{font-family:'Fraunces','Hoefler Text','Didot',Georgia,'Times New Roman',serif}
.sans{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif}
.slide{width:${W}px;height:${H}px;padding:104px 96px;display:flex;flex-direction:column;
  position:relative;overflow:hidden;-webkit-font-smoothing:antialiased;
  font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif}
.row{display:flex;align-items:center;justify-content:space-between}
.spacer{flex:1}
.eyebrow{font-size:25px;font-weight:700;letter-spacing:6px;text-transform:uppercase}
.logo{height:60px;width:auto;display:block}
.handle{font-size:26px;font-weight:600;letter-spacing:1px}
.swipe{font-size:29px;font-weight:600}

/* COVER: deep-green brand panel */
.slide.cover{background:radial-gradient(120% 90% at 50% 8%, ${DEEP} 0%, ${INK} 78%);color:#f3fbf4}
.cover .eyebrow{color:${GREEN}}
.cover .logo{filter:brightness(0) invert(1)}            /* black wordmark -> white */
.cover .h{font-size:92px;font-weight:500;line-height:1.06;letter-spacing:-1.5px;color:#fbfffc}
.cover .sub{font-size:35px;font-weight:400;line-height:1.45;color:#bfe6c9;margin-top:34px;max-width:840px}
.cover .handle,.cover .swipe{color:#9fd3ad}
.cover .hairline{width:96px;height:4px;background:${GREEN};border-radius:4px;margin:0 0 12px}
/* photo sits in a top band and fades into the green panel below */
.cover .photoband{position:absolute;top:0;left:0;right:0;height:58%;background-size:cover;background-position:center 36%}
.cover .photoband::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,35,15,0.30) 0%,rgba(6,35,15,0.05) 20%,rgba(6,35,15,0.10) 52%,rgba(6,35,15,0.80) 85%,${INK} 100%)}
.cover .covertop,.cover .hairline,.cover .h,.cover .sub,.cover .spacer,.cover .row{position:relative;z-index:2}
.cover .covertop .logo,.cover .covertop .eyebrow{text-shadow:0 1px 14px rgba(0,0,0,0.6)}

/* CONTENT: light mint card */
.slide.content{background:linear-gradient(180deg,#ffffff 0%,#f4fbf6 100%);color:${INK}}
.content .eyebrow{color:${GREEN_DK}}
.content .idx{font-family:'Fraunces','Hoefler Text',Georgia,serif;font-size:40px;font-weight:500;color:${GREEN};letter-spacing:1px}
.content .kicker{font-size:30px;font-weight:700;letter-spacing:1px;color:${GREEN_DK};text-transform:uppercase;margin-bottom:22px}
.content .h{font-size:76px;font-weight:500;line-height:1.08;letter-spacing:-1px;color:${INK}}
.content .body{font-size:37px;font-weight:400;line-height:1.5;color:#2c4a37;max-width:860px;margin-top:30px}
.content .rule{height:2px;background:#d6ecdd;margin:0 0 40px;max-width:120px}
.content .handle{color:#5b7a66}

/* CTA: light, product screenshots */
.slide.cta{background:linear-gradient(180deg,#f4fbf6 0%,#e6f6ec 100%);color:${INK};align-items:center;text-align:center}
.cta .eyebrow{color:${GREEN_DK}}
.cta .h{font-size:72px;font-weight:500;line-height:1.1;letter-spacing:-1px;color:${INK};max-width:880px}
.cta .body{font-size:34px;font-weight:400;line-height:1.45;color:#2c4a37;max-width:760px;margin-top:26px}
.phones{display:flex;justify-content:center;align-items:flex-end;gap:-40px;margin:18px 0}
.phone{width:332px;border-radius:46px;overflow:hidden;background:#fff;
  box-shadow:0 40px 90px rgba(6,35,15,0.30),0 0 0 2px rgba(6,35,15,0.06);}
.phone img{width:100%;display:block}
.phone.back{transform:rotate(7deg) translateY(26px);z-index:1}
.phone.front{transform:rotate(-5deg);z-index:2;margin-left:-70px}
.phone.solo{width:392px;transform:rotate(-2deg)}
.cta .ctatext{font-size:34px;font-weight:700;color:${GREEN_DK};margin-top:14px}
.cta .tag{font-size:27px;font-weight:500;color:#5b7a66;margin-top:10px;letter-spacing:0.3px}
.cta .logo{height:54px}

/* highlight pill: soft mint */
.hl{background:#d8f2e0;color:${GREEN_DK};padding:2px 16px;border-radius:12px;font-weight:600;
  white-space:nowrap;line-height:1.5}
.cover .hl{background:rgba(255,255,255,0.16);color:#eafff1}
`;

// House rule for this format: NO em dashes. Strip any stray "—" defensively so
// the rendered slides never show one (copy should already be written without them).
const clean = (t) => String(t).replace(/\s*—\s*/g, ", ");
const hl = (t) => clean(t).replace(/\*(.+?)\*/g, '<span class="hl">$1</span>');

function doc(cls, inner, style = "") {
  const st = style ? ` style="${style}"` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="slide ${cls}"${st}>${inner}</div></body></html>`;
}

// Editorial cover: photo fills a top band (works with landscape stock, no awkward
// 9:16 crop), fading into the deep-green panel below where the headline lives.
function cover({ eyebrow, title, sub, bg }) {
  const band = bg ? `<div class="photoband" style="background-image:url('${bg}')"></div>` : "";
  return doc("cover", `
    ${band}
    <div class="row covertop"><img class="logo" src="${LOGO}"><span class="eyebrow">${eyebrow}</span></div>
    <div style="flex:0 0 50%"></div>
    <div class="hairline"></div>
    <h1 class="h serif">${hl(title)}</h1>
    ${sub ? `<p class="sub">${hl(sub)}</p>` : ""}
    <div class="spacer"></div>
    <div class="row"><span class="swipe">Swipe →</span><span class="handle">${HANDLE}</span></div>
  `);
}

function content({ eyebrow, idx, total, kicker, title, body }) {
  return doc("content", `
    <div class="row"><span class="eyebrow">${eyebrow}</span><span class="idx">${String(idx - 1).padStart(2, "0")} / ${String(total - 2).padStart(2, "0")}</span></div>
    <div class="spacer"></div>
    <div class="rule"></div>
    ${kicker ? `<div class="kicker">${kicker}</div>` : ""}
    <h2 class="h serif">${hl(title)}</h2>
    <p class="body">${hl(body)}</p>
    <div class="spacer"></div>
    <div class="row"><span class="handle">${HANDLE}</span></div>
  `);
}

function phoneHtml(screens) {
  const keys = (screens || []).filter((s) => SCREENS[s]).slice(0, 2);
  if (keys.length <= 1) {
    const k = keys[0] || "plan";
    return `<div class="phones"><div class="phone solo"><img src="${SCREENS[k]}"></div></div>`;
  }
  return `<div class="phones">
    <div class="phone back"><img src="${SCREENS[keys[1]]}"></div>
    <div class="phone front"><img src="${SCREENS[keys[0]]}"></div>
  </div>`;
}

function cta({ eyebrow, title, body, screens, cta_text, tag }) {
  return doc("cta", `
    <div class="eyebrow">${eyebrow}</div>
    <div class="spacer" style="max-height:40px"></div>
    <h1 class="h serif">${hl(title)}</h1>
    ${body ? `<p class="body">${hl(body)}</p>` : ""}
    ${phoneHtml(screens)}
    <img class="logo" src="${LOGO}">
    <div class="ctatext">${clean(cta_text || "search ‘Vibe Health’ on the App Store")}</div>
    ${tag ? `<div class="tag">${clean(tag)}</div>` : ""}
    <div class="spacer"></div>
    <div class="row" style="width:100%"><span class="handle" style="color:#5b7a66">${HANDLE}</span></div>
  `);
}

function specToSlides(spec) {
  const total = spec.slides.length;
  return spec.slides.map((s, i) => {
    if (s.type === "cover") return cover({ eyebrow: spec.eyebrow, title: s.title, sub: s.sub, bg: s.bg ? `../${s.bg}` : null });
    if (s.type === "cta") return cta({ eyebrow: spec.eyebrow, title: s.title, body: s.body, screens: s.screens, cta_text: s.cta_text, tag: s.tag });
    return content({ eyebrow: spec.eyebrow, idx: i + 1, total, kicker: s.kicker, title: s.title, body: s.body });
  });
}

// --- collect brand specs (examples + campaign approved) --------------------
const specs = [];
const exDir = path.join(REPO, "formats", "brand-carousel", "examples");
if (fs.existsSync(exDir))
  for (const f of fs.readdirSync(exDir).filter((x) => /^good-.*\.json$/.test(x)))
    specs.push(JSON.parse(fs.readFileSync(path.join(exDir, f), "utf8")));
const campRoot = path.join(REPO, "campaigns");
if (fs.existsSync(campRoot))
  for (const camp of fs.readdirSync(campRoot)) {
    const appr = path.join(campRoot, camp, "approved");
    if (!fs.existsSync(appr)) continue;
    for (const f of fs.readdirSync(appr).filter((x) => x.endsWith(".json"))) {
      try { const s = JSON.parse(fs.readFileSync(path.join(appr, f), "utf8")); if (s.theme === "brand") specs.push(s); }
      catch (e) { console.error(`skip ${camp}/${f}: ${e.message}`); }
    }
  }

// --- write slide HTML ------------------------------------------------------
let count = 0;
const seen = new Set();
for (const spec of specs) {
  if (seen.has(spec.key)) continue;
  seen.add(spec.key);
  const dir = path.join(__dirname, spec.key);
  fs.mkdirSync(dir, { recursive: true });
  const html = specToSlides(spec);
  html.forEach((h, i) => fs.writeFileSync(path.join(dir, `slide-${String(i + 1).padStart(2, "0")}${SUF}.html`), h));
  console.log(`${spec.key}: ${html.length} slides (brand)`);
  count += html.length;
}
console.log(`done — ${count} brand slide(s) from ${seen.size} deck(s)`);
