# Technikai és látványtechnikai javaslat

Ez egy saját, egyjátékos fantasy RPG megvalósítási terve. A javasolt technológia, világméret, képletek, szektorbeosztás és fejlesztési szakaszok saját tervezési döntések. A tervben a felfedezés, a karakter hosszú fejlődése, a ritka tárgyak, az expedíció előkészítése és az előre átgondolt cselekvések súlya a cél. A TF forrásból ismert elemeit a kutatási napló tartalmazza.

## Ajánlott irány

**Phaser 3 + TypeScript + Vite, 2D, enyhén döntött felülnézetű világ, mozgó és animált szereplőkkel.** A felhasználó böngészőben, játékprogram telepítése nélkül szeretne játszani, ezért ez a végső motorajánlás. A mozgás közvetlenül irányítható; a harc kezdetben szüneteltethető, időegységekre bontható rendszert kapjon. Így a látvány eleven, de marad idő a TF-szerű felszerelési, varázslási és erőforrás-döntésekre. A végleges harci ritmust egy rövid, játszható próba után érdemes rögzíteni.

A megjelenítés alapja lehet festett vagy részletes rajzolt talaj, szikla, fa és épület, 2D karakteranimáció, fény és köd. Ettől a játék térbeliséget kap anélkül, hogy minden szereplőből és tárgyból riggelt 3D modellt kellene előállítani. A világlogika saját, síkbeli koordinátákat használjon, és ne függjön a kamera vetítésétől.

Az izometrikus kép a későbbi látványpróba második jelöltje. Ha a felülnézet túl lapos, először ugyanazt a kis területet kétféle grafikával kell összevetni. Ez nem a motor cseréjét, hanem megjelenítési és pályatervezési többletmunkát jelent.

## A három látványirány összehasonlítása

| Irány | Látvány és használat | Tartalomkészítés | Technikai munka | Értékelés ehhez a projekthez |
|---|---|---|---|---|
| 2D felülnézet, enyhén döntött grafika | Jól olvasható mozgás, ellenfél és zsákmány; nagy táj és sötét hangulat is lehetséges | Egy egységes talaj- és tárgyatlasz; szereplőnként néhány irányú animáció; a változatok újrahasználhatók | Egyszerűbb ütközés, kamera, útkeresés és takarás | Ajánlott első megvalósítás: a világ tartalmára és a szabályokra jut több munka |
| 2.5D izometrikus, 2D képekkel | Közelebb áll a klasszikus izometrikus RPG-k látványához | Több irányból rajzolt szereplők; épületek és falak külön takarási rétegei; a magasságkülönbségekhez külön grafika | Lábpont szerinti rajzolási sorrend, takarás, vetítési átszámítás, összetettebb pályaszerkesztés | Jó második jelölt, ha a kis látványpróba igazolja a plusz költséget |
| Valódi 3D, rögzített izometrikus kamerával | Térbeli világ, természetes fény, forgatható kamerával több nézet | Modellek, UV, textúrák, rig, animáció, felszerelések illesztése és optimalizálása; a modellek több nézetben újrahasználhatók | 3D ütközés és navigáció, fény, árnyék, GPU-erőforrások és nagyobb exportok | Későbbi önálló döntés. A világ első változatához túl nagy kiegészítő feladat |

A nagy világot nem a 3D teszi naggyá. A térkép kapcsolatai, a változatos helyszínek, a mozgást befolyásoló veszélyek, a történetek és a karakterépítés mélysége adják a játékidőt. A több négyzetkilométeres, de egyforma táj önmagában kevés.

## Böngészős Phaser/TypeScript vagy Godot

