# Saját RPG-rendszerjavaslat

Ez az anyag eredeti tervezési javaslat. **Nem a Túlélők Földje ellenőrzött szabályainak leírása**, és az itt szereplő képletek nem annak visszafejtett matematikái. A számok prototípusban tesztelendő kezdőértékek. A játékidőt csak valódi tartalom és játékteszt alapján lehet megbecsülni.

## 1. Alapelv és a játszható hurok

A fő élmény a felkészülés, a felfedezés és az egyre nehezebb helyek meghódítása. A játékos karaktert alkot, felszerelkezik egy településen, útnak indul, találkozásokat old meg, zsákmányt és tudást szerez, majd biztonságos helyen fejleszti a karakterét. Az új képesség, térképinformáció vagy küldetés új útvonalat nyit.

Az expedíció nem pusztán véletlen harcok sora: legyenek titkos ösvények, veszélyjelzések, megkerülhető ellenfelek, beszélgetések, romok, visszatérő szereplők és többféleképpen megoldható helyzetek. Egy romot erővel, rúnák megfejtésével vagy kerülőúton is meg lehessen közelíteni.

**Ajánlott irányítás:** folyamatos mozgás felülnézetben vagy 2,5D izometrikus megjelenítéssel; harcban aktív szünet, amikor célpontot, képességet és következő mozdulatot lehet megadni. A háttérszimuláció rögzített, például 0,1 másodperces lépésekben számoljon. Szünetben és menükben nem telik játékidő. A megjelenítés részletességétől függetlenül működjön a teljes szabályrendszer.

Egy későbbi körökre osztott mód ugyanazokat az akciókat használhatja, de ezt nem kell az első változatban két külön harcrendszerként megépíteni.

A levelezős játék hangulatát egy **opcionális expedíciós parancstervező** őrizheti: a térképen kiválasztott lépések, helyvizsgálat és készülő képesség egy rövid listába kerülnek, majd végrehajtáskor olvasható kalandnapló készül. A terv veszélynél megáll és visszaadja az irányítást. Ez saját modern javaslat; nem az eredeti forduló- vagy pontszabályok reprodukciója. A normál játékhoz nem kell parancsszöveget gépelni.

## 2. Karakteralkotás és fejlődés

Hat tulajdonság: **Erő, Ügyesség, Állóképesség, Ész, Bölcsesség, Akarat**. Mindegyik 10-ről indul; az alkotáskor 8 pont osztható szét, legfeljebb 16-os kezdőértékig. A származás és előélet induló felszerelést, egy kis tudásbónuszt és történeti kapcsolódást adjon. Ne zárjon ki teljes fejlődési utakat.

- Erő: fizikai sebzés, teherbírás, erőpróbák.
- Ügyesség: találat, kitérés, mozgáshoz kapcsolódó próbák.
- Állóképesség: életerő, terhelhetőség, méregellenállás.
- Ész: mana, varázslat tanulása, rúnák és tárgyak azonosítása.
- Bölcsesség: észlelés, természetismeret, mágikus védelem és bizonyos gyógyító képességek.
- Akarat: félelem és mentális hatások elleni védelem, koncentráció.

Saját, ellenőrizhető induló képletek, ahol `L` a karakterszint:

```text
MaxHP   = 80 + 12 × (L − 1) + 5 × (Állóképesség − 10)
MaxMana = 40 +  4 × (L − 1) + 4 × (Ész − 10)
MaxÁllóképességErőforrás = 60 + 3 × (Állóképesség − 10) + 2 × (Ügyesség − 10)
```

Például az 5. szintű, 14 Állóképességgel és 12 Ésszel rendelkező karakternek 148 HP-ja és 64 manája van. Az állóképesség-erőforrás külön harci készlet: kitérésre és erős támadásra fogy; nem azonos az azonos nevű tulajdonsággal. A felületen célszerű **lendületnek** nevezni.

A teljes első kiadás javasolt fejlődési kerete 1–30. szint; az első játszható szelet csak 1–5. szintet fedjen le. Szintenként 1 tulajdonságpont és 1 képességpont jár. Négy kezdeti képességág: fegyverforgatás, vadász/ügyesség, arkanikus mágia, természet/túlélés. Egy ág kezdetben 6 csomópontból állhat, legfeljebb 3 ranggal. A 29 szintlépésből szerzett képességpontok valódi választást jelentenek: nem lehet minden ágat kimaxolni.

Az első városban legyen olcsó újraelosztás, később arányos játékbeli költség. Az előélet és a történeti döntések megmaradnak, a hibás képességválasztás miatt nem kell újrakezdeni.

