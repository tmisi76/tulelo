import { ARCHETYPES, ENEMIES, ITEMS, QUESTS, RACES, SKILLS } from './content';
import { isWalkable } from './world';
import type { CharacterOptions, EnemyState, GameAction, GameState, Interaction, Player, SkillId, StatId, WorldData } from './types';

const STAT_IDS: StatId[] = ['strength', 'dexterity', 'vitality', 'intelligence', 'wisdom', 'will'];
const SKILL_IDS: SkillId[] = ['strike', 'fireball', 'heal', 'dash', 'frost', 'ward'];
const STEP = 0.1;
const VISION_RANGE = 11;
const MELEE_RANGE = 1.7;
const INTERACTION_RANGE = 2.3;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const center = (entity: { x: number; y: number }) => ({ x: entity.x + 0.5, y: entity.y + 0.5 });

export const maxHp = (player: Player): number => 120 + (player.level - 1) * 12 + (player.stats.vitality - 10) * 5;
export const maxMana = (player: Player): number => 50 + (player.level - 1) * 4 + (player.stats.intelligence - 10) * 4 + (player.stats.will - 10) * 2;
export const maxStamina = (player: Player): number => 80 + (player.stats.vitality - 10) * 3 + (player.stats.dexterity - 10) * 2;
/** Required XP for the next level; player.xp is the current level's progress. */
export const xpForLevel = (level: number): number => 80 + level * 25 + level * level * 5;

export function createInitialState(world: WorldData, options: CharacterOptions): GameState {
  const race = RACES.find(candidate => candidate.id === options.raceId) ?? RACES[0];
  const archetype = ARCHETYPES.find(candidate => candidate.id === options.archetypeId) ?? ARCHETYPES[0];
  const stats = { strength: 10, dexterity: 10, vitality: 10, intelligence: 10, wisdom: 10, will: 10 };
  let budget = 6;
  for (const stat of STAT_IDS) {
    stats[stat] += race.bonuses[stat] ?? 0;
    const requested = Number(options.bonuses?.[stat] ?? 0);
    const points = Number.isFinite(requested) ? clamp(Math.floor(requested), 0, Math.max(0, Math.min(6, budget, 16 - stats[stat]))) : 0;
    stats[stat] += points;
    budget -= points;
  }
  const skills = Object.fromEntries(SKILL_IDS.map(skill => [skill, archetype.skills[skill] ?? 0])) as Player['skills'];
  const player: Player = {
    name: options.name.trim().slice(0, 36) || 'Vándor', raceId: race.id, archetypeId: archetype.id,
    level: 1, xp: 0, stats, statPoints: budget, skillPoints: 0,
    x: world.spawn.x + 0.5, y: world.spawn.y + 0.5, hp: 1, mana: 1, stamina: 1,
    gold: 45, food: 100, inventory: [], equipment: { weapon: archetype.weapon, armor: archetype.armor },
    skills, cooldowns: Object.fromEntries(SKILL_IDS.map(skill => [skill, 0])) as Player['cooldowns'], attackCooldown: 0,
  };
  player.hp = maxHp(player); player.mana = maxMana(player); player.stamina = maxStamina(player);
  player.inventory.push({ itemId: archetype.weapon, quantity: 1 }, { itemId: archetype.armor, quantity: 1 });
  const potion = Object.values(ITEMS).find(item => item.kind === 'potion' && item.heal);
  const food = Object.values(ITEMS).find(item => item.kind === 'food');
  if (potion) player.inventory.push({ itemId: potion.id, quantity: 3 });
  if (food) player.inventory.push({ itemId: food.id, quantity: 6 });
  const state: GameState = {
    version: 1, seed: world.seed, player,
    enemies: world.enemies.map(spawn => ({ id: spawn.id, typeId: spawn.typeId,
      x: spawn.x + 0.5, y: spawn.y + 0.5, spawnX: spawn.x + 0.5, spawnY: spawn.y + 0.5,
      hp: ENEMIES[spawn.typeId].hp, maxHp: ENEMIES[spawn.typeId].hp, alive: true, cooldown: 0, respawnAt: 0 })),
    explored: [], discovered: [], openedChests: [], collectedNodes: {}, quests: {}, logs: [], events: [],
    worldTime: 0, rng: world.seed >>> 0 || 123456789, paused: false, status: 'playing', selectedEnemyId: null,
    kills: 0, killCounts: {},
  };
  const engine = new GameEngine(world, state);
  engine.log(`${player.name} megérkezett. Beszélj a falu lakóival, majd indulj expedícióra!`, 'info');
  return state;
}

