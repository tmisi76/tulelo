import { describe, expect, it } from 'vitest';
import { ENEMIES, ITEMS, QUESTS, SKILLS } from '../src/content';
import { createInitialState, GameEngine, maxHp, maxMana, xpForLevel } from '../src/engine';
import { parseSave, snapshot } from '../src/storage';
import type { WorldData } from '../src/types';

function fixture(archetypeId = 'warrior', enemyType = 'bramble_wolf') {
  const world: WorldData = {
    seed: 11, width: 20, height: 20, tiles: Array(400).fill('grass'), blocked: Array(400).fill(false),
    spawn: { x: 2, y: 2 }, regions: [], landmarks: [],
    npcs: [{ id: 'elder', name: 'Mara', role: 'elder', x: 2, y: 2, color: 0xffffff, dialogue: 'Üdvözöllek!', shop: ['red_potion', 'trail_bread'] }],
    resources: [{ id: 'herb-1', itemId: 'bitterleaf', kind: 'herb', x: 3, y: 2 }],
    chests: [{ id: 'chest-1', x: 4, y: 2, gold: 8, items: [{ itemId: 'iron_ore', quantity: 2 }] }],
    enemies: [{ id: 'enemy-1', typeId: enemyType, x: 3, y: 2 }],
  };
  const state = createInitialState(world, { name: 'Tesztvándor', raceId: 'human', archetypeId, bonuses: { strength: 2, dexterity: 2, vitality: 2 } });
  const engine = new GameEngine(world, state);
  return { world, state, engine };
}
const quantity = (state: ReturnType<typeof createInitialState>, id: string) => state.player.inventory.find(item => item.itemId === id)?.quantity ?? 0;

