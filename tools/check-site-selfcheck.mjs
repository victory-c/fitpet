import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkSite, checkBudgets, expectedQuickStart, parseConcern, parseTags, decodeHTML, CSP } from "./check-site.mjs";

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "fitpet-checker-"));
let count = 0;
const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const policy = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`;
const positive = `<!doctype html><html lang="en"><head>${policy}
<link rel="canonical" href="https://victory-c.github.io/fitpet/">
<meta property="og:url" content="https://victory-c.github.io/fitpet/">
<meta property="og:image" content="https://victory-c.github.io/fitpet/assets/og.png">
<meta name="twitter:image" content="https://victory-c.github.io/fitpet/assets/og.png">
<link rel="stylesheet" href="./style.css?v=1"><link rel="icon" href="./assets/icon.png">
<script src="./main.js?v=1" defer></script></head><body>
<a href="https://github.com/victory-c/fitpet">GitHub</a><a href="#quick-start">Quick start</a>
<video controls muted playsinline preload="none" poster="./assets/hero.png"><source src="./assets/loop.mp4" type="video/mp4"></video>
<img src="./assets/hero.png" srcset="./assets/hero.png 1x, ./assets/other.png 2x" alt="Shell" width="600" height="820">
<img src="./assets/other.png" loading="lazy" alt="Shell" width="600" height="820">
<q data-quip>All tests passing. Lovely work.</q><q data-quip>I&apos;m getting worried. A real break would help.</q>
<section id="quick-start"><pre id="quick-start-code"><code>${escape(expectedQuickStart())}</code></pre></section>
<p>Shortbread and booster seats are allowed substrings.</p>
</body></html>`;

function fixture() {
  const root = fs.mkdtempSync(path.join(scratch, "case-"));
  const site = path.join(root, "site"), tools = path.join(root, "tools");
  fs.mkdirSync(path.join(site, "assets"), { recursive: true }); fs.mkdirSync(path.join(tools, "capture/fixtures"), { recursive: true });
  fs.writeFileSync(path.join(tools, "capture/og.html"), "<!doctype html><html><head><title>Fitpet</title></head><body><p>A terminal pet.</p></body></html>");
  fs.writeFileSync(path.join(tools, "capture/fixtures/earnest.json"), JSON.stringify({ reaction: { text: "All tests passing. Lovely work." } }));
  fs.writeFileSync(path.join(tools, "capture/fixtures/concern.json"), JSON.stringify({ reaction: { text: "I\'m getting worried. A real break would help." } }));
  fs.writeFileSync(path.join(tools, "capture/fixtures/snoozed.json"), JSON.stringify({ reaction: null }));
  fs.writeFileSync(path.join(site, "index.html"), positive);
  fs.writeFileSync(path.join(site, "404.html"), `<!doctype html><html><head>${policy}<link rel="stylesheet" href="/fitpet/style.css?v=1"></head><body><a href="/fitpet/">Back</a><a href="https://github.com/victory-c/fitpet">GitHub</a></body></html>`);
  fs.writeFileSync(path.join(site, "style.css"), 'body { color: #fff; background-image: url("./assets/hero.png"); }');
  fs.writeFileSync(path.join(site, "main.js"), 'const video = document.querySelector("video");');
  for (const name of ["hero.png", "other.png", "og.png", "icon.png", "loop.mp4"]) fs.writeFileSync(path.join(site, "assets", name), "fixture bytes");
  return { site, tools };
}
function edit(site, file, from, to) {
  const target = path.join(site, file), text = fs.readFileSync(target, "utf8");
  assert.ok(text.includes(from), `mutation target missing: ${from}`);
  fs.writeFileSync(target, text.replace(from, to));
}
function run(label, expected, mutate = () => {}) {
  const f = fixture(); mutate(f);
  const diagnostics = checkSite(f.site, { tools: f.tools });
  if (expected) assert.ok(diagnostics.some(d => d.code === expected && typeof d.message === "string" && d.message.length), `${label}: expected ${expected}, got ${JSON.stringify(diagnostics)}`);
  else assert.deepEqual(diagnostics, [], label);
  count++; console.log(`ok ${count} ${label}${expected ? ` → ${expected}` : ""}`);
}
function html(label, code, from, to) { run(label, code, ({ site }) => edit(site, "index.html", from, to)); }

try {
  run("positive fixture; same-tab external anchors, lazy image, entities and allowed word substrings", null);
  run("missing index", "R01", ({ site }) => fs.unlinkSync(path.join(site, "index.html")));
  run("uppercase filename", "R01", ({ site }) => fs.writeFileSync(path.join(site, "assets/Upper.png"), "x"));
  run("symlink", "R01", ({ site }) => fs.symlinkSync("hero.png", path.join(site, "assets/link.png")));
  run("hard link", "R01", ({ site }) => fs.linkSync(path.join(site, "assets/hero.png"), path.join(site, "assets/link.png")));
  html("root-relative image", "R02", './assets/hero.png', '/assets/hero.png');
  run("root-relative CSS", "R02", ({ site }) => edit(site, "style.css", './assets/hero.png', '/assets/hero.png'));
  run("root-relative JS", "R02", ({ site }) => fs.appendFileSync(path.join(site, "main.js"), '\nconst x = "/assets/x.png";'));
  html("wrong-case path even on case-insensitive filesystem", "R03", './assets/hero.png', './assets/Hero.png');
  html("missing poster", "R03", 'poster="./assets/hero.png"', 'poster="./assets/missing.png"');
  html("missing srcset member", "R03", './assets/other.png 2x', './assets/missing.png 2x');
  html("traversal", "R03", './assets/hero.png', '../outside.png');
  html("encoded traversal", "R03", './assets/hero.png', './assets/%2e%2e/hero.png');
  html("encoded slash escape", "R03", './assets/hero.png', './assets/%2e%2e%2fhero.png');
  html("malformed encoding", "R03", './assets/hero.png', './assets/%zz.png');
  html("external image", "R04", './assets/hero.png', 'https://example.org/x.png');
  html("protocol-relative image", "R04", './assets/hero.png', '//example.org/x.png');
  html("external script", "R04", './main.js?v=1', 'https://example.org/x.js');
  run("external CSS URL", "R04", ({ site }) => edit(site, "style.css", './assets/hero.png', 'https://example.org/x.png'));
  run("CSS import", "R04", ({ site }) => fs.appendFileSync(path.join(site, "style.css"), '@import "https://example.org/x.css";'));
  run("escaped CSS resource syntax", "R04", ({ site }) => fs.appendFileSync(path.join(site, "style.css"), 'a{background:u\\72l(https://example.org/x)}'));
  html("inline style", "R04", '<body>', '<body style="background:url(https://example.org/x)">');
  html("unquoted resource attribute", "R04", 'src="./assets/hero.png"', 'src=./assets/hero.png');
  html("duplicate attribute", "R04", 'poster="./assets/hero.png"', 'poster="./assets/hero.png" poster="https://example.org/x"');
  html("inline script", "R04", '<body>', '<body><script>fetch("https://example.org/")</script>');
  html("video preload auto forbidden", "R04", 'preload="none"', 'preload="auto"');
  html("video preload metadata forbidden", "R04", 'preload="none"', 'preload="metadata"');
  html("video missing explicit preload", "R04", 'preload="none"', '');
  for (const [label, script] of [
    ["beacon request", 'navigator.sendBeacon("https://example.org/", "data");'],
    ["computed resource assignment", 'img["src"] = "https://example.org/x.png";'],
    ["dynamic computed resource assignment", 'img[key] = "https://example.org/x.png";'],
    ["innerHTML resource injection", 'element.innerHTML = \'<img src="https://example.org/x.png">\';'],
    ["outerHTML resource injection", 'element.outerHTML = \'<img src="https://example.org/x.png">\';'],
    ["adjacent HTML resource injection", 'element.insertAdjacentHTML("beforeend", \'<img src="https://example.org/x.png">\');'],
  ]) run(label, "R04", ({ site }) => fs.appendFileSync(path.join(site, "main.js"), script));
  html("unsupported embed", "R04", '<body>', '<body><iframe src="https://example.org/"></iframe>');
  html("wrong OG prefix", "R05", 'content="https://victory-c.github.io/fitpet/assets/og.png"', 'content="https://example.org/fitpet/assets/og.png"');
  html("lookalike metadata base", "R05", 'href="https://victory-c.github.io/fitpet/"', 'href="https://victory-c.github.io/fitpet.evil/"');
  run("relative 404 stylesheet", "R05", ({ site }) => edit(site, "404.html", '/fitpet/style.css?v=1', './style.css?v=1'));
  html("mixed-case banned phrase", "R06", '<body>', '<body><p>SaY GoOdByE To repetitive work.</p>');
  html("boundary banned word", "R06", '<body>', '<body><p>A BOOST.</p>');
  html("entity encoded banned phrase", "R06", '<body>', '<body><p>LeVel&#32;UP</p>');
  html("inline-tag split banned word", "R06", '<body>', '<body><p>Revo<em>lutionary</em>.</p>');
  html("inline-tag split banned phrase", "R06", '<body>', '<body><p>Say <span>goodbye</span> to repetitive work.</p>');
  html("alt text banned word", "R06", 'alt="Shell"', 'alt="ReVoLuTionary shell"');
  html("title attribute banned phrase", "R06", '<body>', '<body title="Level up">');
  html("accessible label banned word", "R06", '<body>', '<body aria-label="Unleash">');
  html("meta description banned phrase", "R06", '<body>', '<meta name="description" content="DIVE IN"><body>');
  html("social metadata title banned word", "R06", '<body>', '<meta property="og:title" content="Effortless"><body>');
  html("block boundaries retain phrase spaces", "R06", '<body>', '<body><p>Level</p><p>up</p>');
  run("inline joining detects inflected banned word", "R06", ({ site }) => edit(site, "index.html", '<body>', '<body><p>Boost<em>ed</em> experiences.</p>'));
  for (const word of ["boosting", "boosts", "boosted", "harnesses", "unlocked", "journeys", "elevating", "supercharged", "empowering", "game changer", "cutting edge", "next level", "level-up", "whether you’re", "bo\u200bosting", "whether you&#x2019;re"]) html(`normalized inflection ${word}`, "R06", '<body>', `<body><p>${word}</p>`);
  for (const phrase of ["game-changing", "game changing", "game-changed", "game-changers", "leveling up", "levelling up", "leveled up", "levelled up", "levels up", "leveling-up", "levelling-up", "leveled-up", "levelled-up", "harnessing", "harnessed", "harnesses"]) html(`explicit morphology ${phrase}`, "R06", '<body>', `<body><p>${phrase}</p>`);
  for (const phrase of ["ＢＯＯＳＴ", "bo\u00adost", "bo\u061cost", "bo\u034fost", "next‑level", "next－level", "next−level", "whether youʼre", "whether you′re", "effortlessly", "seamlessly", "in short", "dive in"]) html(`Unicode/suffix banned ${phrase}`, "R06", '<body>', `<body><p>${phrase}</p>`);
  for (const phrase of ["ＢＯＯＳＴＥＲ", "bo\u00adoster", "bo\u061coster", "bo\u034foster", "next‑leveler", "next－leveler", "next−leveler", "whether youʼreal", "whether you′real", "effortlesslyish", "seamlesslyish", "boostly", "boostlyish", "in shorts", "in shorted", "in shorting", "dive ins", "dive ined", "dive ining", "game change", "game changes", "gamechange", "gamechanges"]) html(`Unicode/suffix boundary allowed ${phrase}`, null, '<body>', `<body><p>${phrase}</p>`);
  for (const file of ["index.html", "404.html", "nested/extra.html"]) {
    const setup = site => { if (file.includes('/')) { fs.mkdirSync(path.join(site, 'nested')); fs.writeFileSync(path.join(site, file), `<!doctype html><html><head>${policy}</head><body></body></html>`); } };
    for (const [label, value, expected] of [
      ["earnest", "All tests passing. Lovely work.", null],
      ["concern", "I&apos;m getting worried. A real break would help.", null],
      ["invented", "All tests passing. Excellent work.", "R09"],
      ["sarcastic", "Tests passed. Don&apos;t let it go to your head.", "R09"],
      ["not normalized", "Ａll tests passing. Lovely work.", "R09"],
      ["extra space", "All tests passing. Lovely work. ", "R09"],
    ]) for (const kind of ["img", "og:image:alt", "twitter:image:alt"]) for (const [open, close, style] of [["“", "”", "curly"], ["&quot;", "&quot;", "straight"]]) run(`${file} ${kind} ${style} ${label}`, expected, ({ site }) => {
      setup(site);
      const markup = kind === 'img' ? `<img alt="Preview ${open}${value}${close}!">` : `<meta property="${kind}" content="Preview ${open}${value}${close}!">`;
      edit(site, file, '<body>', '<body>' + markup);
    });
    run(`${file} every quote validated`, "R09", ({ site }) => { setup(site); edit(site, file, '<body>', '<body><img alt="“All tests passing. Lovely work.” “Invented.”">'); });
    run(`${file} every straight quote validated`, "R09", ({ site }) => { setup(site); edit(site, file, '<body>', '<body><img alt="&quot;All tests passing. Lovely work.&quot; &quot;Invented.&quot;">'); });
    for (const [label, alt] of [["unbalanced straight", "&quot;All tests passing. Lovely work."], ["mixed curly/straight", "“All tests passing. Lovely work.&quot;"]]) run(`${file} ${label} quote`, "R09", ({ site }) => { setup(site); edit(site, file, '<body>', `<body><img alt="${alt}">`); });
    run(`${file} valid CSP`, null, ({ site }) => setup(site));
    run(`${file} HTML whitespace before CSP`, null, ({ site }) => { setup(site); edit(site, file, policy, '\t\n\f\r ' + policy); });
    run(`${file} HTML whitespace and comments before head`, null, ({ site }) => { setup(site); edit(site, file, '<head>', '\t\n\f\r <!-- harmless --> <head>'); });
    for (const [label, from, to] of [
      ['literal text before head', '<head>', 'TEXT<head>'],
      ['NBSP before head', '<head>', '\u00a0<head>'],
      ['BOM before head', '<head>', '\ufeff<head>'],
      ['literal text before html', '<html', 'TEXT<html'],
      ['noscript hides CSP', policy, `<noscript>${policy}</noscript>`],
      ['self-closing noscript hides CSP', policy, `<noscript/>${policy}</noscript>`],
      ['non-HTML NBSP before CSP', policy, '\u00a0' + policy],
      ['non-HTML BOM before CSP', policy, '\ufeff' + policy],
      ['missing CSP', policy, ''], ['duplicate CSP', policy, policy + policy], ['wrong CSP', policy, policy.replace("default-src 'none'", "default-src 'self'")], ['late CSP', policy, '<link rel="canonical" href="https://victory-c.github.io/fitpet/">' + policy],
      ['no head', '<head>', ''], ['unclosed head', '</head>', ''], ['self-closing head', '<head>', '<head/>'],
      ['nested head', '<head>', '<head><head>'], ['body before head', '<head>', '<body></body><head>'],
      ['body CSP before link', `<head>${policy}`, `<head></head><body>${policy}`],
      ['CSP after head', '</head>', `</head>${policy}`], ['CSP before head', '<head>', `${policy}<head>`],
      ['body in head', policy, `<div>${policy}</div>`],
    ]) run(`${file} ${label}`, 'R11', ({ site }) => { setup(site); edit(site, file, from, to); });
  }
  for (const meta of ["og:image:alt", "twitter:image:alt", "custom:image:alt"]) html(`image alt metadata ${meta}`, "R06", '<body>', `<body><meta property="${meta}" content="Boosted">`);
  run("404 banned copy", "R06", ({ site }) => edit(site, "404.html", 'Back', 'Boosting '));
  run("404 banned metadata", "R06", ({ site }) => edit(site, "404.html", '<head>', '<head><meta name="twitter:image:alt" content="Boosts">'));
  run("OG banned copy", "R06", ({ tools }) => edit(tools, "capture/og.html", 'A terminal pet.', 'Boosting'));
  run("OG banned metadata", "R06", ({ tools }) => edit(tools, "capture/og.html", '<head>', '<head><meta property="og:image:alt" content="Boosted">'));
  run("missing OG fails closed", "R06", ({ tools }) => fs.unlinkSync(path.join(tools, "capture/og.html")));
  for (const file of ["index.html", "404.html"]) {
    run(`${file} missing CSP`, "R11", ({ site }) => edit(site, file, policy, ''));
    run(`${file} duplicate CSP`, "R11", ({ site }) => edit(site, file, policy, policy + policy));
    run(`${file} wrong CSP`, "R11", ({ site }) => edit(site, file, "default-src 'none'", "default-src 'self'"));
    run(`${file} late CSP`, "R11", ({ site }) => edit(site, file, policy, '<link rel="icon" href="' + (file === "404.html" ? '/fitpet/assets/icon.png' : './assets/icon.png') + '">' + policy));
    run(`${file} CSP after canonical`, "R11", ({ site }) => edit(site, file, policy, '<link rel="canonical" href="https://victory-c.github.io/fitpet/">' + policy));
  }
  for (const comment of ['<!-->hidden-->', '<!--->hidden-->', '<!--hidden--!>hidden-->']) html(`unsafe comment ${comment}`, "R04", '<body>', '<body>' + comment);
  for (const ext of ['svg', 'webp', 'jpg', 'gif', 'avif', 'webm', 'mov', 'woff2', 'json', 'bin', 'wasm', 'mjs', '']) run(`unknown published extension ${ext || '(none)'}`, "R04", ({ site }) => fs.writeFileSync(path.join(site, 'unknown' + (ext ? '.' + ext : '')), 'x'));
  run("allowed txt", null, ({ site }) => fs.writeFileSync(path.join(site, "robots.txt"), 'User-agent: *'));
  for (const text of ["Tests passed. Don't let it go to your head.", "All tests passing. Excellent work.", " All tests passing. Lovely work."]) run(`capture non-earnest ${text}`, "R09", ({ tools }) => fs.writeFileSync(path.join(tools, 'capture/fixtures/earnest.json'), JSON.stringify({ reaction: { text } })));
  for (const value of ['{', '{}', 'null', '[]', '{"reaction":{}}', '{"reaction":{"text":5}}', '{"reaction":[]}', '{"reaction":"All tests passing. Lovely work."}']) run(`malformed capture fixture ${value}`, "R09", ({ tools }) => fs.writeFileSync(path.join(tools, 'capture/fixtures/earnest.json'), value));
  run("missing capture fixtures fail closed", "R09", ({ tools }) => fs.rmSync(path.join(tools, 'capture/fixtures'), { recursive: true }));
  run("image budget plus one", "R07", ({ site }) => fs.writeFileSync(path.join(site, "assets/other.png"), Buffer.alloc(80001)));
  run("video budget plus one", "R07", ({ site }) => fs.writeFileSync(path.join(site, "assets/loop.mp4"), Buffer.alloc(250001)));
  run("JS budget plus one", "R07", ({ site }) => fs.writeFileSync(path.join(site, "main.js"), " ".repeat(3001)));
  run("first load budget plus one", "R07", ({ site }) => {
    const sizes = ["index.html", "style.css", "main.js", "assets/icon.png", "assets/hero.png", "assets/other.png"].reduce((sum, name) => sum + fs.statSync(path.join(site, name)).size, 0);
    fs.appendFileSync(path.join(site, "style.css"), " ".repeat(150001 - sizes));
  });
  run("whole site budget plus one", "R07", ({ site }) => {
    let size = 0;
    for (const name of fs.readdirSync(site, { recursive: true })) { const s = fs.statSync(path.join(site, name)); if (s.isFile()) size += s.size; }
    fs.writeFileSync(path.join(site, "extra.bin"), Buffer.alloc(800001 - size));
  });
  html("quick-start comment drift", "R08", '# start a fresh egg', '# start an egg');
  html("quick-start spacing drift", "R08", 'npm install                              #', 'npm install                             #');
  html("quick-start command drift", "R08", 'node src/cli.ts reset --name Shelldon', 'node src/cli.ts reset --name Other');
  html("quick-start clone drift", "R08", 'git clone https://github.com/victory-c/fitpet.git', 'git clone https://example.org/fitpet.git');
  html("invented quotation", "R09", 'All tests passing. Lovely work.', 'All tests passing. Excellent work.');
  html("real sarcastic quotation rejected", "R09", 'All tests passing. Lovely work.', "Tests passed. Don't let it go to your head.");
  for (const name of ["sample.test.mjs", "test-helper.js", "helper-test.ts", "helper_test.cjs", "test/nested.js"]) {
    for (const area of ["site", "tools"]) run(`${area} discovery ${name}`, "R10", f => { const dest = path.join(f[area], name); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, ""); });
  }
  const concern = n => `const LINES: Record<Severity, Record<Personality, string>> = {\n${Array.from({ length: n }, (_, i) => `  B${i}: { earnest: "line ${i}", sarcastic: "other" },`).join("\n")}\n};`;
  assert.deepEqual(parseConcern(concern(4)), ["line 0", "line 1", "line 2", "line 3"]); count++;
  for (const n of [3, 5]) { assert.throws(() => parseConcern(concern(n)), /R09 expected exactly 4/); count++; }
  assert.throws(() => parseConcern('const OTHER = {};'), /R09/); count++;
  assert.equal(decodeHTML('I&#39;m &amp; &#x1f33f;'), "I'm & 🌿"); count++;
  assert.throws(() => parseTags('<img src=unquoted>'), /attribute/); count++;
  // Test byte arithmetic independently at exact boundaries and one byte over.
  for (const [file, limit] of [["asset.png", 80000], ["loop.mp4", 250000], ["main.js", 3000]]) {
    assert.deepEqual(checkBudgets(new Map([[file, limit]]), new Set()), []);
    assert.ok(checkBudgets(new Map([[file, limit + 1]]), new Set()).some(d => d.code === "R07" && d.message.includes(file))); count++;
  }
  assert.deepEqual(checkBudgets(new Map([["data.bin", 800000]]), new Set()), []);
  assert.match(checkBudgets(new Map([["data.bin", 800001]]), new Set())[0].message, /whole site/); count++;
  assert.deepEqual(checkBudgets(new Map([["style.css", 150000]]), new Set(["style.css"])), []);
  assert.match(checkBudgets(new Map([["style.css", 150001]]), new Set(["style.css"]))[0].message, /first load/); count++;
  console.log(`Checker self-check passed: ${count} assertions/cases, R01–R11 with expected diagnostics; synthetic parser and exact decimal boundaries.`);
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
