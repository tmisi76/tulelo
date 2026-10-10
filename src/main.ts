import Phaser from 'phaser';
import './style.css';
import { ARCHETYPES, ENEMIES, ITEMS, QUESTS, RACES, SKILLS, STAT_LABELS } from './content';
import { GameEngine, createInitialState, maxHp, maxMana, maxStamina, xpForLevel } from './engine';
import { createGameScene } from './scene';
import { createWorld, regionAt } from './world';
import { downloadSave, loadGame, parseSave, saveGame } from './storage';
import type { GameState, Interaction, SkillId, StatId, Stats } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;
const order: SkillId[] = ['strike', 'fireball', 'heal', 'dash', 'frost', 'ward'];
const stats: StatId[] = ['strength', 'dexterity', 'vitality', 'intelligence', 'wisdom', 'will'];
const escape = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
let engine: GameEngine | null = null;
let phaser: Phaser.Game | null = null;
let existingSave: GameState | null = null;
let raceId = 'human';
let archetypeId = 'warrior';
let characterName = '';
let creationBonuses: Partial<Stats> = {};
let panel: string | null = null;
let panelBeforePause = false;
let npcId: string | null = null;
let selectedItem = '';
let lastLogId = -1;
let lastHp = -1;
let lastLevel = 1;
let victoryShown = false;
let deathShown = false;
let saving = false;
let pendingManualSave = false;
let muted = true;
let audio: AudioContext | null = null;
let saveLabel = 'Automatikus mentés';
const minimapBacking = document.createElement('canvas');
minimapBacking.width = 224; minimapBacking.height = 168;
const worldMapBacking = document.createElement('canvas');
worldMapBacking.width = 784; worldMapBacking.height = 588;

function sound(frequency: number, duration = 0.09) {
  if (muted) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency / 2, audio.currentTime + duration);
    gain.gain.setValueAtTime(0.025, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(); oscillator.stop(audio.currentTime + duration);
  } catch { /* Sound is optional. */ }
}

function toast(text: string, danger = false) {
  let container = document.querySelector('.toast-container');
  if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.append(container); }
  const note = document.createElement('div');
  note.className = `toast${danger ? ' danger' : ''}`;
  note.textContent = text;
  container.append(note);
  while (container.children.length > 3) container.firstElementChild?.remove();
  setTimeout(() => note.remove(), 4200);
}

function initialStats(): Stats {
  const race = RACES.find(r => r.id === raceId) ?? RACES[0];
  return Object.fromEntries(stats.map(s => [s, 10 + (race.bonuses[s] ?? 0) + (creationBonuses[s] ?? 0)])) as Stats;
}