describe('expedíciós játékmotor', () => {
  it('a közeli élő ellenfél valóban támad, szünetben viszont a világ megáll', () => {
    const { engine, state } = fixture();
    const originalHp = state.player.hp;
    engine.tick(0.2);
    expect(state.player.hp).toBeLessThan(originalHp);
    expect(state.player.hp).toBeGreaterThan(originalHp - 10);
    engine.dispatch({ type: 'pause', value: true });
    const pausedHp = state.player.hp, pausedTime = state.worldTime, pausedX = state.player.x;
    engine.tick(5);
    engine.dispatch({ type: 'move', dx: 1, dy: 0, dt: 0.1 });
    expect(state.player.hp).toBe(pausedHp);
    expect(state.worldTime).toBe(pausedTime);
    expect(state.player.x).toBe(pausedX);
    state.player.statPoints = 1;
    engine.dispatch({ type: 'stat', stat: 'vitality' });
    expect(state.player.statPoints).toBe(0);
    expect(state.player.hp).toBe(pausedHp + 5);
  });

  it('a mozgás nem halad át falon és új csempéket fedez fel', () => {
    const { world, engine, state } = fixture();
    world.blocked[2 * world.width + 3] = true;
    for (let index = 0; index < 10; index++) engine.dispatch({ type: 'move', dx: 1, dy: 0, dt: 0.1 });
    expect(state.player.x).toBeLessThan(3);
    const explored = state.explored.length;
    for (let index = 0; index < 20; index++) engine.dispatch({ type: 'move', dx: 0, dy: 1, dt: 0.1 });
    expect(state.player.y).toBeGreaterThan(7);
    expect(state.explored.length).toBeGreaterThan(explored);
    expect(new Set(state.explored).size).toBe(state.explored.length);
  });

  it('öléskor egyszer ad XP-t, aranyat és zsákmányt; a szintlépés pontokat ad', () => {
    const { engine, state } = fixture();
    state.enemies[0].hp = 1;
    state.player.xp = xpForLevel(1) - 10;
    const gold = state.player.gold;
    engine.dispatch({ type: 'skill', skill: 'strike', enemyId: 'enemy-1' });
    expect(state.enemies[0].alive).toBe(false);
    expect(state.kills).toBe(1);
    expect(state.killCounts.bramble_wolf).toBe(1);
    expect(state.player.gold).toBe(gold + ENEMIES.bramble_wolf.gold);
    expect(state.player.level).toBe(2);
    expect(state.player.xp).toBe(ENEMIES.bramble_wolf.xp - 10);
    expect(state.player.statPoints).toBe(1);
    expect(state.player.skillPoints).toBe(1);
    expect(quantity(state, 'wolf_pelt')).toBe(1);
    const afterGold = state.player.gold, afterXp = state.player.xp;
    engine.dispatch({ type: 'attack', enemyId: 'enemy-1' });
    engine.tick(4);
    engine.dispatch({ type: 'skill', skill: 'strike', enemyId: 'enemy-1' });
    expect(state.player.gold).toBe(afterGold);
    expect(state.player.xp).toBe(afterXp);
    expect(state.kills).toBe(1);
  });

  it('a mana, a cooldown és a mágikus felszerelés valós harci hatással jár', () => {
    const { engine, state } = fixture('mage');
    state.enemies[0].hp = state.enemies[0].maxHp = 150;
    const beforeMana = state.player.mana;
    engine.dispatch({ type: 'skill', skill: 'fireball', enemyId: 'enemy-1' });
    const firstDamage = 150 - state.enemies[0].hp;
    expect(firstDamage).toBeGreaterThan(33);
    expect(state.player.mana).toBe(beforeMana - SKILLS.fireball.mana);
    const afterHp = state.enemies[0].hp;
    engine.dispatch({ type: 'skill', skill: 'fireball', enemyId: 'enemy-1' });
    expect(state.enemies[0].hp).toBe(afterHp);
    expect(state.player.mana).toBe(beforeMana - SKILLS.fireball.mana);
    state.player.cooldowns.fireball = 0;
    state.player.mana = 0;
    engine.dispatch({ type: 'skill', skill: 'fireball', enemyId: 'enemy-1' });
    expect(state.enemies[0].hp).toBe(afterHp);
    state.player.mana = maxMana(state.player);
    state.player.inventory.push({ itemId: 'frost_staff', quantity: 1 });
    engine.dispatch({ type: 'equip', itemId: 'frost_staff' });
    engine.dispatch({ type: 'skill', skill: 'fireball', enemyId: 'enemy-1' });
    expect(afterHp - state.enemies[0].hp).toBeGreaterThan(firstDamage);
    const beforeFrost = state.enemies[0].hp;
    engine.dispatch({ type: 'skill', skill: 'frost', enemyId: 'enemy-1' });
    expect(state.enemies[0].hp).toBeLessThan(beforeFrost);
    expect(state.enemies[0].cooldown).toBeGreaterThan(2);
  });

  it('gyógyítás, kitérés és védőburok különböző, működő képességek', () => {
    const { engine, state } = fixture('guardian');
    state.player.hp -= 60;
    const hurtHp = state.player.hp;
    engine.dispatch({ type: 'skill', skill: 'heal' });
    expect(state.player.hp).toBeGreaterThan(hurtHp);
    state.player.skills.dash = 1;
    engine.dispatch({ type: 'move', dx: 0, dy: 1, dt: 0.01 });
    const previousY = state.player.y;
    engine.dispatch({ type: 'skill', skill: 'dash' });
    expect(state.player.y).toBeGreaterThan(previousY + 2);
    state.player.x = 2.5; state.player.y = 2.5;
    engine.dispatch({ type: 'skill', skill: 'ward' });
    const beforeHp = state.player.hp;
    engine.tick(0.1);
    expect(beforeHp - state.player.hp).toBeLessThan(ENEMIES.bramble_wolf.damage);
    expect(state.player.cooldowns.ward).toBeGreaterThan(0);
  });

  it('az akaratra költött pont ténylegesen több varázslathoz elegendő manát ad', () => {
    const { engine, state } = fixture('mage');
    state.enemies[0].hp = state.enemies[0].maxHp = 150;
    state.player.stats.will = 10;
    const baselineMaximum = maxMana(state.player);
    state.player.mana = SKILLS.fireball.mana - 1;
    engine.dispatch({ type: 'skill', skill: 'fireball', enemyId: 'enemy-1' });
    expect(state.enemies[0].hp).toBe(150);
    state.player.statPoints = 1;
    engine.dispatch({ type: 'stat', stat: 'will' });
    expect(maxMana(state.player)).toBe(baselineMaximum + 2);
    expect(state.player.mana).toBe(SKILLS.fireball.mana + 1);
    engine.dispatch({ type: 'skill', skill: 'fireball', enemyId: 'enemy-1' });
    expect(state.enemies[0].hp).toBeLessThan(150);
    expect(state.player.mana).toBe(1);
  });

  it('a láda és nyersanyag egyszer gyűjthető, és távolról nem nyitható', () => {
    const { engine, state } = fixture();
    engine.dispatch({ type: 'interact', entityId: 'herb-1' });
    engine.dispatch({ type: 'interact', entityId: 'herb-1' });
    expect(quantity(state, 'bitterleaf')).toBe(1);
    const gold = state.player.gold;
    engine.dispatch({ type: 'interact', entityId: 'chest-1' });
    engine.dispatch({ type: 'interact', entityId: 'chest-1' });
    expect(state.player.gold).toBe(gold + 8);
    expect(quantity(state, 'iron_ore')).toBe(2);
    expect(state.openedChests).toEqual(['chest-1']);
    state.player.x = 18;
    const quantityBefore = quantity(state, 'bitterleaf');
    state.worldTime = 1000;
    engine.dispatch({ type: 'interact', entityId: 'herb-1' });
    expect(quantity(state, 'bitterleaf')).toBe(quantityBefore);
  });

  it('a küldetés állapotai és a jutalom egyszerisége betöltés után is megmaradnak', () => {
    const { world, engine, state } = fixture();
    const quest = QUESTS.find(item => item.id === 'first_light')!;
    engine.dispatch({ type: 'quest', questId: quest.id });
    expect(state.quests[quest.id].status).toBe('active');
    state.discovered.push('old_shrine');
    state.enemies[0].hp = 1;
    engine.dispatch({ type: 'skill', skill: 'strike', enemyId: 'enemy-1' });
    expect(state.quests[quest.id].progress[1]).toBe(1);
    state.enemies.push(
      { ...state.enemies[0], id: 'enemy-2', hp: 1, alive: true, respawnAt: 0 },
      { ...state.enemies[0], id: 'enemy-3', hp: 1, alive: true, respawnAt: 0 },
    );
    engine.tick(3);
    engine.dispatch({ type: 'skill', skill: 'strike', enemyId: 'enemy-2' });
    engine.tick(3);
    engine.dispatch({ type: 'skill', skill: 'strike', enemyId: 'enemy-3' });
    expect(state.quests[quest.id].progress[1]).toBe(3);
    expect(state.quests[quest.id].status).toBe('ready');
    const gold = state.player.gold;
    engine.dispatch({ type: 'quest', questId: quest.id });
    expect(state.quests[quest.id].status).toBe('completed');
    expect(state.player.gold).toBe(gold + quest.gold);
    const restored = parseSave(JSON.stringify(snapshot(state)));
    const resumed = new GameEngine(world, restored);
    const paidGold = restored.player.gold, paidLevel = restored.player.level, paidXp = restored.player.xp;
    resumed.dispatch({ type: 'quest', questId: quest.id });
    expect(restored.player.gold).toBe(paidGold);
    expect(restored.player.level).toBe(paidLevel);
    expect(restored.player.xp).toBe(paidXp);
    expect(quantity(restored, 'wood_charm')).toBe(1);
    expect(restored.enemies[0].alive).toBe(false);
  });

  it('a bolt közelséget és pénzt kér, a pihenés ételt és biztonságot', () => {
    const { engine, state } = fixture();
    const originalGold = state.player.gold;
    engine.dispatch({ type: 'buy', itemId: 'red_potion' });
    expect(state.player.gold).toBe(originalGold - ITEMS.red_potion.price);
    expect(quantity(state, 'red_potion')).toBe(4);
    state.player.hp -= 40;
    engine.dispatch({ type: 'use', itemId: 'red_potion' });
    expect(state.player.hp).toBe(maxHp(state.player) - 12);
    engine.dispatch({ type: 'rest' });
    expect(state.player.hp).toBeLessThan(maxHp(state.player));
    state.enemies[0].alive = false;
    const food = quantity(state, 'trail_bread');
    engine.dispatch({ type: 'rest' });
    expect(state.player.hp).toBe(maxHp(state.player));
    expect(quantity(state, 'trail_bread')).toBe(food - 1);
    state.player.x = 15;
    const before = state.player.gold;
    engine.dispatch({ type: 'buy', itemId: 'red_potion' });
    expect(state.player.gold).toBe(before);
  });

  it('halálkor megáll, a főellenfél győzelme után viszont folytatható a világ', () => {
    const death = fixture();
    death.state.player.hp = 1;
    death.engine.tick(0.1);
    expect(death.state.status).toBe('dead');
    const deathTime = death.state.worldTime;
    death.engine.tick(2);
    expect(death.state.worldTime).toBe(deathTime);

    const victory = fixture('warrior', 'ember_warden');
    victory.state.enemies[0].hp = 1;
    victory.engine.dispatch({ type: 'skill', skill: 'strike', enemyId: 'enemy-1' });
    expect(victory.state.status).toBe('won');
    expect(quantity(victory.state, 'sunhammer')).toBe(1);
    const x = victory.state.player.x;
    victory.engine.dispatch({ type: 'move', dx: 1, dy: 0, dt: 0.1 });
    expect(victory.state.player.x).toBeGreaterThan(x);
    victory.state.worldTime += 1000;
    victory.engine.tick(0.1);
    expect(victory.state.enemies[0].alive).toBe(false);
  });
});
