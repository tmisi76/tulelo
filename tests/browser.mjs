import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const testURL = process.env.TULELO_TEST_URL || 'http://127.0.0.1:5173';
const artifacts = process.env.TULELO_TEST_ARTIFACTS || path.resolve('../scratch');
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.TULELO_CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let checks = 0;
const passed = description => { checks++; console.log(`PASS ${checks}: ${description}`); };
const state = () => page.evaluate(() => structuredClone(window.__tulelo.engine.state));
const waitState = (predicate, argument) => page.waitForFunction(predicate, argument, { timeout: 30_000 });
const closeDialog = async () => { await page.locator('#close-dialog').click(); await page.locator('[role="dialog"]').waitFor({ state: 'hidden' }); };
const tap = key => page.keyboard.press(key);
const inventoryCount = (snapshot, itemId) => snapshot.player.inventory.find(item => item.itemId === itemId)?.quantity || 0;

// Only enemy positions and selection are arranged in the combat integration
// fixture. HP, damage, cooldowns, XP, speed and player resources stay real.
async function approachWolf(id) {
  await page.evaluate(enemyId => {
    const engine = window.__tulelo.engine;
    const wolf = engine.state.enemies.find(enemy => enemy.id === enemyId);
    const player = engine.state.player;
    const x = Math.floor(player.x) + 1, y = Math.floor(player.y);
    if (engine.world.blocked[y * engine.world.width + x]) throw new Error('Combat fixture tile is blocked');
    wolf.x = wolf.spawnX = x + 0.5; wolf.y = wolf.spawnY = y + 0.5;
    engine.state.selectedEnemyId = enemyId;
  }, id);
}

async function defeatWolf(id) {
  await approachWolf(id);
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const before = await state();
    assert.notEqual(before.status, 'dead', 'The ordinary wolf battle must remain survivable');
    if (!before.enemies.find(enemy => enemy.id === id).alive) return;
    await tap('f');
    if (before.player.cooldowns.strike <= 0) await tap('1');
    await page.waitForTimeout(750);
  }
  assert.fail(`Real keyboard attacks did not defeat ${id}`);
}

