#!/usr/bin/env node
// Vibe Health performance dashboard.
//
// Pulls from Postiz (via the `postiz` CLI, which carries its own auth), maps
// every post to a content format, joins per-post + account analytics, and
// writes:
//   dashboard/data/*.json   raw + computed (gitignored)
//   dashboard/dashboard.html a self-contained visual dashboard (gitignored)
// and prints a terminal summary.
//
// Run:  node dashboard/build.js          (last 30 days of posts; default)
//       node dashboard/build.js --days 90
//
// Notes / honest caveats baked into the output:
//   * Per-post metrics exist only for PUBLISHED YouTube posts (plus legacy
//     Instagram posts — IG is retired, so only historical IG data appears).
//     TikTok exposes no per-post analytics through this API, so TikTok is
//     counted in inventory + account-level growth only.
//   * Most content is still QUEUE (future-dated); numbers grow as it publishes.

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { parseDecks, classify, FORMATS } = require("./classify");
const { Tracer } = require("../observability/tracer");

const REPO = path.join(__dirname, "..");

// Trace every Postiz CLI call (analytics + listing). Not campaign-scoped, so
// spans land in the repo-wide traces/ stream; shares a run id if TRACE_ID is set.
const tracer = new Tracer({ metadata: { step: "dashboard" }, quiet: true });
process.on("exit", () => {
  const s = tracer.summary();
  if (s.spans) console.log(`▸ trace ${s.traceId}: ${s.spans} Postiz call(s), ${s.failed} failed → traces/${s.traceId}.jsonl`);
});
const DATA = path.join(__dirname, "data");
const OUT_HTML = path.join(__dirname, "dashboard.html");

const argv = process.argv.slice(2);
const DAYS = (() => {
  const i = argv.indexOf("--days");
  return i >= 0 ? argv[i + 1] : "30";
})();

// --- Postiz CLI helper ------------------------------------------------------
// The CLI prints a human header line, then JSON. Strip the first line + parse.
function pz(cmd) {
  const t0 = process.hrtime.bigint();
  let out, status = "success", error = null, result = null;
  try {
    out = execSync(`postiz ${cmd}`, { maxBuffer: 1e8, encoding: "utf8" });
    const body = out.replace(/^[^\n]*\n/, "").trim();
    if (body) {
      try { result = JSON.parse(body); } catch { status = "error"; error = "non-JSON response"; }
    }
  } catch (e) {
    status = "error"; error = e.message; // network / auth / empty
  }
  const verb = cmd.split(/\s+/).slice(0, 2).join(".").replace(/[^A-Za-z0-9.:_-]/g, "");
  tracer.record({
    spanId: `postiz.${verb}`,
    model: "postiz",
    input: cmd,
    output: result == null ? (status === "error" ? error : "empty/non-json") : Array.isArray(result) ? `${result.length} items` : "object",
    status,
    error,
    latencyMs: Number((process.hrtime.bigint() - t0) / 1000000n),
    metadata: { tool: "postiz-cli", command: cmd },
  });
  return result;
}

// Platform-aware "audience" stat: IG/TikTok expose a follower total; YouTube
// only exposes Subscribers Gained/Lost, so we show the net delta there.
function audienceStat(acc) {
  const v = acc.vals || {};
  const p = acc.pct || {};
  if (v.Followers != null) return { value: v.Followers, pct: p.Followers, suffix: "" };
  if (v["Follower Count"] != null)
    return { value: v["Follower Count"], pct: p["Follower Count"], suffix: "" };
  if (v.Subscribers != null) return { value: v.Subscribers, pct: p.Subscribers, suffix: "" };
  if (v["Subscribers Gained"] != null) {
    const net = (v["Subscribers Gained"] || 0) - (v["Subscribers Lost"] || 0);
    return { value: (net >= 0 ? "+" : "") + net, pct: null, suffix: " net subs" };
  }
  return { value: null, pct: null, suffix: "" };
}

