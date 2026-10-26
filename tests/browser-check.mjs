import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined, headless: true });
const out = '.impeccable/review';
await mkdir(out, { recursive: true });
const errors = [];
async function page(width, height) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3001');
  await page.getByText('Table server connected', { exact: true }).waitFor({ state: 'attached' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}
async function capture(page, name) {
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth).map(e => ({class: e.className, width: e.getBoundingClientRect().width, x: e.getBoundingClientRect().x})).slice(0, 12)));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name}: horizontal overflow`);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
try {
  const desktop = await page(1440, 1000), mobile = await page(390, 844);
  await capture(desktop, 'desktop'); await capture(mobile, 'mobile');
  await desktop.getByRole('button', { name: 'How to play' }).click();
  await desktop.getByRole('dialog', { name: 'Welcome to the cat court.' }).waitFor();
  await desktop.keyboard.press('Escape');
  await desktop.getByLabel('Your nickname').fill('Miso');
  await desktop.getByRole('button', { name: 'Create a room' }).click();
  await desktop.getByText('Your table is waiting.').waitFor();
  const code = await desktop.locator('.room-code strong').innerText();
  await mobile.getByLabel('Your nickname').fill('Mochi');
  await mobile.getByLabel('Room code', { exact: true }).fill(code);
  await mobile.getByRole('button', { name: 'Join room' }).click();
  await mobile.getByText('Your table is waiting.').waitFor();
  await capture(desktop, 'lobby-desktop');
  await mobile.getByRole('button', { name: 'I’m ready' }).click();
  await desktop.getByRole('button', { name: 'I’m ready' }).click();
  await desktop.getByRole('button', { name: 'Deal the cards' }).click();
  await desktop.getByRole('heading', { name: 'Your move. Make it convincing.' }).waitFor();
  await capture(desktop, 'game-desktop'); await capture(mobile, 'game-mobile');
  await desktop.getByRole('button', { name: /Income Take 1 coin/ }).click();
  await mobile.getByRole('heading', { name: 'Your move. Make it convincing.' }).waitFor();
  await mobile.getByRole('button', { name: /Tax Take 3 coins/ }).click();
  await desktop.getByRole('button', { name: 'Accept claim' }).click();
  await desktop.getByRole('heading', { name: 'Your move. Make it convincing.' }).waitFor();
  await desktop.reload();
  await desktop.getByRole('heading', { name: 'Your move. Make it convincing.' }).waitFor();
  await desktop.getByRole('button', { name: 'Hide cards', exact: true }).click();
  assert.equal(await desktop.locator('.your-hand .card-back').count(), 2);
  await desktop.getByRole('button', { name: 'Show cards', exact: true }).click();
  assert.equal(await desktop.locator('.your-hand .portrait').count(), 2);
  assert.deepEqual(errors, []);
  await writeFile(`${out}/browser-result.json`, JSON.stringify({ status: 'passed', viewports: ['1440x1000', '390x844'], checks: ['no horizontal overflow', 'room creation and joining', 'ready and deal', 'income', 'tax claim and acceptance', 'reload restores private seat', 'hide and show hand', 'rules dialog keyboard dismissal'], pageErrors: errors }, null, 2));
  console.log('PASS: desktop/mobile multiplayer browser walkthrough');
} finally { await browser.close(); }