function renderStart() {
  const race = RACES.find(r => r.id === raceId) ?? RACES[0];
  const archetype = ARCHETYPES.find(a => a.id === archetypeId) ?? ARCHETYPES[0];
  const values = initialStats();
  const remaining = 6 - Object.values(creationBonuses).reduce((a, b) => a + (b ?? 0), 0);
  app.innerHTML = `<main class="screen start-screen">
    <div class="ambient-backdrop" aria-hidden="true"></div>
    <div class="start-content">
      <header class="brand"><p class="eyebrow">EGY ELFELEDETT VILÁG VÁR RÁD</p><h1>Túlélő<span>Az utolsó menedék</span></h1><p class="subtitle">A világégés után csak egyetlen föld maradt. A történeted most kezdődik.</p></header>
      <div class="creation-layout">
        <section class="creation-card"><div class="section-heading"><span class="step-number">01</span><div><p class="eyebrow">ALKOSD MEG A KARAKTERED</p><h2>Ki lép a vadonba?</h2></div></div>
          <div class="field"><label for="character-name">A kalandozó neve</label><input id="character-name" maxlength="24" placeholder="Írd be a neved…" value="${escape(characterName)}" autocomplete="off"></div>
          <h3>Származás <span class="muted">— eltérő adottságok, szabad fejlődés</span></h3>
          <div class="choice-grid race-grid">${RACES.map(r => `<button class="choice-btn ${r.id === raceId ? 'selected' : ''}" data-race="${r.id}" aria-pressed="${r.id === raceId}"><span class="choice-icon">${r.icon}</span><span class="choice-name">${r.name}</span></button>`).join('')}</div>
          <p class="choice-desc">${race.description}</p>
          <h3>Az első út <span class="muted">— induló felszerelés és képesség</span></h3>
          <div class="choice-grid archetype-grid">${ARCHETYPES.map(a => `<button class="choice-btn ${a.id === archetypeId ? 'selected' : ''}" data-archetype="${a.id}" aria-pressed="${a.id === archetypeId}"><span class="choice-icon">${a.icon}</span><span class="choice-name">${a.name}</span></button>`).join('')}</div>
          <p class="choice-desc">${archetype.description}</p>
        </section>
        <aside class="creation-card creation-summary"><div class="section-heading"><span class="step-number">02</span><div><p class="eyebrow">FORMÁLD A SORSOD</p><h2>Az induló adottságok</h2></div></div>
          <p class="points-remaining">${remaining} szabad tulajdonságpont</p>
          <div class="stat-grid">${stats.map(s => `<div class="stat-row"><span class="stat-label">${STAT_LABELS[s]}</span><span class="stat-value">${values[s]}</span><span class="stat-controls"><button data-stat-minus="${s}" ${!(creationBonuses[s] ?? 0) ? 'disabled' : ''} aria-label="${STAT_LABELS[s]} csökkentése">−</button><button data-stat-plus="${s}" ${remaining === 0 || values[s] >= 16 ? 'disabled' : ''} aria-label="${STAT_LABELS[s]} növelése">+</button></span></div>`).join('')}</div>
          <div class="starter-kit"><h3>Ezzel indulsz</h3><p>${ITEMS[archetype.weapon]?.icon ?? '⚔'} ${ITEMS[archetype.weapon]?.name ?? 'Fegyver'}</p><p>${ITEMS[archetype.armor]?.icon ?? '◈'} ${ITEMS[archetype.armor]?.name ?? 'Páncél'}</p><p>✚ Gyógyitalok · úti élelem · 45 arany</p></div>
          <p class="tip">A képességeid később bővíthetők. A harcos is tanulhat mágiát, a mágus is forgathat kardot.</p>
          <div class="start-actions"><button class="btn btn-primary" id="begin-game">Kalandozás kezdése <span>→</span></button>${existingSave ? `<button class="btn btn-secondary" id="continue-game">Folytatás: ${escape(existingSave.player.name)} · ${existingSave.player.level}. szint</button>` : ''}<button class="btn btn-small btn-secondary" id="import-start">Mentés betöltése fájlból</button></div>
        </aside>
      </div>
      <footer class="start-footer"><span>✦ Egyjátékos kaland · helyi mentés · első expedíció</span><span>A Túlélők Földje ihlette, saját játékszabályokkal.</span></footer>
    </div>
  </main>`;
  document.querySelector<HTMLInputElement>('#character-name')!.addEventListener('input', e => { characterName = (e.target as HTMLInputElement).value; });
  app.querySelectorAll<HTMLElement>('[data-race]').forEach(el => el.onclick = () => { raceId = el.dataset.race!; renderStart(); });
  app.querySelectorAll<HTMLElement>('[data-archetype]').forEach(el => el.onclick = () => { archetypeId = el.dataset.archetype!; renderStart(); });
  app.querySelectorAll<HTMLElement>('[data-stat-plus]').forEach(el => el.onclick = () => { const stat = el.dataset.statPlus as StatId; creationBonuses[stat] = (creationBonuses[stat] ?? 0) + 1; renderStart(); });
  app.querySelectorAll<HTMLElement>('[data-stat-minus]').forEach(el => el.onclick = () => { const stat = el.dataset.statMinus as StatId; creationBonuses[stat] = Math.max(0, (creationBonuses[stat] ?? 0) - 1); renderStart(); });
  document.querySelector<HTMLButtonElement>('#begin-game')!.onclick = () => {
    const world = createWorld(731928);
    startGame(createInitialState(world, { name: characterName.trim() || 'Vándor', raceId, archetypeId, bonuses: creationBonuses }));
    toast('Üdv a Menedékben! Keresd meg a falu vezetőjét.');
  };
  const resume = document.querySelector<HTMLButtonElement>('#continue-game');
  if (resume) resume.onclick = () => { if (existingSave) startGame(structuredClone(existingSave)); };
  document.querySelector<HTMLButtonElement>('#import-start')!.onclick = importGame;
}