// A compact, platform-aware view of a channel's TOTAL on-platform activity
// (all videos/posts the account has, not just Postiz-tracked ones). This is
// where reels published straight to the main channels show up — Postiz's
// posts:list never returns those, but the account analytics count them.
function accountActivity(platform, vals = {}) {
  const out = [];
  const nz = (k, label, suffix = "") =>
    vals[k] != null && `${Number(vals[k]).toLocaleString()}${suffix} ${label}`;
  if (platform === "tiktok") {
    [nz("Videos", "videos"), nz("Views", "views"), nz("Total Likes", "likes")].forEach(
      (x) => x && out.push(x)
    );
  } else if (platform === "youtube") {
    [
      nz("Estimated Minutes Watched", "min watched"),
      vals["Average View Percentage"] != null &&
        `${Number(vals["Average View Percentage"]).toFixed(0)}% retention`,
      nz("Likes", "likes"),
    ].forEach((x) => x && out.push(x));
  } else {
    // instagram + fallback
    [nz("Views", "views"), nz("Reach", "reach"), nz("Likes", "likes")].forEach(
      (x) => x && out.push(x)
    );
  }
  return out.join(" · ");
}

// Postiz analytics arrays look like:
//   [{ label, percentageChange, data:[{ total, date }] }]
// Collapse to { label: latestTotal, _pct: { label: percentageChange } }.
function collapseMetrics(arr) {
  const vals = {};
  const pct = {};
  if (!Array.isArray(arr)) return { vals, pct };
  for (const m of arr) {
    if (!m || !m.label || !Array.isArray(m.data) || !m.data.length) continue;
    const last = m.data[m.data.length - 1];
    vals[m.label] = Number(last.total) || 0;
    pct[m.label] = Number(m.percentageChange) || 0;
  }
  return { vals, pct };
}

// --- channel map ------------------------------------------------------------
// Friendly keys (tiktok_main vs tiktok_alt) come from the gitignored
// config/posting.local.yaml when present; otherwise we fall back to the
// Postiz name/profile.
function loadKeyMap() {
  const f = path.join(REPO, "config", "posting.local.yaml");
  const map = {};
  if (fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^([a-z0-9_]+):\s*(\S+)/i);
      if (m) map[m[2]] = m[1];
    }
  }
  return map; // id -> key
}

function loadChannels() {
  const list = pz("integrations:list") || [];
  const keyMap = loadKeyMap();
  return list.map((c) => ({
    id: c.id,
    key: keyMap[c.id] || c.name,
    platform: (c.identifier || "").replace("-standalone", ""),
    handle: c.profile || c.name,
    name: c.name,
  }));
}

// Published posts Postiz's API doesn't return (reels on the main channels,
// off-workspace posts). Merged so they segment by format/account too.
function loadExternal(channels) {
  const f = path.join(__dirname, "external-posts.local.tsv");
  if (!fs.existsSync(f)) return [];
  const byKey = Object.fromEntries(channels.map((c) => [c.key, c]));
  const platOf = (acct) =>
    /tiktok/i.test(acct) ? "tiktok" : /youtube|yt/i.test(acct) ? "youtube" : "instagram";
  const out = [];
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const [format, account, state, date, views, likes, url, note] = line.split("\t");
    if (!format || !account) continue;
    const num = (x) => (x && x !== "-" ? Number(x) || 0 : 0);
    out.push({
      id: `ext:${format}:${account}:${(url && url !== "-" && url) || note || out.length}`,
      state: (state || "published").toUpperCase(),
      publishDate: date && date !== "-" ? date : "",
      url: url && url !== "-" ? url : null,
      content: (note || "").replace(/^"|"$/g, ""),
      format,
      deck: "external",
      theme: null,
      channelKey: account,
      platform: (byKey[account] && byKey[account].platform) || platOf(account),
      handle: (byKey[account] && byKey[account].handle) || account,
      views: num(views),
      likes: num(likes),
      reach: 0,
      hasMetrics: num(views) > 0 || num(likes) > 0,
      source: "manual",
    });
  }
  return out;
}

