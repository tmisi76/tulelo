# Túlélő — Az utolsó menedék

Magyar, egyjátékos, böngészős fantasy RPG a Túlélők Földje levelezős játékának ihletésére. A jelenlegi változat az első teljes expedíció: karakteralkotás, bejárható világ, működő harc, küldetések, felszerelés, fejlődés és mentés.

## Kipróbálás telepítés nélkül

A `kiadas/tulelo-jatek.html` egy önálló játékfájl. Töltsd le, és nyisd meg Chrome, Edge vagy Firefox böngészőben. A grafika és a program benne van; nem kell Node, játékprogram-telepítés vagy szerver. A mentés ebben a böngészőben tárolódik. A menüben a mentést JSON-fájlként le is töltheted, majd másik böngészőben betöltheted.

Ha egy böngésző nem enged helyi mentést a letöltött HTML-ben, használd a menü **Mentés letöltése** és **Mentés betöltése fájlból** funkcióit. A fejlesztői szerverről indított változat IndexedDB-mentését külön is ellenőrizzük.

## Az első kaland

Alkoss karaktert, és indulj el Újpart menedékéből. Mara a főtéren az első megbízást adja; Borin felszerelést, Ila gyógyitalokat és élelmet árul. Az erdei szentély, a Visszhang-bánya, a nádfényes tábor és Parázsvár romjai egyre veszélyesebb expedíciót kínálnak.

- 9 származás és 4 induló játékstílus; később szabadon kombinálható képességek.
- 7 összefüggő régió egy 112 × 84 csempés világban.
- 32 ellenfél, köztük a Parázsőrző; élő támadó és visszatérő ellenfelek.
- 7 küldetés, 34 tárgy, 6 fejleszthető aktív képesség.
- Felfedezési köd, nyersanyagok, ládák, kereskedők és biztonságos pihenőhelyek.
- Automatikus és kézi mentés; három megőrzött mentési állapot, export/import.

Ez saját szabályrendszerű első játékverzió. A TF pontos harci képleteinek és tárgyadatainak forráskutatása még nem teljes. A nagyobb világ, részletes crafting, további történetek és animációk a meglevő alapra építhetők.

## Irányítás

| Gomb | Művelet |
|---|---|
| WASD vagy nyilak | Mozgás |
| Bal kattintás | Útvonal kijelölése; ellenfél kijelölése és megközelítése |
| F | Alaptámadás |
| E | Beszélgetés, gyűjtés, láda, tábor |
| 1–6 | Megtanult aktív képességek |
| Szóköz | Taktikai szünet / folytatás |
| I vagy B | Felszerelés és fogyóeszközök |
| C | Tulajdonságok és képességek fejlesztése |
| J | Küldetések és kalandnapló |
| M | Felfedezett világ térképe |
| Esc | Ablak bezárása / menü |

Szintlépés után oszd el a pontjaidat a C ablakban. Új felszerelést a táskában kell felszerelni. A távolabbi vidék veszélyesebb; pihenj a menedékben vagy a táborban, és vigyél gyógyitalt.

## Fejlesztés

Node 24 és npm szükséges. Használd a meglévő munkapéldányt; a felhőfeladat már izolált környezetben fut, új Git-worktree nem szükséges.

```sh
npm ci
npm run dev
```

A fejlesztői szerver az 5173-as porton indul. A kód és a függőségek rögzített verziókkal, lockfile-ból telepíthetők.

```sh
npm run typecheck
npm test
npm run build
```

A build a `dist/` statikus weboldalt és a `kiadas/tulelo-jatek.html` önálló fájlt is létrehozza. A böngészős regresszió a futó fejlesztői szervert ellenőrzi:

```sh
npm run test:browser
npm run test:standalone
```

A teszt rendszer-Chromiumot használ; alapértelmezett útvonala `/usr/bin/chromium`. Más gépen `TULELO_CHROMIUM_PATH` változóval megadható a böngésző elérési útja. A tesztcél `TULELO_TEST_URL` változóval módosítható.

A `test:standalone` az elkészült HTML-fájlt szerver és hálózat nélkül nyitja meg, és a grafika betöltését, a mozgást, egy küldetés felvételét, valamint a mentés letöltését és visszatöltését ellenőrzi. Előtte `npm run build` szükséges.

A felhőkörnyezet kezelt Chromium böngészője tiltja a `file://` címeket. Itt `TULELO_STANDALONE_HTTP=1 npm run test:standalone` használható: a teszt csak az egyetlen HTML-dokumentumot szolgálja ki, majd a játék közben lekapcsolja a hálózatot. Ezt a változatot ellenőriztük; a közvetlen helyi fájlmegnyitást ebben a környezetben nem lehetett tesztelni.

A tervek és a forráskutatási napló a [terv](terv/jatekterv.md) könyvtárban olvashatók.
