import { chromium } from 'playwright';
import { readFile, writeFile, cp, mkdtemp, mkdir, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { resolve, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const output = join(root, 'site/assets');
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 2 && args[0] === '--output' && resolve(args[1]) === output), 'Usage from repository root: node tools/capture/capture.mjs [--output site/assets]');
const names = ['hero', 'touch-grass', 'debt', 'snoozed'];
const temp = await mkdtemp(join(tmpdir(), 'fitpet-capture-'));
console.log(`CAPTURE_TMP=${temp}`);
const staged = join(temp, 'assets');
let browser, server;
const report = { browser: 'Playwright 1.63.0 / Chromium revision 1243', assets: [], checks: [], loop: 'Omitted: test-pass flash ends at 1500ms, so first/last screen states do not match. No seamless-loop claim.' };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function ffmpeg(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'pipe' });
}
async function png(input, name, width, height, filters) {
  const path = join(staged, name);
  // RGB conversion is allowed only when the composited source is fully opaque.
  const decode = (file, filter) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, ...(filter ? ['-vf', filter] : []), '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 16 * 1024 * 1024 });
  const sourcePixels = decode(input, filters);
  const opaque = sourcePixels.every((byte, i) => i % 4 !== 3 || byte === 255);
  let best;
  for (const prediction of ['none', 'sub', 'up', 'avg', 'paeth', 'mixed']) {
    const candidate = join(temp, `${name}-${prediction}.png`);
    ffmpeg(['-i', input, ...(filters ? ['-vf', filters] : []), '-frames:v', '1', '-map_metadata', '-1', '-pix_fmt', opaque ? 'rgb24' : 'rgba', '-c:v', 'png', '-pred', prediction, '-compression_level', '9', candidate]);
    const bytes = await readFile(candidate);
    if (!best || bytes.length < best.bytes.length) best = { prediction, bytes };
  }
  await writeFile(path, best.bytes);
  assert(sourcePixels.equals(decode(path)), `${name}: lossless decoded pixels must match`);
  const encoded = await readFile(path);
  // ffmpeg emits pHYs even with -map_metadata -1. Keep only image-critical
  // chunks, stripping that ancillary density metadata without re-encoding.
  const chunks = [encoded.subarray(0, 8)];
  for (let offset = 8; offset < encoded.length;) {
    const length = encoded.readUInt32BE(offset);
    const type = encoded.toString('ascii', offset + 4, offset + 8);
    if (['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS'].includes(type)) chunks.push(encoded.subarray(offset, offset + length + 12));
    offset += length + 12;
  }
  const data = Buffer.concat(chunks);
  await writeFile(path, data);
  assert.equal(data.readUInt32BE(16), width);
  assert.equal(data.readUInt32BE(20), height);
  assert(data.length <= 80000, `${name} exceeds 80,000 bytes`);
  report.assets.push({ name, width, height, bytes: data.length, target55000: data.length <= 55000, prediction: best.prediction, pixelFormat: opaque ? 'rgb24' : 'rgba', sha256: hash(data) });
}
try {
  const manifest = JSON.parse(await readFile(join(here, 'node_modules/playwright-core/browsers.json')));
  assert.equal(manifest.browsers.find(b => b.name === 'chromium').revision, '1243');
  assert(chromium.executablePath().includes('1243'), 'Only cached revision1243 is allowed');
  await stat(chromium.executablePath()); // Never fall back or download.
  const served = join(temp, 'web');
  await cp(join(root, 'out/renderer'), served, { recursive: true });
  let html = await readFile(join(served, 'index.html'), 'utf8');
  assert(html.includes('id="snooze-label"'), 'Fresh renderer build required');
  html = html.replace(/<script type="module"/, '<script src="./shim.js"></script><script type="module"');
  html = html.replace('</head>', '<link rel="stylesheet" href="./shim.css"></head>');
  await writeFile(join(served, 'index.html'), html);
  for (const name of ['shim.js', 'shim.css', 'og.html', 'og.css']) await cp(join(here, name), join(served, name));
  await mkdir(join(temp, 'frames'));
  await mkdir(staged);
  server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      const path = resolve(served, '.' + (pathname === '/' ? '/index.html' : pathname));
      assert(path.startsWith(served + '/'));
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
      res.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream');
      res.end(await readFile(path));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try { browser = await chromium.launch({ headless: true }); }
  catch (error) { throw new Error(`Cached revision1243 launch failed. STOP: ask for approval; never install automatically. ${error.message}`); }
  const context = await browser.newContext({ viewport: { width: 300, height: 410 }, deviceScaleFactor: 2, timezoneId: 'UTC', locale: 'en-US' });
  const external = [], errors = [], resourceFailures = [];
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin !== origin) { external.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => resourceFailures.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) resourceFailures.push(response.url()); });
  for (const name of names) {
    const fixture = JSON.parse(await readFile(join(here, 'fixtures', `${name}.json`)));
    const expectedQuips = { hero: 'All tests passing. Lovely work.', 'touch-grass': "You've been at this a while — go touch grass?", debt: "I'm getting worried. A real break would help.", snoozed: null };
    assert(Object.hasOwn(fixture, 'reaction'), 'reaction property required');
    if (fixture.reaction !== null) assert.equal(typeof fixture.reaction?.text, 'string');
    assert.equal(fixture.reaction === null ? null : fixture.reaction.text, expectedQuips[name], 'Approved earnest quip only');
    assert.equal(fixture.tier, fixture.vitality >= 75 ? 'thriving' : fixture.vitality >= 45 ? 'healthy' : fixture.vitality >= 15 ? 'wilting' : 'dormant');
    const minutes = fixture.coding.currentCodingSessionMinutes;
    assert.equal(fixture.screenDebt.score, Math.round(.25 * Math.max(0, Math.min(minutes, 60) - 30) + .5 * Math.max(0, minutes - 60)));
    await writeFile(join(served, 'fixture.json'), JSON.stringify(fixture));
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__capture?.loaded && document.querySelector('#label').textContent.includes('Shelldon'));
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('#drag-handle').evaluate(el => getComputedStyle(el).display), 'none');
    if (name === 'hero') {
      const fonts = await page.evaluate(() => {
        const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
        const measure = font => { ctx.font = `16px ${font}`; return ctx.measureText('Shelldon · Coding 0123456789').width; };
        return { renderer: getComputedStyle(document.querySelector('#label')).fontFamily, menlo: measure('Menlo'), fallback: measure('monospace') };
      });
      assert.notEqual(fonts.menlo, fonts.fallback, 'Menlo must be installed, not silently substituted');
      report.environment = { platform: process.platform, arch: process.arch, ffmpeg: execFileSync('ffmpeg', ['-version'], { encoding: 'utf8' }).split('\n')[0], fonts };
      const previous = JSON.parse(await readFile(join(here, 'capture-report.json'), 'utf8'));
      if (previous.environment) assert.deepEqual(report.environment, previous.environment, 'Capture environment/font drift: review before updating baseline');
    }
    await page.mouse.move(150, 200); // Show the actual hover-only name; no label edits.
    const clock = await page.evaluate(() => { let result; for (let i = 0; i < 10; i++) result = window.__capture.step(); return result; });
    assert(clock.elapsed >= 300);
    assert.equal(clock.epoch, 1792497600000 + clock.performance);
    assert.equal(clock.queued, 1);
    assert.equal(await page.locator('#label').textContent(), `Shelldon · ${fixture.vitality}%`);
    assert.equal(await page.locator('#coding-label').textContent(), `Coding · ${fixture.coding.currentCodingSessionMinutes} min`);
    assert.equal(await page.locator('#debt-label').textContent(), `Screen debt · ${fixture.screenDebt.score}/100 · ${fixture.screenDebt.severity.toLowerCase()}`);
    assert.equal(await page.locator('#bubble-text').textContent(), fixture.reaction?.text ?? '');
    assert.equal(await page.locator('#bubble').evaluate(el => el.classList.contains('show')), !!fixture.reaction);
    assert.equal(await page.locator('#snooze-label').textContent(), fixture.notifications.snoozed ? 'Nudges snoozed · 30m' : '');
    const canvas = await page.locator('#pet').evaluate(el => {
      const data = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
      return { width: el.width, height: el.height, pixels: data.filter((_, i) => i % 4 === 3 && data[i] > 0).length, url: el.toDataURL() };
    });
    assert.equal(canvas.width, 256); assert.equal(canvas.height, 256); assert(canvas.pixels > 1000);
    const still = join(temp, `${name}.png`);
    await page.screenshot({ path: still, animations: 'disabled' });
    await png(still, name === 'hero' ? 'hero-poster.png' : `${name}.png`, 600, 820);
    const before = hash(Buffer.from(canvas.url));
    await page.evaluate(() => { for (let i = 0; i < 20; i++) window.__capture.step(); });
    const after = await page.locator('#pet').evaluate(el => el.toDataURL());
    assert.notEqual(before, hash(Buffer.from(after)), 'Selected canvas frames must differ');
    if (name === 'hero') {
      await writeFile(join(temp, 'canvas.png'), Buffer.from(canvas.url.split(',')[1], 'base64'));
      // Reload for frame 0 at the exact warmup point used by the poster.
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__capture?.loaded);
      await page.evaluate(() => { for (let i = 0; i < 10; i++) window.__capture.step(); });
      const selected = {};
      for (let frame = 0; frame < 180; frame++) {
        if (frame) await page.evaluate(() => window.__capture.step(33.34));
        const bytes = await page.screenshot({ path: join(temp, 'frames', `hero-${String(frame).padStart(4, '0')}.png`), animations: 'disabled' });
        if ([0, 1, 30, 179].includes(frame)) selected[frame] = hash(bytes);
      }
      assert.notEqual(selected[0], selected[30]);
      assert.notEqual(selected[0], selected[179]);
      report.checks.push({ frames: 180, stepMs: 33.34, warmupMs: 333.4, selectedHashes: selected, seam: 'First and last differ; flash begins on frame0 but has expired by frame179. Loop omitted.' });
    }
    report.checks.push({ fixture: name, labels: 'exact', bubble: 'exact', canvasPixels: canvas.pixels, animatedCanvas: true });
  }
  // Source shell rectangle from SHELL_FLAT anchor[15,4], 34 columns / 24 rows,
  // SCALE4, at poster time breatheDy=0. Pad around that actual canvas crop.
  const flattened = join(temp, 'canvas-opaque.png');
  ffmpeg(['-i', join(temp, 'canvas.png'), '-filter_complex', 'color=c=0x06140b:s=256x256,format=rgba[bg];[bg][0:v]overlay=shortest=1:format=auto,format=rgba[out]', '-map', '[out]', '-frames:v', '1', flattened]);
  const decodeRGBA = file => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-']);
  const assertIconOpaque = file => {
    const pixels = decodeRGBA(file);
    assert(pixels.every((byte, i) => i % 4 !== 3 || byte === 255), 'Icon must have alpha255 throughout');
    assert.deepEqual([...pixels.subarray(0, 4)], [6, 20, 11, 255], 'Icon background must be #06140b');
  };
  assertIconOpaque(flattened);
  const shell = 'crop=136:96:60:16,pad=144:144:4:24:color=0x06140b';
  await png(flattened, 'favicon-32.png', 32, 32, `${shell},scale=32:32:flags=area`);
  await png(flattened, 'apple-touch-icon.png', 180, 180, `${shell},scale=180:180:flags=neighbor`);
  for (const name of ['favicon-32.png', 'apple-touch-icon.png']) assertIconOpaque(join(staged, name));
  report.checks.push({ icons: 'Actual canvas composited over #06140b before cropping; decoded RGBA alpha255 throughout and background pixel #06140b verified.' });
  await cp(join(staged, 'hero-poster.png'), join(served, 'hero-poster.png'));
  await page.setViewportSize({ width: 1280, height: 640 });
  // OG uses DSF1: no DOM text post-upscaling.
  const og = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
  og.on('pageerror', e => errors.push(e.message));
  og.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  og.on('requestfailed', request => resourceFailures.push(request.url()));
  og.on('response', response => { if (response.status() >= 400) resourceFailures.push(response.url()); });
  await og.route('**/*', route => {
    if (new URL(route.request().url()).origin !== origin) { external.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  await og.goto(`${origin}/og.html`, { waitUntil: 'networkidle' });
  await og.evaluate(() => document.fonts.ready);
  const composition = await og.evaluate(() => {
    const elements = [...document.querySelectorAll('section, h1, p, .poster')];
    return {
      h1: document.querySelector('h1').textContent,
      taglinePx: parseFloat(getComputedStyle(document.querySelector('p')).fontSize),
      urlPx: parseFloat(getComputedStyle(document.querySelector('.address')).fontSize),
      boundsFit: elements.every(el => { const r = el.getBoundingClientRect(); return r.x >= 65 && r.right <= 1215 && r.y >= 20 && r.bottom <= 620 && el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight; }),
      crop: 'Real hero poster top 600x620; bubble and crab only; renderer labels excluded.'
    };
  });
  assert.equal(composition.h1, 'FitPet: a desktop pet that grows when you work out.');
  assert(composition.taglinePx >= 32 && composition.urlPx >= 26 && composition.boundsFit, 'OG text must fit at approved readable sizes');
  report.checks.push({ og: composition });
  await og.screenshot({ path: join(temp, 'og.png'), animations: 'disabled' });
  await png(join(temp, 'og.png'), 'og-v3.png', 1280, 640);
  assert.deepEqual(external, []); assert.deepEqual(errors, []); assert.deepEqual(resourceFailures, []);
  report.checks.push({ externalRequests: external, rendererAndOgErrors: errors, resourceFailures });
  const inventory = [...names.map(name => name === 'hero' ? 'hero-poster.png' : `${name}.png`), 'favicon-32.png', 'apple-touch-icon.png', 'og-v3.png'];
  assert.deepEqual(report.assets.map(asset => asset.name), inventory);
  for (const asset of report.assets) assert.equal(hash(await readFile(join(staged, asset.name))), asset.sha256);
  const reportBytes = JSON.stringify(report, null, 2) + '\n';
  await writeFile(join(temp, 'capture-report.json'), reportBytes);
  // Publication begins only after the entire staged inventory and report pass.
  await mkdir(output, { recursive: true });
  for (const name of inventory) await cp(join(staged, name), join(output, name));
  await rm(join(output, 'og-v1.png'), { force: true });
  await rm(join(output, 'og-v2.png'), { force: true });
  await cp(join(temp, 'capture-report.json'), join(here, 'capture-report.json'));
  console.log(JSON.stringify(report, null, 2));
} finally {
  try {
    if (browser) await browser.close();
  } finally {
    try {
      if (server) await new Promise(resolve => server.close(resolve));
    } finally {
      await rm(temp, { recursive: true, force: true });
      console.log('Temporary renderer and frames removed.');
    }
  }
}