| Szempont | Godot 4 + GDScript | Phaser + TypeScript + Vite |
|---|---|---|
| Elsődleges cél | Önálló, offline egyjátékos RPG, webes próbaverzió lehetőségével | Azonnal böngészőben indítható 2D RPG |
| Pálya és jelenet | Beépített vizuális szerkesztő, 2D csempés pálya, jelenetek, animáció, UI és hang | Erős webes 2D keretrendszer; pályaszerkesztéshez külön eszköz, például Tiled; több saját infrastruktúra |
| 2D és 3D | 2D-re jó; egy későbbi 3D próbához is ugyanaz a motor használható, de a grafika és a jelenet újratervezendő | 2D-re jó; valódi 3D másik motorra épülő munkát igényelne |
| Fejlesztés a felhőben | Headless import és szabálytesztek; exporthoz pontosan megfelelő export template kell; a látványhoz külön futtatás szükséges | Node, csomagtelepítés, fejlesztői szerver, böngészős előnézet és teszt kényelmes |
| Mentés | Asztali változatban fájlba, a Godot `user://` útvonala alá; weben a böngésző tárolási korlátai érvényesek | IndexedDB, rendszeres tranzakciós mentés és kézi mentésexport |
| Szabályteszt | Motor nélküli szolgáltatások vagy headless GDScript tesztfuttató | Vitest a DOM-tól független TypeScript szabályokra |
| Felület | RPG-felület jól szervezhető jelenetekkel | HTML felület külön rétegként, vagy Phaser UI; az inputfókuszt és az életciklust egységesen kezelni kell |
| Ajánlás | Másodlagos lehetőség, ha később önálló asztali játék is szükséges | **Első választás a kért, telepítés nélküli böngészős játékhoz** |

A böngészős játék statikus buildként kiszolgálható; az első változathoz nem kell online játékszerver, adatbázisszolgáltatás vagy felhasználói regisztráció. A kód és az eszközök egyszer betöltődnek, a világ és a mentés a böngészőben működik. A játék telepítése nem követelmény. Internet nélküli újrainduláshoz később service worker és cache, opcionálisan PWA-támogatás kell; a PWA telepítése sem lehet kötelező. React nem szükséges a játékhurokhoz; legfeljebb egy későbbi menüréteg lehet külön UI-technológián.

## A játék rétegei

A szabálymotor kezelje a karakterértékeket, költségeket, sebzést, hatásokat, fejlődést, zsákmányt és véletlent. A világmodell kezelje a szektorokat, időt, felfedezettséget, szereplőket, helyszíneket és a játékos döntéseinek következményeit. A megjelenítés az állapotból rajzoljon, az irányítás pedig szándékokat küldjön a szabálymotornak: például „mozogj ide”, „használd ezt a képességet”, „vedd fel ezt a tárgyat”.

Ez a felosztás azért fontos, mert a harci matematika és a mentés kipróbálható a karakteranimáció vagy grafikus ablak nélkül. A felülnézet és az izometria ugyanazt a világmodellt használhatja. A sérülést például ne egy animáció adott képkockája számolja ki; az animáció a szabályok által elfogadott találatot jelenítse meg.

Javasolt modulok:

- karakter, tulajdonságok, képességek és felszerelés;
- harc, hatások, cselekvési idő és erőforrásköltség;
- zsákmány, tárgysablonok, ritkaságok és tárgyváltozatok;
- világ, szektorok, útkeresés és felfedezés;
- helyszínek, küldetések, párbeszédek, frakciók;
- mentés, betöltés, sémafrissítés és visszaállítás;
- képernyők, irányítás, hang, kamera és megjelenítés.

## Adatvezérelt tartalom

A lények, tárgyak, képességek, helyszínek, zsákmánytáblák és receptjeik stabil azonosítóval, külön tartalomfájlokban szerepeljenek. A motor kódja értelmezze a szabályokat; egy új kardhoz vagy erdei ellenfélhez ne kelljen új jelenetlogikát írni. A formátum legyen a szerkesztő és a build számára is egyértelműen ellenőrizhető.

Az első technológiai döntéshez TypeScript-típusok és futásidejű sémával ellenőrzött JSON tartalomfájlok illenek. Godot esetén típusos Resource is lehetséges, de az első változat ezt nem igényli.

A tartalomellenőrzés utasítsa el a hibás azonosítóhivatkozást, a negatív súlyt, a hiányzó grafikát, az elérhetetlen küldetéslépést, a nem létező képességet és az ellentmondó előfeltételeket. A ritkaság, ellenségszint, készségbónusz és régióveszély adatok legyenek. Az eredeti TF-ből ellenőrzött információ kapjon forrásjelölést a tervezési dokumentációban; a saját szabály kapjon külön jelölést.

A térképhez kézzel szerkesztett települések, történeti pontok és útvonalak kellenek. A procedurális rendszer ezek közét töltheti ki erdővel, romokkal, táborokkal és erőforrásokkal, területenként eltérő szabályokkal. A világhoz tartozó seed és a generátor verziója rögzüljön a mentésben; a felkeresett terület alapadatait is érdemes tartósan tárolni, hogy egy generátorfrissítés ne változtassa meg a már bejárt tájat.