// --- main -------------------------------------------------------------------
function main() {
  fs.mkdirSync(DATA, { recursive: true });
  const generatedAt = new Date().toISOString();
  console.log(`▸ Fetching Postiz data (posts + analytics, ${DAYS}d window)…`);

  const channels = loadChannels();
  const byId = Object.fromEntries(channels.map((c) => [c.id, c]));

  // Posts (default window is -30d..+30d in the CLI; --days widens lookback)
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - Number(DAYS));
  const end = new Date(now);
  end.setDate(end.getDate() + 60);
  const postsResp =
    pz(
      `posts:list --startDate ${start.toISOString()} --endDate ${end.toISOString()}`
    ) || pz("posts:list");
  const posts = (postsResp && postsResp.posts) || [];

  const decks = parseDecks();

  // Account-level analytics per channel
  const accountAnalytics = {};
  for (const c of channels) {
    const a = collapseMetrics(pz(`analytics:platform ${c.id} -d ${DAYS}`));
    accountAnalytics[c.id] = a;
  }

  // Per-post analytics for published posts (IG + YouTube return data; TikTok []).
  const enriched = posts.map((p) => {
    const cls = classify(p.content, decks);
    const chan = byId[p.integration.id] || {
      key: p.integration.name,
      platform: p.integration.providerIdentifier,
      handle: p.integration.name,
    };
    let metrics = { vals: {}, pct: {} };
    let hasMetrics = false;
    if (p.state === "PUBLISHED") {
      const raw = pz(`analytics:post ${p.id} -d ${DAYS}`);
      metrics = collapseMetrics(raw);
      hasMetrics = Object.keys(metrics.vals).length > 0;
    }
    return {
      id: p.id,
      state: p.state,
      publishDate: p.publishDate,
      url: p.releaseURL || null,
      content: p.content,
      format: cls.format,
      deck: cls.deck,
      theme: cls.theme,
      channelKey: chan.key,
      platform: chan.platform,
      handle: chan.handle,
      views: metrics.vals.Views || 0,
      likes: metrics.vals.Likes || metrics.vals["Total Likes"] || 0,
      reach: metrics.vals.Reach || 0,
      hasMetrics,
      source: "postiz",
    };
  });

  // Merge in published posts Postiz's API doesn't return (see the .local.tsv).
  const external = loadExternal(channels);
  enriched.push(...external);
  if (external.length)
    console.log(`  + ${external.length} post(s) from external-posts.local.tsv`);

  // --- aggregate ------------------------------------------------------------
  const blankAgg = () => ({
    posts: 0,
    published: 0,
    queue: 0,
    error: 0,
    views: 0,
    likes: 0,
    reach: 0,
    metricPosts: 0, // posts contributing per-post metrics (IG+YT published)
  });

  const byFormat = Object.fromEntries(FORMATS.concat("unknown").map((f) => [f, blankAgg()]));
  const byAccount = Object.fromEntries(channels.map((c) => [c.key, blankAgg()]));
  const matrix = {}; // `${format}::${channelKey}` -> agg

  for (const p of enriched) {
    const add = (agg) => {
      agg.posts++;
      if (p.state === "PUBLISHED") agg.published++;
      else if (p.state === "QUEUE") agg.queue++;
      else if (p.state === "ERROR") agg.error++;
      agg.views += p.views;
      agg.likes += p.likes;
      agg.reach += p.reach;
      if (p.hasMetrics) agg.metricPosts++;
    };
    add(byFormat[p.format] || (byFormat[p.format] = blankAgg()));
    add(byAccount[p.channelKey] || (byAccount[p.channelKey] = blankAgg()));
    const mk = `${p.format}::${p.channelKey}`;
    add(matrix[mk] || (matrix[mk] = blankAgg()));
  }

  const computed = {
    generatedAt,
    days: Number(DAYS),
    channels,
    accountAnalytics,
    byFormat,
    byAccount,
    matrix,
    topPosts: enriched
      .filter((p) => p.hasMetrics)
      .sort((a, b) => b.views - a.views)
      .slice(0, 15),
    totals: {
      posts: enriched.length,
      published: enriched.filter((p) => p.state === "PUBLISHED").length,
      queue: enriched.filter((p) => p.state === "QUEUE").length,
      error: enriched.filter((p) => p.state === "ERROR").length,
    },
  };

  // --- persist --------------------------------------------------------------
  fs.writeFileSync(path.join(DATA, "raw-posts.json"), JSON.stringify(posts, null, 2));
  fs.writeFileSync(
    path.join(DATA, "raw-account-analytics.json"),
    JSON.stringify(accountAnalytics, null, 2)
  );
  fs.writeFileSync(path.join(DATA, "computed.json"), JSON.stringify(computed, null, 2));
  fs.writeFileSync(OUT_HTML, renderHtml(computed, enriched));

  printSummary(computed);
  console.log(`\n✓ Wrote ${path.relative(REPO, OUT_HTML)} and dashboard/data/*.json`);
  console.log(`  Open it:  open ${path.relative(REPO, OUT_HTML)}`);
}

