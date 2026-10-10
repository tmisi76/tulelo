import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const gameFile = path.resolve('kiadas/tulelo-jatek.html');
const artifacts = process.env.TULELO_TEST_ARTIFACTS || path.resolve('../scratch');
await mkdir(artifacts, { recursive: true });
// The managed cloud browser blocks file:// URLs. In that environment serve only
// this one document, then turn networking off while exercising the game.
const useHTTP = process.env.TULELO_STANDALONE_HTTP === '1';
let server;
let gameURL = pathToFileURL(gameFile).href;
if (useHTTP) {
  const html = await readFile(gameFile);
  server = createServer((request, response) => {
    if (request.url !== '/tulelo-jatek.html') { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  gameURL = `http://127.0.0.1:${server.address().port}/tulelo-jatek.html`;
}
const browser = await chromium.launch({
  executablePath: process.env.TULELO_CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const context = await browser.newContext({ offline: !useHTTP, acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
const requests = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });

try {
  await page.goto(gameURL, { waitUntil: 'load' });
  await context.setOffline(true);
  await page.locator('#character-name').fill('Offline kalandor');
  assert.equal(await page.locator('[data-race]').count(), 9);
  const backgroundLoaded = await page.locator('.ambient-backdrop').evaluate(element => {
    const source = getComputedStyle(element).backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
    return new Promise(resolve => { if (!source) return resolve(false); const img = new Image(); img.onload = () => resolve(img.naturalWidth > 1000); img.onerror = () => resolve(false); img.src = source; });
  });
  assert.ok(backgroundLoaded, 'Bundled concept art loads without Internet');
  await page.locator('#begin-game').click();
  await page.locator('#game-canvas canvas').waitFor();
  assert.equal(await page.locator('#hero-name').innerText(), 'Offline kalandor');
  assert.equal(await page.evaluate(() => typeof window.__tulelo), 'undefined', 'Production does not expose the developer fixture');
  await page.keyboard.down('w');
  await page.waitForFunction(() => Number(document.querySelector('#map-coordinates').textContent.split(',')[1]) <= 40, null, { timeout: 30_000 });
  await page.keyboard.up('w');
  await page.keyboard.press('e');
  await page.locator('[data-quest="first_light"]').waitFor();
  await page.locator('[data-quest="first_light"]').click();
  await page.locator('#close-dialog').click();
  await page.keyboard.press('Escape');
  await page.locator('#save-now').click();
  await page.waitForFunction(() => document.querySelector('.toast-container')?.textContent.includes('A kaland elmentve'));
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export-save').click();
  const download = await downloadPromise;
  const save = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(save.state.player.name, 'Offline kalandor');
  assert.equal(save.state.quests.first_light.status, 'active');
  assert.ok(save.state.player.y < 41 && save.state.worldTime > 0, 'Real scene movement and ticking survive export');
  if (useHTTP) await context.setOffline(false);
  await page.reload({ waitUntil: 'load' });
  await context.setOffline(true);
  await page.locator('#continue-game').waitFor();
  await page.locator('#continue-game').click();
  await page.locator('#hero-name').waitFor();
  assert.equal(await page.locator('#hero-name').innerText(), 'Offline kalandor');
  assert.match(await page.locator('#quest-tracker').innerText(), /Az első ösvény/);
  assert.equal(await page.locator('#map-coordinates').innerText(), `${Math.floor(save.state.player.x)}, ${Math.floor(save.state.player.y)}`);
  await page.screenshot({ path: `${artifacts}/tulelo-offline.png` });
  assert.deepEqual(requests, useHTTP ? [gameURL, gameURL] : [], 'Only the two document navigations are permitted; gameplay fetches no assets or external URLs');
  assert.deepEqual(errors, [], 'Standalone gameplay has no uncaught browser exceptions');
  console.log(`PASS: standalone ${useHTTP ? 'single-document HTTP' : 'file://'} startup, bundled artwork, offline real movement, NPC quest, export and IndexedDB reload; zero asset/external requests and browser errors`);
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
