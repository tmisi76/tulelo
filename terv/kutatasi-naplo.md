# Túlélők Földje — forráskutatási napló

Dátum: 2026. október 10. Állapot: a feltöltött Wikipédia-szöveg feldolgozva; az elsődleges szabályok kutatása hozzáférésre vár.

## Amit jelenleg tudunk

A megrendelő a régi, levélben beküldött parancsokra épülő Túlélők Földje élményét szeretné modern, személyes használatú fantasy RPG-ben újragondolni. A kért változat böngészőben, telepítés nélkül játszható. A feltöltött Wikipédia-szöveg a történeti működés több lényeges elemét alátámasztja; a korabeli részletes szabályok és képletek még nincsenek ellenőrizve.

A `tmisi76/tulelo` Git-tároló elérhető. A kezdeti ellenőrzéskor üres volt: nem tartalmazott commitot, távoli ágat vagy projektfájlt. A tervezés után a megrendelő kérésére elkészült az első játszható alkalmazás is; részletei és a kipróbálás a [README-ben](../README.md) szerepelnek. A szabályok egyelőre saját implementációk, nem ellenőrzött TF-képletek.

## Források és hozzáférés

| Azonosító | Forrás | Mire használjuk majd? | Ellenőrzési állapot |
|---|---|---|---|
| TF-S01 | [Magyar Wikipédia: Túlélők Földje](https://hu.wikipedia.org/wiki/T%C3%BAl%C3%A9l%C5%91k_F%C3%B6ldje) | Történeti áttekintés és további hivatkozások | A felhasználó feltöltött szövegét elolvastuk; az élő oldal HTTPS-kérése 403 Forbidden választ adott |
| TF-S02 | [Beholder: a felhasználó által megadott TF-oldal](https://www.beholder.hu/?m=tf&cikk=1) | Elsődleges szabályokhoz és játékismertetőhöz vezető hivatkozások | HTTPS-kérés: a proxy 403 Forbidden választ adott; a lap tartalmát nem olvastuk |

A környezet konfigurációtervezetébe elmentett hálózati kiegészítés: `hu.wikipedia.org`, `www.beholder.hu`, `beholder.hu`. A mentés visszaigazolt; a környezetbe való alkalmazás és közzététel még nem igazolt. Más hálózati beállítást, titkot vagy környezeti változót nem változtattunk meg.

TF-S01 megőrzött helyi forrása: [a felhasználó feltöltött Wikipédia-szövege](forrasok/wikipedia-feltoltott.txt). A forrás megadja a szócikk címét, a Wikipédia eredetét és a Creative Commons Nevezd meg! – Így add tovább! 4.0 licencet. A feltöltött szöveg szerint a szócikk utolsó módosítása 2025. július 17. A benne szereplő, e-mailes működésre és böngészős újraírásra vonatkozó helyzetleírás 2014-re utal; ebből a TF mai elérhetősége nem állapítható meg.

## A feltöltött szövegből alátámasztott elemek

- A játékot Tihor Miklós alkotta meg, és 1992-ben indult. A játékterv szempontjából lényeges háttér a világégés után fennmaradt, szörnyekkel teli félsziget és a felfedezés.
- A karakteralkotásnál faj, nem, kinézet és név volt választható. A technikai tulajdonságokat a számítógép faji adottságok figyelembevételével véletlenszerűen generálta; a szöveg példaként erőt és ügyességet említ.
- A történeti postai működésben kilencnapos fordulókban, korlátozott utasításszámmal és pontkerettel lehetett cselekvéssorozatot beadni. A kilenc nap adminisztrációs sajátosság volt; a mai játékban nem szükséges várakozási időként átvenni.
- A visszaküldött eredmény szöveges kaland- és csataleírást, grafikus térképet, karakterlapot és tárgylistát tartalmazott. Ez adja a modern expedíciós napló ötletének forrását.
- A szörnytalálkozások véletlenszerűek lehettek. A harc eredményét többek között erő, fegyverzet és páncélzat befolyásolta. Pontos számítás nem szerepel a szövegben.
- A felsorolt fajok: ember, elf, törpe, árnymanó, troll, gnóm, alakváltó, kobudera és mutáns. A leírás minőségi adottságokat ad; számszerű faji bónuszt nem.
- Az istenválasztás és a közös célú „Közös tudatok” szerepelnek a leírásban. A modern egyjátékos játékban a frakciókat, követőket és NPC-céheket saját rendszerként kell megtervezni.
- A világ helynevei között Ghalla, Erdauin és Yaurr szerepelnek. A szöveg 700 000 négyzetmérföldes történeti világméretet említ; ez nem technikai térképfelosztás vagy megvalósítandó pixelméret.
- A képességhez kötött felfedezés példája a veszélyes csatorna: a történeti leírás szerint úszástudás nélkül nem lehetett átkelni.
- A sajátos, humoros szörnynevek a játék jellegzetességei. A teljes szörnyadatbázis és annak értékei a feltöltött szövegben nincsenek meg.

A feltöltött szöveg nem tartalmaz pontos harci képletet, tulajdonság-/fegyvertáblát, fejlődési görbét, akciópontköltséget, parancsszintaxist, zsákmányesélyt vagy részletes gazdasági szabályt.

## Kutatási feladatlista

Az oldalakat elérve először az elsődleges szabálykönyvet, a parancsleírásokat és a példafordulókat kell összegyűjteni. A későbbi változtatások dátumát és szabályverzióját külön rögzítjük. A játékosi leírások kiegészítő források; bizonytalan tapasztalati állításból nem készül hitelesnek nevezett képlet.

| Terület | Keresendő konkrét információ | Állapot |
|---|---|---|
| Karakteralkotás | Fajok, induló tulajdonságok, elosztható pontok, háttérválasztás | A fajlista és a véletlen generálás elve ismert; a számszerű szabályok ellenőrizendők |
| Tulajdonságok | Pontos nevek; erő, ügyesség, életerő, bölcsesség és más értékek szerepe | Ellenőrizendő |
| Forduló és mozgás | Parancsok, akció-/időköltségek, térképrács, terep, látótáv | A korlátos utasítássor ismert; a részletes szabályok ellenőrizendők |
| Harc | Kezdeményezés, találati esély, sebzés, páncél, ellenállás, menekülés | Ellenőrizendő |
| Fejlődés | XP, szintlépés, használattal fejlődő jártasságok, tanulás | Ellenőrizendő |
| Mágia | Iskolák, varázslatok, költségek, célzás, megszakítás, komponensek | Ellenőrizendő |
| Tárgyak | Fegyver-/páncéltáblák, követelmények, tárgyhatások, javítás | Ellenőrizendő |
| Zsákmány | Találkozási és tárgyszerzési táblák, ritkaság, keresés, gyűjtés | Ellenőrizendő |
| Túlélés | Élelem, pihenés, teherbírás, állapotok, halál következményei | Ellenőrizendő |
| Világ | Régiók, települések, veszélyszintek, útvonalak, küldetések | A háttér és néhány helynév ismert; a térkép és tartalom ellenőrizendő |
| Társadalmi rendszerek | Istenek, céhek, frakciók, kereskedelem; egyjátékos megfelelőjük | Ellenőrizendő |

## A szabályok eredetének nyilvántartása

Minden később beemelt szabályhoz legyen forrásazonosító, URL, szabályverzió/dátum, az ellenőrzést lehetővé tevő szakaszcím, valamint egy eredetjelölés:

- **Ellenőrzött TF-szabály:** a nyilvános forrás kifejezetten leírja.
- **TF-alapú átalakítás:** a forrásból ismert elvet a mai, egyjátékos működéshez módosítottuk; a módosítást leírjuk.
- **Saját javaslat:** a mostani játékhoz tervezett rendszer, később tesztelendő értékekkel.
- **Nyitott kérdés:** a szükséges adat még nincs ellenőrizve.

Ismeretlen szerveroldali képleteket, teljes tárgyadatbázist vagy a találkozások rejtett valószínűségeit nem szabad kitalált adatokkal eredetiként pótolni. Ha a nyilvános leírás nem tartalmazza őket, saját, jelölt és tesztelhető változatot készítünk.

## Következő ellenőrzés

A hálózati változtatás alkalmazása után újra le kell kérni TF-S01 és TF-S02 tartalmát, és követni kell az elsődleges szabályokra, utasításlapra, mintafordulóra és adatbázisokra vezető hivatkozásokat. A feltöltött TF-S01 alapján történeti összefoglaló már készíthető. A részletes kutatási eredményt a `jatekterv.md` saját rendszereivel összevetve kell dönteni a megtartott, átalakított és külön kezelt elemekről.