// --- terminal summary -------------------------------------------------------
function printSummary(c) {
  const pad = (s, n) => String(s).padEnd(n);
  const num = (s, n) => String(s).padStart(n);
  console.log(
    `\nVibe Health — content performance   (${c.generatedAt.slice(0, 16).replace("T", " ")} · ${c.days}d)`
  );
  console.log(
    `Posts: ${c.totals.posts}  ·  published ${c.totals.published}  ·  queued ${c.totals.queue}  ·  error ${c.totals.error}`
  );

  console.log(`\nBY FORMAT` + " ".repeat(13) + "posts  pub  views  likes  reach  (per-post)");
  for (const [f, a] of Object.entries(c.byFormat)) {
    if (!a.posts) continue;
    const perView = a.metricPosts ? (a.views / a.metricPosts).toFixed(1) : "–";
    console.log(
      `  ${pad(f, 22)}${num(a.posts, 4)}${num(a.published, 5)}${num(a.views, 7)}${num(
        a.likes,
        7
      )}${num(a.reach, 7)}   ${perView}/post`
    );
  }

  console.log(
    `\nBY ACCOUNT (tracked = Postiz posts · activity = ALL channel content incl. reels)`
  );
  for (const ch of c.channels) {
    const a = c.byAccount[ch.key] || {};
    const acc = c.accountAnalytics[ch.id] || { vals: {}, pct: {} };
    const aud = audienceStat(acc);
    const audStr =
      aud.value == null
        ? "–"
        : `${aud.value}${aud.pct != null ? ` (${aud.pct >= 0 ? "+" : ""}${aud.pct}%)` : aud.suffix}`;
    const activity = accountActivity(ch.platform, acc.vals) || "no account data";
    console.log(
      `  ${pad(ch.key + " (" + ch.platform + ")", 24)} tracked ${a.published || 0}/${
        a.posts || 0
      } · audience ${audStr}`
    );
    console.log(`     activity: ${activity}`);
  }
}