export class GameEngine {
  private accumulator = 0;
  private sequence = 1;
  private explored = new Set<number>();
  private eventAges = new Map<number, number>();
  private facing = { x: 1, y: 0 };
  public constructor(public world: WorldData, public state: GameState) {
    this.explored = new Set(state.explored);
    this.sequence = Math.max(0, ...state.logs.map(log => log.id), ...state.events.map(event => event.id)) + 1;
    for (const event of state.events) this.eventAges.set(event.id, 0);
    this.reveal();
  }

  /** Stable, bounded simulation steps. A suspended browser never advances hours at once. */
  public tick(dt: number): void {
    if (this.state.paused || this.state.status === 'dead' || !Number.isFinite(dt) || dt <= 0) return;
    this.accumulator += Math.min(dt, 5);
    while (this.accumulator >= STEP - 1e-8) {
      this.accumulator -= STEP;
      this.step(STEP);
      if (this.state.player.hp <= 0) { this.accumulator = 0; break; }
    }
  }

  public dispatch(action: GameAction): Interaction | undefined {
    if (action.type === 'pause') { this.state.paused = action.value; this.accumulator = 0; return; }
    if (this.state.status === 'dead') return;
    const player = this.state.player;
    switch (action.type) {
      case 'move':
        if (!this.state.paused && [action.dx, action.dy, action.dt].every(Number.isFinite) && action.dt > 0) {
          const length = Math.hypot(action.dx, action.dy);
          if (length) {
            this.facing = { x: action.dx / length, y: action.dy / length };
            this.moveEntity(player, action.dx / Math.max(1, length), action.dy / Math.max(1, length), 3.6 * Math.min(action.dt, 0.25));
          }
          this.reveal();
        }
        break;
      case 'target':
        this.state.selectedEnemyId = this.state.enemies.some(enemy => enemy.id === action.enemyId && enemy.alive) ? action.enemyId : null;
        break;
      case 'attack':
        if (!this.state.paused) this.attack(action.enemyId);
        break;
      case 'skill':
        if (!this.state.paused) this.skill(action.skill, action.enemyId);
        break;
      case 'interact': return this.interact(action.entityId);
      case 'equip': this.equip(action.itemId); break;
      case 'use': this.use(action.itemId); break;
      case 'buy': this.buy(action.itemId); break;
      case 'sell': this.sell(action.itemId); break;
      case 'rest': this.rest(); break;
      case 'quest': this.quest(action.questId); break;
      case 'learn': {
        const skill = SKILLS[action.skill];
        if (!skill || player.level < skill.unlockLevel) { this.log('Ehhez a képességhez még magasabb szint szükséges.', 'info'); break; }
        if (player.skillPoints < 1 || player.skills[action.skill] >= 3) { this.log('Nincs képességpontod, vagy már elérted a harmadik rangot.', 'info'); break; }
        player.skillPoints--; player.skills[action.skill]++;
        this.log(`${skill.name}: ${player.skills[action.skill]}. rang.`, 'info');
        break;
      }
      case 'stat': {
        if (!STAT_IDS.includes(action.stat) || player.statPoints < 1) break;
        const before = [maxHp(player), maxMana(player), maxStamina(player)];
        player.stats[action.stat]++; player.statPoints--;
        player.hp += maxHp(player) - before[0]; player.mana += maxMana(player) - before[1]; player.stamina += maxStamina(player) - before[2];
        this.log('Tulajdonságpont elosztva.', 'info');
        break;
      }
    }
    return undefined;
  }