function startGame(state: GameState) {
  if (phaser) { phaser.destroy(true); phaser = null; }
  engine = new GameEngine(createWorld(state.seed), state);
  engine.dispatch({ type: 'pause', value: false });
  panel = null; npcId = null; lastLogId = -1; lastHp = state.player.hp; lastLevel = state.player.level; victoryShown = state.status === 'won'; deathShown = false;
  selectedItem = state.player.equipment.weapon;
  app.innerHTML = `<main class="game-shell">
    <header class="topbar"><div class="game-logo"><span class="logo-rune">✦</span><span>TÚLÉLŐ<small>Az utolsó menedék</small></span></div><div class="region-title"><span id="region-name">Menedék</span><small id="region-level"></small></div><nav class="toolbar" aria-label="Játék menü"><button class="tool-btn" data-panel="character" title="Karakter (C)">♙ <span>Karakter</span><kbd>C</kbd></button><button class="tool-btn" data-panel="inventory" title="Felszerelés (I)">▣ <span>Táska</span><kbd>I</kbd></button><button class="tool-btn" data-panel="quests" title="Kalandnapló (J)">☷ <span>Napló</span><kbd>J</kbd></button><button class="tool-btn" data-panel="map" title="Világtérkép (M)">⌘ <span>Térkép</span><kbd>M</kbd></button><button class="tool-btn" id="sound-toggle" title="Hang be/ki">${muted ? '♪' : '♫'}</button><button class="tool-btn" data-panel="menu" title="Menü">☰</button></nav></header>
    <section class="play-area" aria-label="Bejárható játékvilág"><div id="game-canvas"></div>
      <div class="hud-top"><div class="portrait">${RACES.find(r => r.id === state.player.raceId)?.icon ?? '♙'}</div><div class="hero-info"><div class="hero-heading"><strong id="hero-name"></strong><span class="hero-level" id="hero-level"></span></div><div class="vital-bars">${['hp', 'mana', 'stamina'].map(id => `<div class="vital ${id}"><div class="vital-fill ${id}" id="${id}-fill"></div><span class="vital-label" id="${id}-label"></span></div>`).join('')}</div><div class="xp-track"><div id="xp-fill"></div><span id="xp-label"></span></div></div></div>
      <aside class="minimap-card"><img id="minimap" width="224" height="168" alt="Felfedezett környék"><div class="map-caption"><span id="map-coordinates"></span><button data-panel="map">M · Térkép</button></div></aside>
      <aside class="quest-tracker" id="quest-tracker"></aside>
      <div class="pause-banner" id="pause-banner" hidden>MEGÁLLÍTVA <small>Szóköz · folytatás</small></div>
      <div class="interaction-hint" id="interaction-hint"></div>
      <div class="target-info" id="target-info"></div>
      <div class="touch-controls"><button id="touch-interact">E · Vizsgálat</button><button id="touch-attack">⚔ · Támadás</button><button id="touch-pause">Ⅱ · Szünet</button></div>
    </section>
    <footer class="bottom-bar"><div class="resource-strip"><span title="Arany">◉ <b id="gold-amount"></b></span><span title="Jóllakottság">♨ <b id="food-amount"></b></span><span class="save-status" id="save-status"></span></div><div class="skill-bar">${order.map((id, i) => `<button class="skill-slot" data-skill="${id}" title="${SKILLS[id].name}: ${SKILLS[id].description}"><span class="skill-key">${i + 1}</span><span class="skill-icon">${SKILLS[id].icon}</span><span class="skill-label">${SKILLS[id].name}</span><span class="skill-cooldown" id="cooldown-${id}"></span></button>`).join('')}</div><div class="expedition-log"><button class="log-title" data-panel="quests">KALANDNAPLÓ <span>↗</span></button><div id="log-entries"></div></div><p class="control-hint">WASD / kattintás · mozgás <span>F · támadás</span> <span>E · vizsgálat</span> <span>Szóköz · taktikai szünet</span></p></footer>
  </main><div id="dialog-root"></div>`;
  const scene = createGameScene(engine, handleInteraction, () => refreshUI(false));
  phaser = new Phaser.Game({ type: Phaser.AUTO, parent: 'game-canvas', backgroundColor: '#1b2923', scene: [scene], scale: { mode: Phaser.Scale.RESIZE, width: document.querySelector('#game-canvas')!.clientWidth, height: document.querySelector('#game-canvas')!.clientHeight }, render: { antialias: true, pixelArt: false }, audio: { noAudio: true }, fps: { target: 60, forceSetTimeOut: false } });
  app.querySelectorAll<HTMLElement>('[data-panel]').forEach(el => el.onclick = () => openPanel(el.dataset.panel!));
  app.querySelectorAll<HTMLElement>('[data-skill]').forEach(el => el.onclick = () => act({ type: 'skill', skill: el.dataset.skill as SkillId }));
  document.querySelector<HTMLButtonElement>('#sound-toggle')!.onclick = e => { muted = !muted; (e.currentTarget as HTMLElement).textContent = muted ? '♪' : '♫'; sound(440); toast(muted ? 'Hang kikapcsolva' : 'Hang bekapcsolva'); };
  document.querySelector<HTMLButtonElement>('#touch-interact')!.onclick = () => { const interaction = engine?.dispatch({ type: 'interact' }); if (interaction) handleInteraction(interaction); refreshUI(true); };
  document.querySelector<HTMLButtonElement>('#touch-attack')!.onclick = () => act({ type: 'attack' });
  document.querySelector<HTMLButtonElement>('#touch-pause')!.onclick = togglePause;
  refreshUI(true);
  void saveCurrent(false);
  if (import.meta.env.DEV) (window as unknown as { __tulelo: unknown }).__tulelo = { engine, game: phaser, openPanel, saveCurrent, handleInteraction };
}

function act(action: Parameters<GameEngine['dispatch']>[0]) {
  if (!engine) return;
  const interaction = engine.dispatch(action);
  if (interaction) handleInteraction(interaction);
  refreshUI(true);
}

