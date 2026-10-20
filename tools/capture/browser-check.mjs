import assert from 'node:assert/strict';
import { mkdir, writeFile, realpath } from 'node:fs/promises';
import { resolve, dirname, basename, join } from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const option = (name) => args[args.indexOf(name) + 1];
if (!args.includes('--base-url') || !args.includes('--output-dir')) {
  throw new Error('Usage: node browser-check.mjs --base-url http://127.0.0.1:8000/fitpet/ --output-dir /absolute/scratch');
}
const base = new URL(option('--base-url'));
assert.equal(base.hostname, '127.0.0.1');
assert.equal(base.pathname, '/fitpet/');
assert.equal(base.origin, 'http://127.0.0.1:8000');
const output = resolve(option('--output-dir'));
const repo = resolve(import.meta.dirname, '../..');
const protectedRepo = '/Users/victorchun/fitpet';
const outsideRepos = (path) => [repo, protectedRepo].every((root) => path !== root && !path.startsWith(root + '/'));
assert(outsideRepos(output), 'Screenshots must be outside both repositories');
let ancestor = output;
const suffix = [];
while (true) {
  try {
    const physical = join(await realpath(ancestor), ...suffix);
    assert(outsideRepos(physical), 'Screenshot destination must not resolve into either repository');
    break;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    suffix.unshift(basename(ancestor));
    ancestor = dirname(ancestor);
  }
}
await mkdir(output, { recursive: true });
assert(outsideRepos(await realpath(output)), 'Screenshot destination symlink must not enter either repository');
const browser = await chromium.launch({ headless: true });
const failures = [];
const report = { base: base.href, scenarios: [], screenshots: [], firstLoadBytes: 0, requests: [] };