// --- HTML dashboard ---------------------------------------------------------
function renderHtml(c, posts) {
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const fmtLabel = {
    "health-carousel": "Health carousel",
    "looksmax-carousel": "Looksmax carousel",
    "before-and-after-reels": "Before/after reel",
    unknown: "Unknown",
  };
  const n = (x) => (x || 0).toLocaleString();

  const formatRows = Object.entries(c.byFormat)
    .filter(([, a]) => a.posts)
    .map(([f, a]) => {
      const per = a.metricPosts ? Math.round(a.views / a.metricPosts) : null;
      return `<tr>
        <td><span class="dot ${f}"></span>${fmtLabel[f] || f}</td>
        <td class="num">${a.posts}</td>
        <td class="num pub">${a.published}</td>
        <td class="num muted">${a.queue}</td>
        <td class="num">${n(a.views)}</td>
        <td class="num">${n(a.likes)}</td>
        <td class="num">${n(a.reach)}</td>
        <td class="num">${per != null ? n(per) : "<span class='muted'>–</span>"}</td>
      </tr>`;
    })
    .join("");

  const accountRows = c.channels
    .map((ch) => {
      const a = c.byAccount[ch.key] || {};
      const acc = c.accountAnalytics[ch.id] || { vals: {}, pct: {} };
      const aud = audienceStat(acc);
      const accViews = acc.vals.Views;
      const audCell =
        aud.value == null
          ? "<span class='muted'>–</span>"
          : `${typeof aud.value === "number" ? n(aud.value) : esc(aud.value)}${
              aud.pct != null
                ? ` <span class="chg ${aud.pct >= 0 ? "up" : "down"}">${aud.pct >= 0 ? "+" : ""}${aud.pct}%</span>`
                : `<span class="muted small">${esc(aud.suffix)}</span>`
            }`;
      const activity = accountActivity(ch.platform, acc.vals);
      const isMain = /_main$/.test(ch.key);
      return `<tr>
        <td>${esc(ch.key)} <span class="plat">${esc(ch.platform)}</span>${
        isMain ? ' <span class="tag-main">main</span>' : ""
      }<div class="muted small">@${esc(ch.handle)}</div></td>
        <td class="num">${a.published || 0} / ${a.posts || 0}</td>
        <td class="num">${n(a.views)}</td>
        <td class="num">${n(a.likes)}</td>
        <td class="num">${audCell}</td>
        <td class="small">${activity || "<span class='muted'>no account data</span>"}</td>
      </tr>`;
    })
    .join("");

  // format × account matrix (posts / views)
  const fkeys = Object.keys(c.byFormat).filter((f) => c.byFormat[f].posts);
  const matrixHead = c.channels.map((ch) => `<th>${esc(ch.key)}</th>`).join("");
  const matrixRows = fkeys
    .map((f) => {
      const cells = c.channels
        .map((ch) => {
          const a = c.matrix[`${f}::${ch.key}`];
          if (!a) return `<td class="num muted">·</td>`;
          return `<td class="num"><b>${a.posts}</b>${
            a.views ? `<div class="small muted">${n(a.views)} v</div>` : ""
          }</td>`;
        })
        .join("");
      return `<tr><td><span class="dot ${f}"></span>${fmtLabel[f] || f}</td>${cells}</tr>`;
    })
    .join("");

  const topRows = c.topPosts
    .map((p) => {
      const cap = p.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 70);
      return `<tr>
        <td class="num">${n(p.views)}</td>
        <td class="num">${n(p.likes)}</td>
        <td><span class="dot ${p.format}"></span>${fmtLabel[p.format] || p.format}</td>
        <td>${esc(p.channelKey)} <span class="plat">${esc(p.platform)}</span></td>
        <td class="muted small">${esc(p.publishDate.slice(0, 10))}</td>
        <td class="cap">${p.url ? `<a href="${esc(p.url)}" target="_blank">` : ""}${esc(cap)}…${
        p.url ? "</a>" : ""
      }${p.source === "manual" ? ' <span class="tag-manual">manual</span>' : ""}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Vibe Health · Performance</title>
<style>
  :root{--bg:#0b0d0f;--card:#15181c;--line:#262b31;--txt:#e8edf2;--mut:#7d8896;--grn:#22c55e;}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--txt);
    font:15px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1100px;margin:0 auto;padding:48px 28px 80px}
  h1{font-size:30px;font-weight:800;letter-spacing:-.5px;margin:0 0 4px}
  .sub{color:var(--mut);margin-bottom:34px}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:38px}
  .kpi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px}
  .kpi .v{font-size:30px;font-weight:800;letter-spacing:-.5px}
  .kpi .l{color:var(--mut);font-size:13px;text-transform:uppercase;letter-spacing:.6px;margin-top:2px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:1.2px;color:var(--mut);margin:34px 0 12px;font-weight:700}
  table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
  th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line);font-size:14px;vertical-align:top}
  th{color:var(--mut);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.5px;background:#101316}
  tr:last-child td{border-bottom:none}
  .num{text-align:right;font-variant-numeric:tabular-nums} .pub{color:var(--grn);font-weight:700}
  .muted{color:var(--mut)} .small{font-size:12px}
  .dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px;vertical-align:middle}
  .dot.health-carousel{background:#38bdf8}.dot.looksmax-carousel{background:#a78bfa}
  .dot.before-and-after-reels{background:#f59e0b}.dot.unknown{background:#64748b}
  .plat{font-size:11px;color:var(--mut);border:1px solid var(--line);border-radius:6px;padding:1px 6px;margin-left:4px}
  .tag-main{font-size:10px;color:#0b0d0f;background:var(--grn);border-radius:6px;padding:1px 6px;margin-left:4px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  .tag-manual{font-size:10px;color:var(--mut);border:1px solid var(--line);border-radius:6px;padding:1px 6px;margin-left:6px;text-transform:uppercase;letter-spacing:.5px}
  .chg{font-size:12px;margin-left:6px}.chg.up{color:var(--grn)}.chg.down{color:#f87171}
  .cap{max-width:340px} .cap a{color:var(--txt);text-decoration:none;border-bottom:1px dotted var(--mut)}
  .note{background:#141a14;border:1px solid #1f2a1f;border-radius:12px;padding:14px 18px;color:#a7b3a7;font-size:13px;margin-top:30px}
</style></head><body><div class="wrap">
  <h1>Vibe Health · content performance</h1>
  <div class="sub">Generated ${esc(c.generatedAt.slice(0, 16).replace("T", " "))} UTC · ${c.days}-day window · source: Postiz</div>

  <div class="kpis">
    <div class="kpi"><div class="v">${c.totals.posts}</div><div class="l">Posts tracked</div></div>
    <div class="kpi"><div class="v pub">${c.totals.published}</div><div class="l">Published</div></div>
    <div class="kpi"><div class="v">${c.totals.queue}</div><div class="l">Queued</div></div>
    <div class="kpi"><div class="v" style="color:#f87171">${c.totals.error}</div><div class="l">Errored</div></div>
  </div>

  <h2>By format</h2>
  <table><thead><tr><th>Format</th><th class="num">Posts</th><th class="num">Pub</th><th class="num">Queue</th>
    <th class="num">Views</th><th class="num">Likes</th><th class="num">Reach</th><th class="num">Views/post</th></tr></thead>
    <tbody>${formatRows}</tbody></table>

  <h2>By account</h2>
  <table><thead><tr><th>Channel</th><th class="num">Tracked<br><span class="small">pub / total</span></th>
    <th class="num">Post views</th><th class="num">Post likes</th><th class="num">Audience</th>
    <th>Channel activity <span class="small">(all content, incl. reels)</span></th></tr></thead>
    <tbody>${accountRows}</tbody></table>

  <h2>Format × account (posts · views)</h2>
  <table><thead><tr><th>Format</th>${matrixHead}</tr></thead><tbody>${matrixRows}</tbody></table>

  <h2>Top published posts</h2>
  <table><thead><tr><th class="num">Views</th><th class="num">Likes</th><th>Format</th><th>Channel</th><th>Date</th><th>Caption</th></tr></thead>
    <tbody>${topRows || `<tr><td colspan="6" class="muted">No published posts with metrics yet.</td></tr>`}</tbody></table>

  <div class="note"><b>Two layers, two sources.</b>
  <b>Tracked posts</b> (the by-format tables, post-level) are the only posts Postiz returns from
  <code>posts:list</code> — the June carousel campaign on the <i>alt</i> channels. Per-post views/likes/reach
  exist for published Instagram &amp; YouTube there; TikTok exposes none per-post.<br>
  <b>Channel activity</b> (right-most account column, account-level) counts <i>all</i> content on each channel,
  including reels published straight to the <span class="tag-main">main</span> @vibehealthapp accounts —
  e.g. TikTok-main's 60 videos / 3k+ views. Postiz doesn't return those as individual posts, so they can't be
  split by format or shown per-post — only as account totals. To get per-reel numbers you'd add the platform
  APIs or a manual log (see dashboard/README.md).</div>
</div></body></html>`;
}

main();