function refreshUI(force: boolean) {
  if (!engine || !document.querySelector('#hero-name')) return;
  const { player: p } = engine.state;
  const region = regionAt(engine.world, p.x, p.y);
  const text = (id: string, value: string) => { const el = document.getElementById(id); if (el && el.textContent !== value) el.textContent = value; };
  text('hero-name', p.name); text('hero-level', `${p.level}. SZINT`);
  text('region-name', region.name); text('region-level', `${region.minLevel}–${region.maxLevel}. szintű vidék`);
  for (const [id, value, maximum, label] of [['hp', p.hp, maxHp(p), 'Életerő'], ['mana', p.mana, maxMana(p), 'Mana'], ['stamina', p.stamina, maxStamina(p), 'Lendület']] as const) {
    document.getElementById(`${id}-fill`)!.style.width = `${Math.max(0, Math.min(100, value / maximum * 100))}%`;
    text(`${id}-label`, `${label} ${Math.ceil(value)} / ${maximum}`);
  }
  document.getElementById('xp-fill')!.style.width = `${Math.min(100, p.xp / xpForLevel(p.level) * 100)}%`;
  text('xp-label', `${Math.floor(p.xp)} / ${xpForLevel(p.level)} XP`);
  text('gold-amount', `${Math.floor(p.gold)} arany`); text('food-amount', `${Math.floor(p.food)}%`); text('save-status', saveLabel);
  text('map-coordinates', `${Math.floor(p.x)}, ${Math.floor(p.y)}`);
  const pause = document.getElementById('pause-banner')!;
  pause.hidden = !engine.state.paused || !!panel || engine.state.status === 'dead';
  for (const id of order) {
    const el = document.querySelector<HTMLButtonElement>(`[data-skill="${id}"]`)!;
    el.classList.toggle('locked', p.skills[id] === 0);
    el.classList.toggle('disabled', p.cooldowns[id] > 0 || p.mana < SKILLS[id].mana || p.stamina < SKILLS[id].stamina);
    el.disabled = p.skills[id] === 0 || engine.state.status === 'dead';
    text(`cooldown-${id}`, p.skills[id] === 0 ? 'Tanulható' : p.cooldowns[id] > 0 ? `${Math.ceil(p.cooldowns[id])} mp` : '');
  }
  const target = engine.state.enemies.find(e => e.id === engine!.state.selectedEnemyId && e.alive);
  document.getElementById('target-info')!.innerHTML = target ? `<strong>${ENEMIES[target.typeId].name}</strong><span>${ENEMIES[target.typeId].level}. szint · ${Math.ceil(target.hp)} / ${target.maxHp} HP</span>` : '';
  const near = [...engine.world.npcs.map(n => ({ ...n, hint: `Beszélgetés: ${n.name}` })), ...engine.world.landmarks.filter(l => l.kind === 'camp').map(l => ({ ...l, hint: `Pihenés: ${l.name}` })), ...engine.world.resources.filter(n => engine!.state.collectedNodes[n.id] === undefined || engine!.state.worldTime >= engine!.state.collectedNodes[n.id] + 300).map(n => ({ ...n, hint: `Gyűjtés: ${ITEMS[n.itemId]?.name}` })), ...engine.world.chests.filter(c => !engine!.state.openedChests.includes(c.id)).map(c => ({ ...c, hint: 'Láda felnyitása' }))].filter(n => Math.hypot(n.x + 0.5 - p.x, n.y + 0.5 - p.y) < 2.3).sort((a, b) => Math.hypot(a.x + 0.5 - p.x, a.y + 0.5 - p.y) - Math.hypot(b.x + 0.5 - p.x, b.y + 0.5 - p.y))[0];
  document.getElementById('interaction-hint')!.innerHTML = near ? `<kbd>E</kbd> ${near.hint}` : '';
  const active = QUESTS.filter(q => engine!.state.quests[q.id] && engine!.state.quests[q.id].status !== 'completed');
  document.getElementById('quest-tracker')!.innerHTML = active.length ? `<p class="tracker-title">AKTUÁLIS KALAND</p>${active.slice(0, 2).map(q => { const progress = engine!.state.quests[q.id]; return `<strong>${q.title}</strong>${progress.status === 'ready' ? `<p class="tracker-goal completed">✓ Térj vissza: ${engine!.world.npcs.find(n => n.id === (q.turnInId ?? q.giverId))?.name ?? 'Menedék'}</p>` : q.objectives.map((o, i) => `<p class="tracker-goal ${progress.progress[i] >= o.count ? 'completed' : ''}">${progress.progress[i] >= o.count ? '✓' : '◇'} ${o.label} <span>${Math.min(o.count, progress.progress[i])}/${o.count}</span></p>`).join('')}`; }).join('')}` : `<p class="tracker-title">AZ ELSŐ LÉPÉS</p><strong>A Menedék hívása</strong><p class="tracker-goal">Beszélj a falu vezetőjével.<br><kbd>E</kbd> · interakció a közelben</p>`;
  const currentLogId = engine.state.logs.at(-1)?.id ?? -1;
  if (force || currentLogId !== lastLogId) {
    document.getElementById('log-entries')!.innerHTML = engine.state.logs.slice(-3).reverse().map(l => `<div class="log-entry ${l.kind}">${escape(l.text)}</div>`).join('');
    if (currentLogId !== lastLogId && lastLogId !== -1 && engine.state.logs.at(-1)?.kind === 'loot') sound(660);
    lastLogId = currentLogId;
  }
  if (p.hp < lastHp) sound(120, 0.07);
  if (p.level > lastLevel) { toast(`Szintlépés! ${p.level}. szint — új tulajdonság- és képességpont. Nyomj C-t!`); sound(880, 0.3); }
  lastHp = p.hp; lastLevel = p.level;
  drawMap(minimapBacking, false);
  document.querySelector<HTMLImageElement>('#minimap')!.src = minimapBacking.toDataURL('image/png');
  if (force && panel) renderPanel();
  if (engine.state.status === 'dead' && !deathShown) { deathShown = true; openPanel('death'); }
  if (engine.state.status === 'won' && !victoryShown) { victoryShown = true; void saveCurrent(false); openPanel('victory'); }
}