async function scenario({ theme = 'dark', width = 1280, js = true, motion = 'reduce', name }) {
  const context = await browser.newContext({
    viewport: { width, height: 900 }, colorScheme: theme,
    reducedMotion: motion, javaScriptEnabled: js, deviceScaleFactor: 1,
  });
  const requests = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== base.origin) {
      failures.push(`${name}: outbound request ${url.href}`);
      await route.abort();
    } else await route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => failures.push(`${name}: ${error.message}`));
  page.on('requestfailed', (request) => failures.push(`${name}: failed request ${request.url()}: ${request.failure()?.errorText}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`${name}: console ${message.text()}`);
  });
  const responses = [];
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${name}: HTTP ${response.status()} ${response.url()}`);
    responses.push(response);
  });
  await page.goto(base.href, { waitUntil: 'networkidle' });
  const initialResponses = [...responses];
  const initialResources = [];
  for (const response of new Map(initialResponses.map((response) => [response.url(), response])).values()) {
    initialResources.push({ url: response.url(), bytes: (await response.body()).length });
  }
  if (motion === 'reduce') assert(!initialResponses.some((response) => response.request().resourceType() === 'media'), 'Reduced-motion first load must not fetch video');
  assert.equal(await page.locator('h1').count(), 1, `${name}: one h1`);
  assert.equal(await page.locator('main').count(), 1);
  assert.equal(await page.locator('header').count(), 1);
  assert.equal(await page.locator('footer').count(), 1);
  const headings = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll((nodes) => nodes.map((node) => Number(node.tagName[1])));
  headings.forEach((level, i) => assert(i === 0 || level <= headings[i - 1] + 1, `${name}: heading hierarchy`));
  assert.equal(await page.locator('script:not([src]), [style], [onclick], [onload]').count(), 0, 'No CSP-incompatible markup');
  assert.equal(await page.locator('a[target="_blank"], a[rel~="noreferrer"], meta[name="referrer"]').count(), 0);
  assert(await page.locator('meta[http-equiv="Content-Security-Policy"]').count());
  assert(await page.locator('link[rel="canonical"]').getAttribute('href') === 'https://victory-c.github.io/fitpet/');
  assert((await page.locator('meta[name="description"]').getAttribute('content')).length <= 160);
  for (const image of await page.locator('img').all()) {
    assert(await image.getAttribute('alt'), `${name}: meaningful alt text`);
    assert(Number(await image.getAttribute('width')) > 0 && Number(await image.getAttribute('height')) > 0, 'Explicit image dimensions');
    const box = await image.boundingBox();
    if (box && box.y >= 900 && await image.getAttribute('fetchpriority') !== 'high') assert.equal(await image.getAttribute('loading'), 'lazy', 'Below-fold non-hero image must be lazy');
  }
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: horizontal overflow`);
  assert.equal((await context.cookies()).length, 0);
  if (js) {
    assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
    assert.equal(await page.evaluate(() => navigator.serviceWorker?.controller ?? null), null);
  }
  const video = page.locator('video');
  if (await video.count()) {
    assert.equal(await video.getAttribute('autoplay'), null);
    assert.equal(await video.getAttribute('preload'), 'none');
    assert(await video.getAttribute('poster'));
    if (motion === 'reduce' && js) assert(await video.evaluate((element) => element.paused), 'Reduced motion must not autoplay');
    if (!js) assert(await video.getAttribute('controls') !== null, 'JS-disabled native controls');
    if (motion === 'no-preference' && js) {
      await page.waitForFunction(() => !document.querySelector('video').paused);
      const control = page.getByRole('button', { name: /pause/i });
      await control.focus();
      await page.keyboard.press('Enter');
      assert(await video.evaluate((element) => element.paused));
      await page.getByRole('button', { name: /play/i }).focus();
      await page.keyboard.press('Space');
      await page.waitForFunction(() => !document.querySelector('video').paused);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert(await video.evaluate((element) => element.paused), 'Motion preference changes pause video');
    }
  }
  // Tab from document start: the skip link must lead into the main landmark.
  await page.goto(base.href, { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').getAttribute('href'), '#main');
  const outline = await page.locator(':focus').evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
  });
  assert(outline.width >= 3 && outline.style !== 'none', 'Visible >=3px keyboard focus');
  await page.keyboard.press('Enter');
  assert.equal(new URL(page.url()).hash, '#main');
  assert(await page.evaluate(() => document.activeElement === document.querySelector('main') || document.querySelector('main').contains(document.activeElement)), 'Skip link moves keyboard focus into main');
  await page.locator('main').evaluate((element) => element.blur());
  // Scroll through lazy images so review screenshots contain decoded imagery.
  for (const image of await page.locator('img').all()) await image.scrollIntoViewIfNeeded();
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
  const screenshot = resolve(output, `${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
  report.screenshots.push(screenshot);
  if (name === 'desktop-dark') {
    requests.push(...initialResources);
    // Actual initial responses include browser-selected icons and near-viewport lazy images.
    report.firstLoadBytes = requests.reduce((sum, { bytes }) => sum + bytes, 0);
    report.requests = requests;
    // Supplemental reflow/text-resize stress test, not a claim of browser UI zoom.
    await page.setViewportSize({ width: 640, height: 900 });
    const originalFont = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    await page.evaluate((size) => document.styleSheets[0].insertRule(`html { font-size: ${size * 2}px !important; }`, document.styleSheets[0].cssRules.length), originalFont);
    assert.equal(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize)), originalFont * 2);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '200% text zoom overflow');
    await page.screenshot({ path: resolve(output, 'zoom-200.png'), fullPage: true, animations: 'disabled' });
  }
  if (name === 'desktop-dark') {
    await page.goto(new URL('404.html', base).href, { waitUntil: 'networkidle' });
    assert.match(await page.locator('h1').innerText(), /Shelldon wandered off/);
    assert.equal(await page.getByRole('link', { name: /back to fitpet/i }).getAttribute('href'), '/fitpet/');
    assert(await page.evaluate(() => !!document.styleSheets.length));
    await page.screenshot({ path: resolve(output, '404-dark.png'), fullPage: true });
  }
  report.scenarios.push({ name, passed: true });
  assert.equal((await context.cookies()).length, 0);
  if (js) assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
  await context.close();
}

try {
  for (const theme of ['dark', 'light']) {
    await scenario({ theme, name: `desktop-${theme}` });
    await scenario({ theme, width: 360, name: `mobile-${theme}` });
  }
  await scenario({ width: 320, name: 'narrow-320' });
  await scenario({ js: false, name: 'javascript-disabled' });
  await scenario({ motion: 'no-preference', name: 'motion-enabled' });
  await writeFile(resolve(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  assert(report.firstLoadBytes <= 150000, `First load ${report.firstLoadBytes} > 150000 bytes`);
  assert.deepEqual(failures, [], failures.join('\n'));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}