  public log(text: string, kind: GameState['logs'][number]['kind']): void {
    this.state.logs.push({ id: this.sequence++, text, kind });
    if (this.state.logs.length > 100) this.state.logs.splice(0, this.state.logs.length - 100);
  }

  private random(): number {
    let value = this.state.rng | 0;
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    this.state.rng = value >>> 0 || 123456789;
    return this.state.rng / 4294967296;
  }

  private emit(x: number, y: number, text: string, color: string): void {
    const event = { id: this.sequence++, x, y, text, color };
    this.state.events.push(event); this.eventAges.set(event.id, 0);
    while (this.state.events.length > 40) this.eventAges.delete(this.state.events.shift()!.id);
  }

  private canStand(x: number, y: number): boolean {
    const radius = 0.19;
    return isWalkable(this.world, x - radius, y - radius) && isWalkable(this.world, x + radius, y - radius)
      && isWalkable(this.world, x - radius, y + radius) && isWalkable(this.world, x + radius, y + radius);
  }

  private moveEntity(entity: { x: number; y: number }, dx: number, dy: number, amount: number): void {
    const subdivisions = Math.max(1, Math.ceil(amount / 0.15));
    for (let index = 0; index < subdivisions; index++) {
      const delta = amount / subdivisions;
      if (this.canStand(entity.x + dx * delta, entity.y)) entity.x += dx * delta;
      if (this.canStand(entity.x, entity.y + dy * delta)) entity.y += dy * delta;
    }
  }

  private reveal(): void {
    const player = this.state.player;
    const px = Math.floor(player.x), py = Math.floor(player.y);
    for (let y = Math.max(0, py - VISION_RANGE); y <= Math.min(this.world.height - 1, py + VISION_RANGE); y++) {
      for (let x = Math.max(0, px - VISION_RANGE); x <= Math.min(this.world.width - 1, px + VISION_RANGE); x++) {
        if (Math.hypot(x + 0.5 - player.x, y + 0.5 - player.y) <= VISION_RANGE) {
          const index = y * this.world.width + x;
          if (!this.explored.has(index)) { this.explored.add(index); this.state.explored.push(index); }
        }
      }
    }
    for (const landmark of this.world.landmarks) {
      if (!this.state.discovered.includes(landmark.id) && distance(player, center(landmark)) <= 4) {
        this.state.discovered.push(landmark.id);
        this.log(`Új helyszín: ${landmark.name}.`, 'quest'); this.grantXp(12);
        this.refreshQuests();
      }
    }
  }

