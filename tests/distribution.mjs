import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';

// Exercise exactly the entry document someone receives in the player ZIP.
// The managed Chromium policy blocks file://; this server offers only that
// document, so a missing local build file cannot accidentally be supplied.
const archive = path.resolve('kiadas/tulelo-kiprobalas.zip');
const standalone = await readFile('kiadas/tulelo-jatek.html', 'utf8');
const files = unzipSync(await readFile(archive));
const entries = Object.keys(files);
assert.equal(entries.length, 2, 'The player ZIP must contain only the game and its opening instructions');
assert.ok(entries.includes('index.html'), 'The ZIP opens through an unambiguous root index.html');
const instructionsFile = entries.find(entry => entry !== 'index.html');
assert.ok(/^[^/\\]+\.txt$/i.test(instructionsFile), 'Instructions sit beside the root game, without a source-code tree');
const document = strFromU8(files['index.html']);
assert.equal(document, standalone, 'The ZIP ships the same self-contained document as the supported HTML download');
const instructions = strFromU8(files[instructionsFile]);
assert.match(instructions, /index\.html/i, 'Instructions name the actual playable document');
console.log('PASS: player ZIP has one root game document and correct opening instructions');

const gameBundle = /<script\b(?=[^>]*\bdata-game-bundle\b)[^>]*>[\s\S]*?<\/script>/i;
assert.ok(gameBundle.test(document), 'The packaged startup script can be tested independently of the startup error handler');
const brokenDocument = document.replace(gameBundle, '<script data-game-bundle>function invalidStartup(</script>');
const documents = new Map([
  ['/index.html', document],
  ['/broken.html', brokenDocument],
]);
const server = createServer((request, response) => {
  const html = documents.get(request.url);
  if (html === undefined) { response.writeHead(404).end('Only the packaged game document is available.'); return; }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseURL = `http://127.0.0.1:${server.address().port}`;
let browser;

async function testPlayable({ blockedStorage = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  if (blockedStorage) {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        get() { throw new DOMException('Storage is disabled for this browser origin.', 'SecurityError'); },
      });
    });
  }
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  try {
    await page.goto(`${baseURL}/index.html`, { waitUntil: 'load' });
    await context.setOffline(true);
    await page.locator('#begin-game').waitFor({ timeout: 30_000 });
    assert.equal(await page.locator('[data-race]').count(), 9);
    assert.equal(await page.locator('[data-archetype]').count(), 4);
    const externalElements = await page.evaluate(() => [
      ...document.querySelectorAll('script[src], link[rel="stylesheet"], img[src], source[src], audio[src]'),
    ].filter(element => !element.getAttribute('src')?.startsWith('data:')).map(element => element.outerHTML));
    assert.deepEqual(externalElements, [], 'The opening screen references no separate scripts, styles, images or audio files');
    const name = blockedStorage ? 'Mentés nélkül' : 'ZIP kalandor';
    await page.locator('#character-name').fill(name);
    await page.locator('#begin-game').click();
    await page.locator('#game-canvas canvas').waitFor({ timeout: 30_000 });
    assert.equal(await page.locator('#hero-name').innerText(), name);
    const canvas = await page.locator('#game-canvas canvas').boundingBox();
    assert.ok(canvas.width > 400 && canvas.height > 200, 'The game renderer starts in a usable play area');
    await page.keyboard.press('Escape');
    await page.locator('#save-now').waitFor();
    assert.deepEqual(requests, [`${baseURL}/index.html`], 'Only the game document is requested; the game starts offline');
    assert.deepEqual(errors, [], 'ZIP startup and scene creation produce no uncaught browser errors');
    console.log(`PASS: ZIP character creation and game scene start offline${blockedStorage ? ' with browser storage disabled' : ''}`);
  } finally {
    await context.close();
  }
}

try {
  browser = await chromium.launch({
    executablePath: process.env.TULELO_CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  await testPlayable();
  await testPlayable({ blockedStorage: true });

  const noJavaScript = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await noJavaScript.newPage();
    await page.goto(`${baseURL}/index.html`, { waitUntil: 'load' });
    assert.ok((await page.locator('body').innerText()).trim().length > 80, 'With JavaScript disabled, the player receives visible instructions instead of a white screen');
    assert.match(await page.locator('body').innerText(), /JavaScript/i);
    console.log('PASS: disabled JavaScript shows readable startup instructions');
  } finally {
    await noJavaScript.close();
  }

  const faultyStartup = await browser.newContext();
  try {
    const page = await faultyStartup.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${baseURL}/broken.html`, { waitUntil: 'load' });
    const alert = page.locator('[role="alert"]');
    await alert.waitFor({ state: 'visible', timeout: 30_000 });
    assert.ok((await alert.innerText()).trim().length > 40, 'An actual startup syntax failure produces an actionable visible message');
    assert.ok(errors.length > 0, 'The syntax-failure fixture genuinely failed to execute');
    assert.equal(await page.locator('#begin-game').count(), 0, 'The failure fixture did not accidentally execute the original game');
    console.log('PASS: a genuine game-script syntax error shows a visible recovery message');
  } finally {
    await faultyStartup.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