## 3. XP: felfedezés és veszélyvállalás

Egy induló szintgörbe:

```text
XP az L. szintről a következőre = 80 + 25L + 5L²
Azonos szintű normál ellenfél alap-XP-je = 20 + 6 × ellenfélszint
```

Példák: az 1. szintről 110 XP, a 10. szintről 830 XP, a 20. szintről 2580 XP szükséges. Az azonos szintű normál ellenfelek rendre 26, 80 és 140 XP-t adnak. A 30. szint összesen 55 970 XP-nél érhető el ezzel a görbével; ez nem játékidőígéret.

A veszélytől függő XP-szorzó az ellenfél és a játékos szintkülönbségéhez igazodjon. Kezdő táblázat: legalább 6-tal gyengébb 0,1×; 3–5-tel gyengébb 0,5×; 0–2-vel gyengébb 1×; 1–2-vel erősebb 1,15×; legalább 3-mal erősebb 1,3×. A nehéz ellenfél nem válik legyőzhetővé pusztán attól, hogy többet ér.

Egy fontos, szinthez illő küldetés 4–8 normál harc XP-jét adhatja; egy új helyszín felfedezése 1–2 harcét. A küldetésjutalom a küldetés saját nehézségéből számolódjon, ne a jutalom felvételekor lévő játékosszintből. Felfedezésért, beszélgetős megoldásért és békés küldetésmegoldásért is jár XP. Ismételt ajtónyitogatás, újra meglátogatott térkép vagy saját idézett lény megölése nem ad fejlődést.

A görbét a prototípusban kell a tényleges találkozássűrűséghez igazítani. Ha túl sok az ismételt harc, először a jutalmak és a tartalmi ritmus javítandó; a puszta magasabb szintszám nem helyettesít új élményt.

## 4. Világ és ellenfélszintek

A világ régióinak legyen saját veszélyszintjük. Például:

| Régió | Normál találkozások | Kiemelt veszély | Szerep |
|---|---:|---:|---|
| Határvidék és első falu | 1–4 | 5 | Indulás, mesterségek, első rom |
| Ködös erdő és elhagyott bánya | 4–8 | 9–10 | Mérgek, titkos ösvények, első hosszabb expedíció |
| Széttört fennsík és mocsár | 8–13 | 14–15 | Többféle ellenfélcsoport, mágikus ellenállások |
| Hegylánc és ősi város | 13–20 | 21–22 | Összetett dungeonök, ritka alapanyagok |
| Átkozott határ és mélyvilág | 20–27 | 28–30 | Végjáték történeti és harci kihívások |

Ez veszélytérkép, nem lezárt lineáris pálya. Egy régión belül legyen több útvonal és előre jelzett, erősebb terület. A játékos korábban is benézhet nehéz helyre, és később élvezheti, hogy a kezdeti farkasok már nem jelentenek problémát. **Nem igazodik automatikusan minden ellenfél a játékosszinthez.** A visszatérő banditacsapat, járőr és helyi esemény a régió előre meghatározott sávján belül változhat.

Az ellenfél ne csak szint és HP legyen: farkas bekerít, csontváz ellen a megfelelő sebzéstípus segít, íjász fedezékből támad, sámán társait támogatja. A szintkülönbség miatt ne legyen rejtett, teljes találati immunitás. Az erősebb ellenfél a sebzése, védelme és viselkedése miatt veszélyes.

A teljes változat célja 8–12 eltérő régió lehet, közös világállapottal és később hozzáadható térképrészekkel. Ez tartalmi irány, nem már elkészült vagy időben vállalt mennyiség. A teljes map ne legyen eleve kitöltött: köd, térképjelölők, megtalált ösvények, saját jegyzetek segítsék a felfedezést.

## 5. Harc: látható, ellenőrizhető szabályok

A játékos kattintással vagy billentyűkkel mozog; az alapütés, varázslat és kitérés animációja időt vesz igénybe. Az aktív szünetben kijelölt akció a folytatás után ugyanazokkal a szabályokkal hajtódik végre. Egy egyszerű kard alap akcióideje például 1,8 másodperc. A kitérés rövid sérthetetlensége csak későbbi, tesztelt opció legyen; induláskor helyváltoztatással kerülje el a telegráfozott támadást.

```text
Találati esély = clamp(0,15; 0,95; 0,80 + 0,02 × (Pontosság − Kitérés))
Normál fizikai sebzés = FegyverSebzés × [1 + 0,02 × (Erő − 10)] × 100 / (100 + Páncél)
```

