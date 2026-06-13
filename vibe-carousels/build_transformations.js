#!/usr/bin/env node
// Rebuilds the per-deck before/after transformation reels as SIMPLE two-photo
// reels + an app-demo promo tail — matching the posted before/after reel:
//
//   [ before photo + text ] --cut--> [ after photo + text ] --cut--> [ app demo: "i used Vibe Health" ]
//
// NOT a continuous AI "morph" video, no zoom, no camera shake. Static photos.
// Captions are TikTok Sans, white with a black outline (TikTok caption style).
// No @handle, no download button. Each folder's existing audio is looped to fit.
//
// Run:  node build_transformations.js              (all folders)
//       node build_transformations.js 12-transformation-male-25 ...

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = __dirname;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const APP_DEMO = path.join(ROOT, "..", "Vibe Health Assets", "app-video.mov");
const BEFORE_SECS = 2.6;
const AFTER_SECS = 3.6;
const PROMO_SECS = 4.5;
const PROMO_SS = 2; // start offset into the app demo clip

// Before/after on-screen text per folder, understated first-person voice.
// Edit a line here and re-run. Keep lines short; no weight numbers, no guarantees.
const TEXT = {
  "12-transformation-male-25":   { b: ["tried everything.", "nothing stuck."],     a: ["90 days later.", "best shape of my life."] },
  "13-transformation-female-20": { b: ["thought i was", "just stuck like this."],   a: ["turns out i wasn't.", "strongest i've ever felt."] },
  "14-transformation-male-17":   { b: ["so close, but", "i kept stalling."],        a: ["that last push hit.", "finally happy with it."] },
  "15-transformation-female-30": { b: ["the photo i", "almost deleted."],           a: ["now i can't", "stop staring."] },
  "16-transformation-male-28":   { b: ["swore i'd start", "monday. again."],        a: ["started for real.", "this is me now."] },
  "17-transformation-female-24": { b: ["didn't recognize", "who i'd become."],      a: ["feel like myself", "again. finally."] },
  "18-transformation-male-22":   { b: ["hated every", "mirror."],                   a: ["can't stop", "checking now."] },
  "19-transformation-female-27": { b: ["tired all the time.", "every single day."], a: ["i have energy", "i forgot i had."] },
  "20-transformation-male-20":   { b: ["kept hiding in", "baggy shirts."],          a: ["not hiding", "anymore."] },
  "21-transformation-female-23": { b: ["told myself it's", "just genetics."],       a: ["it wasn't.", "proved myself wrong."] },
};
const FALLBACK = { b: ["day one.", "starting now."], a: ["months later.", "worth every day."] };

// shared TikTok-caption text styling: TikTok Sans, white fill, thick black outline
const CAPTION_CSS = `
@font-face{font-family:'TikTok Sans';src:local('TikTok Sans'),local('TikTokSans-Bold');font-weight:700}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px}
.tt{font-family:'TikTok Sans','TikTok Sans Bold',-apple-system,BlinkMacSystemFont,sans-serif;
  color:#fff;font-weight:700;-webkit-text-stroke:7px #000;paint-order:stroke fill;
  text-stroke:7px #000;letter-spacing:-1px}
.tt.sm{-webkit-text-stroke:5px #000;text-stroke:5px #000}`;

function photoFrame({ img, lines }) {
  const big = lines[0] || "";
  const small = lines[1] || "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CAPTION_CSS}
.slide{width:1080px;height:1920px;position:relative;overflow:hidden;background:#0a0a0a}
.photo{position:absolute;inset:0;background:url('${img}') center top/cover}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.12) 0%,rgba(0,0,0,0.02) 40%,rgba(0,0,0,0.45) 82%,rgba(0,0,0,0.72) 100%)}
.cap{position:absolute;left:0;right:0;bottom:330px;text-align:center;padding:0 70px;z-index:2}
.big{font-size:80px;line-height:1.04}
.small{font-size:42px;line-height:1.12;margin-top:16px}
</style></head><body><div class="slide">
  <div class="photo"></div><div class="scrim"></div>
  <div class="cap"><div class="tt big">${big}</div>${small ? `<div class="tt sm small">${small}</div>` : ""}</div>
</div></body></html>`;
}

// promo background: brand mint + "i used Vibe Health" at top; center left empty for the app video
function promoBgHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CAPTION_CSS}
.slide{width:1080px;height:1920px;position:relative;overflow:hidden;
  background:linear-gradient(160deg,#f6fcf8 0%,#cdeeda 100%)}
.top{position:absolute;top:120px;left:0;right:0;text-align:center;padding:0 60px;z-index:2}
.l1{font-size:64px;line-height:1.05}.l2{font-size:84px;line-height:1.05;margin-top:6px}
</style></head><body><div class="slide">
  <div class="top"><div class="tt l1">i used</div><div class="tt l2">Vibe Health</div></div>
</div></body></html>`;
}