function togglePause() { if (engine && !panel) { engine.dispatch({ type: 'pause', value: !engine.state.paused }); refreshUI(false); } }
function openPanel(name: string) {
  if (!engine) return;
  if (!panel) { panelBeforePause = engine.state.paused; engine.dispatch({ type: 'pause', value: true }); }
  panel = name; renderPanel(); refreshUI(false);
}
function closePanel() {
  if (!engine) return;
  if (engine.state.status === 'dead') return;
  panel = null; npcId = null; document.getElementById('dialog-root')!.innerHTML = '';
  engine.dispatch({ type: 'pause', value: panelBeforePause }); refreshUI(false);
}
function handleInteraction(event: Interaction) {
  if (event.kind === 'npc') { npcId = event.id; openPanel('npc'); }
  else if (event.kind === 'camp') { npcId = null; openPanel('camp'); }
  else { toast(event.text); refreshUI(true); }
}

function itemDetail(itemId: string): string {
  if (!engine) return '';
  const item = ITEMS[itemId]; if (!item) return '<p>Válassz egy tárgyat a táskából.</p>';
  const p = engine.state.player;
  const equipped = Object.values(p.equipment).includes(itemId);
  return `<div class="item-detail rarity-${item.rarity}"><div class="detail-icon">${item.icon}</div><p class="eyebrow">${({ common: 'Közönséges', fine: 'Jó minőségű', rare: 'Ritka', epic: 'Epikus' })[item.rarity]}</p><h3>${item.name}</h3><p>${item.description}</p><div class="item-stats">${item.damage ? `<span>⚔ ${item.damage} fegyversebzés</span>` : ''}${item.armor ? `<span>◈ ${item.armor} páncél</span>` : ''}${item.power ? `<span>✦ +${item.power} varázserő</span>` : ''}${item.heal ? `<span>✚ ${item.heal} életerő</span>` : ''}${item.mana ? `<span>◆ ${item.mana} mana</span>` : ''}${item.food ? `<span>♨ +${item.food}% jóllakottság</span>` : ''}</div><div class="detail-actions">${['weapon', 'armor', 'charm'].includes(item.kind) ? `<button class="btn btn-primary" data-equip="${itemId}" ${equipped ? 'disabled' : ''}>${equipped ? '✓ Felszerelve' : 'Felszerelem'}</button>` : ''}${['potion', 'food'].includes(item.kind) ? `<button class="btn btn-primary" data-use="${itemId}">Felhasználom</button>` : ''}</div><small>Érték: ${item.price} arany</small></div>`;
}

function questCard(q: (typeof QUESTS)[number], atNpc = false) {
  const state = engine!.state.quests[q.id];
  const prerequisiteMet = !q.prerequisite || engine!.state.quests[q.prerequisite]?.status === 'completed';
  const readyHere = state?.status === 'ready' && (q.turnInId ?? q.giverId) === npcId;
  const availableHere = !state && prerequisiteMet && q.giverId === npcId;
  return `<article class="quest-card ${state?.status === 'completed' ? 'completed' : ''}"><div class="quest-card-heading"><h3>${q.title}</h3><span class="quest-status">${state?.status === 'completed' ? '✓ Teljesítve' : state?.status === 'ready' ? 'Átadható' : state ? 'Folyamatban' : prerequisiteMet ? 'Elérhető' : 'Későbbi kaland'}</span></div><p>${q.summary}</p><ul>${q.objectives.map((o, i) => `<li class="quest-objective ${(state?.progress[i] ?? 0) >= o.count ? 'completed' : ''}">${o.label} <span>${Math.min(o.count, state?.progress[i] ?? 0)} / ${o.count}</span></li>`).join('')}</ul><p class="quest-reward">Jutalom: ${q.xp} XP · ${q.gold} arany${q.items?.length ? ` · ${q.items.map(i => `${ITEMS[i.itemId]?.name} ×${i.quantity}`).join(', ')}` : ''}</p>${atNpc && (readyHere || availableHere) ? `<button class="btn btn-primary btn-small" data-quest="${q.id}">${readyHere ? 'Kaland lezárása · jutalom átvétele' : 'Elvállalom a kalandot'}</button>` : state?.status === 'ready' ? `<small>Átadás: ${engine!.world.npcs.find(n => n.id === (q.turnInId ?? q.giverId))?.name ?? 'Menedék'}</small>` : ''}</article>`;
}

