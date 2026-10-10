export type StatId = 'strength' | 'dexterity' | 'vitality' | 'intelligence' | 'wisdom' | 'will';
export type Stats = Record<StatId, number>;
export type SkillId = 'strike' | 'fireball' | 'heal' | 'dash' | 'frost' | 'ward';
export type TileType = 'grass' | 'path' | 'forest' | 'water' | 'rock' | 'marsh' | 'floor' | 'wall' | 'sand';
export type Rarity = 'common' | 'fine' | 'rare' | 'epic';
export interface ItemDef {
  id: string; name: string; description: string; icon: string;
  kind: 'weapon' | 'armor' | 'charm' | 'potion' | 'food' | 'material' | 'quest';
  rarity: Rarity; price: number; damage?: number; armor?: number; power?: number;
  heal?: number; mana?: number; food?: number;
}
export interface RaceDef { id: string; name: string; description: string; icon: string; bonuses: Partial<Stats>; }
export interface ArchetypeDef { id: string; name: string; description: string; icon: string; weapon: string; armor: string; skills: Partial<Record<SkillId, number>>; }
export interface SkillDef { id: SkillId; name: string; description: string; icon: string; mana: number; stamina: number; cooldown: number; unlockLevel: number; }
export interface EnemyDef { id: string; name: string; level: number; hp: number; damage: number; armor: number; speed: number; xp: number; gold: number; color: number; kind: 'wolf' | 'spider' | 'skeleton' | 'bandit' | 'golem' | 'boss'; drops: Array<{ itemId: string; chance: number }>; }
export interface InventoryStack { itemId: string; quantity: number; }
export interface Player {
  name: string; raceId: string; archetypeId: string; level: number; xp: number;
  stats: Stats; statPoints: number; skillPoints: number;
  x: number; y: number; hp: number; mana: number; stamina: number; gold: number; food: number;
  inventory: InventoryStack[]; equipment: { weapon: string; armor: string; charm?: string };
  skills: Record<SkillId, number>; cooldowns: Record<SkillId, number>; attackCooldown: number;
}
export interface EnemyState { id: string; typeId: string; x: number; y: number; spawnX: number; spawnY: number; hp: number; maxHp: number; alive: boolean; cooldown: number; respawnAt: number; }
export interface RegionDef { id: string; name: string; subtitle: string; minLevel: number; maxLevel: number; x: number; y: number; width: number; height: number; color: number; }
export interface Landmark { id: string; name: string; description: string; x: number; y: number; kind: 'village' | 'ruin' | 'mine' | 'camp' | 'shrine' | 'bridge' | 'portal'; }
export interface NpcDef { id: string; name: string; role: string; x: number; y: number; color: number; dialogue: string; shop?: string[]; }
export interface ResourceNode { id: string; itemId: string; x: number; y: number; kind: 'herb' | 'ore'; }
export interface ChestDef { id: string; x: number; y: number; items: InventoryStack[]; gold: number; }
export interface EnemySpawn { id: string; typeId: string; x: number; y: number; }
export interface QuestObjective { kind: 'kill' | 'gather' | 'discover'; target: string; count: number; label: string; }
export interface QuestDef { id: string; title: string; giverId: string; turnInId?: string; summary: string; objectives: QuestObjective[]; xp: number; gold: number; items?: InventoryStack[]; prerequisite?: string; }
export interface QuestState { status: 'active' | 'ready' | 'completed'; progress: number[]; }
export interface WorldData {
  seed: number; width: number; height: number; tiles: TileType[]; blocked: boolean[];
  spawn: { x: number; y: number }; regions: RegionDef[]; landmarks: Landmark[];
  npcs: NpcDef[]; resources: ResourceNode[]; chests: ChestDef[]; enemies: EnemySpawn[];
}
export interface LogEntry { id: number; text: string; kind: 'info' | 'combat' | 'loot' | 'quest' | 'danger'; }
export interface FloatingEvent { id: number; x: number; y: number; text: string; color: string; }
export interface GameState {
  version: 1; seed: number; player: Player; enemies: EnemyState[];
  explored: number[]; discovered: string[]; openedChests: string[]; collectedNodes: Record<string, number>;
  quests: Record<string, QuestState>; logs: LogEntry[]; events: FloatingEvent[];
  worldTime: number; rng: number; paused: boolean; status: 'playing' | 'dead' | 'won';
  selectedEnemyId: string | null; kills: number; killCounts: Record<string, number>;
}
export interface CharacterOptions { name: string; raceId: string; archetypeId: string; bonuses?: Partial<Stats>; }
export interface Interaction { id: string; kind: 'npc' | 'camp' | 'chest' | 'resource' | 'landmark'; title: string; text: string; }
export type GameAction =
  | { type: 'move'; dx: number; dy: number; dt: number }
  | { type: 'target'; enemyId: string | null }
  | { type: 'attack'; enemyId?: string }
  | { type: 'skill'; skill: SkillId; enemyId?: string }
  | { type: 'interact'; entityId?: string }
  | { type: 'equip' | 'use' | 'buy' | 'sell'; itemId: string }
  | { type: 'rest' }
  | { type: 'quest'; questId: string }
  | { type: 'learn'; skill: SkillId }
  | { type: 'stat'; stat: StatId }
  | { type: 'pause'; value: boolean };
