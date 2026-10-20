import { quipsFor } from "../src/content/quips.ts";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.dirname(HERE);
const PREFIX = "https://victory-c.github.io/fitpet/";
const EVENTS = ["session_start", "test_pass", "test_fail", "error", "edit", "long_session", "idle", "fed", "tier_up", "tier_down", "evolved", "revived", "stale"];
const BANNED = ["revolutionary", "seamless", "unleash", "supercharge", "elevate", "effortless", "game-changer", "empower", "journey", "delve", "cutting-edge", "boost", "harness", "unlock", "next-level", "level up", "say goodbye to", "whether you're", "dive in", "in short"];

export const CSP = "default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'";
const PUBLISHED = /\.(?:html|css|js|png|ico|mp4|txt)$/;

// Match whole words plus grammatical inflections, never arbitrary substrings.
function bannedPattern(phrase) {
  const parts = phrase.split(/[ -]+/);
  const inflect = word => {
    const forms = [word, word + "s", word + "es", word + "ed", word + "ing"];
    if (word.endsWith("e")) forms.push(word.slice(0, -1) + "ing", word + "d");
    if (word.endsWith("y")) forms.push(word.slice(0, -1) + "ies", word.slice(0, -1) + "ied");
    // These phrase stems need explicit morphology beyond suffix addition:
    // game-changer → game-changing; level up → levelling/leveling up.
    if (word === "changer") forms.push("changing", "changed", "change", "changes");
    if (word === "level") forms.push("levelled", "levelling");
    return "(?:" + forms.join("|") + ")";
  };
  return new RegExp(`(?<![\\p{L}\\p{N}_])${parts.map(inflect).join("[\\s-]+")}(?![\\p{L}\\p{N}_])`, "iu");
}
function checkCopy(text, tags, owner, add) {
  try {
    let visible = decodeHTML(text.replace(/<!--[\s\S]*?-->/g, "").replace(/<\/?(?:address|article|aside|blockquote|br|caption|dd|details|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|summary|table|tbody|td|th|thead|tr|ul)\b[^>]*>/gi, " ").replace(/<[^>]*>/g, ""));
    visible += "\n" + tags.flatMap(({ name: tag, attrs: a }) => [a.alt, a.title, a["aria-label"],
      tag === "meta" && /^(?:description|og:(?:title|description)|twitter:(?:title|description)|.*:image:alt)$/.test(a.property || a.name || "") ? a.content : undefined,
    ]).filter(value => value !== undefined).join("\n");
    visible = visible.replace(/[\u200b-\u200d\u2060\ufeff]/g, "").replace(/[‘’]/g, "'");
    for (const phrase of BANNED) if (bannedPattern(phrase).test(visible)) add("R06", `${owner}: banned phrase: ${phrase}`);
  } catch (e) { add("R06", `${owner}: ${e.message}`); }
}

export function decodeHTML(text) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", rsquo: "’", lsquo: "‘", mdash: "—", ndash: "–", hellip: "…", rarr: "→" };
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (all, entity) => {
    if (entity[0] !== "#") {
      if (!Object.hasOwn(named, entity)) throw Error(`unsupported entity ${all}`);
      return named[entity];
    }
    const n = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    if (!n || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) throw Error(`invalid entity ${all}`);
    return String.fromCodePoint(n);
  });
}