  private step(dt: number): void {
    const state = this.state, player = state.player;
    state.worldTime += dt;
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    for (const skill of SKILL_IDS) player.cooldowns[skill] = Math.max(0, player.cooldowns[skill] - dt);
    player.stamina = Math.min(maxStamina(player), player.stamina + dt * (player.food > 0 ? 11 : 5));
    player.mana = Math.min(maxMana(player), player.mana + dt * (1.5 + Math.max(0, player.stats.wisdom - 10) * 0.08));
    player.food = Math.max(0, player.food - dt / 45);
    for (const event of state.events) this.eventAges.set(event.id, (this.eventAges.get(event.id) ?? 0) + dt);
    state.events = state.events.filter(event => {
      if ((this.eventAges.get(event.id) ?? 0) <= 1.8) return true;
      this.eventAges.delete(event.id); return false;
    });
    for (const enemy of state.enemies) {
      const def = ENEMIES[enemy.typeId];
      if (!def) continue;
      if (!enemy.alive) {
        if (def.kind !== 'boss' && enemy.respawnAt > 0 && state.worldTime >= enemy.respawnAt && distance(player, { x: enemy.spawnX, y: enemy.spawnY }) > 8) {
          enemy.alive = true; enemy.hp = enemy.maxHp; enemy.x = enemy.spawnX; enemy.y = enemy.spawnY; enemy.cooldown = 1;
        }
        continue;
      }
      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      const range = distance(player, enemy);
      const leash = Math.hypot(enemy.x - enemy.spawnX, enemy.y - enemy.spawnY);
      if (range <= 6.5 && leash < 10) {
        if (range > 1.35) {
          this.moveEntity(enemy, (player.x - enemy.x) / range, (player.y - enemy.y) / range, def.speed * dt);
        } else if (enemy.cooldown <= 0) {
          enemy.cooldown = def.kind === 'boss' ? 1.75 : 2.05;
          const armor = (ITEMS[player.equipment.armor]?.armor ?? 0) + (ITEMS[player.equipment.charm ?? '']?.armor ?? 0);
          const wardDuration = 4 + player.skills.ward;
          const wardActive = player.skills.ward > 0 && player.cooldowns.ward > Math.max(0, SKILLS.ward.cooldown - wardDuration);
          const multiplier = wardActive ? Math.max(0.35, 0.7 - 0.08 * player.skills.ward - Math.max(0, player.stats.will - 10) * 0.01) : 1;
          const damage = Math.max(1, Math.round(def.damage * (0.9 + this.random() * 0.2) * Math.max(0.35, 100 / (100 + armor)) * multiplier));
          player.hp = Math.max(0, player.hp - damage);
          this.emit(player.x, player.y, `−${damage}`, '#ef7373');
          this.log(`${def.name} ${damage} sérülést okozott.`, 'combat');
          if (player.hp <= 0) {
            state.status = 'dead'; state.paused = false;
            this.log('Elestél. Töltsd vissza a mentésedet, vagy kezdj új expedíciót.', 'danger');
            break;
          }
        }
      } else if (Math.hypot(enemy.x - enemy.spawnX, enemy.y - enemy.spawnY) > 0.2) {
        const homeDistance = Math.hypot(enemy.spawnX - enemy.x, enemy.spawnY - enemy.y);
        this.moveEntity(enemy, (enemy.spawnX - enemy.x) / homeDistance, (enemy.spawnY - enemy.y) / homeDistance, def.speed * dt);
      }
    }
  }

  private target(id?: string): EnemyState | undefined {
    const requested = id ?? this.state.selectedEnemyId;
    if (requested) return this.state.enemies.find(enemy => enemy.id === requested && enemy.alive);
    return this.state.enemies.filter(enemy => enemy.alive && distance(this.state.player, enemy) <= MELEE_RANGE).sort((a, b) => distance(this.state.player, a) - distance(this.state.player, b))[0];
  }

  private attack(id?: string): void {
    const player = this.state.player, enemy = this.target(id);
    if (!enemy || player.attackCooldown > 0) return;
    const weapon = ITEMS[player.equipment.weapon];
    const range = weapon?.id.includes('bow') ? 5.5 : MELEE_RANGE;
    if (distance(player, enemy) > range) { this.log('Az ellenfél túl messze van.', 'info'); return; }
    player.attackCooldown = 1.25;
    this.state.selectedEnemyId = enemy.id;
    const accuracy = clamp(0.85 + (player.stats.dexterity - 10) * 0.01 - Math.max(0, ENEMIES[enemy.typeId].level - player.level) * 0.015, 0.4, 0.95);
    if (this.random() > accuracy) { this.emit(enemy.x, enemy.y, 'Mellé', '#c2b7a6'); return; }
    const raw = (weapon?.damage ?? 8) * (1 + (player.stats.strength - 10) * 0.025) * (0.9 + this.random() * 0.2);
    this.damageEnemy(enemy, raw, false);
  }