## Nagy világ, szektoronként betöltve

Kezdő mérési paraméter lehet egy **64 × 64 csempés szektor**, és a karakter körül legfeljebb **3 × 3 aktív szektor**. Ez kezdeti méréshez használt érték, nem a kész játék végleges műszaki korlátja. A belső termek és kazamaták külön területek lehetnek.

- A szomszédos terület betöltése még a határhoz érés előtt induljon. Az előkészített adat, grafika és navigáció csak készen kerüljön az aktív világba.
- A távoli területen ne fusson minden lény mesterséges intelligenciája képkockánként. Ott a világidő és néhány összesített esemény határozza meg például a növények újranövését és a kereskedő készletét.
- A térképet, ütközést, navigációt és mentett változásokat ugyanazok a szektorazonosítók kapcsolják össze.
- A tartós változások a felvett tárgyat, kinyitott ládát, legyőzött egyedi ellenfelet és küldetésállapotot rögzítsék. A szándékosan újratermelődő tartalom külön időszabályt kapjon.
- A világtérkép egy egyszerűsített régiógráfot használjon az egész világ fizikai betöltése nélkül.
- A betöltéskor minden létrejövő karakter csak egyszer aktiválódjon; szektorhatáron ugyanaz az ellenfél ne duplázódjon.

A régió veszélye legyen érthető és helyhez kötött. A játékos szintlépése miatt a korábban könnyű erdei patkány ne váljon automatikusan ugyanakkora fenyegetéssé. Az új, távolabbi vidékek erősebb lényeket adhatnak, és bizonyos események alkalmazkodhatnak egy szűk szinttartományban. Ez egyszerre engedi megélni a fejlődést és biztosítja a folytatódó kihívást; ez saját designjavaslat.

## Böngészős képi költség és determinisztikus szimuláció

A Phaser WebGL renderer a javasolt alap. A térkép ne egyetlen óriási képfájl legyen: csempés atlaszok és szektoronként aktivált díszletek kellenek. Az atlaszba rendezés csökkenti a textúraváltásokat; a képernyőn kívüli elemeket ki kell hagyni a rajzolásból, az élő ellenfelek és partikulák száma pedig legyen korlátos. Egy 4096 × 4096 képpontos, tömörítetlen RGBA textúra körülbelül 64 MiB GPU-memóriát foglal, ezért az összes grafika egyszerre betöltése még 2D-ben sem jó terv.

A karakter és a fa rajzolási sorrendjét a földön álló lábpont Y-koordinátája határozza meg; azonos értéknél stabil entitásazonosító dönt. A tető, lomb és magas fal a játékos takarásakor átlátszóvá tehető. Az ütközéshez külön, a lábak és terep tényleges helyét leíró alakzat kell: a sprite teljes téglalapja nem helyes ütközési forma. A statikus talaj rétege nem igényel minden képkockában újrarendezést.

A megjelenítés célozhat 60 képkockát másodpercenként az egyeztetett asztali célgépen; ez mérési cél, nem minden eszközre tett ígéret. Külön kell mérni a szabályszimuláció, szektorépítés, rajzolási hívások és GPU-memória költségét. A túl magas eszközpixelarány, sok átlátszó réteg és fényhatás drága lehet. A grafikai beállítás csökkenthesse a részecskéket, árnyékszerű effektusokat és felbontási szorzót. A WebGL kontextus elvesztése után az utolsó stabil mentésből, ellenőrzött újratöltéssel lehessen visszatérni.

A játéklogika független legyen a rajzolás képkockaszámától. A mozgás és időzített események fix időlépést, a harci döntések pedig jól definiált akcióazonosítót és sorrendet kapjanak. A fontos szabályértékek lehetőleg egész számokkal vagy rögzített skálán működjenek; a grafikai interpoláció használhat lebegőpontos értékeket. A tab elrejtésekor az egyjátékos világ álljon meg, így visszatéréskor nem fut le perceknyi váratlan éhség vagy harc.

Világgeneráláshoz, harchoz és zsákmányhoz külön, seedelt véletlenfolyam ajánlott. Egy szektor létrehozása ne változtassa meg a következő csata dobásait; díszítő részecskék pedig soha ne fogyasszák a zsákmány RNG-jét. A teszt rögzített seedből és parancssorozatból reprodukálható állapotsort kapjon. A mentés a véletlenfolyamok állapotát is rögzítse. Az elv a hibák reprodukálását segíti; egyetlen helyi játékosnak nincs szüksége online csalásvédelemre.

