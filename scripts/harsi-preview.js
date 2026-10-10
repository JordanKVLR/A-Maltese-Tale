#!/usr/bin/env node
/*
 * Renders hand-drawn art to a PNG contact sheet, the way the game shows it: big, in a battle,
 * in the Codex and party lists, mirrored (your own Ħarsi faces right in battle), and at map-tile
 * size for people. Use it to look at your work.
 *
 *   node scripts/harsi-preview.js out.png calfleaf vinehorn mosstaur      one row per Ħarsi
 *   node scripts/harsi-preview.js out.png --lineup calfleaf vinehorn …    side by side, same scale
 *   node scripts/harsi-preview.js out.png --people portrait-abela player-down …
 *   node scripts/harsi-preview.js out.png path/to/any.svg …               any file
 *
 * Set HARSI_OLD to a JSON file of { id: svgMarkup } to show the old art beside the new.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const ROOT = path.join(__dirname, "..");
const args = process.argv.slice(2);
const out = args.shift();
const lineup = args.includes("--lineup");
const people = args.includes("--people");
const names = args.filter((a) => !a.startsWith("--"));
if (!out || !names.length) {
  console.log("usage: node scripts/harsi-preview.js out.png [--lineup|--people] name …");
  process.exit(2);
}

const info = {};
for (const f of ["starters", "wildCreatures", "legendaries", "regionalVariants"]) {
  const walk = (x) => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") {
      if (x.id && x.types && !info[x.id]) info[x.id] = x;
      Object.values(x).forEach(walk);
    }
  };
  walk(JSON.parse(fs.readFileSync(path.join(ROOT, "src/data", `${f}.json`), "utf8")));
}
const old = process.env.HARSI_OLD && fs.existsSync(process.env.HARSI_OLD) ? JSON.parse(fs.readFileSync(process.env.HARSI_OLD, "utf8")) : {};

function load(name) {
  const candidates = [name, path.join(ROOT, "src/art/harsi/svg", `${name}.svg`), path.join(ROOT, "src/art/people/svg", `${name}.svg`)];
  const file = candidates.find((c) => c.endsWith(".svg") && fs.existsSync(c));
  if (!file) return { name, svg: null };
  return { name: path.basename(file, ".svg"), svg: fs.readFileSync(file, "utf8").replace(/<\?xml[^>]*>/, "") };
}
const items = names.map(load);
const sized = (svg, px, extra = "") => (svg ? svg.replace("<svg", `<svg width="${px}" height="${px}" ${extra}`) : `<div class="missing" style="width:${px}px;height:${px}px">missing</div>`);
const oldSized = (svg, px) => (svg ? svg.replace(/width="\d+" height="\d+"/, `width="${px}" height="${px}"`) : "");

let body = "";
if (lineup) {
  body = `<div class="lineup">${items
    .map((it) => `<div class="cell"><div class="frame">${sized(it.svg, 180)}<div class="base"></div></div><div class="cap">${info[it.name]?.name ?? it.name}</div></div>`)
    .join("")}</div>`;
} else if (people) {
  body = items
    .map(
      (it) => `<div class="row">
      <div class="label"><b>${it.name}</b></div>
      <div class="card grid">${sized(it.svg, 220)}</div>
      <div class="card"><div class="circle">${sized(it.svg, 72)}</div><small>dialogue 72px</small></div>
      <div class="card tiles"><div class="tile">${sized(it.svg, 44)}</div><div class="tile">${sized(it.svg, 44, 'style="transform:scaleX(-1)"')}</div><small>map tile 44px</small></div>
      <div class="card dark">${sized(it.svg, 110)}</div>
    </div>`
    )
    .join("");
} else {
  body = items
    .map((it) => {
      const d = info[it.name];
      return `<div class="row">
      <div class="label"><b>${d?.name ?? it.name}</b><br>${it.name}<br><i>${(d?.types ?? []).join(" / ")}</i></div>
      <div class="card grid">${sized(it.svg, 220)}</div>
      <div class="card battle"><div class="enemy">${sized(it.svg, 96)}</div><div class="player">${sized(it.svg, 128, 'style="transform:scaleX(-1)"')}</div><small>battle: enemy 96 / yours 128, mirrored</small></div>
      <div class="card list"><div class="chip">${sized(it.svg, 48)}</div><div class="chip">${sized(it.svg, 40)}</div><div class="chip faded">${sized(it.svg, 40)}</div><small>Codex / party / not caught</small></div>
      <div class="card dark">${sized(it.svg, 120)}</div>
      ${old[it.name] ? `<div class="card old">${oldSized(old[it.name], 110)}<small>old</small></div>` : ""}
    </div>`;
    })
    .join("");
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:14px;background:#efe6d2;font:13px/1.3 system-ui,sans-serif;color:#2b3a44}
.row{display:flex;gap:10px;align-items:stretch;margin-bottom:10px}
.label{width:120px;padding:6px}
.card{background:#fff8ea;border-radius:12px;padding:8px;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 1px 0 #d8caa8}
.card small{position:absolute;bottom:3px;left:8px;font-size:10px;opacity:.6}
.grid{background-image:linear-gradient(#e9dcc0 1px,transparent 1px),linear-gradient(90deg,#e9dcc0 1px,transparent 1px);background-size:55px 55px;background-position:8px 8px}
.battle{width:300px;height:220px;padding:0;background:linear-gradient(#9fdcff,#d9f2ff 55%,#9ccf6a 56%,#7cb24e);overflow:hidden}
.battle .enemy{position:absolute;right:26px;top:22px}
.battle .enemy:before,.battle .player:before{content:"";position:absolute;left:-14%;right:-14%;bottom:2%;height:22%;border-radius:50%;background:rgba(90,130,60,.55)}
.battle .player{position:absolute;left:22px;bottom:16px}
.battle svg{position:relative}
.list{flex-direction:row;gap:8px;width:190px}
.chip{background:#fff;border:1px solid #e3d6b8;border-radius:10px;padding:4px}
.faded svg{opacity:.35}
.dark{background:#16243a}
.old{background:#f3f3f3}
.circle{width:72px;height:72px;border-radius:50%;overflow:hidden;background:#f4ecd8}
.tiles{gap:4px;background:#8cc35a}
.tile{width:44px;height:44px;background:#9bd068;border-radius:4px}
.lineup{display:flex;flex-wrap:wrap;gap:8px}
.cell{text-align:center}
.frame{position:relative;background:#fff8ea;border-radius:12px;padding:6px}
.frame .base{position:absolute;left:6px;right:6px;top:${6 + 180 * 0.92}px;border-top:1px dashed #c9b88f}
.cap{font-size:12px;margin-top:3px}
.missing{display:flex;align-items:center;justify-content:center;background:#fdd;color:#a00}
</style></head><body>${body}</body></html>`;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: lineup ? 1400 : 1220, height: 400 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: path.resolve(out), fullPage: true });
  await browser.close();
  console.log(`wrote ${out} (${items.length} item${items.length === 1 ? "" : "s"}${items.some((i) => !i.svg) ? "; some missing" : ""})`);
})();