function renderPanel() {
  if (!engine || !panel) return;
  const p = engine.state.player;
  let title = '', body = '', wide = false;
  if (panel === 'inventory') {
    title = 'Felszerelés és úti készlet';
    if (!p.inventory.some(i => i.itemId === selectedItem)) selectedItem = p.inventory[0]?.itemId ?? '';
    body = `<div class="inventory-heading"><span>${p.inventory.length} tárgyhalom</span><span>◉ ${Math.floor(p.gold)} arany · ♨ ${Math.floor(p.food)}% jóllakottság</span></div><div class="inventory-layout"><div class="inventory-grid">${p.inventory.map(stack => { const item = ITEMS[stack.itemId]; return `<button class="item-slot rarity-${item.rarity} ${selectedItem === item.id ? 'selected' : ''} ${Object.values(p.equipment).includes(item.id) ? 'equipped' : ''}" data-item="${item.id}" title="${item.name}"><span class="item-icon">${item.icon}</span><span class="item-name">${item.name}</span><span class="quantity">${stack.quantity > 1 ? `×${stack.quantity}` : ''}</span>${Object.values(p.equipment).includes(item.id) ? '<span class="equipped-mark">✓</span>' : ''}</button>`; }).join('')}${Array.from({ length: Math.max(0, 24 - p.inventory.length) }, () => '<div class="item-slot empty"></div>').join('')}</div>${itemDetail(selectedItem)}</div>`;
    wide = true;
  } else if (panel === 'character') {
    title = `${escape(p.name)} · ${p.level}. szint`;
    body = `<p class="character-origin">${RACES.find(r => r.id === p.raceId)?.name} · ${ARCHETYPES.find(a => a.id === p.archetypeId)?.name}</p><div class="character-grid"><section class="character-card"><h3>Adottságok <span>${p.statPoints} szabad pont</span></h3>${stats.map(s => `<div class="stat-row"><span>${STAT_LABELS[s]}</span><strong>${p.stats[s]}</strong><button class="btn btn-small" data-stat="${s}" ${p.statPoints < 1 ? 'disabled' : ''}>+</button></div>`).join('')}<div class="derived-stats"><p>Életerő <b>${maxHp(p)}</b></p><p>Mana <b>${maxMana(p)}</b></p><p>Lendület <b>${maxStamina(p)}</b></p><p>Fegyver <b>${ITEMS[p.equipment.weapon].name}</b></p><p>Páncél <b>${ITEMS[p.equipment.armor].armor ?? 0}</b></p></div></section><section class="character-card"><h3>Képességek <span>${p.skillPoints} szabad pont</span></h3><div class="skill-tree">${order.map(id => { const s = SKILLS[id]; return `<article class="skill-card ${p.skills[id] > 0 ? 'learned' : ''}"><span class="skill-card-icon">${s.icon}</span><div><h4>${s.name} <small>${p.skills[id]}/3</small></h4><p>${s.description}</p><small>${s.mana} mana · ${s.stamina} lendület · ${s.cooldown} mp</small></div><button class="btn btn-small" data-learn="${id}" ${p.skillPoints < 1 || p.level < s.unlockLevel || p.skills[id] >= 3 ? 'disabled' : ''}>${p.level < s.unlockLevel ? `${s.unlockLevel}. szint` : p.skills[id] >= 3 ? 'MAX' : p.skills[id] > 0 ? 'Fejlesztés' : 'Tanulás'}</button></article>`; }).join('')}</div></section></div>`;
    wide = true;
  } else if (panel === 'quests') {
    title = 'Kalandnapló';
    body = `<div class="quest-list">${QUESTS.filter(q => engine!.state.quests[q.id]).map(q => questCard(q)).join('') || '<div class="empty-state"><span>☷</span><h3>Minden kaland egy beszélgetéssel kezdődik.</h3><p>Keresd meg a falu vezetőjét, és nyomj E-t a közelében.</p></div>'}</div><h3 class="journal-heading">Az expedíció feljegyzései</h3><div class="full-log">${engine.state.logs.slice(-50).reverse().map(l => `<p class="log-entry ${l.kind}">${escape(l.text)}</p>`).join('')}</div>`;
  } else if (panel === 'map') {
    title = 'A felfedezett világ'; wide = true;
    body = `<p class="map-intro">Menedék → Vadon → Bánya → Ködmocsár → Elfeledett romok. A távolabbi vidék veszélyesebb.</p><img class="world-mapcanvas" id="world-map" width="784" height="588" alt="A felfedezett világ térképe"><div class="map-legend"><span>◆ Kalandozó</span><span>● Település / tábor</span><span>✦ Felfedezett hely</span><span>■ Ismeretlen terület</span></div><div class="landmark-list">${engine.world.landmarks.filter(l => engine!.state.discovered.includes(l.id)).map(l => `<span>${l.name} <small>${l.x}, ${l.y}</small></span>`).join('')}</div>`;
  } else if (panel === 'npc') {
    const npc = engine.world.npcs.find(n => n.id === npcId);
    if (!npc) { closePanel(); return; }
    title = npc.name;
    body = `<div class="npc-dialogue"><div class="npc-portrait">${npc.role.includes('kovács') ? '⚒' : npc.role.includes('gyógy') ? '✚' : '♙'}</div><div><p class="eyebrow">${npc.role}</p><p>„${npc.dialogue}”</p></div></div><div class="npc-quests">${QUESTS.filter(q => (q.giverId === npc.id || ((q.turnInId ?? q.giverId) === npc.id && engine!.state.quests[q.id])) && (!q.prerequisite || engine!.state.quests[q.prerequisite]?.status === 'completed' || engine!.state.quests[q.id])).map(q => questCard(q, true)).join('')}</div>${npc.shop?.length ? `<h3>Áruk <span class="muted">· ${Math.floor(p.gold)} aranyad van</span></h3><div class="shop-grid">${npc.shop.map(id => { const item = ITEMS[id]; return `<div class="shop-item rarity-${item.rarity}"><span>${item.icon}</span><div><strong>${item.name}</strong><small>${item.description}</small></div><button class="btn btn-small" data-buy="${id}" ${p.gold < item.price ? 'disabled' : ''}>${item.price} ◉</button></div>`; }).join('')}</div><h3>Eladható felszerelés</h3><div class="shop-grid">${p.inventory.filter(i => !Object.values(p.equipment).includes(i.itemId) && ITEMS[i.itemId].kind !== 'quest').map(i => `<div class="shop-item"><span>${ITEMS[i.itemId].icon}</span><div><strong>${ITEMS[i.itemId].name} ×${i.quantity}</strong></div><button class="btn btn-small" data-sell="${i.itemId}">Eladás · ${Math.max(1, Math.floor(ITEMS[i.itemId].price * 0.4))} ◉</button></div>`).join('') || '<p class="muted">Most nincs eladható tárgyad.</p>'}</div>` : ''}${['elder', 'healer'].includes(npc.id) ? '<button class="btn btn-secondary" id="rest-now">Pihenés · erőforrások feltöltése</button>' : ''}`;
  } else if (panel === 'camp') {
    title = 'A tábortűz mellett';
    body = `<div class="camp-illustration">♨</div><p>A tűz melege és az úti élelem visszaadja az erődet. A pihenés élelmet fogyaszt, és csak akkor biztonságos, ha nincs ellenfél a közelben.</p><p>Jóllakottság: ${Math.floor(p.food)}% · Készlet a táskádban</p><button class="btn btn-primary" id="rest-now">Megpihenek és feltöltődöm</button>`;
  } else if (panel === 'menu') {
    title = 'A kalandozó pihenője';
    body = `<p class="tip">A játék megállt. A mentés ebben a böngészőben marad; a letöltött mentésfájllal máshol is folytathatod.</p><div class="menu-actions"><button class="btn btn-primary" id="resume-now">Vissza a kalandhoz</button><button class="btn btn-secondary" id="save-now">Mentés most</button><button class="btn btn-secondary" id="export-save">Mentés letöltése</button><button class="btn btn-secondary" id="import-save">Mentés betöltése fájlból</button><button class="btn btn-secondary" id="show-help">Irányítás és tippek</button><button class="btn btn-small" id="return-start">Vissza a karakteralkotóhoz</button></div><p class="save-status">${saveLabel}</p>`;
  } else if (panel === 'help') {
    title = 'A kalandozó kézikönyve';
    body = `<div class="help-keys"><p><kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd> Mozgás</p><p><kbd>Kattintás</kbd> Útvonal a célhoz; ellenfélre kattintva harc</p><p><kbd>F</kbd> Alaptámadás a közeli ellenfélre</p><p><kbd>E</kbd> Beszélgetés, gyűjtés, láda és tábor</p><p><kbd>1–6</kbd> A megtanult képességek használata</p><p><kbd>Szóköz</kbd> Taktikai szünet / folytatás</p><p><kbd>I</kbd> Táska · <kbd>C</kbd> Karakter · <kbd>J</kbd> Napló · <kbd>M</kbd> Térkép</p><p><kbd>Esc</kbd> Ablak bezárása / menü</p></div><p>Beszélj a Menedék vezetőjével. Vállalj kalandot, fedezz fel új helyeket, és térj vissza a jutalmadért. A távoli romok főellenfeléhez érdemes fejlődni és jobb felszerelést szerezni.</p><p>Az életerőt gyógyitallal vagy mágiával, az összes erőforrást a faluban és a táboroknál pihenve töltheted fel. Szintlépés után nyomj C-t, és oszd el az új pontokat.</p><p>A ritka tárgyakat a táskában külön keretszín jelzi. Az új fegyvert a táskában fel is kell szerelni.</p>`;
  } else if (panel === 'death') {
    title = 'A vadon elcsendesedik…';
    body = `<div class="death-screen"><span>☾</span><h3>Az expedíció itt véget ért.</h3><p>A kalandozó története folytatódhat a legutóbbi mentéstől. Egy másik út, egy gyógyital vagy egy új képesség fordíthat a következő harcon.</p><button class="btn btn-primary" id="retry-game">Vissza a legutóbbi mentéshez</button><button class="btn btn-secondary" id="return-start">Karakteralkotó</button></div>`;
  } else if (panel === 'victory') {
    title = 'Fény az elfeledett romok között';
    body = `<div class="victory-screen"><span>✦</span><h3>Az ősi őrző legyőzve!</h3><p>${escape(p.name)} elérte az első expedíció végpontját. A Menedék egy időre fellélegezhet.</p><p>${p.level}. szint · ${engine.state.kills} legyőzött ellenfél · ${engine.state.discovered.length} felfedezett hely</p><p>A kaland folytatható: térj vissza a jutalomért, fejezd be a többi küldetést, és fedezd fel a megmaradt helyeket.</p><button class="btn btn-primary" id="resume-now">Vissza a világba</button><button class="btn btn-secondary" id="export-save">A kaland mentésének letöltése</button></div>`;
  }
  const root = document.querySelector('#dialog-root')!;
  root.innerHTML = `<div class="dialog-backdrop"><section class="dialog ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="dialog-header"><h2 id="dialog-title">${title}</h2>${panel !== 'death' ? '<button class="close-btn" id="close-dialog" aria-label="Ablak bezárása">×</button>' : ''}</header><div class="dialog-body">${body}</div></section></div>`;
  const click = (selector: string, fn: (el: HTMLElement) => void) => root.querySelectorAll<HTMLElement>(selector).forEach(el => el.onclick = () => fn(el));
  click('#close-dialog, #resume-now', closePanel);
  click('[data-item]', el => { selectedItem = el.dataset.item!; renderPanel(); });
  click('[data-equip]', el => act({ type: 'equip', itemId: el.dataset.equip! }));
  click('[data-use]', el => act({ type: 'use', itemId: el.dataset.use! }));
  click('[data-buy]', el => act({ type: 'buy', itemId: el.dataset.buy! }));
  click('[data-sell]', el => act({ type: 'sell', itemId: el.dataset.sell! }));
  click('[data-quest]', el => act({ type: 'quest', questId: el.dataset.quest! }));
  click('[data-learn]', el => act({ type: 'learn', skill: el.dataset.learn as SkillId }));
  click('[data-stat]', el => act({ type: 'stat', stat: el.dataset.stat as StatId }));
  click('#rest-now', () => { act({ type: 'rest' }); void saveCurrent(false); });
  click('#save-now', () => { void saveCurrent(true); });
  click('#export-save', () => { if (engine) downloadSave(engine.state); });
  click('#import-save', importGame);
  click('#show-help', () => openPanel('help'));
  click('#return-start', () => { void returnToStart(); });
  click('#retry-game', () => { void retryGame(); });
  if (panel === 'map') {
    drawMap(worldMapBacking, true);
    document.querySelector<HTMLImageElement>('#world-map')!.src = worldMapBacking.toDataURL('image/png');
  }
}