## Mentés és visszatérés

**Az első változat mentése IndexedDB-ben működjön**, verziózott adatokkal és egyetlen sikeres tranzakcióban végrehajtott állapotcserével. Maradjon előző mentéspéldány, és legyen külön JSON-fájlba letölthető export, valamint fájlból import. A nagy mentést ne a szinkron `localStorage` tárolja.

A mentés tartalmazza a séma és szabályváltozatot, a világ seedjét, a világidőt, az aktív karaktert, a tényleges tárgypéldányokat, a tanult képességeket, a küldetés- és frakcióállapotot, a felfedezett területeket és a szektorok tartós változásait. A véletlenfolyamat állapotát is tároljuk, hogy egy betöltés ne adjon új ritka zsákmányt ugyanarra az el nem döntött cselekvésre.

Asztali változatban a mentés először ideiglenes fájlba kerüljön, ellenőrzés után váltsa az aktív fájlt; maradjon előző biztonsági példány. Legyen több mentési hely, automatikus mentés, külön kézi mentés és exportálás/importálás. A betöltés ellenőrizze a sémát és a tartalmi hivatkozásokat, a régi séma pedig ellenőrzött migrációval alakuljon az újra. A régi fájlt sikeres migráció előtt ne írjuk felül.

A böngészős tároló törölhető vagy elveszhet profilváltáskor. A mentés a webcím originjéhez kötődik: másik domainre vagy portra költözéskor export/import szükséges lehet. Privát böngészésnél vagy tárhelykorlát esetén a hibát érthetően jelezni kell, és a kézi export legyen továbbra is elérhető. Ezért a kézi mentésletöltés alapfunkció, és nem elég csupán a böngésző tárolójára építeni. Külső felhőmentés későbbi bővítés, nem előfeltétel.

## Mit tud a jelenlegi felhőgép

A `/workspace/tulelo` tárolóban elkészült az első játszható Phaser/TypeScript alkalmazás. A gépen ellenőriztük a Node **24.19.0** és npm **11.9.0** verziót. A függőségek pontos verzióját a `package.json` és a `package-lock.json` rögzíti; Phaser **3.90.0** az alkalmazás alapja.

**A tényleges ellenőrzés Node-alapú szabálytesztből, TypeScript-ellenőrzésből, Vite buildből és külön böngészős próbából áll.** A szabálymotor 10 tesztje és a valódi Chromium 13 ellenőrzéses folyamata sikeres. A build statikus weboldalt és önálló, a képeket és a programot tartalmazó HTML-fájlt is készít. Az aktuális futtatási parancsok a [README-ben](../README.md) szerepelnek.

A Godot headless futtatás, amennyiben később ezt az alternatívát választjuk, a játék matematikáját, importálhatóságát és állapotkezelését teszteli. A headless driver nem igazolja a tényleges képet, fényt, hangot, teljesítményt vagy kezelhetőséget. Ehhez tényleges böngészős futtatás, Godot alternatíva esetén webes export vagy grafikus asztali futtatás szükséges. A valós célgépen megmért teljesítmény a mérvadó; az editor indulása nem készjáték-teszt.

A Phaser/TypeScript/Vite csomagverzióit lockfile rögzíti, és az ismételt telepítést `npm ci` paranccsal is ellenőriztük. A későbbi, opcionális Godot útnál a motort és export template-et azonos verzióra kell rögzíteni, megbízható forrásból beszerezni és az eredeti ellenőrzést megtartani. A jelenlegi játékhoz Godot nem szükséges.

## Rétegezett megvalósítás és valódi ellenőrzés

### 1. Szabály- és tartalomterv

A kutatásból álljon össze a forrásolt TF-összefoglaló és a saját szabályok jegyzéke. Rögzítsük a karakteralkotást, fejlődést, harc időmodelljét, tárgyrendszert, felfedezést és mentésformátumot. Készüljön egy karakter, három ellenfél és néhány felszerelés számszerű mintája; ezekből szimuláljuk a találati és sebzési eloszlást, valamint a várható fejlődést. Ez még nem a teljes szabálykészlet lemásolása.

**Kilépési feltétel:** a tervezett döntések és képletek érthetők, a nullával osztás és korlátlan erőforráshurok kizárható, a mintacsaták többféle karakterrel értelmes eredményt adnak.

