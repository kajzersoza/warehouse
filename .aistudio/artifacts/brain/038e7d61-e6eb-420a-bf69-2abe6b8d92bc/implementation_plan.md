# Mérődoboz kereső (Konnektor Ellenpár Kereső & Párosító)

A funkció célja, hogy a gyártandó kábelkorbácsokhoz / termékekhez azonnal és tévedésmentesen megtalálja a megfelelő Mérődobozt a beépülő csatlakozók (Konnektorok) és azok ellenpárjainak vizsgálatával, vizuális színkódolt státuszokkal (Zöld, Sárga, Narancssárga).

## Felhasználói visszajelzés és megerősített döntések

> [!IMPORTANT]
> **Megerősített felhasználói döntések:**
> 1. **Mérődoboz alkatrész-forrás:** A keresés kizárólag a mérődobozokba **beépülő alkatrészekre (Konnektorokra)** támaszkodik (`componentRelations`, ahol a szülő termék kategóriája "Mérődoboz").
> 2. **Konnektor-kategória szűrő:** A keresésben kizárólag a `Konnektor` kategóriájú komponensek vesznek részt.
> 3. **Rugalmas beviteli mód:** Választható egy létező Gyártandó Termék (amelyből a rendszer automatikusan beemeli a beépülő konnektorokat), és/vagy szabadon adhatók hozzá új konnektorok és darabszámok kézzel is.

---

## 1. Áttekintés és Fő Működés

### Mit csinál a funkció?
A főmenüben megjelenik egy új **Mérődoboz kereső** menüpont (`meterbox-finder` nézet), ahol:
1. **Gyártandó termék választása:** A felhasználó rákereshet vagy kiválaszthat egy készterméket (pl. `9220000067_00`). Ha a termékhez már rögzítve vannak beépülő alkatrészek, a rendszer automatikusan kigyűjti a Konnektor típusú alkatrészeket (pl. `4101621124`, `4101611124`) azok darabszámaival.
2. **Kézi konnektor-szerkesztő:** Bármikor módosíthatók a darabszámok, vagy kézzel hozzáadhatók további konnektorok (akár termék kiválasztása nélkül is).
3. **Automata Ellenpár-feloldás:** Minden megadott konnektorhoz megkeresi a rendszer a hozzá rögzített ellenpárt (a `matingPairRelations` adatbázisból).
4. **Mérődoboz elemzés:** Megvizsgálja az összes `Mérődoboz` kategóriájú terméket, és összeveti a beépülő alkatrészeiket az ellenpárokkal és darabszámokkal.
5. **Színkódolt találati lista:**
   * 🟢 **ZÖLD (Teljes egyezés):** Minden megadott konnektor ellenpárja megtalálható a mérődobozban, ÉS a mérődobozban lévő darabszám eléri vagy meghaladja a szükséges darabszámot.
   * 🟡 **SÁRGA (Ellenpár egyezés, kevesebb darabszám):** Minden keresett konnektor ellenpárja szerepel a dobozban, de legalább az egyikből kevesebb darabszám érhető el benne, mint amennyi a gyártandó termékhez szükséges.
   * 🟠 **NARANCSSÁRGA (Részleges egyezés):** Nem minden konnektor ellenpárja van meg a mérődobozban, de legalább 1 egyezés található (pl. 2-ből 1 csatlakozó illeszkedik).

---

## 2. Felhasználói Élmény és Felületterv

### Kulcs képernyők és lépések
1. **Fő navigációs menü:**
   * A bal oldali fiókban (`NavigationDrawer`) új, jól megkülönböztethető menüpont: **Mérődoboz kereső** mérőműszer/doboz ikonnal.
2. **Keresési & Beviteli Panel (Felső szekció):**
   * *Gyártandó termék választó:* Keresőmező autocomplettel (cikkszám, név alapján). Kiválasztásakor zöld visszaigazolás és a beépülő konnektorok azonnali betöltése.
   * *Keresett konnektorok listája:* Kártyák vagy kompakt táblázat, ahol soronként látható:
     - Konnektor fotója, cikkszáma, neve
     - Szükséges darabszám (léptető gombokkal: - / + vagy közvetlen számbevitel)
     - Automatikusan felismert Ellenpár cikkszáma és fotója
     - Törlés gomb (eltávolítás a keresésből)
   * *Új konnektor hozzáadása:* "+ Konnektor hozzáadása" gomb keresőablakkal, amelyben **kizárólag a Konnektor kategóriájú tételek** közül lehet választani és darabszámot megadni.
