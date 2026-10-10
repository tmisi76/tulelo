import type { EnemySpawn, RegionDef, TileType, WorldData } from './types';

/** A local seeded generator keeps exploration, scenery and save files repeatable. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function isWalkable(world: WorldData, x: number, y: number): boolean {
  const tileX = Math.floor(x), tileY = Math.floor(y);
  return Number.isFinite(x) && Number.isFinite(y)
    && tileX >= 0 && tileY >= 0 && tileX < world.width && tileY < world.height
    && !world.blocked[tileY * world.width + tileX];
}

export function regionAt(world: WorldData, x: number, y: number): RegionDef {
  return world.regions.find(region => x >= region.x && y >= region.y
    && x < region.x + region.width && y < region.y + region.height) ?? world.regions[0];
}

export function createWorld(seed: number): WorldData {
  const width = 112, height = 84;
  const random = seededRandom(seed);
  const tiles: TileType[] = Array(width * height).fill('grass');
  const blocked: boolean[] = Array(width * height).fill(false);
  const put = (x: number, y: number, tile: TileType) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    tiles[index] = tile;
    blocked[index] = tile === 'water' || tile === 'wall' || tile === 'rock' || tile === 'forest';
  };
  const disk = (cx: number, cy: number, radius: number, tile: TileType) => {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) put(x, y, tile);
      }
    }
  };
  const road = (fromX: number, fromY: number, toX: number, toY: number, breadth = 1) => {
    let x = fromX, y = fromY;
    disk(x, y, breadth, 'path');
    while (x !== toX || y !== toY) {
      if (x !== toX) x += Math.sign(toX - x);
      else y += Math.sign(toY - y);
      disk(x, y, breadth, 'path');
    }
  };

  // A broad peninsula: dense northern woods, a broken ridge and southern reeds.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < 2 || y < 2 || x >= width - 2 || y >= height - 2) {
        put(x, y, 'water');
        continue;
      }
      const noise = random();
      if (y < 28 && x < 54) put(x, y, noise < 0.43 ? 'forest' : noise < 0.46 ? 'rock' : 'grass');
      else if (y < 28) put(x, y, noise < 0.17 ? 'rock' : noise < 0.29 ? 'sand' : 'grass');
      else if (x > 53 && y > 57) put(x, y, noise < 0.09 ? 'water' : noise < 0.64 ? 'marsh' : 'grass');
      else if (y > 57) put(x, y, noise < 0.2 ? 'forest' : 'grass');
      else put(x, y, noise < 0.1 ? 'forest' : noise < 0.125 ? 'rock' : 'grass');
      const riverX = 64 + Math.round(Math.sin(y / 9) * 3);
      if (Math.abs(x - riverX) <= 1 && y > 2 && y < height - 3) put(x, y, 'water');
    }
  }
  disk(43, 19, 5, 'water');
  disk(91, 69, 4, 'water');
  disk(16, 42, 10, 'grass');
  disk(74, 64, 5, 'grass');

  const regions: RegionDef[] = [
    { id: 'greenwood', name: 'Ezüstlomb', subtitle: 'Lombok alatt ébredő vadon', minLevel: 1, maxLevel: 3, x: 0, y: 0, width: 54, height: 28, color: 0x678768 },
    { id: 'ridge', name: 'Visszhang-hát', subtitle: 'Érc, kő és elfeledett járatok', minLevel: 3, maxLevel: 5, x: 54, y: 0, width: 58, height: 28, color: 0x9b917a },
    { id: 'haven', name: 'Újpart menedéke', subtitle: 'Itt még égnek az őrtüzek', minLevel: 1, maxLevel: 1, x: 0, y: 28, width: 34, height: 30, color: 0xb5a780 },
    { id: 'crossing', name: 'Ködjáró ösvény', subtitle: 'Az erdő és a régi világ határa', minLevel: 2, maxLevel: 4, x: 34, y: 28, width: 48, height: 30, color: 0x819078 },
    { id: 'ruins', name: 'Parázsvár romjai', subtitle: 'Egy kihunyt birodalom utolsó őrei', minLevel: 6, maxLevel: 8, x: 82, y: 28, width: 30, height: 30, color: 0x978379 },
    { id: 'lowlands', name: 'Szélcsendes rét', subtitle: 'Vándorok és mohos kövek', minLevel: 2, maxLevel: 3, x: 0, y: 58, width: 54, height: 26, color: 0x91a274 },
    { id: 'marsh', name: 'A suttogó nádvidék', subtitle: 'Lámpafény a mély ködben', minLevel: 4, maxLevel: 6, x: 54, y: 58, width: 58, height: 26, color: 0x718b79 },
  ];

  const landmarks: WorldData['landmarks'] = [
    { id: 'haven', name: 'Újpart menedéke', description: 'A világégés túlélőinek otthona. A közös őrtűznél mindig akad egy szabad hely.', x: 16, y: 42, kind: 'village' },
    { id: 'haven_camp', name: 'A menedék őrtüze', description: 'Biztonságos pihenőhely. Pihenj, töltsd fel erődet, és készülj a következő útra.', x: 17, y: 46, kind: 'camp' },
    { id: 'old_shrine', name: 'Az erdei szentély', description: 'A mohás köveken egy elfeledett napjel dereng. Talán még visszatérhet ide a fény.', x: 23, y: 17, kind: 'shrine' },
    { id: 'echo_mine', name: 'Visszhang-bánya', description: 'A beomlott tárna falából vörös ér erezete fut a szabadba.', x: 78, y: 18, kind: 'mine' },
    { id: 'river_bridge', name: 'A ködök hídja', description: 'A régi kőhíd még megtartja a túlélők lépteit.', x: 62, y: 40, kind: 'bridge' },
    { id: 'reed_camp', name: 'Nádfény-tábor', description: 'Elhagyott őrhely, amelynek parazsa nem hűlt ki. Itt biztonságban megpihenhetsz.', x: 74, y: 64, kind: 'camp' },
    { id: 'sunken_gate', name: 'Az Elmerült kapu', description: 'A régi város bejárata félig a földbe süppedt. A kapun túl vörösen izzik az ég.', x: 86, y: 42, kind: 'ruin' },
    { id: 'ember_throne', name: 'A parázstrón', description: 'Az utolsó őr itt vigyázza egy halott világ kapuját.', x: 99, y: 39, kind: 'portal' },
  ];
  const npcs: WorldData['npcs'] = [
    { id: 'elder', name: 'Mara, a menedék őrzője', role: 'Küldetések · a menedék története', x: 16, y: 39, color: 0xccb383, dialogue: 'Nem azt kérdezem, honnan érkeztél. Csak azt: segítesz-e felépíteni, ami ezután jön? A szentély és a romok között még sok válasz vár.' },
    { id: 'smith', name: 'Borin, a kovács', role: 'Fegyverek · páncélok · kereskedés', x: 21, y: 43, color: 0xad9270, dialogue: 'Az acél nem kérdezi, ki voltál. Csak azt tudja, milyen kezek tartják. Hozz ércet, és adok valamit, ami kitart melletted.', shop: ['iron_sword', 'hunting_bow', 'ash_staff', 'iron_mace', 'thorn_spear', 'ring_mail', 'scale_armor', 'embersteel_blade', 'moon_bow', 'frost_staff', 'guardian_plate', 'mist_robe'] },
    { id: 'healer', name: 'Ila, a gyógyító', role: 'Gyógyitalok · ellátmány', x: 12, y: 43, color: 0xa0bfa2, dialogue: 'A test tudja, hogyan gyógyuljon. Néha csak emlékeztetni kell rá. Az erdő keserűlevele és a nyugodt pihenés is segít.', shop: ['red_potion', 'blue_potion', 'greater_potion', 'moon_elixir', 'trail_bread', 'smoked_meat', 'forest_berries'] },
    { id: 'hunter', name: 'Neris, a vadonőr', role: 'A vadon hírei · küldetések', x: 23, y: 38, color: 0x91a479, dialogue: 'Az ösvény nem mindig a legrövidebb út, de többnyire a legbiztosabb. Északon szentélyt találsz, keleten a bányát; a lápba feltöltött kulaccsal indulj.' },
  ];
  const resources: WorldData['resources'] = [
    ...[[18, 24], [25, 25], [30, 18], [13, 18], [35, 23], [44, 31], [78, 69], [69, 72], [83, 64], [75, 56]].map(([x, y], index) => ({ id: `herb_${index + 1}`, itemId: 'bitterleaf', x, y, kind: 'herb' as const })),
    ...[[71, 21], [76, 15], [82, 15], [85, 21], [74, 26], [89, 12]].map(([x, y], index) => ({ id: `ore_${index + 1}`, itemId: 'iron_ore', x, y, kind: 'ore' as const })),
  ];
  const chests: WorldData['chests'] = [
    { id: 'chest_shrine', x: 25, y: 17, gold: 15, items: [{ itemId: 'red_potion', quantity: 2 }, { itemId: 'trail_bread', quantity: 2 }] },
    { id: 'chest_woods', x: 38, y: 10, gold: 22, items: [{ itemId: 'blue_potion', quantity: 2 }, { itemId: 'wood_charm', quantity: 1 }] },
    { id: 'chest_crossing', x: 47, y: 44, gold: 30, items: [{ itemId: 'thorn_spear', quantity: 1 }, { itemId: 'smoked_meat', quantity: 2 }] },
    { id: 'chest_mine', x: 80, y: 18, gold: 45, items: [{ itemId: 'iron_ore', quantity: 3 }, { itemId: 'greater_potion', quantity: 2 }] },
    { id: 'chest_reeds', x: 83, y: 73, gold: 55, items: [{ itemId: 'mist_robe', quantity: 1 }, { itemId: 'moon_elixir', quantity: 1 }] },
    { id: 'chest_gate', x: 88, y: 46, gold: 70, items: [{ itemId: 'ember_shard', quantity: 1 }, { itemId: 'greater_potion', quantity: 2 }] },
    { id: 'chest_ruins', x: 103, y: 49, gold: 90, items: [{ itemId: 'ember_shard', quantity: 2 }, { itemId: 'moon_elixir', quantity: 2 }] },
  ];
  const spawnGroups: Array<[string, Array<[number, number]>]> = [
    ['bramble_wolf', [[17, 21], [27, 21], [31, 12], [12, 11], [39, 24]]],
    ['spark_beetle', [[30, 25], [39, 13], [45, 29], [39, 35]]],
    ['hollow_bandit', [[42, 46], [51, 36], [34, 64]]],
    ['glass_spider', [[54, 23], [59, 32], [69, 27], [51, 62]]],
    ['slag_golem', [[74, 17], [84, 19], [81, 25], [89, 16]]],
    ['mire_stalker', [[61, 69], [84, 67], [79, 76], [92, 63]]],
    ['ash_skeleton', [[87, 35], [89, 51], [96, 49], [104, 44]]],
    ['ruin_guardian', [[92, 35], [98, 44], [103, 33]]],
    ['ember_warden', [[99, 39]]],
  ];
  const enemies: EnemySpawn[] = spawnGroups.flatMap(([typeId, points]) => points.map(([x, y], index) => ({ id: `${typeId}_${index + 1}`, typeId, x, y })));

  // Main routes cross the river at two deliberate bridges. Side trails connect
  // every interactable and enemy spawn to the same walkable component.
  road(16, 42, 55, 42, 2);
  road(55, 42, 86, 42, 1);
  road(16, 42, 23, 17, 1);
  road(55, 42, 78, 18, 1);
  road(55, 42, 74, 64, 1);
  road(74, 64, 86, 42, 1);
  road(86, 42, 99, 39, 1);
  for (const point of [...landmarks, ...npcs, ...resources, ...chests, ...enemies]) {
    let anchor = { x: 16, y: 42 };
    if (point.x >= 82 && point.y >= 28 && point.y < 58) anchor = { x: 86, y: 42 };
    else if (point.x >= 54 && point.y < 28) anchor = { x: 78, y: 18 };
    else if (point.x >= 54 && point.y >= 58) anchor = { x: 74, y: 64 };
    else if (point.y < 28) anchor = { x: 23, y: 17 };
    else if (point.x >= 34) anchor = { x: 55, y: 42 };
    road(anchor.x, anchor.y, point.x, point.y, 0);
    disk(point.x, point.y, point.id === 'ember_warden_1' ? 3 : 1, 'grass');
  }

  // A small ruined courtyard: accessible gaps, with a road to the final room.
  for (let y = 30; y <= 53; y++) {
    for (let x = 88; x <= 106; x++) {
      if (tiles[y * width + x] === 'grass') put(x, y, 'floor');
    }
  }
  for (let x = 91; x <= 104; x++) {
    if (x !== 96 && x !== 97 && x !== 98) put(x, 31, 'wall');
    if (x !== 94 && x !== 95 && x !== 96) put(x, 52, 'wall');
  }
  // Reconnect after architecture so walls never invalidate an entity route.
  for (const point of [...chests, ...enemies].filter(point => point.x >= 82 && point.y >= 28 && point.y < 58)) {
    road(86, 42, point.x, point.y, 0);
    if (point.id === 'ember_warden_1') disk(point.x, point.y, 3, 'floor');
  }

  // Houses and tree trunks occupy ground, independently of their taller artwork.
  // Doors, the central square, and all NPC interaction points remain open.
  for (const [left, top, right, bottom] of [[12, 39, 15, 40], [18, 39, 20, 40], [8, 45, 10, 45]]) {
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) blocked[y * width + x] = true;
  }
  for (const [x, y] of [[8, 36], [22, 35], [25, 45], [12, 50], [7, 45], [19, 33]]) {
    tiles[y * width + x] = 'forest'; blocked[y * width + x] = true;
  }
  return { seed, width, height, tiles, blocked, spawn: { x: 16, y: 42 }, regions, landmarks, npcs, resources, chests, enemies };
}
