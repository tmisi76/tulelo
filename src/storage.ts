import type { GameState } from './types';
import { ENEMIES, ITEMS, QUESTS, RACES, ARCHETYPES } from './content';

const DATABASE = 'tulelo-rpg';
const STORE = 'saves';
export interface SaveEnvelope { format: 'tulelo-rpg'; version: 1; savedAt: string; state: GameState; }

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('A böngésző nem engedi a helyi mentést. Használd a mentés letöltését.'));
  });
}

export function snapshot(state: GameState): SaveEnvelope {
  const copy = structuredClone(state);
  copy.paused = false;
  copy.events = [];
  copy.logs = copy.logs.slice(-100);
  return { format: 'tulelo-rpg', version: 1, savedAt: new Date().toISOString(), state: copy };
}

export async function saveGame(state: GameState): Promise<void> {
  if (state.status === 'dead') return;
  const envelope = snapshot(state);
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const previous = store.get('current');
    previous.onsuccess = () => {
      const older = store.get('previous');
      older.onsuccess = () => {
        if (older.result) store.put(older.result, 'backup');
        if (previous.result) store.put(previous.result, 'previous');
        store.put(envelope, 'current');
      };
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(new Error('A mentés nem sikerült. Töltsd le a mentésfájlt.')); };
    tx.onabort = tx.onerror;
  });
}

export async function loadGame(): Promise<GameState | null> {
  const db = await database();
  const envelopes = await new Promise<unknown[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const values: unknown[] = [];
    for (const key of ['current', 'previous', 'backup']) {
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => values.push(req.result);
    }
    tx.oncomplete = () => { db.close(); resolve(values); };
    tx.onerror = () => { db.close(); reject(new Error('A helyi mentés nem olvasható.')); };
  });
  for (const envelope of envelopes) {
    if (!envelope) continue;
    try { return parseSave(JSON.stringify(envelope)); } catch { /* Try a retained checkpoint. */ }
  }
  return null;
}

export function parseSave(text: string): GameState {
  if (text.length > 5_000_000) throw new Error('Ez a mentésfájl túl nagy.');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Ez nem olvasható JSON-mentés.'); }
  const fail = (): never => { throw new Error('A mentés sérült, vagy másik játékverzióhoz tartozik.'); };
  if (!value || typeof value !== 'object') fail();
  const envelope = value as SaveEnvelope;
  if (envelope.format !== 'tulelo-rpg' || envelope.version !== 1) fail();
  const s = envelope.state;
  if (!s || s.version !== 1 || !Number.isInteger(s.seed) || !s.player) fail();
  const p = s.player;
  if (typeof p.name !== 'string' || p.name.length > 40 || !RACES.some(r => r.id === p.raceId) || !ARCHETYPES.some(a => a.id === p.archetypeId)) fail();
  for (const number of [p.level, p.xp, p.hp, p.mana, p.stamina, p.gold, p.food, p.x, p.y, p.statPoints, p.skillPoints, p.attackCooldown, s.worldTime, s.kills]) {
    if (!Number.isFinite(number) || number < 0 || number > 1_000_000_000) fail();
  }
  if (!Number.isInteger(s.rng) || s.rng < 0 || s.rng > 0xffffffff) fail();
  if (p.level < 1 || p.level > 30 || p.x >= 112 || p.y >= 84 || p.food > 100) fail();
  for (const key of ['strength', 'dexterity', 'vitality', 'intelligence', 'wisdom', 'will'] as const) {
    if (!p.stats || !Number.isFinite(p.stats[key]) || p.stats[key] < 1 || p.stats[key] > 100) fail();
  }
  for (const key of ['strike', 'fireball', 'heal', 'dash', 'frost', 'ward'] as const) {
    if (!p.skills || !Number.isInteger(p.skills[key]) || p.skills[key] < 0 || p.skills[key] > 3 || !p.cooldowns || !Number.isFinite(p.cooldowns[key]) || p.cooldowns[key] < 0) fail();
  }
  if (!Array.isArray(p.inventory) || p.inventory.length > 200) fail();
  for (const item of p.inventory) if (!ITEMS[item.itemId] || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100_000) fail();
  if (!p.equipment || !ITEMS[p.equipment.weapon] || !ITEMS[p.equipment.armor] || (p.equipment.charm && !ITEMS[p.equipment.charm])) fail();
  for (const list of [s.explored, s.discovered, s.openedChests, s.logs, s.events, s.enemies]) if (!Array.isArray(list) || list.length > 12_000) fail();
  if (s.explored.some(i => !Number.isInteger(i) || i < 0 || i >= 112 * 84)) fail();
  if (s.discovered.some(id => typeof id !== 'string') || s.openedChests.some(id => typeof id !== 'string')) fail();
  if (!s.collectedNodes || !s.quests || !s.killCounts || !['playing', 'dead', 'won'].includes(s.status)) fail();
  for (const enemy of s.enemies) {
    if (!ENEMIES[enemy.typeId] || typeof enemy.id !== 'string' || typeof enemy.alive !== 'boolean') fail();
    for (const num of [enemy.x, enemy.y, enemy.spawnX, enemy.spawnY, enemy.hp, enemy.maxHp, enemy.cooldown, enemy.respawnAt]) if (!Number.isFinite(num) || num < 0) fail();
    if (enemy.x >= 112 || enemy.y >= 84 || enemy.spawnX >= 112 || enemy.spawnY >= 84) fail();
  }
  for (const [id, quest] of Object.entries(s.quests)) {
    const def = QUESTS.find(q => q.id === id);
    if (!def || !['active', 'ready', 'completed'].includes(quest.status) || !Array.isArray(quest.progress) || quest.progress.length !== def.objectives.length || quest.progress.some(n => !Number.isFinite(n) || n < 0)) fail();
  }
  if (s.logs.some(log => typeof log.text !== 'string' || log.text.length > 3000 || !Number.isFinite(log.id))) fail();
  s.events = [];
  s.paused = false;
  return s;
}

export function downloadSave(state: GameState): void {
  const blob = new Blob([JSON.stringify(snapshot(state), null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `tulelo-${state.player.name.replace(/[^a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ_-]/g, '_')}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