const mapColors: Record<string, string> = { grass: '#62764d', forest: '#324c36', path: '#b7a17a', water: '#426f75', rock: '#77746a', marsh: '#596e58', floor: '#928571', wall: '#55564e', sand: '#a99a76' };
function drawMap(canvas: HTMLCanvasElement, full: boolean) {
  if (!engine) return;
  const context = canvas.getContext('2d'); if (!context) return;
  const w = engine.world;
  const scaleX = canvas.width / w.width, scaleY = canvas.height / w.height;
  const discovered = new Set(engine.state.explored);
  context.fillStyle = '#121e1b'; context.fillRect(0, 0, canvas.width, canvas.height);
  for (const index of discovered) { context.fillStyle = mapColors[w.tiles[index]] ?? '#44503c'; context.fillRect(index % w.width * scaleX, Math.floor(index / w.width) * scaleY, Math.ceil(scaleX), Math.ceil(scaleY)); }
  for (const landmark of w.landmarks) {
    if (!engine.state.discovered.includes(landmark.id)) continue;
    context.fillStyle = landmark.kind === 'village' || landmark.kind === 'camp' ? '#f0ce81' : '#bdbfa0';
    context.beginPath(); context.arc(landmark.x * scaleX, landmark.y * scaleY, full ? 5 : 2.5, 0, Math.PI * 2); context.fill();
    if (full) { context.font = '12px Georgia'; context.fillStyle = '#fff1cb'; context.fillText(landmark.name, landmark.x * scaleX + 7, landmark.y * scaleY - 5); }
  }
  const { x, y } = engine.state.player;
  context.save(); context.translate(x * scaleX, y * scaleY); context.rotate(Math.PI / 4); context.fillStyle = '#fff4c9'; context.strokeStyle = '#362d1e'; context.lineWidth = 2; context.fillRect(-4, -4, 8, 8); context.strokeRect(-4, -4, 8, 8); context.restore();
}