  private skill(id: SkillId, enemyId?: string): void {
    const player = this.state.player, definition = SKILLS[id], rank = player.skills[id];
    if (!definition || !rank || player.level < definition.unlockLevel) { this.log('Ezt a képességet még nem ismered.', 'info'); return; }
    if (player.cooldowns[id] > 0) return;
    if (player.mana < definition.mana || player.stamina < definition.stamina) { this.log('Nincs elég mana vagy lendület.', 'info'); return; }
    const enemy = this.target(enemyId);
    if (id === 'strike' || id === 'fireball' || id === 'frost') {
      const range = id === 'strike' ? MELEE_RANGE : 6;
      if (!enemy || distance(player, enemy) > range) { this.log('Válassz egy elérhető ellenfelet.', 'info'); return; }
    }
    if (id === 'heal' && player.hp >= maxHp(player)) { this.log('Az életerőd már teljes.', 'info'); return; }
    player.mana -= definition.mana; player.stamina -= definition.stamina; player.cooldowns[id] = definition.cooldown;
    const magicPower = Object.values(player.equipment).reduce((sum, item) => sum + (ITEMS[item ?? '']?.power ?? 0), 0);
    switch (id) {
      case 'strike':
        this.damageEnemy(enemy!, (ITEMS[player.equipment.weapon]?.damage ?? 8) * (1.65 + 0.35 * rank) * (1 + Math.max(0, player.stats.strength - 10) * 0.025), false);
        break;
      case 'fireball':
        this.damageEnemy(enemy!, (24 + rank * 9 + Math.max(0, player.stats.intelligence - 10) * 1.8) * (1 + magicPower * 0.03), true);
        break;
      case 'heal': {
        const healed = Math.min(maxHp(player) - player.hp, 30 + rank * 14 + Math.max(0, player.stats.wisdom - 10) * 2);
        player.hp += healed; this.emit(player.x, player.y, `+${Math.round(healed)}`, '#8fd99b');
        this.log(`Gyógyítás: ${Math.round(healed)} életerő.`, 'combat');
        break;
      }
      case 'dash': {
        this.moveEntity(player, this.facing.x, this.facing.y, 2.4 + rank * 0.4);
        this.reveal(); this.emit(player.x, player.y, 'Kitérés', '#b9e4da');
        break;
      }
      case 'frost':
        this.damageEnemy(enemy!, (17 + rank * 6 + Math.max(0, player.stats.intelligence - 10)) * (1 + magicPower * 0.03), true);
        if (enemy!.alive) enemy!.cooldown = Math.max(enemy!.cooldown, 2 + rank * 0.5);
        this.emit(enemy!.x, enemy!.y, 'Dermedés', '#93d8f4');
        break;
      case 'ward': this.emit(player.x, player.y, 'Védőburok', '#dab7ff'); this.log('A védőburok átmenetileg csökkenti a beérkező sebzést.', 'combat'); break;
    }
  }

  private damageEnemy(enemy: EnemyState, raw: number, magic: boolean): void {
    if (!enemy.alive) return;
    const def = ENEMIES[enemy.typeId];
    const damage = Math.max(1, Math.round(raw * (magic ? 1 : Math.max(0.35, 100 / (100 + def.armor)))));
    enemy.hp = Math.max(0, enemy.hp - damage);
    this.state.selectedEnemyId = enemy.id;
    this.emit(enemy.x, enemy.y, `−${damage}`, magic ? '#b8a4ff' : '#ffe2a0');
    this.log(`${def.name}: ${damage} sebzés.`, 'combat');
    if (enemy.hp > 0) return;
    enemy.alive = false; enemy.respawnAt = def.kind === 'boss' ? 0 : this.state.worldTime + 900;
    this.state.kills++; this.state.killCounts[def.id] = (this.state.killCounts[def.id] ?? 0) + 1;
    this.state.selectedEnemyId = null;
    this.state.player.gold += def.gold; this.grantXp(def.xp);
    this.log(`${def.name} legyőzve. +${def.xp} XP, +${def.gold} arany.`, 'loot');
    for (const drop of def.drops) {
      if (ITEMS[drop.itemId] && this.random() < drop.chance) { this.addItem(drop.itemId, 1); this.log(`Zsákmány: ${ITEMS[drop.itemId].name}.`, 'loot'); }
    }
    for (const quest of QUESTS) {
      const current = this.state.quests[quest.id];
      if (!current || current.status === 'completed') continue;
      quest.objectives.forEach((objective, index) => {
        if (objective.kind === 'kill' && objective.target === def.id) current.progress[index] = Math.min(objective.count, current.progress[index] + 1);
      });
    }
    this.refreshQuests();
    if (def.kind === 'boss') {
      this.state.status = 'won';
      this.log('A Parázsőrző elesett. Az expedíció győzelemmel zárult; továbbra is szabadon felfedezheted a világot.', 'quest');
    }
  }