A pontosság és a kitérés összehasonlítható származtatott értékek: például az Ügyesség fele lefelé kerekítve, plusz képesség- és tárgybónuszok. A páncél miatti csökkentés legfeljebb 65%; ennek megfelelően a képletben figyelembe vett páncél legfeljebb körülbelül 185,7. A további páncélbónusz ne legyen értéktelen: a magas értékek helyett az itemek más védelmet is adhatnak.

Számpélda: a 12–18-as kard átlagsebzése 15; Erő 16 esetén 16,8; a célpont 40-es páncélja ezt 12-re csökkenti. Azonos pontosság és kitérés mellett 80% a találat. 5% kritikus eséllyel és 1,5× kritikus sebzéssel a támadásonkénti várható sebzés `12 × 0,8 × 1,025 = 9,84`. Az 1,8 másodperces ütések elméleti átlagsebzése 5,47 HP/s. Egy 80 HP-s célpont körülbelül 14,6 másodperc alatt esne el; a mozgás, megszakítás, sebzéseloszlás és a visszatámadás ezt megváltoztatja.

A felszerelés összehasonlítása mutassa a várható sebzést és a valós kompromisszumokat: a nehéz páncél több védelmet, de nagyobb lendületköltséget adhat. A mágia külön ellenállásokkal működjön; a tűzellenállás, fagy és mentális védelem ne legyen ugyanaz az érték. A karakterlap mutassa a képletekből származó értékeket, a harci napló pedig a fontos eseményeket. Nincs szükség minden tizedmásodperc kiírására.

A gyógyítás manát, időt vagy fogyóeszközt kér. Harc közben a gyógyító varázslat megszakítható; a mana regenerációja nem teszi korlátlanná az azonnali gyógyítást. Nehogy egy túl olcsó gyógyítás megszüntesse a felkészülés és a visszatérés értelmét.

## 6. Felszerelés, zsákmány és crafting

A fegyvereknek külön szerepe legyen: kard kiegyensúlyozott, lándzsa nagyobb elérésű, buzogány páncélozott ellenfél ellen kedvező, íj távolsági, bot mágikus specializációhoz illik. A ritkaság és a használhatóság külön fogalom: egy jobb minőségű kard sem feltétlenül jobb egy íjász építéshez.

Induló loot-modell: egy normál, zsákmányt adó ellenfél 50% eséllyel dob egy felszerelést. A dobott felszerelés feltételes ritkasága 55% közönséges, 35% jó minőségű, 9% ritka, 1% epikus. Így az epikus felszerelés teljes esélye 0,5%, a ritkáé 4,5%. A pénz, élelem és alapanyag ettől külön dobás. Az értékeket régiónként és ellenféltípusonként kell mérni; az itemek ne jelenjenek meg értelmetlen forrásból.

Ritkaság szerint 0/1/2/3 választható affix lehet a tárgyakon, a régióhoz illő értéksávokból. Az első legyőzött jelentős főellenfél legalább egy ritka, a karakter számára használható jutalmat adjon. A kézzel tervezett egyedi tárgyak történethez, küldetéshez vagy konkrét ellenfélhez kötődjenek. Ugyanazt az egyszeri küldetésjutalmat mentés-visszatöltéssel ne lehessen megkettőzni.

A crafting ismert receptekből, konkrét anyagokkal, biztos eredménnyel induljon: főzés, alkímia, felszerelésjavítás/fejlesztés. A „javítás” kezdetben minőségfejlesztést jelentsen; általános kopási rendszer nem szükséges az első szelethez. A kovács egy adott fegyvert legfeljebb néhány fokozattal erősíthet, így kedvelt tárgy egy ideig megtartható, de nem válik végtelenül fejleszthetővé.

Az anyagokat a világ adja: érc a bányából, gyógynövény a megfelelő biomából, különleges reagensek speciális ellenfelektől. A szétbontás adjon részleges nyersanyag-visszatérítést. Egy recept ne követeljen kiszámíthatatlan ritkaságot a fő történet továbblépéséhez; az ilyen anyag opcionális, erős fejlesztéshez illik.

A készlet legyen áttekinthető: halmozódó anyagok, külön kulcstárgyak és felszerelés. A küldetéstárgyakat ne lehessen véletlenül eladni, és ne töltsék ki a normál csomagot. Az első változatban elég egy 24–30 normál férőhelyes táska; a teherbírás és bővíthető zsák akkor kerüljön be, ha expedíciós döntést ad, nem folyamatos pakolgatást.

## 7. Élelem, pihenés és expedíció