export function parseConcern(source) {
  const blocks = [...source.matchAll(/const LINES:[^=]+?=\s*\{([\s\S]*?)\n\};/g)];
  if (blocks.length !== 1) throw Error("R09 concern LINES block not recognized");
  const matches = [...blocks[0][1].matchAll(/\bearnest:\s*("(?:[^"\\\r\n]|\\.)*")\s*,/g)];
  if (matches.length !== 4) throw Error(`R09 expected exactly 4 earnest concerns, found ${matches.length}`);
  return matches.map(m => JSON.parse(m[1]));
}

export function expectedQuickStart(readme = fs.readFileSync(path.join(REPO, "README.md"), "utf8")) {
  const block = /\n## Quick start\s*\n+```bash\n([\s\S]*?)\n```/.exec(readme);
  if (!block || !block[1].startsWith("git clone <this repo> ~/fitpet && cd ~/fitpet\n")) throw Error("R08 README quick-start shape changed");
  return block[1].replace("git clone <this repo>", "git clone https://github.com/victory-c/fitpet.git");
}

function earnestPool() {
  const source = fs.readFileSync(path.join(REPO, "src/content/quips.ts"), "utf8");
  const block = /const QUIPS: Pools = \{([\s\S]*?)\n\};/.exec(source);
  if (!block) throw Error("R09 quips structure changed");
  const keys = [...block[1].matchAll(/^  ([a-z_]+): \{/gm)].map(m => m[1]);
  if ((block[1].match(/\bearnest\s*:/g) || []).length !== keys.length || /^  (?![a-z_]+: \{|\/\/|\},?\s*$)\S/m.test(block[1])) throw Error("R09 unsupported QUIPS source structure");
  if (JSON.stringify([...keys].sort()) !== JSON.stringify([...EVENTS].sort())) throw Error("R09 supported quip event coverage changed");
  return new Set([...EVENTS.flatMap(event => quipsFor(event, "earnest")), ...quipsFor("unknown", "earnest"), ...parseConcern(fs.readFileSync(path.join(REPO, "src/screen-debt/concern.ts"), "utf8"))]);
}

// A deliberately small HTML tokenizer, not a general browser HTML parser. Unknown
// fetching syntax is rejected rather than guessed. Attributes must be quoted.
export function parseTags(html) {
  const tags = [];
  let i = 0;
  while (i < html.length) {
    const start = html.indexOf("<", i);
    if (start < 0) break;
    if (html.startsWith("<!--", start)) {
      const end = html.indexOf("-->", start + 4);
      if (end < 0) throw Error("unterminated comment");
      const comment = html.slice(start + 4, end);
      if (/^(?:>|->)/.test(comment) || comment.includes("--!>")) throw Error("unsafe HTML comment");
      i = end + 3; continue;
    }
    const head = /^<(!doctype\s+html\s*>|\/?[a-z][a-z0-9-]*)/i.exec(html.slice(start));
    if (!head) throw Error("unrecognized HTML token");
    if (head[1].startsWith("!")) { i = start + head[0].length; continue; }
    const closing = head[1][0] === "/";
    const name = head[1].replace(/^\//, "").toLowerCase();
    let p = start + head[0].length;
    const attrs = {};
    while (true) {
      const ws = /^\s*/.exec(html.slice(p))[0]; p += ws.length;
      if (html.startsWith("/>", p) || html[p] === ">") { p += html[p] === "/" ? 2 : 1; break; }
      if (closing || !ws) throw Error("invalid tag/attribute separator");
      const attr = /^([a-z_:][a-z0-9_:.-]*)(?:\s*=\s*(["'])([\s\S]*?)\2)?/i.exec(html.slice(p));
      if (!attr) throw Error("unquoted or malformed attribute");
      const key = attr[1].toLowerCase();
      if (Object.hasOwn(attrs, key)) throw Error(`duplicate attribute ${key}`);
      attrs[key] = attr[3] === undefined ? "" : decodeHTML(attr[3]);
      p += attr[0].length;
    }
    if (!closing) tags.push({ name, attrs, start, end: p });
    i = p;
    if (!closing && ["script", "style", "textarea", "title"].includes(name)) {
      const end = new RegExp(`</${name}\\s*>`, "ig"); end.lastIndex = p;
      const match = end.exec(html);
      if (!match) throw Error(`unclosed ${name}`);
      tags.at(-1).body = html.slice(p, match.index);
      i = end.lastIndex;
    }
  }
  return tags;
}

export function checkBudgets(files, firstLoad) {
  const errors = [];
  const fail = text => errors.push({ code: "R07", message: text });
  let total = 0, first = 0;
  for (const [name, size] of files) {
    total += size;
    if (firstLoad.has(name)) first += size;
    if (/\.(png|jpe?g|gif|webp|avif|svg|ico)$/i.test(name) && size > 80000) fail(`${name}: image ${size} > 80000 bytes`);
    if (/\.(mp4|webm|mov)$/i.test(name) && size > 250000) fail(`${name}: video ${size} > 250000 bytes`);
    if (name === "main.js" && size > 3000) fail(`main.js ${size} > 3000 bytes`);
  }
  if (total > 800000) fail(`whole site ${total} > 800000 bytes`);
  if (first > 150000) fail(`first load ${first} > 150000 bytes`);
  return errors;
}

export function checkSite(site, { tools = HERE } = {}) {
  site = path.resolve(site);
  const diagnostics = [];
  const add = (code, message) => diagnostics.push({ code, message });
  const files = new Map();
  function walk(dir, prefix = "", published = true) {
    if (!fs.existsSync(dir)) { add("R01", `missing directory ${dir}`); return; }
    if (fs.lstatSync(dir).isSymbolicLink() || !fs.lstatSync(dir).isDirectory()) { add("R01", `not an ordinary directory ${dir}`); return; }
    for (const entry of fs.readdirSync(dir).sort()) {
      if (!published && ["node_modules", ".git"].includes(entry)) continue;
      const rel = prefix + entry, absolute = path.join(dir, entry);
      const stat = fs.lstatSync(absolute);
      if (published && entry !== entry.toLowerCase()) add("R01", `uppercase filename ${rel}`);
      if (stat.isSymbolicLink()) { if (published) add("R01", `symlink ${rel}`); continue; }
      if (stat.isDirectory()) walk(absolute, rel + "/", published);
      else if (stat.isFile()) {
        if (published) {
          if (stat.nlink > 1) add("R01", `hard link ${rel}`);
          files.set(rel, stat.size);
          if (!PUBLISHED.test(rel)) add("R04", `unsupported published extension ${rel}`);
        }
        if (/\.(?:[cm]?[jt]s|[jt]sx)$/.test(entry) && (rel.split("/").slice(0, -1).includes("test") || /^test/.test(entry) || /(?:[._-]test)\./.test(entry))) add("R10", `test-discoverable file ${published ? "site" : "tools"}/${rel}`);
      } else if (published) add("R01", `nonregular entry ${rel}`);
    }
  }
  walk(site); walk(tools, "", false);
  for (const name of ["index.html", "404.html", "style.css", "main.js"]) if (!files.has(name)) add("R01", `missing required ${name}`);
  const first = new Set(["index.html", "style.css", "main.js"]);
  function reference(raw, owner, resource = true, initial = false, metadata = false) {
    if (metadata) {
      if (!raw.startsWith(PREFIX)) add("R05", `${owner}: metadata prefix ${raw}`);
      else if (resource) reference("./" + raw.slice(PREFIX.length), "index.html", true, false);
      return;
    }
    if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(raw)) {
      if (resource || !/^https?:\/\//i.test(raw)) add("R04", `${owner}: forbidden URL ${raw}`);
      return;
    }
    if (!raw || raw.startsWith("#")) { if (resource) add("R03", `${owner}: empty resource URL`); return; }
    if (owner === "404.html") {
      if (!raw.startsWith("/fitpet/")) add("R05", `404.html: local URL must start /fitpet/: ${raw}`);
    } else if (raw.startsWith("/")) add("R02", `${owner}: root-relative URL ${raw}`);
    let local;
    try { local = decodeURIComponent(raw.split(/[?#]/, 1)[0]); } catch { add("R03", `${owner}: malformed URL ${raw}`); return; }
    if (/[\\\x00-\x20]/.test(local) || local.includes("%") || local.startsWith("/") && !raw.startsWith("/") || local.split("/").some(p => p === "..")) { add("R03", `${owner}: unsafe path ${raw}`); return; }
    local = local.startsWith("/fitpet/") ? local.slice(8) : path.posix.join(path.posix.dirname(owner), local);
    if (!local || local === "." || local.endsWith("/")) local = (!local || local === "." ? "" : local) + "index.html";
    if (local.startsWith("../") || !files.has(local)) add("R03", `${owner}: unresolved case-exact local URL ${raw}`);
    else if (initial) first.add(local);
  }
  for (const [name] of files) {
    if (!/\.(html|css|js)$/.test(name)) continue;
    const text = fs.readFileSync(path.join(site, name), "utf8");
    if (name.endsWith(".html")) {
      let tags;
      try { tags = parseTags(text); } catch (e) { add("R04", `${name}: controlled markup: ${e.message}`); continue; }
      for (const { name: tag, attrs: a, body } of tags) {
        if (["base", "iframe", "object", "embed", "form", "style", "svg", "math"].includes(tag) || Object.keys(a).some(k => /^on/.test(k) || ["style", "srcdoc", "ping", "background", "action", "formaction", "manifest", "xlink:href", "data", "codebase", "archive", "imagesrcset", "imagesizes"].includes(k))) add("R04", `${name}: unsupported resource-bearing markup ${tag}`);
        if (tag === "script" && (!a.src || body?.trim())) add("R04", `${name}: inline script forbidden`);
        if (tag === "video" && a.preload !== "none") add("R04", `${name}: video must explicitly use preload="none" for first-load accounting`);
        if (tag === "meta" && a["http-equiv"]?.toLowerCase() === "refresh") add("R04", `${name}: meta refresh forbidden`);
        const metaKey = a.property || a.name;
        if (tag === "meta" && ["og:url", "og:image", "twitter:url", "twitter:image"].includes(metaKey)) reference(a.content || "", name, metaKey.endsWith("image"), false, true);
        for (const attr of ["href", "src", "poster"]) if (Object.hasOwn(a, attr)) {
          const canonical = tag === "link" && a.rel === "canonical";
          const resource = !(tag === "a" && attr === "href") && !canonical;
          reference(a[attr], name, resource, name === "index.html" && resource && (tag !== "img" || a.loading !== "lazy") && !["video", "source"].includes(tag) || name === "index.html" && attr === "poster", canonical);
        }
        if (Object.hasOwn(a, "srcset")) {
          for (const item of a.srcset.split(",")) {
            const match = /^\s*(\S+)(?:\s+(?:\d+w|(?:\d*\.)?\d+x))?\s*$/.exec(item);
            if (!match) add("R04", `${name}: unsupported srcset`);
            else reference(match[1], name, true, name === "index.html" && a.loading !== "lazy");
          }
        }
        if (Object.keys(a).some(k => /(?:src|href|url|srcset)$/.test(k) && !["src", "href", "srcset"].includes(k) && !k.startsWith("data-"))) add("R04", `${name}: unknown URL attribute`);
      }
      checkCopy(text, tags, name, add);
      if (["index.html", "404.html"].includes(name)) {
        const policies = tags.filter(t => t.name === "meta" && t.attrs["http-equiv"]?.toLowerCase() === "content-security-policy");
        const resource = tags.find(t => ["link", "script", "img", "video", "audio", "source", "track", "iframe", "object", "embed", "style", "input"].includes(t.name) || Object.keys(t.attrs).some(k => ["src", "srcset", "poster", "background"].includes(k)));
        if (policies.length !== 1 || policies[0].attrs.content !== CSP || resource && policies[0].start > resource.start) add("R11", `${name}: exact PRD10 CSP required once before any resource tag`);
      }
      if (name === "index.html") {
        const blocks = [...text.matchAll(/<pre\b[^>]*\bid=["']quick-start-code["'][^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g)];
        try { if (blocks.length !== 1 || decodeHTML(blocks[0][1]) !== expectedQuickStart()) add("R08", "quick-start must match README exactly (clone URL excepted)"); } catch (e) { add("R08", e.message); }
        try {
          const pool = earnestPool();
          const quotes = [...text.matchAll(/<q\b[^>]*>([\s\S]*?)<\/q>/g)];
          if (!quotes.length || quotes.length !== tags.filter(tag => tag.name === "q").length) add("R09", "missing or unclosed identifiable pet quotation");
          for (const quote of quotes) if (/<[^>]+>/.test(quote[1]) || !pool.has(decodeHTML(quote[1]))) add("R09", `not an exact earnest quip: ${quote[1]}`);
        } catch (e) { add("R09", e.message); }
      }
    } else if (name.endsWith(".css")) {
      const css = text.replace(/\/\*[\s\S]*?\*\//g, "");
      if (/\\|@import\b|(?:image-set|image|src)\s*\(/i.test(css)) add("R04", `${name}: unsupported CSS resource syntax`);
      const urls = [...css.matchAll(/url\(\s*(?:"([^"\n]*)"|'([^'\n]*)'|([^\s()'";]+))\s*\)/gi)];
      if ((css.match(/url\s*\(/gi) || []).length !== urls.length) add("R04", `${name}: malformed CSS URL`);
      for (const url of urls) reference(url[1] ?? url[2] ?? url[3], name, true, true);
    } else {
      // The approved tiny progressive-enhancement script has no fetching API,
      // imports or dynamically assigned resource URLs. Browser checks enforce
      // runtime behavior; this static subset fails closed on those additions.
      if (/\b(?:import|fetch|XMLHttpRequest|WebSocket|EventSource|Worker|URL|importScripts|sendBeacon|innerHTML|outerHTML|insertAdjacentHTML|write|writeln)\b|\.(?:src|href|poster|srcset)\s*=|setAttribute\s*\(\s*["'](?:src|href|poster|srcset)|\[[^\]\r\n]+\]\s*=/.test(text)) add("R04", `${name}: unsupported JavaScript resource syntax`);
      if (/["'`]\/(?!\/)/.test(text)) add("R02", `${name}: root-relative JavaScript path`);
    }
  }
  const og = path.join(tools, "capture/og.html");
  try {
    const text = fs.readFileSync(og, "utf8");
    checkCopy(text, parseTags(text), "tools/capture/og.html", add);
  } catch (e) { add("R06", `tools/capture/og.html: ${e.message}`); }
  try {
    const dir = path.join(tools, "capture/fixtures");
    const names = fs.readdirSync(dir).filter(name => name.endsWith(".json"));
    if (!names.length) throw Error("no capture JSON fixtures");
    const pool = earnestPool();
    for (const name of names) {
      try {
        const file = path.join(dir, name);
        if (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) throw Error("not an ordinary fixture file");
        const fixture = JSON.parse(fs.readFileSync(file, "utf8"));
        if (!fixture || typeof fixture !== "object" || Array.isArray(fixture) || !Object.hasOwn(fixture, "reaction")) throw Error("missing reaction");
        // Explicit null represents no displayed quotation (e.g. snoozed).
        if (fixture.reaction !== null && (!fixture.reaction || typeof fixture.reaction !== "object" || Array.isArray(fixture.reaction) || typeof fixture.reaction.text !== "string" || !pool.has(fixture.reaction.text))) throw Error("reaction.text is not an exact earnest quip");
      } catch (e) { add("R09", `tools/capture/fixtures/${name}: ${e.message}`); }
    }
  } catch (e) { add("R09", `capture fixtures: ${e.message}`); }
  diagnostics.push(...checkBudgets(files, first));
  return diagnostics;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const diagnostics = checkSite(process.argv[2] || path.join(REPO, "site"));
    for (const { code, message } of diagnostics) console.error(`${code} ${message}`);
    if (diagnostics.length) process.exitCode = 1;
    else console.log("Site checker passed R01–R11 (decimal byte budgets).");
  } catch (error) { console.error(`R01 checker failed closed: ${error.message}`); process.exitCode = 1; }
}
