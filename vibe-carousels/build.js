// Generates HTML slides for Vibe Health (vibehealthapp.com) carousels.
// Brand: clean black & white, casual/enthusiastic. Tagline: "Building tools that help you flourish".
// Output: 1080x1350 (4:5) HTML files, screenshotted to PNG by render.sh via headless Chrome.

const fs = require("fs");
const path = require("path");

const HANDLE = "@vibehealthapp";
// FMT=tt → 9:16 (1080x1920) for TikTok; default → 4:5 (1080x1350) for Instagram.
const TT = process.env.FMT === "tt";
const W = 1080, H = TT ? 1920 : 1350;
const SUF = TT ? "-tt" : "";

// --- design system ---------------------------------------------------------
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px}
.slide{width:${W}px;height:${H}px;background:#0a0a0a;color:#fafafa;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif;
  padding:96px;display:flex;flex-direction:column;position:relative;overflow:hidden;
  -webkit-font-smoothing:antialiased}
.row{display:flex;align-items:center;justify-content:space-between}
.eyebrow{font-size:24px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:#7c7c7c}
.prog{font-size:24px;font-weight:700;letter-spacing:2px;color:#7c7c7c}
.spacer{flex:1}
.idx{font-size:240px;font-weight:800;line-height:0.85;letter-spacing:-4px;color:#1c1c1c;margin-bottom:8px}
.h-cover{font-size:88px;font-weight:800;line-height:1.04;letter-spacing:-2px}
.h-content{font-size:60px;font-weight:800;line-height:1.08;letter-spacing:-1px;margin-bottom:30px}
.sub{font-size:32px;font-weight:500;line-height:1.45;color:#9a9a9a;margin-top:34px;max-width:840px}
.body{font-size:32px;font-weight:400;line-height:1.5;color:#c4c4c4;max-width:840px}
.hl{background:#fafafa;color:#0a0a0a;padding:2px 14px;border-radius:10px;font-weight:600;
  white-space:nowrap;line-height:1.5}
.swipe{font-size:30px;font-weight:600;color:#fafafa}
.handle{font-size:26px;font-weight:600;color:#6f6f6f;letter-spacing:1px}
.tag{font-size:24px;font-weight:600;color:#6f6f6f}
.btn{display:inline-block;background:#fafafa;color:#0a0a0a;font-size:34px;font-weight:700;
  padding:26px 52px;border-radius:999px;letter-spacing:0.5px}
.hairline{height:2px;background:#1e1e1e;margin:38px 0}
.kicker{font-size:34px;font-weight:700;color:#fafafa;margin-bottom:16px}
.slide.onimg{background-size:cover;background-position:center center}
.slide.onimg .h-cover,.slide.onimg .h-content{text-shadow:0 2px 34px rgba(0,0,0,0.65)}
.slide.onimg .sub{text-shadow:0 2px 20px rgba(0,0,0,0.8);color:#d6d6d6}
.slide.onimg .eyebrow,.slide.onimg .tag,.slide.onimg .handle,.slide.onimg .swipe,.slide.onimg .prog{text-shadow:0 1px 14px rgba(0,0,0,0.9)}
`;

// dark gradient overlay so text stays legible over a photo background
function bgStyle(img) {
  return `background-image:linear-gradient(180deg,rgba(10,10,10,0.80) 0%,rgba(10,10,10,0.40) 40%,rgba(10,10,10,0.55) 66%,rgba(10,10,10,0.96) 100%),url('${img}');background-size:cover;background-repeat:no-repeat;background-position:center center`;
}

// turn *word* into a highlighted pill
function hl(text) {
  return text.replace(/\*(.+?)\*/g, '<span class="hl">$1</span>');
}

function doc(inner, { cls = "", style = "" } = {}) {
  const attrs = `class="slide${cls ? " " + cls : ""}"${style ? ` style="${style}"` : ""}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div ${attrs}>${inner}</div></body></html>`;
}

function cover({ eyebrow, title, sub, bg }) {
  return doc(`
    <div class="spacer"></div>
    <h1 class="h-cover">${hl(title)}</h1>
    ${sub ? `<p class="sub">${hl(sub)}</p>` : ""}
    <div class="spacer"></div>
    <div class="row"><span class="swipe">Swipe →</span><span class="handle">${HANDLE}</span></div>
  `, bg ? { cls: "onimg", style: bgStyle(bg) } : {});
}

function content({ eyebrow, idx, total, kicker, title, body }) {
  return doc(`
    <div class="spacer"></div>
    <div class="idx">${String(idx-1).padStart(2,"0")}</div>
    ${kicker ? `<div class="kicker">${kicker}</div>` : ""}
    <h2 class="h-content">${hl(title)}</h2>
    <p class="body">${hl(body)}</p>
    <div class="spacer"></div>
    <div class="row"><span class="handle">${HANDLE}</span></div>
  `);
}

function cta({ eyebrow, title, body, button, bg, tag }) {
  return doc(`
    <div class="spacer"></div>
    <h1 class="h-cover">${hl(title)}</h1>
    <p class="sub">${hl(body)}</p>
    <div class="hairline" style="max-width:840px"></div>
    <div>${`<span class="btn">${button}</span>`}</div>
    <div class="spacer"></div>
    <div class="row"><span class="handle">${HANDLE}</span><span class="tag">${tag || "Building tools that help you flourish"}</span></div>
  `, bg ? { cls: "onimg", style: bgStyle(bg) } : {});
}

// --- deck definitions ------------------------------------------------------
const decks = {
  "01-glowup-is-health": {
    eyebrow: "Looksmaxing",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Your glow-up is *90% health*.", sub: "Skincare helps. But the real levers are what you eat, drink, and how you sleep.", bg: "../ai-bg/01-cover.png" }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Start here", title: "Sleep is the cheapest skincare", body: "*7–9 hrs* a night = brighter eyes, clearer skin, less puffiness. Nothing topical beats it." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Drink up", title: "Hydration = plump, glowing skin", body: "Chronic low water leaves skin *dull and tired*. Sip steadily all day — coffee doesn't count." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Eat for it", title: "Protein builds the look", body: "Skin, hair, and a *defined jawline* all need it. Most people eat way too little. Aim higher." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Sharpen up", title: "Debloat your face in days", body: "Lower *sodium* + more whole foods = a sharper, less-puffy face surprisingly fast." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Free + powerful", title: "Morning light + daily steps", body: "Sunlight sets your rhythm. *Daily steps* lean you out and lift your mood — both show on your face." }),
      cta({ eyebrow: E, title: "Track it. Watch it *compound*.", tag: "your glow-up, tracked daily", body: "Vibe Health scores your sleep, food, water & steps in one place — so your glow-up actually adds up.", button: "Download Vibe Health →", bg: "../ai-bg/01-cta.png" }),
    ],
  },

  "02-looksmaxing-mistakes": {
    eyebrow: "Looksmaxing",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "5 looksmaxing mistakes *wrecking your glow-up*.", sub: "You're putting in effort. These quietly cancel it out.", bg: "../ai-bg/02-cover.png" }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Mistake 01", title: "Chasing hacks, skipping habits", body: "Mewing won't outwork *bad sleep* and junk food. Fundamentals first, gimmicks later." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Mistake 02", title: "Sleeping like garbage", body: "Under *6 hrs* = puffy eyes, dull skin, more cravings. It shows on your face by noon." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Mistake 03", title: "Under-eating protein", body: "Skin, hair, and *jawline definition* all need it — and most people fall short every single day." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Mistake 04", title: "Living dehydrated", body: "Always a little low on water = *dull, flat skin*. Fix the easiest variable you have." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Mistake 05", title: "Tracking nothing", body: "You can't improve what you don't measure. *Guessing* is why you feel stuck." }),
      cta({ eyebrow: E, title: "Fix the *foundation* first.", tag: "your foundation, one score", body: "Vibe Health turns sleep, food, water & steps into one Health Score you can actually move.", button: "Download Vibe Health →", bg: "../ai-bg/02-cta.png" }),
    ],
  },

  "03-tiny-habits": {
    eyebrow: "Healthy habits",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "7 tiny habits that *actually move your health*.", sub: "No gym membership. No crash diet. Just small wins that stack.", bg: "../ai-bg/03-cover.png" }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Habit 01", title: "Snap your meals", body: "A *photo log* beats guessing. See your calories & macros in seconds, not spreadsheets." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Habit 02", title: "Walk after you eat", body: "A *10-minute walk* blunts the blood-sugar spike. Easiest health win there is." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Habit 03", title: "Protein at breakfast", body: "Aim for *30g* early. Kills the 3pm cravings and keeps you full longer." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Habit 04", title: "Keep a sleep window", body: "Consistent *bed + wake times* beat raw hours for daytime energy." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Habit 05", title: "Hydrate before coffee", body: "One glass of *water first* thing. Tiny habit, all-day payoff." }),
      content({ eyebrow: E, idx: 7, total: T, kicker: "Habit 06", title: "Move every hour", body: "Break up sitting with *2 minutes* of movement. It quietly adds up." }),
      content({ eyebrow: E, idx: 8, total: T, kicker: "Habit 07", title: "Check one number", body: "Stop juggling 5 apps. One *Health Score* tells you if today was a win." }),
      cta({ eyebrow: E, title: "Build the habits. *Watch the score climb.*", tag: "tiny habits, one daily score", body: "Vibe Health tracks all of it automatically and turns it into one simple daily score.", button: "Download Vibe Health →", bg: "../ai-bg/03-cta.png" }),
    ],
  },

  "04-hit-your-protein": {
    eyebrow: "Protein",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "How to actually hit your *protein goal*.", sub: "Most people miss it by 40g a day. Here's the fix — no shakes required." }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Step 01", title: "Anchor every meal", body: "Build each plate around a *protein source* first. Let carbs and fats fill the gaps." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Step 02", title: "Know your number", body: "Aim for *0.7–1g per lb* of goal bodyweight. Most people are nowhere close." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Step 03", title: "Front-load breakfast", body: "*30g at breakfast* kills cravings and makes the rest of the day easy." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Step 04", title: "Keep easy wins stocked", body: "Greek yogurt, eggs, chicken, tofu, jerky. *Boring beats nothing.*" }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Step 05", title: "Track it for one week", body: "You can't fix what you can't see. *One week of logging* is genuinely eye-opening." }),
      cta({ eyebrow: E, title: "Hit it *without the guesswork*.", tag: "hit your number, automatically", body: "Snap your meals and Vibe Health counts your protein for you — so you actually hit the number.", button: "Download Vibe Health →" }),
    ],
  },

  "05-the-scale-lies": {
    eyebrow: "Weight",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Why the *scale lies* to you.", sub: "Your weight swings 2–4 lbs a day and almost none of it is fat. Stop panicking." }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "First", title: "Water is the culprit", body: "Salt, carbs, and stress *shift water weight* overnight. That spike isn't fat." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Do this", title: "Weigh-in rules", body: "*Same time, same conditions* — morning, after the bathroom, before you eat." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "The key", title: "Watch the trend", body: "One day means nothing. The *7-day average* is what tells the truth." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Be patient", title: "The drop is sudden", body: "Fat loss shows up in *whooshes*, not smooth lines. Don't quit during a flat week." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Remember", title: "Use more than the scale", body: "Photos, how clothes fit, energy, strength. *The scale is one data point.*" }),
      cta({ eyebrow: E, title: "Zoom out. *Trust the trend.*", tag: "see the trend, not the noise", body: "Vibe Health smooths the daily noise into a clean trend line you can actually read.", button: "Download Vibe Health →" }),
    ],
  },

  "06-fat-loss-no-bs": {
    eyebrow: "Fat loss",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Fat loss, *without the BS*.", sub: "No detox. No magic food. Just one principle that actually works." }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "The core", title: "It's energy balance", body: "Eat less than you burn over time. *Everything else is just detail.*" }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Pace it", title: "Small + steady wins", body: "Aim for a *300–500 cal deficit*. Crash diets only set up the rebound." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Protect muscle", title: "Keep protein high", body: "In a deficit, *high protein* makes the weight you lose fat — not muscle." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Reality check", title: "You can't outrun a fork", body: "Exercise helps, but *the deficit is made in the kitchen.*" }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "The skill", title: "Consistency > perfection", body: "An 80% week beats a perfect-then-quit one. *Adherence is the whole game.*" }),
      cta({ eyebrow: E, title: "Know your numbers. *Stay consistent.*", tag: "your deficit, on autopilot", body: "Vibe Health sets your target and tracks it automatically — so the deficit takes care of itself.", button: "Download Vibe Health →" }),
    ],
  },

  "07-case-for-steps": {
    eyebrow: "Movement",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "The case for *8,000 steps*.", sub: "The most underrated fat-loss and mood tool there is — and it's free." }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Underrated", title: "Walking burns more than you think", body: "Steps add up to *hundreds of calories* a day with zero recovery cost." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Bonus", title: "It crushes stress", body: "A daily walk *lowers cortisol* and clears your head better than scrolling." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Timing", title: "Post-meal is magic", body: "A *10-min walk after eating* blunts the blood-sugar spike. Easiest win there is." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "No excuses", title: "No gym required", body: "Calls, podcasts, errands. *Stack steps* into the day you already have." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "The target", title: "8k is the sweet spot", body: "Most of the benefit lands by *~8,000 steps*. You don't need 20k." }),
      cta({ eyebrow: E, title: "Start walking. *Watch it add up.*", tag: "every step, counted", body: "Vibe Health counts your steps into your daily score — so the easy wins finally count.", button: "Download Vibe Health →" }),
    ],
  },

  "08-fix-your-sleep": {
    eyebrow: "Sleep",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Fix your sleep, *fix everything*.", sub: "Bad sleep wrecks cravings, energy, and recovery. Here's the reset." }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Most important", title: "Consistency beats hours", body: "*Same bed + wake time* matters more than chasing a perfect 8." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Morning", title: "Get light early", body: "*10 minutes of daylight* soon after waking sets your clock for the whole day." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Afternoon", title: "Cut caffeine by 2pm", body: "Caffeine lingers *8+ hours*. That 4pm coffee is quietly stealing your deep sleep." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Environment", title: "Cool, dark, boring", body: "*Cool room, no screens* in bed. Your environment does half the work for you." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Why it matters", title: "Bad sleep = more cravings", body: "One rough night spikes *hunger hormones* the next day. It's not willpower." }),
      cta({ eyebrow: E, title: "Better sleep *starts tonight*.", tag: "better sleep, on autopilot", body: "Vibe Health tracks your sleep and ties it to how you feel — so the pattern gets obvious.", button: "Download Vibe Health →" }),
    ],
  },

  "09-stop-drinking-calories": {
    eyebrow: "Nutrition",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Stop *drinking* your calories.", sub: "The sneakiest reason your progress stalls is sitting in your cup." }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "The trap", title: "Liquid calories don't fill you", body: "A 600-cal latte *won't keep you full* — but it counts like a whole meal." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Watch out", title: "Soda & juice add up fast", body: "*Hundreds of calories* with no protein or fiber. Pure stall fuel." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Real talk", title: "Alcohol pauses fat loss", body: "Your body *burns the alcohol first* — everything else gets stored and waits." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Sneaky", title: "'Healthy' drinks count too", body: "Smoothies and oat-milk lattes are often *dessert in disguise.*" }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "The fix", title: "Easy swaps win", body: "Water, sparkling water, black coffee, tea. *Save the calories for food.*" }),
      cta({ eyebrow: E, title: "Log the cup, *not just the plate*.", tag: "every sip, accounted for", body: "Vibe Health counts your drinks too — so the hidden calories finally stop hiding.", button: "Download Vibe Health →" }),
    ],
  },

  "10-read-a-label": {
    eyebrow: "Nutrition",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Read a nutrition label in *10 seconds*.", sub: "Ignore the marketing on the front. The truth is all on the back." }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Step 01", title: "Start with serving size", body: "Every number is *per serving* — and the pack is often 2–3 servings." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Step 02", title: "Find the protein", body: "*Protein per serving* is the number that actually keeps you full." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Step 03", title: "Check added sugar", body: "*Added sugar* is the one to watch — not the naturally occurring kind." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Step 04", title: "Scan the ingredients", body: "Short lists of *recognizable ingredients* usually mean less junk." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Remember", title: "'Healthy' is marketing", body: "Front-of-box claims aren't regulated. *The label is.*" }),
      cta({ eyebrow: E, title: "Scan it. Know it. *Log it.*", tag: "nutrition, decoded for you", body: "Snap the item and Vibe Health pulls the nutrition for you — no squinting required.", button: "Download Vibe Health →" }),
    ],
  },

  "11-high-protein-meals": {
    eyebrow: "Meals",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "5 high-protein meals *under 500 calories*.", sub: "Full, satisfying, and they keep you on track. Save this one." }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Meal 01", title: "Greek yogurt bowl", body: "Yogurt + berries + a little granola. *~30g protein*, 5 minutes flat." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Meal 02", title: "Egg & veggie scramble", body: "3 eggs, spinach, salsa. *~25g protein* with barely any effort." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Meal 03", title: "Chicken rice bowl", body: "Chicken, rice, veg, hot sauce. *~40g protein* and it meal-preps perfectly." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Meal 04", title: "Tuna crunch wrap", body: "Tuna, Greek yogurt, a wrap. *~35g protein* in minutes." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Meal 05", title: "Cottage cheese plate", body: "Cottage cheese + fruit or tomato. *~25g protein*, zero cooking." }),
      cta({ eyebrow: E, title: "Eat full. *Stay on track.*", tag: "your go-to meals, one tap", body: "Log any of these in a tap — Vibe Health remembers your go-to meals.", button: "Download Vibe Health →" }),
    ],
  },

  "12-drink-enough-water": {
    eyebrow: "Hydration",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Are you *actually* drinking enough?", sub: "Most people walk around mildly dehydrated and just blame it on being tired." }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Heads up", title: "Thirst lags behind", body: "By the time you feel thirsty, *you're already low*. Sip before you feel it." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Sneaky", title: "Dehydration mimics hunger", body: "Half your afternoon 'snack cravings' are *just thirst.* Try water first." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "The target", title: "A simple baseline", body: "Roughly *half your bodyweight in ounces* is a solid daily starting point." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Morning", title: "Start with a glass", body: "*Water before coffee* rehydrates you after a whole night without it." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Myth", title: "Coffee doesn't cancel out", body: "Caffeine is fine in moderation, but *plain water still wins* for hydration." }),
      cta({ eyebrow: E, title: "Make hydration *automatic*.", tag: "hydration, on autopilot", body: "Vibe Health tracks your water alongside everything else — one habit, one score.", button: "Download Vibe Health →" }),
    ],
  },

  "13-stop-falling-off": {
    eyebrow: "Mindset",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Why you keep *falling off* (and how to stop).", sub: "It's not your motivation. It's that you're aiming for perfect." }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "The trap", title: "Perfect is the problem", body: "One 'bad' meal makes you quit the whole week. *80% beats all-or-nothing.*" }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Step 01", title: "Shrink the habit", body: "Make it too small to fail. *One photo-logged meal a day* is a real start." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Step 02", title: "Never miss twice", body: "Slipped once? Fine. *Just don't skip the next one.* That's the entire game." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Step 03", title: "Make it visible", body: "A streak or score you can see *pulls you back* better than willpower ever will." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Step 04", title: "Track the trend", body: "Zoom out. *Progress is a direction*, not any single day." }),
      cta({ eyebrow: E, title: "Small, steady, *repeatable*.", tag: "consistency, made easy", body: "Vibe Health turns your day into one score and one streak — so consistency feels easy.", button: "Download Vibe Health →" }),
    ],
  },

  "14-sharpen-jawline": {
    eyebrow: "Looksmaxing",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Sharpen your jawline — *no surgery needed*.", sub: "Most of a 'weak' jaw is bloat and body fat hiding it. Here's the real fix.", bg: "../ai-bg/14-cover.png" }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Lean out", title: "Body fat hides the jaw", body: "A defined jaw shows up as you *get leaner*. Fat loss reveals it more than any exercise." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Debloat", title: "Cut the salt & alcohol", body: "*Sodium and booze* puff your whole face. Drop them and the jawline sharpens in days." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Posture", title: "Chin up, tongue up", body: "Standing tall and *resting your tongue on the roof* of your mouth changes your whole profile." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Build it", title: "Give your jaw work", body: "Harder foods and a little gum build the *masseter muscle*. Real — if minor." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Overnight", title: "Beat the morning puff", body: "*Deep sleep and water* drain the overnight fluid that softens your jawline." }),
      cta({ eyebrow: E, title: "Lean, debloated, *defined*.", tag: "a sharper jaw, tracked", body: "Vibe Health tracks the sleep, food & water that actually reveal your jaw — in one score.", button: "Download Vibe Health →", bg: "../ai-bg/14-cta.png" }),
    ],
  },

  "15-clear-skin-kitchen": {
    eyebrow: "Skin",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Clear skin starts *in your kitchen*.", sub: "Topicals are the last 10%. What you eat and how you sleep is the other 90%.", bg: "../ai-bg/15-cover.png" }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "First", title: "Spike less sugar", body: "*Blood-sugar spikes* drive breakouts. Lower added sugar before you buy another serum." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Test it", title: "Watch the dairy", body: "For some people *skim milk and whey* trigger acne. Worth a 3-week experiment." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Eat for it", title: "Eat the rainbow", body: "Colorful produce = *antioxidants* your skin actually uses. Brightness from the inside." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Overnight", title: "Sleep repairs skin", body: "Your skin *rebuilds overnight*. Short sleep = dull tone and slow healing." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Daily", title: "Hydrate for clarity", body: "Chronic low water leaves skin *flat and tired*. Sip all day, not all at once." }),
      cta({ eyebrow: E, title: "Feed your skin. *Watch it clear.*", tag: "clearer skin, from within", body: "Vibe Health connects your food, sleep & water to how your skin looks — in one simple score.", button: "Download Vibe Health →", bg: "../ai-bg/15-cta.png" }),
    ],
  },

  "16-under-eye-bags": {
    eyebrow: "Eyes",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Kill your *under-eye bags*.", sub: "Dark circles and puffiness are mostly fixable — and mostly not genetic.", bg: "../ai-bg/16-cover.png" }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Non-negotiable", title: "Sleep erases bags", body: "Nothing works like *7–9 hours*. It's the original, free eye cream." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Dinner", title: "Drop the night sodium", body: "A *salty dinner* shows up as morning puff right under your eyes." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Daily", title: "Stay hydrated", body: "Dehydration makes the *thin under-eye skin* look hollow and dark." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Late night", title: "Cut the late alcohol", body: "Booze before bed *wrecks deep sleep* and floods your face with fluid." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Tiny trick", title: "Sleep slightly elevated", body: "An *extra pillow* keeps fluid from pooling under your eyes overnight." }),
      cta({ eyebrow: E, title: "Bright eyes, *on repeat*.", tag: "wake up looking rested", body: "Vibe Health ties your sleep, water & food to how rested you actually look. One score.", button: "Download Vibe Health →", bg: "../ai-bg/16-cta.png" }),
    ],
  },

  "17-looksmax-hair": {
    eyebrow: "Hair",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Looksmax your *hair*.", sub: "Thicker, healthier hair is downstream of your health — not your shampoo.", bg: "../ai-bg/17-cover.png" }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Foundation", title: "Protein builds hair", body: "Hair is *mostly protein*. Under-eat it and thickness and growth suffer first." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Fill the gaps", title: "Iron, zinc & vitamin D", body: "Common *deficiencies* quietly thin your hair. Whole foods cover most of it." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Calm down", title: "Stress sheds hair", body: "Chronic stress pushes hair into *shedding mode*. Sleep and steps lower it." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Overnight", title: "Sleep equals growth", body: "Hair follicles *regenerate overnight*. Poor sleep slows the whole cycle." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Easy win", title: "Be gentle", body: "Ease up on *hot tools and tight styles*. Damage reads as thinning." }),
      cta({ eyebrow: E, title: "Healthy body, *healthy hair*.", tag: "healthier hair, from within", body: "Vibe Health tracks the protein, sleep & stress habits your hair depends on — all in one place.", button: "Download Vibe Health →", bg: "../ai-bg/17-cta.png" }),
    ],
  },

  "18-leaner-face": {
    eyebrow: "Face",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "How to get a *leaner face*.", sub: "You can't spot-reduce — but a leaner you means a sharper face. Here's how.", bg: "../ai-bg/18-cover.png" }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "The truth", title: "It's overall fat loss", body: "Face fat goes when *total body fat* goes. There's no facial-workout shortcut." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Pace it", title: "Small steady deficit", body: "A *300–500 cal deficit* leans you out without the gaunt, crash-diet look." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Protect", title: "Keep protein high", body: "High protein keeps the loss *fat, not muscle* — so your face looks sharp, not sick." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Bonus", title: "Debloat too", body: "Lower *sodium and alcohol* — half a 'puffy face' is water, not fat." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Easiest lever", title: "Walk it off", body: "*Daily steps* lean you out with zero recovery cost. Easiest win there is." }),
      cta({ eyebrow: E, title: "Leaner you, *sharper face*.", tag: "a leaner face, on autopilot", body: "Vibe Health sets your target and tracks the deficit automatically — so it actually happens.", button: "Download Vibe Health →", bg: "../ai-bg/18-cta.png" }),
    ],
  },

  "19-stand-taller": {
    eyebrow: "Posture",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Stand taller — the *instant looksmax*.", sub: "Posture changes your height, jaw, and presence in one second. And it's free.", bg: "../ai-bg/19-cover.png" }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Instant", title: "Posture beats an inch", body: "Standing tall makes you look *taller and leaner* instantly. No genetics required." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Cue", title: "Open the chest", body: "Roll *shoulders back and down*. It widens your frame and lifts your chin." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Build it", title: "Strengthen the back", body: "Rows and *pulling movements* fix the rounded, hunched-forward slump." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Loosen", title: "Stretch the front", body: "Sitting tightens your *chest and hip flexors*. Open them up to stand straight." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Watch out", title: "Phone-neck is aging you", body: "Looking *down at a screen* all day builds a hunch. Lift the phone to eye level." }),
      cta({ eyebrow: E, title: "Stand tall. *Own the room.*", tag: "stand taller, every day", body: "Vibe Health nudges your steps and movement so you sit less and stand straighter — daily.", button: "Download Vibe Health →", bg: "../ai-bg/19-cta.png" }),
    ],
  },

  "20-beauty-sleep": {
    eyebrow: "Sleep",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Beauty sleep is *actually real*.", sub: "One bad night shows on your face. Here's what sleep does for your looks.", bg: "../ai-bg/20-cover.png" }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Repair", title: "Skin rebuilds at night", body: "*Collagen and repair* peak in deep sleep. Skimp and your skin looks dull." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "De-puff", title: "Brighter, less-puffy eyes", body: "Good sleep *drains fluid* and erases the morning puffiness around your eyes." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Rhythm", title: "Consistency over hours", body: "*Same bed + wake time* beats chasing a perfect 8. Your face notices the rhythm." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Protect it", title: "Cut caffeine by 2pm", body: "Caffeine lingers *8+ hours* and steals the deep sleep your skin needs." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Environment", title: "Cool, dark, no screens", body: "Your *environment* does half the work. Make the room boring." }),
      cta({ eyebrow: E, title: "Sleep well, *look well*.", tag: "sleep well, look well", body: "Vibe Health tracks your sleep and ties it to how you look and feel — so the pattern gets obvious.", button: "Download Vibe Health →", bg: "../ai-bg/20-cta.png" }),
    ],
  },

  "21-debloat-face": {
    eyebrow: "Debloat",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Debloat your face in *3 days*.", sub: "That puffy, soft look is usually water — and water moves fast.", bg: "../ai-bg/21-cover.png" }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Step 01", title: "Cut the sodium", body: "*Salty, processed food* is the #1 cause of facial bloat. Drop it first." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Step 02", title: "Drink more, not less", body: "Counterintuitive: *more water* tells your body to stop hoarding it." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Step 03", title: "Pause the alcohol", body: "Booze *dehydrates and inflames* — your face puffs the morning after." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Step 04", title: "Move and sweat", body: "*Steps and a light sweat* flush retained water out fast." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Step 05", title: "Sleep it off", body: "Deep sleep *drains overnight fluid*. Wake up sharper, not softer." }),
      cta({ eyebrow: E, title: "Sharper face, *in days*.", tag: "debloat, tracked daily", body: "Vibe Health tracks the sodium, water & sleep that move the puffiness — in one score.", button: "Download Vibe Health →", bg: "../ai-bg/21-cta.png" }),
    ],
  },

  "22-glow-from-within": {
    eyebrow: "Glow",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "Real glow comes *from within*.", sub: "No highlighter required. This is the lit-from-inside look, built by habits.", bg: "../ai-bg/22-cover.png" }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "Hydrate", title: "Water plumps skin", body: "Well-hydrated skin looks *plump and dewy*. Dehydrated skin looks flat." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "Good fats", title: "Healthy fats add sheen", body: "*Omega-3s* — fish, walnuts, olive oil — give skin a soft, healthy glow." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "Color", title: "Antioxidants brighten", body: "Colorful produce fights the *dullness* of stress and processed food." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "Move", title: "Steps boost circulation", body: "A daily walk brings *blood flow* to your skin — that's the post-workout glow." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "Multiplier", title: "Sleep ties it together", body: "All of it *compounds in deep sleep*. That's when the glow gets built." }),
      cta({ eyebrow: E, title: "Glow, *built daily*.", tag: "your glow, built daily", body: "Vibe Health scores the water, food, steps & sleep your glow depends on — all in one place.", button: "Download Vibe Health →", bg: "../ai-bg/22-cta.png" }),
    ],
  },

  "23-looksmax-tier-list": {
    eyebrow: "Looksmaxing",
    slides: (E, T) => [
      cover({ eyebrow: E, title: "The looksmaxing *tier list*.", sub: "What actually moves the needle — ranked. Stop wasting effort on the bottom.", bg: "../ai-bg/23-cover.png" }),
      content({ eyebrow: E, idx: 2, total: T, kicker: "S-Tier", title: "Sleep, leanness, grooming", body: "*The big three.* Consistent sleep, lower body fat, and basic grooming beat everything else." }),
      content({ eyebrow: E, idx: 3, total: T, kicker: "A-Tier", title: "Skin, posture, hair", body: "*Health-driven wins.* Clear skin, standing tall, healthy hair — all downstream of habits." }),
      content({ eyebrow: E, idx: 4, total: T, kicker: "B-Tier", title: "Debloating & hydration", body: "*Quick, real wins.* Less salt and more water sharpen your face within days." }),
      content({ eyebrow: E, idx: 5, total: T, kicker: "C-Tier", title: "Style & light fitness", body: "*Nice multipliers.* Clothes that fit and a bit of muscle help — once the basics are in." }),
      content({ eyebrow: E, idx: 6, total: T, kicker: "F-Tier", title: "Gimmicks & gadgets", body: "*Skip these.* Mewing devices and miracle serums won't outwork bad sleep and junk food." }),
      cta({ eyebrow: E, title: "Fix the *top of the list* first.", tag: "the basics, handled for you", body: "Vibe Health turns the S-tier basics — sleep, food, water, steps — into one score you can move.", button: "Download Vibe Health →", bg: "../ai-bg/23-cta.png" }),
    ],
  },
};

// --- merge in approved campaign specs --------------------------------------
// Any carousel spec in campaigns/<camp>/approved/*.json renders automatically,
// so new campaigns need no edits here. Cover/CTA backgrounds auto-attach from
// ai-bg/<NN>-cover|cta.png (see the write loop below).
function specToDeck(spec) {
  return {
    eyebrow: spec.eyebrow,
    slides: (E, T) =>
      spec.slides.map((s, i) => {
        if (s.type === "cover") return cover({ eyebrow: E, title: s.title, sub: s.sub });
        if (s.type === "cta")
          return cta({ eyebrow: E, title: s.title, body: s.body, button: s.button, tag: s.tag });
        return content({ eyebrow: E, idx: i + 1, total: T, kicker: s.kicker, title: s.title, body: s.body });
      }),
  };
}
const campRoot = path.join(__dirname, "..", "campaigns");
if (fs.existsSync(campRoot)) {
  for (const camp of fs.readdirSync(campRoot)) {
    const appr = path.join(campRoot, camp, "approved");
    if (!fs.existsSync(appr)) continue;
    for (const f of fs.readdirSync(appr).filter((x) => x.endsWith(".json"))) {
      try {
        const spec = JSON.parse(fs.readFileSync(path.join(appr, f), "utf8"));
        if (spec.theme !== "health" && spec.theme !== "looksmax") continue; // carousels only
        if (!decks[spec.key]) decks[spec.key] = specToDeck(spec);
      } catch (e) {
        console.error(`skip ${camp}/${f}: ${e.message}`);
      }
    }
  }
}

// --- write files -----------------------------------------------------------
const root = __dirname;
for (const [name, def] of Object.entries(decks)) {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  const total = def.slides(def.eyebrow, 0).length;
  const html = def.slides(def.eyebrow, total);
  const num = (name.match(/^(\d+)/) || [])[1];
  html.forEach((h, i) => {
    let out = h;
    // auto-attach AI background to cover (first) + CTA (last) when an image exists
    if (num && !out.includes('class="slide onimg"')) {
      const img = i === 0 ? `${num}-cover.png` : i === html.length - 1 ? `${num}-cta.png` : null;
      if (img && fs.existsSync(path.join(root, "ai-bg", img))) {
        out = out.replace('<div class="slide">', `<div class="slide onimg" style="${bgStyle(`../ai-bg/${img}`)}">`);
      }
    }
    fs.writeFileSync(path.join(dir, `slide-${String(i + 1).padStart(2, "0")}${SUF}.html`), out);
  });
  console.log(`${name}: ${html.length} slides`);
}
console.log("done");