A túlélés a felkészülést tegye érdekessé, ne legyen néhány percenként ismétlendő kötelező kattintás. Az élelem az utazási és pihenési rendszerhez kapcsolódjon. Kezdő szabály: egy karakternek minden 8 játékvilágban eltelt utazási órára 1 adag élelem és víz szükséges; a teljes, 8 órás pihenés szintén 1 adagot és vizet fogyaszt. A táska mutassa, hány tervezett útra elegendő a készlet.

A világidő az útvonalakhoz, utazáshoz és pihenéshez kötődjön; a menüben töltött valódi idő ne fogyasszon készletet. A rövid harc a saját másodperceit adja a világórához. Az időlépték és az útvonalhossz később együttesen egyensúlyozandó, nem a játékos gépének FPS-étől függ.

Jóllakottság: normál állapot; első hiányzó adag: lassabb lendület-visszatöltés; tartós hiány: kisebb maximális HP és gyengébb pihenés. A karakter ne haljon meg váratlanul attól, hogy a játékos térképet olvas. A főzött étel időleges, világosan jelzett bónuszt is adhat. A víz utánpótlása egy ismert kútnál legyen egyszerű.

Fogadóban és biztonságos táborban a teljes pihenés helyreállítja a fő erőforrásokat. Veszélyes helyen táborozni csak jól látható kockázattal lehessen. Az első változatban elég a biztonságos és nem biztonságos tábor különbsége; a bonyolult éjszakai eseménytáblák későbbi bővítésként kezelhetők.

## 8. Tartós világ, halál és mentés

Az elfogadott böngészős irányban egy helyi, egyjátékos világ **IndexedDB-alapú, verziózott mentést** használjon, importálható és exportálható mentésfájllal. A mentésben szerepeljen a karakter, a világ generálási magja, a véletlengenerátor állapota, a felfedezett térkép, küldetésállapotok, választások, NPC-állapotok, egyedi ellenfelek, kifosztott ládák és a világóra. A mag önmagában nem elegendő: a végrehajtott változásokat is menteni kell. Az alapjátékhoz nincs szükség szerverre vagy felhasználói fiókra.

Autosave biztonságos hely elhagyásakor, jelentős esemény után és időszakosan; kézi mentés is legyen. Legalább három forgó automatikus mentés szükséges. Az adatbázisírás egyetlen tranzakcióban, ellenőrzött mentésállapottal történjen. Tartalmi frissítésnél a mentésverzióhoz migráció vagy érthető kompatibilitási üzenet kell.

A főellenfelek és történeti ládák alapértelmezetten egyszeriek. A vadállatok és nyersanyaghelyek régiónként szabályozott világidő után visszatérhetnek, így a világ él, de a befejezett történet nem áll vissza. A bossjutalom és a küldetés teljesítése közös, egyszeri állapotváltozás legyen.

Alap nehézségben halálkor az utolsó mentés tölthető be. A végleges halál vagy a felszerelés eldobása opcionális későbbi mód, nem alapkövetelmény. A gyakorlás és a komoly világfelfedezés fontosabb, mint a játékidőt növelő büntetés.

## 9. Első játszható szelet és bővítés

Az első elfogadható szelet **végig játszható teljes hurkot** adjon: karakteralkotás → település → vadon → egy többhelyiséges dungeon → főellenfél → jutalom és visszatérés → fejlesztés → mentés → ugyanazon világ folytatása.

Ehhez egy település, két kapcsolódó vadonterület, egy dungeon, 1–5. szint, négy alap ellenféltípus, egy főellenfél, három fegyvercsalád, négy alapvarázslat, néhány recept és három eltérő megoldású küldetés elegendő. Ez a rendszerek próbája; önmagában még nem a felhasználó által kért hatalmas RPG.

A következő körben kell regionális tartalmat, teljes képességágakat, új ellenségviselkedést, történetszálakat és különleges felszerelést építeni. A világméret, a játékidő és a szintek csak akkor növelhetők értelmesen, ha már bizonyítottan szórakoztató a felfedezés és a harc. Egy procedurálisan nagy térkép nem pótolja az érdekes helyeket.

**A szelet ellenőrzése:** működik-e eltérő harcos és mágus karakterrel; indokolt-e visszatérni feltöltődni; előre felismerhető-e a veszélyes út; megkülönböztethetők-e a fegyverek; elmentés és újratöltés után pontosan megmarad-e a világ; egyszeriek maradnak-e a küldetésjutalmak; világos-e, miért talál el vagy győz le egy ellenfél. A bővítés ezekre épüljön.