function shoot(html, outPng) {
  const tmp = outPng.replace(/\.png$/, ".html");
  fs.writeFileSync(tmp, html);
  execSync(
    `"${CHROME}" --headless=new --window-size=1080,1920 --hide-scrollbars ` +
      `--force-device-scale-factor=1 --default-background-color=00000000 ` +
      `--screenshot="${outPng}" "file://${tmp}"`,
    { stdio: "ignore" }
  );
  fs.unlinkSync(tmp);
}

function stillSeg(png, secs, outMp4) {
  execSync(
    `ffmpeg -y -loop 1 -framerate 30 -t ${secs} -i "${png}" ` +
      `-vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p" ` +
      `-c:v libx264 -crf 18 -preset medium -r 30 "${outMp4}"`,
    { stdio: "ignore" }
  );
}

// app-demo promo: mint+text bg with the app screen recording composited in the middle
function promoSeg(bgPng, outMp4) {
  execSync(
    `ffmpeg -y -loop 1 -framerate 30 -t ${PROMO_SECS} -i "${bgPng}" ` +
      `-ss ${PROMO_SS} -t ${PROMO_SECS} -i "${APP_DEMO}" ` +
      `-filter_complex "[1:v]scale=-2:1480,setsar=1[ph];` +
      `[0:v][ph]overlay=(W-w)/2:330:shortest=1,format=yuv420p[v]" ` +
      `-map "[v]" -r 30 -c:v libx264 -crf 18 -preset medium "${outMp4}"`,
    { stdio: "ignore" }
  );
}

function buildFolder(dir) {
  const abs = path.join(ROOT, dir);
  const before = path.join(abs, "before.png");
  const after = path.join(abs, "after.png");
  if (!fs.existsSync(before) || !fs.existsSync(after)) {
    console.log(`✗ ${dir}: missing before.png/after.png — skipping`);
    return false;
  }
  const txt = TEXT[dir] || FALLBACK;
  const final = path.join(abs, "transformation-video.mp4");

  // grab existing audio (looped later to fit the new, longer reel)
  const tmpAudio = path.join(abs, ".orig-audio.m4a");
  let haveAudio = false;
  if (fs.existsSync(final)) {
    try {
      execSync(`ffmpeg -y -i "${final}" -vn -c:a aac -b:a 128k "${tmpAudio}"`, { stdio: "ignore" });
      haveAudio = fs.existsSync(tmpAudio) && fs.statSync(tmpAudio).size > 0;
    } catch {
      haveAudio = false;
    }
  }

  // frames → segments
  const bPng = path.join(abs, "before-frame.png");
  const aPng = path.join(abs, "after-frame.png");
  const pPng = path.join(abs, "promo-frame.png");
  shoot(photoFrame({ img: "before.png", lines: txt.b }), bPng);
  shoot(photoFrame({ img: "after.png", lines: txt.a }), aPng);
  shoot(promoBgHtml(), pPng);

  const bSeg = path.join(abs, ".before.mp4");
  const aSeg = path.join(abs, ".after.mp4");
  const pSeg = path.join(abs, ".promo.mp4");
  stillSeg(bPng, BEFORE_SECS, bSeg);
  stillSeg(aPng, AFTER_SECS, aSeg);
  promoSeg(pPng, pSeg);

  const list = path.join(abs, ".concat.txt");
  fs.writeFileSync(list, `file '${bSeg}'\nfile '${aSeg}'\nfile '${pSeg}'\n`);
  const silent = path.join(abs, ".silent.mp4");
  execSync(`ffmpeg -y -f concat -safe 0 -i "${list}" -c copy "${silent}"`, { stdio: "ignore" });

  const out = path.join(abs, ".out.mp4");
  if (haveAudio) {
    // loop the (short) audio to cover the full reel; video length is the limit
    execSync(
      `ffmpeg -y -i "${silent}" -stream_loop -1 -i "${tmpAudio}" ` +
        `-map 0:v -map 1:a -c:v copy -c:a aac -b:a 128k -shortest "${out}"`,
      { stdio: "ignore" }
    );
  } else {
    fs.copyFileSync(silent, out);
  }
  fs.renameSync(out, final);

  for (const f of [bSeg, aSeg, pSeg, list, silent, tmpAudio]) if (fs.existsSync(f)) fs.unlinkSync(f);
  const dur = (BEFORE_SECS + AFTER_SECS + PROMO_SECS).toFixed(1);
  console.log(`✓ ${dir}  before→after→app-demo  ${dur}s  ${haveAudio ? "(audio looped)" : "(silent)"}`);
  return true;
}

if (!fs.existsSync(APP_DEMO)) {
  console.error(`✗ app demo not found: ${APP_DEMO}`);
  process.exit(1);
}
const args = process.argv.slice(2);
const folders = args.length
  ? args.map((a) => a.replace(/\/$/, ""))
  : fs
      .readdirSync(ROOT)
      .filter((d) => /^\d+-transformation-/.test(d) && fs.statSync(path.join(ROOT, d)).isDirectory());

console.log(`Rebuilding ${folders.length} transformation reel(s): before→after photos + app-demo promo…\n`);
let ok = 0;
for (const d of folders) if (buildFolder(d)) ok++;
console.log(`\nDone. Rebuilt ${ok}/${folders.length}.`);
