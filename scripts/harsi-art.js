#!/usr/bin/env node
/*
 * The hand-drawn art pipeline.
 *
 * Every Ħarsi is one SVG file in src/art/harsi/svg/<speciesId>.svg, and every person (story
 * portraits, the player, trainers, quest-givers) one in src/art/people/svg/<name>.svg. This
 * script checks them against the subset of SVG that react-native-svg's SvgXml draws the same
 * on every platform, and bundles them into TypeScript modules the game imports.
 *
 *   node scripts/harsi-art.js check [file.svg ...]   check some files (default: all of them)
 *   node scripts/harsi-art.js build                  check everything, then write the modules
 *   node scripts/harsi-art.js build --check          fail if the modules are out of date
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SETS = [
  { dir: "src/art/harsi/svg", out: "src/art/harsi/sprites.generated.ts", name: "HARSI_SVG", what: "Ħarsi" },
  { dir: "src/art/people/svg", out: "src/art/people/sprites.generated.ts", name: "PEOPLE_SVG", what: "people" },
];

const TAGS = new Set([
  "svg", "g", "defs", "path", "circle", "ellipse", "rect", "polygon", "polyline", "line",
  "linearGradient", "radialGradient", "stop", "clipPath",
]);
const ATTRS = new Set([
  "xmlns", "viewBox", "id", "d", "cx", "cy", "r", "rx", "ry", "x", "y", "width", "height",
  "x1", "y1", "x2", "y2", "fx", "fy", "points", "fill", "stroke", "stroke-width",
  "stroke-linecap", "stroke-linejoin", "stroke-opacity", "stroke-dasharray", "stroke-miterlimit",
  "fill-opacity", "fill-rule", "clip-rule", "clip-path", "opacity", "transform", "offset",
  "stop-color", "stop-opacity", "gradientUnits", "gradientTransform", "spreadMethod", "clipPathUnits",
]);
const SOFT_LIMIT = 10_000;
const HARD_LIMIT = 16_000;

function minify(svg) {
  return svg
    .replace(/<\?xml[^>]*>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .replace(/\s*\/>/g, "/>")
    .trim();
}

/** Checks one file; returns { errors, warnings, xml }. */
function check(file) {
  const errors = [];
  const warnings = [];
  const name = path.basename(file, ".svg");
  if (!/^[a-z0-9_-]+$/.test(name)) errors.push(`file name "${name}" must be lower-case letters, digits, - or _`);
  const raw = fs.readFileSync(file, "utf8");
  const xml = minify(raw);
  if (/<!DOCTYPE|<!\[CDATA\[|<style|<script|<text|<image|<use|<filter|<mask|<pattern|<foreignObject/i.test(xml)) {
    errors.push("uses a forbidden element (style, script, text, image, use, filter, mask, pattern, foreignObject, CDATA)");
  }
  const ids = new Set();
  const refs = [];
  const stack = [];
  let rootSeen = false;
  const tagRe = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[^\s=>\/]+\s*=\s*"[^"]*")*)\s*(\/?)>/g;
  let m;
  let consumed = 0;
  while ((m = tagRe.exec(xml))) {
    const between = xml.slice(consumed, m.index).trim();
    if (between) errors.push(`stray text "${between.slice(0, 40)}"`);
    consumed = m.index + m[0].length;
    const [, closing, tag, attrText, selfClosing] = m;
    if (closing) {
      const open = stack.pop();
      if (open !== tag) errors.push(`</${tag}> closes <${open}>`);
      continue;
    }
    if (!TAGS.has(tag)) errors.push(`<${tag}> is not allowed`);
    if (tag === "svg") {
      if (rootSeen || stack.length) errors.push("<svg> must be the single root");
      rootSeen = true;
    } else if (!rootSeen) errors.push(`<${tag}> outside <svg>`);
    const attrRe = /([^\s=]+)\s*=\s*"([^"]*)"/g;
    let a;
    const attrs = {};
    while ((a = attrRe.exec(attrText))) {
      const [, key, value] = a;
      attrs[key] = value;
      if (!ATTRS.has(key)) errors.push(`<${tag} ${key}=…> attribute is not allowed`);
      if (/NaN|undefined|Infinity/.test(value)) errors.push(`<${tag} ${key}="${value}"> is not a number`);
      const url = /url\(#([^)]+)\)/.exec(value);
      if (url) refs.push(url[1]);
    }
    if (tag === "svg") {
      if (attrs.viewBox !== "0 0 200 200") errors.push(`viewBox must be "0 0 200 200" (is "${attrs.viewBox}")`);
      if (attrs.width || attrs.height) errors.push("the root <svg> must not set width or height (the game sizes it)");
    }
    if (attrs.id) {
      if (!attrs.id.startsWith(name + "-")) errors.push(`id "${attrs.id}" must start with "${name}-" (ids are shared across the whole page)`);
      if (ids.has(attrs.id)) errors.push(`id "${attrs.id}" is used twice`);
      ids.add(attrs.id);
    }
    if ((tag === "linearGradient" || tag === "radialGradient" || tag === "clipPath") && !stack.includes("defs")) {
      errors.push(`<${tag} id="${attrs.id}"> must be inside <defs>`);
    }
    if ((tag === "linearGradient" || tag === "radialGradient" || tag === "clipPath") && !attrs.id) errors.push(`<${tag}> needs an id`);
    if (!selfClosing) stack.push(tag);
  }
  const tail = xml.slice(consumed).trim();
  if (tail) errors.push(`stray text at the end "${tail.slice(0, 40)}"`);
  if (stack.length) errors.push(`unclosed <${stack.join("> <")}>`);
  if (!rootSeen) errors.push("no <svg> root");
  for (const r of refs) if (!ids.has(r)) errors.push(`url(#${r}) points at an id that isn't defined`);
  const bytes = Buffer.byteLength(xml);
  if (bytes > HARD_LIMIT) errors.push(`${bytes} bytes: over the ${HARD_LIMIT}-byte limit`);
  else if (bytes > SOFT_LIMIT) warnings.push(`${bytes} bytes: over the ${SOFT_LIMIT}-byte target`);
  const longNumbers = (xml.match(/\d+\.\d{3,}/g) || []).length;
  if (longNumbers > 10) warnings.push(`${longNumbers} numbers with 3+ decimals: round to 1 decimal to save space`);
  return { errors, warnings, xml, bytes };
}

