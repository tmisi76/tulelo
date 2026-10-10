import type { ArchetypeDef, EnemyDef, ItemDef, QuestDef, RaceDef, SkillDef, SkillId, StatId } from './types';

export const STAT_LABELS: Record<StatId, string> = {
  strength: 'Erő', dexterity: 'Ügyesség', vitality: 'Életerő',
  intelligence: 'Értelem', wisdom: 'Bölcsesség', will: 'Akarat',
};

export const RACES: RaceDef[] = [
  { id: 'human', name: 'Ember', icon: '◈', description: 'Az Újpart kitartó telepesei. Sokoldalúságuk és józan eszük segíti őket az ismeretlen földön.', bonuses: { strength: 1, vitality: 1, wisdom: 1, will: 1 } },
  { id: 'elf', name: 'Holdelf', icon: '☾', description: 'Az elveszett ligetek emlékezői. Könnyű léptük és mágikus érzékük a vadonban is vezeti őket.', bonuses: { dexterity: 2, intelligence: 2 } },
  { id: 'dwarf', name: 'Kőtörpe', icon: '⬟', description: 'A mélycsarnokok szívós lakói. Értenek a fémhez, és kevés seb téríti el őket az útjukról.', bonuses: { vitality: 3, strength: 1 } },
  { id: 'shadowkin', name: 'Árnyjáró', icon: '◆', description: 'Apró, halk szavú vándorok, akik inkább egy ügyes kitérést választanak, mint a nyers erőt.', bonuses: { dexterity: 3, will: 1 } },
  { id: 'troll', name: 'Mohatroll', icon: '♣', description: 'A vadon hatalmas, békés őrei. Ha sarokba szorítják őket, az erdő minden erejével küzdenek.', bonuses: { strength: 2, vitality: 2 } },
  { id: 'gnome', name: 'Rézgnóm', icon: '⚙', description: 'Kíváncsi feltalálók. Számukra minden rom egy megfejtésre váró gépezet, minden varázs egy új ötlet.', bonuses: { intelligence: 3, wisdom: 1 } },
  { id: 'shifter', name: 'Ködváltó', icon: '◌', description: 'A köd szülöttei, akik lassan változó alakjukban is megőrzik rendíthetetlen önmagukat.', bonuses: { vitality: 1, wisdom: 1, will: 2 } },
  { id: 'kobudera', name: 'Szélvérű', icon: '✧', description: 'A puszta kéz és a pontos mozdulat mesterei. Testük fegyelme gondolataiknak is irányt szab.', bonuses: { dexterity: 2, strength: 1, will: 1 } },
  { id: 'mutant', name: 'Szikraszülött', icon: '✺', description: 'A világégés vadmágiája formálta őket. Idegen külsejük mögött kivételes elme és erős akarat él.', bonuses: { intelligence: 2, will: 2 } },
];

export const ARCHETYPES: ArchetypeDef[] = [
  { id: 'warrior', name: 'Vándorharcos', icon: '⚔', description: 'Közelharc, biztos csapások és szívósság. A penge mögött mindig ott áll az ember.', weapon: 'iron_sword', armor: 'leather_armor', skills: { strike: 1, dash: 1 } },
  { id: 'ranger', name: 'Vadonőr', icon: '➶', description: 'Mozgékony felderítő, aki íjjal és a vadon ismeretével őrzi az ösvényeket.', weapon: 'hunting_bow', armor: 'scout_cloak', skills: { strike: 1, dash: 1 } },
  { id: 'mage', name: 'Parázsmágus', icon: '✦', description: 'A romokban maradt mágiát kutatja. Tűzzel és jéggel tartja távol az ellenfeleket.', weapon: 'ash_staff', armor: 'linen_robe', skills: { fireball: 1, frost: 1 } },
  { id: 'guardian', name: 'Fényőrző', icon: '⬡', description: 'Páncélozott védelmező, aki gyógyítással és oltalommal egyenlíti ki a harcokat.', weapon: 'iron_mace', armor: 'ring_mail', skills: { strike: 1, heal: 1, ward: 1 } },
];