3. **Eredmény Panel (Alsó szekció):**
   * Összesítő sáv: Találatok száma, szűrőgombok a státuszokra (`Mind (X)`, `🟢 Teljes (Y)`, `🟡 Eltérő db (Z)`, `🟠 Részleges (W)`).
   * Találati mérődoboz kártyák:
     - Mérődoboz fotója, cikkszáma (kattintásra megnyitja a részletes adatlapot)
     - Raktári pozíciója és aktuális készlete
     - Státusz jelvény (Zöld / Sárga / Narancssárga felirattal és indoklással)
     - **Párosítási Mátrix / Részletező tábla:**
       * Keresett konnektor ➔ Ellenpár a mérődobozban
       * Szükséges db vs. Mérődobozban lévő db összehasonlítás
       * Egyezési pipa vagy hiányzó jelzés

---

## 3. Technikai Architektúra & Adatmodell

```
┌──────────────────────────────────────────────────────────┐
│                   App.tsx Router                         │
│       currentView === 'meterbox-finder'                  │
└────────────────────────────┬─────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌────────────────────────┐      ┌──────────────────────────┐
│    NavigationDrawer    │      │   MeterBoxFinderView     │
│   "Mérődoboz kereső"   │      │  (Új főkomponens)        │
└────────────────────────┘      └─────────────┬────────────┘
                                              │
                ┌─────────────────────────────┼──────────────────────────────┐
                ▼                             ▼                              ▼
      ┌──────────────────┐          ┌───────────────────┐          ┌────────────────────┐
      │  Product Selector│          │ Connector List    │          │ Match Engine       │
      │ (Gyártandó termék│          │ (Konnektorok + db │          │ - Mating Pair map  │
      │  beemelése)      │          │  kézi hozzáadás)  │          │ - Meterbox comps   │
      └──────────────────┘          └───────────────────┘          │ - 3-color scoring  │
                                                                   └─────────┬──────────┘
                                                                             │
                                                                   ┌─────────▼──────────┐
                                                                   │ MeterBox Result    │
                                                                   │ Cards (Zöld/Sárga/ │
                                                                   │ Narancssárga)      │
                                                                   └────────────────────┘
```

### Egyezés-számítási logika (Match Engine):
```typescript
interface ConnectorRequirement {
  connectorId: string;
  requiredQuantity: number;
  matingPairIds: string[]; // feloldott ellenpárok
}

interface MeterBoxMatchResult {
  meterBox: Product;
  matchType: 'FULL' | 'QUANTITY_MISMATCH' | 'PARTIAL';
  matchedConnectorsCount: number;
  totalRequiredConnectorsCount: number;
  breakdown: {
    sourceConnectorId: string;
    requiredQty: number;
    matingPairId: string | null;
    availableQtyInBox: number;
    isMatingPairPresent: boolean;
    isQtySufficient: boolean;
  }[];
}
```

1. **Ellenpár keresés:** A `matingPairRelations` listából kigyűjtjük az adott konnektorhoz tartozó összes ellenpárt.
2. **Mérődoboz beépülő alkatrészei:** A `componentRelations` táblából lekérjük a mérődobozhoz rendelt alkatrészeket (`childProductId`) és darabszámaikat (`quantity`).
3. **Pontozás:**
   * Ha a gyártandó termék MINDEN konnektorának van ellenpárja a dobozban, és minden darabszám `availableQtyInBox >= requiredQty` ➔ **ZÖLD** (`FULL`).
   * Ha MINDEN konnektor ellenpárja megtalálható, de van olyan, ahol `availableQtyInBox < requiredQty` ➔ **SÁRGA** (`QUANTITY_MISMATCH`).
   * Ha legalább 1 konnektor ellenpárja megvan, de nem az összes ➔ **NARANCSSÁRGA** (`PARTIAL`).
   * Ha egyetlen ellenpár sincs a dobozban ➔ Nem jelenik meg a találati listában.

---

## 4. Tervezett Lépések a Jóváhagyás Után

1. **Típusdefiníciók frissítése:** `ViewMode` kiegészítése `'meterbox-finder'` értékkel a `src/types/product.ts` fájlban.
2. **Új komponens létrehozása:** `src/components/MeterBoxFinderView.tsx` kidolgozása a teljes kereső logikával, elegáns kezelőfelülettel és színkódolással.
3. **Menü integráció:** A `NavigationDrawer.tsx` és `App.tsx` frissítése, hogy a menüből elérhető legyen a "Mérődoboz kereső".
4. **Tesztelés és ellenőrzés:** Validálás a megadott példával (`9220000067_00` és `4101621124`, `4101611124`), majd fordítás-ellenőrzés (`compile_applet`).