async function saveCurrent(notify: boolean) {
  if (!engine || engine.state.status === 'dead') return;
  if (saving) { pendingManualSave ||= notify; return; }
  saving = true;
  try { await saveGame(engine.state); saveLabel = `✓ Mentve ${new Date().toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}`; if (notify) toast('A kaland elmentve ebben a böngészőben.'); }
  catch (error) { saveLabel = '⚠ Mentésfájl letöltése ajánlott'; if (notify) toast((error as Error).message, true); }
  finally {
    saving = false; refreshUI(false);
    if (pendingManualSave) { pendingManualSave = false; void saveCurrent(true); }
  }
}

function importGame() {
  const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
  input.onchange = async () => {
    const file = input.files?.[0]; if (!file) return;
    try { const state = parseSave(await file.text()); startGame(state); toast('A mentés betöltve. Folytatódhat a kaland!'); }
    catch (error) { toast((error as Error).message, true); }
  };
  input.click();
}
async function retryGame() {
  try { const state = await loadGame(); if (state && state.status !== 'dead') startGame(state); else { await returnToStart(); toast('Nincs visszatölthető mentés. Új expedíciót indíthatsz.'); } }
  catch (error) { toast((error as Error).message, true); }
}
async function returnToStart() {
  if (engine?.state.status !== 'dead') await saveCurrent(false);
  phaser?.destroy(true); phaser = null; engine = null; panel = null;
  try { existingSave = await loadGame(); } catch { existingSave = null; }
  renderStart();
}

window.addEventListener('keydown', event => {
  if (!engine || (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))) return;
  const key = event.key.toLowerCase();
  if (key === 'escape') { event.preventDefault(); if (panel) closePanel(); else openPanel('menu'); return; }
  const panels: Record<string, string> = { i: 'inventory', b: 'inventory', c: 'character', j: 'quests', m: 'map' };
  if (panels[key]) { event.preventDefault(); if (panel === panels[key]) closePanel(); else openPanel(panels[key]); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && engine) { engine.dispatch({ type: 'pause', value: true }); void saveCurrent(false); } });
setInterval(() => { if (engine && engine.state.status !== 'dead') void saveCurrent(false); }, 20_000);

renderStart();
void loadGame().then(save => { existingSave = save; if (!engine) renderStart(); }).catch(() => { /* File export remains available. */ });