export const SKILLS: Record<SkillId, SkillDef> = {
  strike: { id: 'strike', name: 'Sújtás', icon: '⚔', description: 'Erős fegyveres csapás a kijelölt ellenfélre. A képzettséggel együtt nő a sebzése.', mana: 0, stamina: 18, cooldown: 3, unlockLevel: 1 },
  fireball: { id: 'fireball', name: 'Parázsgömb', icon: '✹', description: 'Lángoló lövedék egy távoli ellenfélre. Az értelem és a mágikus felszerelés erősíti.', mana: 12, stamina: 0, cooldown: 3.5, unlockLevel: 1 },
  heal: { id: 'heal', name: 'Életfonál', icon: '✚', description: 'Helyreállítja az életerő egy részét. A bölcsességgel és a képzettséggel erősödik.', mana: 14, stamina: 0, cooldown: 8, unlockLevel: 1 },
  dash: { id: 'dash', name: 'Szélugrás', icon: '➜', description: 'Gyors előretörés az utolsó mozgás irányába. Menekülésre és közelítésre is jó.', mana: 0, stamina: 16, cooldown: 5, unlockLevel: 1 },
  frost: { id: 'frost', name: 'Dérnyíl', icon: '❄', description: 'Hideg varázslövedék, amely sebzi az ellenfelet és rövid időre késlelteti a következő támadását.', mana: 9, stamina: 0, cooldown: 2.5, unlockLevel: 1 },
  ward: { id: 'ward', name: 'Őrfény', icon: '⬡', description: 'Védőburok, amely rövid időre csökkenti a beérkező sebzést. Magasabb képzettséggel tovább tart és erősebb.', mana: 10, stamina: 0, cooldown: 12, unlockLevel: 1 },
};