function allFiles() {
  return SETS.flatMap((set) => {
    const dir = path.join(ROOT, set.dir);
    return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".svg")).map((f) => path.join(dir, f)) : [];
  });
}

function report(files) {
  let bad = 0;
  for (const file of files) {
    const { errors, warnings, bytes } = check(file);
    const rel = path.relative(ROOT, file);
    if (errors.length) {
      bad++;
      console.log(`✗ ${rel}`);
      errors.forEach((e) => console.log(`    error: ${e}`));
    } else console.log(`✓ ${rel} (${bytes} bytes)`);
    warnings.forEach((w) => console.log(`    warning: ${w}`));
  }
  return bad;
}

function moduleText(set, files) {
  const entries = files
    .sort()
    .map((file) => `  ${JSON.stringify(path.basename(file, ".svg"))}: ${JSON.stringify(check(file).xml)},`)
    .join("\n");
  return (
    `// Generated by scripts/harsi-art.js from ${set.dir}. Do not edit by hand:\n` +
    `// change the SVG files and run \`node scripts/harsi-art.js build\`.\n\n` +
    `/** Hand-drawn ${set.what} art, as SVG markup keyed by name. */\n` +
    `export const ${set.name}: Record<string, string> = {\n${entries}\n};\n`
  );
}

/** The intro video draws the Ħarsi from a script file: their names, types and art. */
function introText(harsiFiles) {
  const info = {};
  for (const f of ["starters", "wildCreatures", "legendaries", "regionalVariants"]) {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data", `${f}.json`), "utf8"));
    const walk = (x) => {
      if (Array.isArray(x)) x.forEach(walk);
      else if (x && typeof x === "object") {
        if (x.id && x.types && !info[x.id]) info[x.id] = { n: x.name, t: x.types };
        Object.values(x).forEach(walk);
      }
    };
    walk(data);
  }
  const out = {};
  for (const file of harsiFiles.sort()) {
    const id = path.basename(file, ".svg");
    if (!info[id]) continue;
    out[id] = { ...info[id], s: check(file).xml.replace("<svg ", '<svg width="256" height="256" ') };
  }
  return "/* The game's own Ħarsi, generated by scripts/harsi-art.js. */\nwindow.HARSI_ART=" + JSON.stringify(out) + ";\n";
}

function build(onlyCheck) {
  const files = allFiles();
  if (report(files)) {
    console.error("\nFix the errors above first.");
    process.exit(1);
  }
  let stale = 0;
  const write = (rel, text) => {
    const target = path.join(ROOT, rel);
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
    if (current === text) return;
    if (onlyCheck) {
      stale++;
      console.error(`${rel} is out of date: run node scripts/harsi-art.js build`);
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, text);
      console.log(`wrote ${rel}`);
    }
  };
  for (const set of SETS) {
    const dir = path.join(ROOT, set.dir);
    const setFiles = files.filter((f) => path.dirname(f) === dir);
    write(set.out, moduleText(set, setFiles));
    // The intro shows every Ħarsi, so it only switches to the new art once all of them have it.
    if (set.name === "HARSI_SVG" && setFiles.length) {
      const text = introText(setFiles);
      const have = Object.keys(JSON.parse(text.slice(text.indexOf("=") + 1, text.lastIndexOf(";")))).length;
      if (have >= 106) write("public/intro/harsi-art.js", text);
      else console.log(`intro art left as it is: ${have} of 106 Ħarsi drawn so far`);
    }
  }
  if (stale) process.exit(1);
}

module.exports = { check, minify };

if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "check") process.exit(report(rest.length ? rest.map((f) => path.resolve(f)) : allFiles()) ? 1 : 0);
  else if (cmd === "build") build(rest.includes("--check"));
  else {
    console.log("usage: node scripts/harsi-art.js check [files…] | build [--check]");
    process.exit(2);
  }
}