  private grantXp(amount: number): void {
    const player = this.state.player;
    if (player.level >= 30) return;
    player.xp += amount;
    while (player.level < 30 && player.xp >= xpForLevel(player.level)) {
      player.xp -= xpForLevel(player.level); player.level++;
      player.statPoints++; player.skillPoints++;
      player.hp = maxHp(player); player.mana = maxMana(player); player.stamina = maxStamina(player);
      this.emit(player.x, player.y, `${player.level}. szint!`, '#efd477');
      this.log(`${player.level}. szint! Egy tulajdonságpontot és egy képességpontot kaptál.`, 'quest');
    }
    if (player.level === 30) player.xp = 0;
  }

  private quantity(id: string): number { return this.state.player.inventory.find(stack => stack.itemId === id)?.quantity ?? 0; }
  private addItem(id: string, quantity: number): void {
    if (!ITEMS[id] || quantity <= 0) return;
    const stack = this.state.player.inventory.find(item => item.itemId === id);
    if (stack) stack.quantity += quantity; else this.state.player.inventory.push({ itemId: id, quantity });
  }
  private removeItem(id: string, quantity = 1): boolean {
    const stack = this.state.player.inventory.find(item => item.itemId === id);
    if (!stack || stack.quantity < quantity) return false;
    stack.quantity -= quantity;
    this.state.player.inventory = this.state.player.inventory.filter(item => item.quantity > 0);
    return true;
  }

  private interact(entityId?: string): Interaction | undefined {
    const options: Array<{ id: string; kind: Interaction['kind']; x: number; y: number; title: string; text: string }> = [
      ...this.world.npcs.map(npc => ({ ...center(npc), id: npc.id, kind: 'npc' as const, title: npc.name, text: npc.dialogue })),
      ...this.world.resources.map(node => ({ ...center(node), id: node.id, kind: 'resource' as const, title: ITEMS[node.itemId]?.name ?? 'Nyersanyag', text: 'Begyűjthető nyersanyag.' })),
      ...this.world.chests.map(chest => ({ ...center(chest), id: chest.id, kind: 'chest' as const, title: 'Régi láda', text: 'A láda tartalma egyszer gyűjthető be.' })),
      ...this.world.landmarks.map(landmark => ({ ...center(landmark), id: landmark.id, kind: landmark.kind === 'camp' || landmark.kind === 'village' ? 'camp' as const : 'landmark' as const, title: landmark.name, text: landmark.description })),
    ];
    const candidate = options.filter(option => (!entityId || option.id === entityId) && distance(this.state.player, option) <= INTERACTION_RANGE)
      .sort((a, b) => distance(this.state.player, a) - distance(this.state.player, b))[0];
    if (!candidate) { this.log('Nincs elérhető személy vagy tárgy a közeledben.', 'info'); return undefined; }
    if (candidate.kind === 'resource') {
      const node = this.world.resources.find(resource => resource.id === candidate.id)!;
      const last = this.state.collectedNodes[node.id];
      if (last !== undefined && this.state.worldTime < last + 300) { this.log('Itt egyelőre nincs újabb begyűjthető alapanyag.', 'info'); return undefined; }
      this.state.collectedNodes[node.id] = this.state.worldTime;
      this.addItem(node.itemId, 1); this.log(`Begyűjtötted: ${ITEMS[node.itemId].name}.`, 'loot'); this.refreshQuests();
    } else if (candidate.kind === 'chest') {
      if (this.state.openedChests.includes(candidate.id)) { this.log('Ez a láda már üres.', 'info'); return undefined; }
      const chest = this.world.chests.find(item => item.id === candidate.id)!;
      this.state.openedChests.push(chest.id); this.state.player.gold += chest.gold;
      for (const item of chest.items) this.addItem(item.itemId, item.quantity);
      this.log(`Láda felnyitva: ${chest.gold} arany és ${chest.items.map(item => ITEMS[item.itemId]?.name ?? item.itemId).join(', ')}.`, 'loot'); this.refreshQuests();
    }
    return { id: candidate.id, kind: candidate.kind, title: candidate.title, text: candidate.text };
  }