const itemList: ItemDef[] = [
  { id: 'red_potion', name: 'Gyógyital', description: 'Keserű, vörös főzet, amely 28 életerőt állít helyre.', icon: '🧪', kind: 'potion', rarity: 'common', price: 12, heal: 28 },
  { id: 'blue_potion', name: 'Kék harmat', description: 'Tiszta holdharmat: 25 manát állít helyre.', icon: '💧', kind: 'potion', rarity: 'common', price: 14, mana: 25 },
  { id: 'greater_potion', name: 'Életelixír', description: 'A gyógyítók sűrített főzete 65 életerőt állít helyre.', icon: '⚗', kind: 'potion', rarity: 'fine', price: 32, heal: 65 },
  { id: 'moon_elixir', name: 'Holdelixír', description: 'Ritka esszencia: 50 életerő és 40 mana egyetlen kortyban.', icon: '✦', kind: 'potion', rarity: 'rare', price: 58, heal: 50, mana: 40 },
  { id: 'trail_bread', name: 'Útravaló kenyér', description: 'Sűrű, tartós kenyér. 35 élelmet biztosít.', icon: '🍞', kind: 'food', rarity: 'common', price: 6, food: 35 },
  { id: 'smoked_meat', name: 'Füstölt vadpecsenye', description: 'A vadonőrök útravalója: 60 élelem és 8 életerő.', icon: '🍖', kind: 'food', rarity: 'fine', price: 14, food: 60, heal: 8 },
  { id: 'forest_berries', name: 'Ligetbogyó', description: 'Apró, savanykás bogyók. 20 élelem és 5 mana.', icon: '🫐', kind: 'food', rarity: 'common', price: 5, food: 20, mana: 5 },
  { id: 'iron_sword', name: 'Vándorkard', description: 'Egyszerű, jól kiegyensúlyozott vaskard. Megbízható társ az első úton.', icon: '⚔', kind: 'weapon', rarity: 'common', price: 24, damage: 7 },
  { id: 'hunting_bow', name: 'Kőrisíj', description: 'A vadonőrök könnyű íja. Feszített húrja pontos lövést ígér.', icon: '🏹', kind: 'weapon', rarity: 'common', price: 24, damage: 7 },
  { id: 'ash_staff', name: 'Parázsbot', description: 'Meleg tapintású vándorbot, végén halványan izzó kristállyal.', icon: '🪄', kind: 'weapon', rarity: 'common', price: 24, damage: 4, power: 5 },
  { id: 'iron_mace', name: 'Őrkalapács', description: 'Súlyos vasfeje csontot és kőpáncélt egyaránt megrepeszt.', icon: '🔨', kind: 'weapon', rarity: 'common', price: 24, damage: 6, power: 1 },
  { id: 'thorn_spear', name: 'Tövislándzsa', description: 'Acélhegyű lándzsa a sűrűben portyázóknak.', icon: '↗', kind: 'weapon', rarity: 'fine', price: 68, damage: 11 },
  { id: 'embersteel_blade', name: 'Parázsacél penge', description: 'A Visszhang-bánya ércéből kovácsolt, melegen derengő kard.', icon: '⚔', kind: 'weapon', rarity: 'rare', price: 165, damage: 17, power: 3 },
  { id: 'moon_bow', name: 'Holdhúr', description: 'Ezüstberakásos íj, amelynek nyilai a romok őreit is elérik.', icon: '🏹', kind: 'weapon', rarity: 'rare', price: 165, damage: 16, power: 4 },
  { id: 'frost_staff', name: 'Dérszív pálca', description: 'A nádvidék mélyén lelt kristályból csiszolt varázspálca.', icon: '❄', kind: 'weapon', rarity: 'rare', price: 165, damage: 9, power: 12 },
  { id: 'sunhammer', name: 'Hajnalverő', description: 'Ősi őrök fegyvere: vas és fény egyetlen súlyos csapásban.', icon: '🔨', kind: 'weapon', rarity: 'epic', price: 330, damage: 22, power: 8 },
  { id: 'leather_armor', name: 'Vándorbőr', description: 'Foltozott, de erős bőrvért. A karcolásokat felfogja.', icon: '🦺', kind: 'armor', rarity: 'common', price: 20, armor: 3 },
  { id: 'scout_cloak', name: 'Vadonőrköpeny', description: 'Könnyű köpeny rejtett bőrerősítésekkel.', icon: '🧥', kind: 'armor', rarity: 'common', price: 20, armor: 2 },
  { id: 'linen_robe', name: 'Rúnaszőttes', description: 'Vékony mágusköpeny, amely a mana áramlását segíti.', icon: '👘', kind: 'armor', rarity: 'common', price: 20, armor: 1, power: 3 },
  { id: 'ring_mail', name: 'Őrök sodronya', description: 'Egymásba font vaskarikák a védelmezőknek.', icon: '🛡', kind: 'armor', rarity: 'fine', price: 46, armor: 5 },
  { id: 'scale_armor', name: 'Pikkelyvért', description: 'Erős fémlapokból összeállított mellvért.', icon: '🛡', kind: 'armor', rarity: 'fine', price: 88, armor: 7 },
  { id: 'mist_robe', name: 'Ködfonat', description: 'A szövet rostjai között hideg fény kanyarog.', icon: '👘', kind: 'armor', rarity: 'rare', price: 145, armor: 5, power: 7 },
  { id: 'guardian_plate', name: 'Romőrző vért', description: 'A romváros régi őrségének díszes, még mindig erős páncélja.', icon: '🛡', kind: 'armor', rarity: 'rare', price: 185, armor: 11 },
  { id: 'dawn_armor', name: 'Hajnalpáncél', description: 'A visszatérő fény oltalmazza viselőjét.', icon: '⬡', kind: 'armor', rarity: 'epic', price: 350, armor: 15, power: 5 },
  { id: 'wood_charm', name: 'Faragott talizmán', description: 'A menedékből származó kis emlék. Egy kevés védelmet és erőt hordoz.', icon: '📿', kind: 'charm', rarity: 'common', price: 18, armor: 1, power: 1 },
  { id: 'frost_charm', name: 'Dérkönny', description: 'Az elcsendesített láp tiszta kristálya.', icon: '💎', kind: 'charm', rarity: 'rare', price: 95, armor: 2, power: 5 },
  { id: 'dawn_seal', name: 'A hajnal pecsétje', description: 'A Parázsőr bukásának emléke. A menedék új reményének jele.', icon: '☀', kind: 'charm', rarity: 'epic', price: 280, armor: 4, power: 9 },
  { id: 'bitterleaf', name: 'Keserűlevél', description: 'Gyógyfőzetekhez gyűjthető, ezüsterezetű erdei növény.', icon: '🌿', kind: 'material', rarity: 'common', price: 3 },
  { id: 'iron_ore', name: 'Vasérc', description: 'Rozsdavörös kődarab. A kovácsműhelyben értékes alapanyag.', icon: '⛏', kind: 'material', rarity: 'common', price: 5 },
  { id: 'wolf_pelt', name: 'Tövisfarkas-prém', description: 'A vadonőrök használják a tél közeledtével.', icon: '🐾', kind: 'material', rarity: 'common', price: 5 },
  { id: 'beetle_shell', name: 'Szikrapáncél', description: 'A szikrabogár meleg, aranyló kitinpáncélja.', icon: '◈', kind: 'material', rarity: 'fine', price: 7 },
  { id: 'silver_thread', name: 'Üvegfonál', description: 'Az üvegpók hálójának szinte láthatatlan, szívós rostja.', icon: '🕸', kind: 'material', rarity: 'fine', price: 9 },
  { id: 'ember_shard', name: 'Parázsszilánk', description: 'A romváros oltalmát tápláló, halványan izzó kristálytöredék.', icon: '🔶', kind: 'quest', rarity: 'rare', price: 0 },
  { id: 'ancient_coin', name: 'Régi birodalmi érme', description: 'Egy elpusztult világ pénze. A kovács szívesen megveszi.', icon: '🪙', kind: 'material', rarity: 'fine', price: 12 },
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(itemList.map(item => [item.id, item]));

export const ENEMIES: Record<string, EnemyDef> = {
  bramble_wolf: { id: 'bramble_wolf', name: 'Tövisfarkas', level: 1, hp: 28, damage: 5, armor: 0, speed: 1.7, xp: 22, gold: 4, color: 0x8c8577, kind: 'wolf', drops: [{ itemId: 'wolf_pelt', chance: 0.7 }, { itemId: 'red_potion', chance: 0.12 }] },
  spark_beetle: { id: 'spark_beetle', name: 'Szikrabogár', level: 2, hp: 37, damage: 6, armor: 1, speed: 1.1, xp: 32, gold: 6, color: 0xd69b47, kind: 'spider', drops: [{ itemId: 'beetle_shell', chance: 0.7 }, { itemId: 'forest_berries', chance: 0.25 }] },
  hollow_bandit: { id: 'hollow_bandit', name: 'Ködrabló', level: 3, hp: 49, damage: 8, armor: 2, speed: 1.5, xp: 46, gold: 12, color: 0x917365, kind: 'bandit', drops: [{ itemId: 'trail_bread', chance: 0.4 }, { itemId: 'thorn_spear', chance: 0.12 }] },
  glass_spider: { id: 'glass_spider', name: 'Üvegpók', level: 3, hp: 43, damage: 9, armor: 1, speed: 1.9, xp: 45, gold: 7, color: 0x9ecac3, kind: 'spider', drops: [{ itemId: 'silver_thread', chance: 0.75 }, { itemId: 'blue_potion', chance: 0.2 }] },
  slag_golem: { id: 'slag_golem', name: 'Salakhát', level: 4, hp: 78, damage: 10, armor: 4, speed: 0.85, xp: 72, gold: 14, color: 0x847d73, kind: 'golem', drops: [{ itemId: 'iron_ore', chance: 1 }, { itemId: 'scale_armor', chance: 0.1 }] },
  mire_stalker: { id: 'mire_stalker', name: 'Nádkarmú', level: 5, hp: 86, damage: 12, armor: 3, speed: 1.7, xp: 90, gold: 16, color: 0x718a59, kind: 'wolf', drops: [{ itemId: 'bitterleaf', chance: 0.7 }, { itemId: 'greater_potion', chance: 0.2 }] },
  ash_skeleton: { id: 'ash_skeleton', name: 'Hamuvándor', level: 6, hp: 103, damage: 14, armor: 4, speed: 1.25, xp: 115, gold: 20, color: 0xc8b6a0, kind: 'skeleton', drops: [{ itemId: 'ember_shard', chance: 0.75 }, { itemId: 'ancient_coin', chance: 0.4 }] },
  ruin_guardian: { id: 'ruin_guardian', name: 'Bazaltőr', level: 7, hp: 145, damage: 17, armor: 6, speed: 0.8, xp: 165, gold: 28, color: 0x827b95, kind: 'golem', drops: [{ itemId: 'ember_shard', chance: 1 }, { itemId: 'guardian_plate', chance: 0.15 }] },
  ember_warden: { id: 'ember_warden', name: 'Az utolsó Parázsőr', level: 8, hp: 330, damage: 21, armor: 7, speed: 1.15, xp: 450, gold: 100, color: 0xd48056, kind: 'boss', drops: [{ itemId: 'dawn_armor', chance: 1 }, { itemId: 'sunhammer', chance: 1 }] },
};

export const QUESTS: QuestDef[] = [
  { id: 'first_light', title: 'Az első ösvény', giverId: 'elder', summary: 'Mara szerint a régi erdei szentély fénye kialudt. Keresd meg, és tisztítsd meg a hozzá vezető utat a tövisfarkasoktól.', objectives: [
    { kind: 'discover', target: 'old_shrine', count: 1, label: 'Fedezd fel az erdei szentélyt' },
    { kind: 'kill', target: 'bramble_wolf', count: 3, label: 'Győzz le 3 tövisfarkast' },
  ], xp: 100, gold: 30, items: [{ itemId: 'red_potion', quantity: 2 }, { itemId: 'wood_charm', quantity: 1 }] },
  { id: 'forest_medicine', title: 'A vadon ajándéka', giverId: 'hunter', turnInId: 'healer', prerequisite: 'first_light', summary: 'A beteg menedéklakóknak keserűlevél kell. A gyógynövényeket szikrabogarak őrzik; Ila hálás lesz a tiszta levélért.', objectives: [
    { kind: 'gather', target: 'bitterleaf', count: 3, label: 'Gyűjts 3 keserűlevelet' },
    { kind: 'kill', target: 'spark_beetle', count: 3, label: 'Győzz le 3 szikrabogarat' },
  ], xp: 140, gold: 45, items: [{ itemId: 'greater_potion', quantity: 2 }, { itemId: 'smoked_meat', quantity: 2 }] },
  { id: 'echoes_of_iron', title: 'Vas a hamu alatt', giverId: 'smith', prerequisite: 'forest_medicine', summary: 'Borin a régi bányából kovácsolna új fegyvereket. Derítsd fel a Visszhang-bányát, hozz ércet, és törd meg a salakhátak őrségét.', objectives: [
    { kind: 'discover', target: 'echo_mine', count: 1, label: 'Fedezd fel a Visszhang-bányát' },
    { kind: 'gather', target: 'iron_ore', count: 4, label: 'Gyűjts 4 vasércet' },
    { kind: 'kill', target: 'slag_golem', count: 2, label: 'Győzz le 2 salakhátat' },
  ], xp: 220, gold: 75, items: [{ itemId: 'embersteel_blade', quantity: 1 }, { itemId: 'blue_potion', quantity: 2 }] },
  { id: 'silent_reeds', title: 'A nádvidék csendje', giverId: 'healer', prerequisite: 'echoes_of_iron', summary: 'Ila egy lápi őrtűzről hallott. Keresd fel a Nádfény-tábort, és szabadítsd meg környékét a nádkarmúaktól.', objectives: [
    { kind: 'discover', target: 'reed_camp', count: 1, label: 'Találd meg a Nádfény-tábort' },
    { kind: 'kill', target: 'mire_stalker', count: 3, label: 'Győzz le 3 nádkarmút' },
  ], xp: 280, gold: 90, items: [{ itemId: 'frost_charm', quantity: 1 }, { itemId: 'moon_elixir', quantity: 2 }] },
  { id: 'gate_of_ashes', title: 'A hamuváros kapuja', giverId: 'hunter', prerequisite: 'silent_reeds', summary: 'A keleti romokban még járnak a régi város lakói. Nézz át az Elmerült kapun, és csendesítsd el a hamuvándorokat.', objectives: [
    { kind: 'discover', target: 'sunken_gate', count: 1, label: 'Fedezd fel az Elmerült kaput' },
    { kind: 'kill', target: 'ash_skeleton', count: 3, label: 'Győzz le 3 hamuvándort' },
  ], xp: 360, gold: 120, items: [{ itemId: 'guardian_plate', quantity: 1 }, { itemId: 'frost_staff', quantity: 1 }] },
  { id: 'broken_seal', title: 'A megtört pecsét', giverId: 'elder', prerequisite: 'gate_of_ashes', summary: 'A romváros kristályőrei a végső kaput védik. Három parázsszilánk és a bazaltőrök elcsendesítése nélkül nincs új hajnal.', objectives: [
    { kind: 'gather', target: 'ember_shard', count: 3, label: 'Szerezz 3 parázsszilánkot' },
    { kind: 'kill', target: 'ruin_guardian', count: 2, label: 'Győzz le 2 bazaltőrt' },
  ], xp: 420, gold: 170, items: [{ itemId: 'moon_bow', quantity: 1 }, { itemId: 'greater_potion', quantity: 3 }] },
  { id: 'a_new_dawn', title: 'A menedék hajnala', giverId: 'elder', prerequisite: 'broken_seal', summary: 'Az utolsó Parázsőr nem tudja, hogy az általa őrzött világ már véget ért. Győzd le, hogy a menedék lakói új életet kezdhessenek.', objectives: [
    { kind: 'kill', target: 'ember_warden', count: 1, label: 'Győzd le az utolsó Parázsőrt' },
  ], xp: 650, gold: 240, items: [{ itemId: 'dawn_seal', quantity: 1 }] },
];
