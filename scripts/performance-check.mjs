// Synthetic cold-page measurements. Use only an isolated loopback instance.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:3105';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw Error('Use a local test instance');
const label = process.argv[2] || 'baseline';
if (!/^[a-z0-9-]+$/.test(label)) throw Error('Invalid result label');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined, headless: true });
const samples = [];
const output = '.impeccable/review';
await mkdir(output, { recursive: true });
try {
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 500000, uploadThroughput: 125000 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      window.__catPerf = { lcp: null, cls: 0, longTasks: 0 };
      new PerformanceObserver(list => { for (const e of list.getEntries()) window.__catPerf.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__catPerf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => { window.__catPerf.longTasks += list.getEntries().length; }).observe({ type: 'longtask', buffered: true });
    });
    const artwork = page.waitForResponse(r => /\/assets\/cat-court(?:-lossless)?\.(?:png|webp)$/.test(new URL(r.url()).pathname), { timeout: 60000 });
    await page.goto(base, { waitUntil: 'load', timeout: 60000 });
    try {
      await page.getByText('Table server connected', { exact: true }).waitFor({ timeout: 60000 });
    } catch (error) {
      await page.screenshot({ path: `${output}/performance-${label}-failed.png`, fullPage: true });
      await writeFile(`${output}/performance-${label}-failed.json`, JSON.stringify({ errors, body: await page.locator('body').innerText() }, null, 2));
      throw error;
    }
    await page.evaluate(() => document.fonts.ready);
    const artResponse = await artwork;
    if (artResponse.status() !== 200) throw Error('Artwork was not served successfully');
    await artResponse.finished();
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const result = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource').filter(e => !e.name.includes('/socket.io/'));
      const nav = performance.getEntriesByType('navigation')[0];
      return { ...window.__catPerf, visualReadyMs: performance.now(), documentTtfbMs: nav.responseStart - nav.requestStart,
        resourceBytes: resources.reduce((n, e) => n + e.encodedBodySize, 0),
        resources: resources.map(e => ({ path: new URL(e.name).pathname, bytes: e.encodedBodySize, durationMs: e.duration })) };
    });
    samples.push(result);
    if (i === 2) await page.screenshot({ path: `${output}/performance-${label}.png`, fullPage: true });
    await context.close();
  }
} finally { await browser.close(); }
const median = key => samples.map(s => s[key]).sort((a, b) => a - b)[1];
const report = { label, conditions: { coldCache: true, runs: 3, viewport: '1440x1000', downloadBytesPerSecond: 500000, latencyMs: 40, cpuSlowdown: 4, reducedMotion: true },
  median: Object.fromEntries(['visualReadyMs', 'lcp', 'cls', 'longTasks', 'resourceBytes'].map(key => [key, median(key)])), samples };
await writeFile(`${output}/performance-${label}.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ label, median: report.median }, null, 2));