  private equip(id: string): void {
    const item = ITEMS[id], player = this.state.player;
    if (!item || !this.quantity(id)) return;
    if (item.kind !== 'weapon' && item.kind !== 'armor' && item.kind !== 'charm') { this.log('Ezt a tárgyat nem lehet felszerelni.', 'info'); return; }
    player.equipment[item.kind] = id; this.log(`Felszerelve: ${item.name}.`, 'info');
  }

  private use(id: string): void {
    const item = ITEMS[id], player = this.state.player;
    if (!item || !this.quantity(id)) return;
    if (item.kind === 'weapon' || item.kind === 'armor' || item.kind === 'charm') { this.equip(id); return; }
    if (item.kind !== 'potion' && item.kind !== 'food') { this.log('Ezt az alapanyagot egy küldetéshez vagy készítéshez tarthatod meg.', 'info'); return; }
    const heal = Math.min(item.heal ?? 0, maxHp(player) - player.hp);
    const mana = Math.min(item.mana ?? 0, maxMana(player) - player.mana);
    const food = Math.min(item.food ?? 0, 100 - player.food);
    if (heal + mana + food <= 0) { this.log('Erre a tárgyra most nincs szükséged.', 'info'); return; }
    if (!this.removeItem(id)) return;
    player.hp += heal; player.mana += mana; player.food += food;
    this.log(`Felhasználva: ${item.name}.`, 'info');
    if (heal) this.emit(player.x, player.y, `+${Math.round(heal)}`, '#8fd99b');
    this.refreshQuests();
  }

  private nearestShop() {
    return this.world.npcs.filter(npc => npc.shop && distance(this.state.player, center(npc)) <= INTERACTION_RANGE)
      .sort((a, b) => distance(this.state.player, center(a)) - distance(this.state.player, center(b)))[0];
  }
  private buy(id: string): void {
    const npc = this.nearestShop(), item = ITEMS[id];
    if (!npc?.shop?.includes(id) || !item) { this.log('Ehhez a kereskedő közelében kell lenned.', 'info'); return; }
    if (this.state.player.gold < item.price) { this.log('Nincs elég aranyad.', 'info'); return; }
    this.state.player.gold -= item.price; this.addItem(id, 1);
    this.log(`Megvetted: ${item.name} (${item.price} arany).`, 'loot'); this.refreshQuests();
  }
  private sell(id: string): void {
    const item = ITEMS[id], player = this.state.player;
    if (!this.nearestShop()) { this.log('Eladáshoz menj a kereskedőhöz.', 'info'); return; }
    if (!item || item.kind === 'quest' || !this.quantity(id)) return;
    if (Object.values(player.equipment).includes(id) && this.quantity(id) <= 1) { this.log('A viselt felszerelésedet nem adhatod el.', 'info'); return; }
    if (this.removeItem(id)) { const price = Math.max(1, Math.floor(item.price * 0.4)); player.gold += price; this.log(`Eladtad: ${item.name} (${price} arany).`, 'loot'); }
    this.refreshQuests();
  }