### 2. Rövid látvány- és irányításpróba

Egy kis erdei pálya, egy mozgó karakter, néhány fa és szikla, fény, kamera, tooltip és egy egyszerű ellenfél. Legyen egy felülnézeti és szükség esetén egy izometrikus képi összevetés. A képterv önmagában nem bizonyítja az animáció és kezelés használhatóságát.

**Kilépési feltétel:** a karakter útvonala és a veszély jól látható; a takarás, kattintás vagy billentyűmozgás működik; a célgépen elfogadható a képkockaidő.

### 3. Egy teljes, kis léptékű játékciklus

Karakteralkotás, biztonságos település, erdő, egy kazamata, felszerelés, fejlődés, pihenés, néhány küldetés és mentés. A karakter ténylegesen elhagyja a települést, kockázatot vállal, zsákmányt hoz vissza, fejlődik, és visszatérhet a korábban mentett állapothoz. Ez a próbarész a hosszú játék alapjait ellenőrzi; a tényleges játékidejét játéktesztben mérjük meg.

**Kilépési feltétel:** a teljes ciklus végigjátszható; a mentés betöltés után azonos állapotot ad; nincs tárgyduplázás, eltűnő karakter vagy megismétlődő egyszeri jutalom. A többórás fejlesztési cél nem azonos egy kör alatt elkészülő tartalomígérettel.

### 4. Világalap és tartalomszerkesztés

Szektorbetöltés, világ seed, régiók, térkép, tartalmi séma és ellenőrző eszköz. Néhány egymáshoz kapcsolt régió igazolja a távolság, ellátmány, útvonalválasztás és visszatérés értelmét. A régiók bővítése ekkor már többnyire tartalomszerkesztés legyen.

**Kilépési feltétel:** hosszú út alatt korlátos a memória; a szektorhatár nem állítja meg érzékelhetően a játékot; mentés után megmaradnak a felfedezés és a világ változásai; egy új régió hozzáadható alapkódmódosítás nélkül.

### 5. Hosszú játék és egyensúly

Több táj, lénycsalád, tárgykészlet, képességág, frakció és történet. A kész világ méretét a működő első régió tartalomköltségéből tervezzük újra. A karakterút, ritka tárgyak, zsákmánygazdaság és harci arányok szimulációja támogassa a hosszú tesztjátékot, de ne helyettesítse azt.

**Kilépési feltétel:** több eltérő karakterépítés életképes; a tartalom órák elteltével is új döntéseket ad; az új területek, tárgyak és képességek túlmutatnak a korábbiak átnevezésén.

### 6. Tartós játékkiadás

Visszafelé kompatibilis mentés, javítható sérült mentés, több automatikus biztonsági pont, grafikai és hangbeállítások, billentyűkiosztás és olvasható felület. A böngészőre valódi production build, tiszta böngészőprofilban megnyitás, mentésvisszatöltés és régi mentések próbája szükséges. Internet nélküli újraindítást az opcionális offline támogatás után ellenőrizzünk.

**Kilépési feltétel:** a játék külön gép böngészőjében, telepítés nélkül elindul, menthető és visszaállítható, és a frissítés nem veszti el a már kialakított karaktert.

## Fontos tesztek

- Harci képletek szélsőértékei, találati és sebzési valószínűségek, készségköltségek és ideiglenes hatások lejárata.
- Véletlentáblák eloszlásai és garantált jutalmak; a ritka tárgy valószínűségét sok mintából, megadott toleranciával kell vizsgálni.
- Ugyanaz a seed és parancssorozat ugyanazt a szabályállapotot adja, ahol szándékosan determinisztikus a rendszer.
- Mentés–betöltés körbefordítás, korábbi séma migrációja, félbeszakadt írás, hiányzó tartalmi azonosító.
- Útkeresés, szektorhatáron átlépés, ki- és betöltött láda/ellenfél, egyszeri jutalom és időalapú újratermelődés.
- Képesség- és felszereléskombinációk szimulációja; ne a véletlenül jóként megmaradt egyetlen build legyen a játék alapja.
- Külön grafikus játékpróba a kamera, képernyőszél, kis és nagy felbontás, egérfókusz, tárgymozgatás és olvashatóság ellenőrzésére.

A fejetlen felhőteszt és a valódi játékpróba egymást egészítik ki. A tervezésből először egy kis, teljes rendszert kell megépíteni, majd az igazolt alapra bővíteni a világot.