try {
  await page.goto(testURL, { waitUntil: 'networkidle' });
  await page.locator('#begin-game').waitFor();
  assert.equal(await page.locator('[data-race]').count(), 9);
  assert.equal(await page.locator('[data-archetype]').count(), 4);
  await page.locator('#character-name').fill('Böngészővándor');
  await page.locator('[data-race="elf"]').click();
  assert.equal(await page.locator('[data-race="elf"]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-race="human"]').click();
  await page.locator('[data-archetype="mage"]').click();
  assert.match(await page.locator('.starter-kit').innerText(), /Parázsbot/);
  await page.locator('[data-archetype="warrior"]').click();
  await page.locator('[data-stat-plus="vitality"]').click();
  assert.equal(await page.locator('#character-name').inputValue(), 'Böngészővándor');
  assert.match(await page.locator('.points-remaining').innerText(), /5 szabad/);
  await page.screenshot({ path: `${artifacts}/tulelo-browser-start.png`, fullPage: true });
  passed('9 faj, 4 induló út, névmegőrzés és valódi karakterpont-elosztás');

  await page.locator('#begin-game').click();
  await page.locator('#game-canvas canvas').waitFor();
  await waitState(() => window.__tulelo?.engine && window.__tulelo.game.scene.scenes[0]?.scene.isActive());
  assert.equal(await page.locator('#hero-name').innerText(), 'Böngészővándor');
  assert.equal((await state()).player.stats.vitality, 12);
  assert.equal((await state()).player.equipment.weapon, 'iron_sword');
  const gameBounds = await page.locator('#game-canvas canvas').boundingBox();
  assert.ok(gameBounds.width > 800 && gameBounds.height > 300, 'The real Phaser scene has usable dimensions');
  passed('Phaser-jelenet, választott hős, felszerelés és induló adottság');

  const beforeMove = await state();
  await page.keyboard.down('w');
  await waitState(() => {
    const engine = window.__tulelo.engine;
    const elder = engine.world.npcs.find(npc => npc.id === 'elder');
    return engine.state.player.y < elder.y + 1.7;
  });
  await page.keyboard.up('w');
  const afterMove = await state();
  assert.ok(afterMove.player.y < beforeMove.player.y - 0.5, 'W must move the hero through the real scene input');
  assert.ok(afterMove.worldTime > beforeMove.worldTime, 'The world must actually tick');
  await tap('Space');
  await waitState(() => window.__tulelo.engine.state.paused);
  const paused = await state();
  await page.keyboard.down('d');
  await page.waitForTimeout(350);
  await page.keyboard.up('d');
  const stillPaused = await state();
  assert.equal(stillPaused.worldTime, paused.worldTime);
  assert.equal(stillPaused.player.x, paused.player.x);
  assert.equal(stillPaused.player.y, paused.player.y);
  assert.ok(await page.locator('#pause-banner').isVisible());
  await tap('Space');
  await waitState(() => !window.__tulelo.engine.state.paused);
  passed('WASD-mozgás és Szóköz: a szünet valóban megállítja a világot');

  await tap('e');
  await page.locator('[data-quest="first_light"]').waitFor();
  assert.match(await page.locator('#dialog-title').innerText(), /Mara/);
  await page.locator('[data-quest="first_light"]').click();
  assert.equal((await state()).quests.first_light.status, 'active');
  await closeDialog();
  assert.match(await page.locator('#quest-tracker').innerText(), /Az első ösvény/);
  passed('E-interakció a valóban közeli Marával és első küldetés felvétele');

  await tap('c');
  const beforeStat = await state();
  assert.ok(beforeStat.player.statPoints > 0);
  await page.locator('[data-stat="vitality"]').click();
  const afterStat = await state();
  assert.equal(afterStat.player.stats.vitality, beforeStat.player.stats.vitality + 1);
  assert.equal(afterStat.player.statPoints, beforeStat.player.statPoints - 1);
  assert.ok(await page.locator('[data-learn="fireball"]').isDisabled(), 'Learning must be unavailable without an earned skill point');
  await closeDialog();
  passed('Karakterpanel: megmaradt tulajdonságpont elosztása, képességpontkorlát');

  const firstWolf = 'bramble_wolf_1';
  const beforeFixture = await state();
  await approachWolf(firstWolf);
  const beforeCombat = await state();
  await tap('f');
  const afterAttack = await state();
  assert.ok(afterAttack.enemies.find(enemy => enemy.id === firstWolf).hp < beforeCombat.enemies.find(enemy => enemy.id === firstWolf).hp, 'F must reduce enemy HP');
  await waitState(() => window.__tulelo.engine.state.player.hp < window.__tulelo.engine.state.player.stats.vitality * 5 + 70);
  const injured = await state();
  assert.ok(injured.player.hp < beforeFixture.player.hp, 'The live opponent must inflict actual damage');
  const wolfHp = injured.enemies.find(enemy => enemy.id === firstWolf).hp;
  await tap('1');
  assert.ok((await state()).enemies.find(enemy => enemy.id === firstWolf).hp < wolfHp, 'The real ability shortcut must damage the enemy');
  await defeatWolf(firstWolf);
  assert.equal((await state()).killCounts.bramble_wolf, 1);
  assert.match(await page.locator('#log-entries').innerText(), /legyőzve|Zsákmány/);
  passed('Valós F-támadás, 1-képesség, ellenséges sebzés, ölés és zsákmánynapló');

  await tap('i');
  assert.ok(await page.locator('[data-item="iron_sword"]').evaluate(element => element.classList.contains('equipped')));
  await page.locator('[data-item="red_potion"]').click();
  assert.match(await page.locator('.item-detail').innerText(), /28 életerő/);
  const beforePotion = await state();
  await page.locator('[data-use="red_potion"]').click();
  const afterPotion = await state();
  assert.ok(afterPotion.player.hp > beforePotion.player.hp, 'Inventory use must heal the actual player');
  assert.equal(inventoryCount(afterPotion, 'red_potion'), inventoryCount(beforePotion, 'red_potion') - 1);
  await closeDialog();
  passed('Táska: felszerelt kard jelzése, tárgyleírás, gyógyital és készletcsökkenés');

  for (const id of ['bramble_wolf_2', 'bramble_wolf_3', 'bramble_wolf_4', 'bramble_wolf_5']) await defeatWolf(id);
  const afterBattles = await state();
  assert.equal(afterBattles.killCounts.bramble_wolf, 5);
  assert.ok(afterBattles.player.level >= 2, 'Skill points must be earned from genuine combat XP');
  assert.equal(afterBattles.quests.first_light.progress[1], 3);
  await tap('c');
  const beforeLearn = await state();
  await page.locator('[data-learn="fireball"]').click();
  const afterLearn = await state();
  assert.equal(afterLearn.player.skills.fireball, 1);
  assert.equal(afterLearn.player.skillPoints, beforeLearn.player.skillPoints - 1);
  await closeDialog();
  assert.ok(await page.locator('[data-skill="fireball"]').isEnabled());
  passed('Harcból szerzett szintlépés, küldetéselőrehaladás és UI-n megtanult új képesség');

  await tap('m');
  await page.locator('#world-map').waitFor();
  assert.match(await page.locator('.landmark-list').innerText(), /Újpart/);
  assert.ok((await state()).paused, 'The map is a tactical paused view');
  await tap('m');
  await page.locator('[role="dialog"]').waitFor({ state: 'hidden' });
  assert.equal((await state()).paused, false);
  passed('Világtérkép nyitása, felfedezett menedék és ugyanazzal a gombbal bezárás');

  await tap('Escape');
  await page.evaluate(() => {
    void window.__tulelo.saveCurrent(false);
    void window.__tulelo.saveCurrent(true);
  });
  await page.getByText('A kaland elmentve ebben a böngészőben.', { exact: true }).waitFor();
  passed('Az automatikus mentéssel egyidejű kézi mentés is végrehajtódik és visszajelzést ad');
  await page.getByText('A kaland elmentve ebben a böngészőben.', { exact: true }).waitFor({ state: 'hidden' });
  await page.locator('#save-now').click();
  await page.getByText('A kaland elmentve ebben a böngészőben.', { exact: true }).waitFor();
  const saved = await state();
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#continue-game').waitFor();
  assert.match(await page.locator('#continue-game').innerText(), /Böngészővándor/);
  await page.locator('#continue-game').click();
  await page.locator('#game-canvas canvas').waitFor();
  const resumed = await state();
  assert.equal(resumed.player.name, saved.player.name);
  assert.equal(resumed.player.level, saved.player.level);
  assert.deepEqual(resumed.player.stats, saved.player.stats);
  assert.deepEqual(resumed.player.skills, saved.player.skills);
  assert.deepEqual(resumed.player.inventory, saved.player.inventory);
  assert.deepEqual(resumed.quests, saved.quests);
  assert.deepEqual(resumed.killCounts, saved.killCounts);
  assert.equal(resumed.enemies.filter(enemy => !enemy.alive).length, 5);
  passed('Kézi IndexedDB-mentés, valódi újratöltés és folytatás megmaradt állapottal');

  await tap('Escape');
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#export-save').click();
  const download = await downloadEvent;
  assert.equal(await download.failure(), null);
  const exportPath = `${artifacts}/tulelo-browser-save.json`;
  await download.saveAs(exportPath);
  const envelope = JSON.parse(await readFile(exportPath, 'utf8'));
  assert.equal(envelope.format, 'tulelo-rpg');
  assert.equal(envelope.version, 1);
  assert.equal(envelope.state.player.name, saved.player.name);
  assert.deepEqual(envelope.state.quests, saved.quests);
  assert.deepEqual(envelope.state.player.skills, saved.player.skills);
  const chooserEvent = page.waitForEvent('filechooser');
  await page.locator('#import-save').click();
  await (await chooserEvent).setFiles(exportPath);
  await page.getByText('A mentés betöltve. Folytatódhat a kaland!', { exact: true }).waitFor();
  await page.locator('#game-canvas canvas').waitFor();
  const imported = await state();
  assert.equal(imported.player.name, envelope.state.player.name);
  assert.deepEqual(imported.player.equipment, envelope.state.player.equipment);
  assert.deepEqual(imported.player.inventory, envelope.state.player.inventory);
  assert.deepEqual(imported.player.skills, envelope.state.player.skills);
  assert.deepEqual(imported.quests, envelope.state.quests);
  assert.deepEqual(imported.killCounts, envelope.state.killCounts);
  passed('Letöltött JSON valódi formátuma és fájlválasztón keresztüli konzisztens visszaimportálás');

  await page.waitForTimeout(250);
  await page.screenshot({ path: `${artifacts}/tulelo-browser-final.png`, fullPage: true });
  assert.deepEqual(errors, [], `Unexpected browser errors: ${errors.join('; ')}`);
  passed('Kezdő- és játékképernyő mentve; 0 böngészőoldali kivétel');
  console.log(`SUCCESS: ${checks} meaningful browser checks passed at ${testURL}.`);
} catch (error) {
  console.error(`FAIL after ${checks} checks:`, error);
  console.error('Browser page errors:', errors);
  await page.screenshot({ path: `${artifacts}/tulelo-browser-failure.png`, fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