  private rest(): void {
    const player = this.state.player;
    const nearNpc = this.world.npcs.some(npc => distance(player, center(npc)) <= INTERACTION_RANGE);
    const nearCamp = this.world.landmarks.some(landmark => ['camp', 'village'].includes(landmark.kind) && distance(player, center(landmark)) <= INTERACTION_RANGE);
    if (!nearNpc && !nearCamp) { this.log('Pihenéshez keress tábort vagy települést.', 'info'); return; }
    if (this.state.enemies.some(enemy => enemy.alive && distance(player, enemy) < 7)) { this.log('Ellenség van a közelben: most nem biztonságos pihenni.', 'danger'); return; }
    const ration = player.inventory.find(stack => ITEMS[stack.itemId]?.kind === 'food');
    if (ration) this.removeItem(ration.itemId);
    else if (player.food >= 35) player.food -= 35;
    else { this.log('Pihenéshez egy adag élelem szükséges.', 'info'); return; }
    player.hp = maxHp(player); player.mana = maxMana(player); player.stamina = maxStamina(player);
    player.food = Math.max(player.food, 70); player.attackCooldown = 0;
    for (const id of SKILL_IDS) player.cooldowns[id] = 0;
    this.state.worldTime += 480;
    this.log('Pihentél és elfogyasztottál egy adag élelmet. Az erőforrásaid helyreálltak.', 'info'); this.refreshQuests();
  }

  private nearbyNpc(id: string): boolean { return this.world.npcs.some(npc => npc.id === id && distance(this.state.player, center(npc)) <= INTERACTION_RANGE); }
  private quest(id: string): void {
    const quest = QUESTS.find(candidate => candidate.id === id);
    if (!quest) return;
    let current = this.state.quests[id];
    if (current?.status === 'completed') { this.log('Ezt a küldetést már teljesítetted.', 'info'); return; }
    if (!current) {
      if (!this.nearbyNpc(quest.giverId)) { this.log('A küldetés felvételéhez beszélj a megbízóval.', 'info'); return; }
      if (quest.prerequisite && this.state.quests[quest.prerequisite]?.status !== 'completed') { this.log('Előbb teljesítsd az előző megbízást.', 'info'); return; }
      this.state.quests[id] = current = { status: 'active', progress: quest.objectives.map(objective => objective.kind === 'kill' ? Math.min(objective.count, this.state.killCounts[objective.target] ?? 0) : 0) };
      this.log(`Új küldetés: ${quest.title}.`, 'quest'); this.refreshQuests(); return;
    }
    this.refreshQuests();
    if (current.status !== 'ready') { this.log('Még nem teljesült minden küldetéscél.', 'info'); return; }
    if (!this.nearbyNpc(quest.turnInId ?? quest.giverId)) { this.log('A jutalomért térj vissza a megbízóhoz.', 'info'); return; }
    const gathered = new Map<string, number>();
    for (const objective of quest.objectives) if (objective.kind === 'gather') gathered.set(objective.target, (gathered.get(objective.target) ?? 0) + objective.count);
    if ([...gathered].some(([item, count]) => this.quantity(item) < count)) { this.log('A begyűjtendő tárgyaknak nálad kell lenniük.', 'info'); return; }
    for (const [item, count] of gathered) this.removeItem(item, count);
    current.status = 'completed'; this.state.player.gold += quest.gold;
    for (const item of quest.items ?? []) this.addItem(item.itemId, item.quantity);
    this.grantXp(quest.xp); this.log(`Teljesítve: ${quest.title}. +${quest.xp} XP, +${quest.gold} arany.`, 'quest');
    this.refreshQuests();
  }

  private refreshQuests(): void {
    for (const definition of QUESTS) {
      const current = this.state.quests[definition.id];
      if (!current || current.status === 'completed') continue;
      definition.objectives.forEach((objective, index) => {
        if (objective.kind === 'gather') current.progress[index] = Math.min(objective.count, this.quantity(objective.target));
        if (objective.kind === 'discover') current.progress[index] = this.state.discovered.includes(objective.target) ? objective.count : 0;
      });
      const ready = definition.objectives.every((objective, index) => current.progress[index] >= objective.count);
      if (ready && current.status !== 'ready') this.log(`Visszatérhetsz a jutalomért: ${definition.title}.`, 'quest');
      current.status = ready ? 'ready' : 'active';
    }
  }
}
