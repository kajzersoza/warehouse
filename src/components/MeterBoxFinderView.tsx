import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Gauge,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  SlidersHorizontal,
  Minus,
  Check,
  X,
  Sparkles,
  HelpCircle,
  Package,
  Layers,
  Box,
  Boxes,
  MapPin
} from 'lucide-react';
import { Product, ProductComponentRelation, ProductMatingPairRelation } from '../types/product';
import { isConnectorCategory } from '../services/connectorTerminalService';
import { getConnectedMatingPairsForProduct } from '../services/matingPairService';

export interface SelectedConnectorReq {
  connectorId: string;
  requiredQty: number;
  product?: Product;
  matingPairIds: string[];
}

export interface MeterBoxMatchBreakdownItem {
  sourceConnectorId: string;
  sourceConnectorName?: string;
  sourceConnectorThumb?: string | null;
  requiredQty: number;
  matchedMatingPairId: string | null;
  matchedMatingPairName?: string;
  matchedMatingPairThumb?: string | null;
  availableQtyInBox: number;
  isMatingPairPresent: boolean;
  isQtySufficient: boolean;
}

export interface MeterBoxMatchResult {
  meterBox: Product;
  matchType: 'FULL' | 'QUANTITY_MISMATCH' | 'PARTIAL';
  matchedCount: number;
  totalRequired: number;
  sufficientQtyCount: number;
  breakdown: MeterBoxMatchBreakdownItem[];
}

export interface MeterBoxCombinationContribution {
  meterBoxId: string;
  meterBoxName: string;
  meterBoxFactoryCode?: string;
  meterBoxLocation?: string;
  meterBoxStock?: number;
  meterBoxThumb?: string | null;
  matchedMatingPairId: string;
  matchedMatingPairName?: string;
  matchedMatingPairThumb?: string | null;
  providedQty: number;
}

export interface MeterBoxCombinationBreakdownItem {
  sourceConnectorId: string;
  sourceConnectorName?: string;
  sourceConnectorThumb?: string | null;
  requiredQty: number;
  totalAvailableQty: number;
  isCovered: boolean;
  isQtySufficient: boolean;
  contributions: MeterBoxCombinationContribution[];
}

export interface MeterBoxCombinationResult {
  id: string;
  titleFormula: string;
  boxes: Product[];
  matchType: 'FULL' | 'QUANTITY_MISMATCH' | 'PARTIAL';
  coveredCount: number;
  totalRequired: number;
  sufficientQtyCount: number;
  breakdown: MeterBoxCombinationBreakdownItem[];
}

interface MeterBoxFinderViewProps {
  products: Product[];
  componentRelations: ProductComponentRelation[];
  matingPairRelations: ProductMatingPairRelation[];
  onBack: () => void;
  onGoToList: () => void;
  onSelectProduct: (product: Product) => void;
  initialProductId?: string;
}

export const MeterBoxFinderView: React.FC<MeterBoxFinderViewProps> = ({
  products,
  componentRelations,
  matingPairRelations,
  onBack,
  onGoToList,
  onSelectProduct,
  initialProductId
}) => {
  // Gyors keresési / kiválasztási állapotok
  const [productSearchInput, setProductSearchInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(initialProductId || null);
  const [connectorRequirements, setConnectorRequirements] = useState<SelectedConnectorReq[]>([]);

  // Kézi konnektor-hozzáadás modal állapota
  const [isAddConnectorModalOpen, setIsAddConnectorModalOpen] = useState(false);
  const [connectorSearchInput, setConnectorSearchInput] = useState('');
  const [newConnectorQty, setNewConnectorQty] = useState<number>(1);

  // Eredmény szűrés státusz szerint ('ALL' | 'FULL' | 'QUANTITY_MISMATCH' | 'PARTIAL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FULL' | 'QUANTITY_MISMATCH' | 'PARTIAL'>('ALL');
  // Megjelenítési mód: Összes | Csak egyedi dobozok | Csak több dobozos kombinációk
  const [viewModeFilter, setViewModeFilter] = useState<'ALL' | 'SINGLE' | 'COMBOS'>('ALL');
  // Dobozok száma szerinti szűrés kombinációknál: 'ALL' | 2 | 3 | 4 | 5
  const [comboSizeFilter, setComboSizeFilter] = useState<'ALL' | 2 | 3 | 4 | 5>('ALL');
  const [resultSearchQuery, setResultSearchQuery] = useState('');

  // 1. Termékek gyorstérképe (ID -> Product)
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => {
      if (p.productId) map.set(p.productId.trim().toLowerCase(), p);
      if (p.id) map.set(p.id.trim().toLowerCase(), p);
      if (p.factoryCode) map.set(p.factoryCode.trim().toLowerCase(), p);
    });
    return map;
  }, [products]);

  // 2. Kizárólag a Konnektor kategóriájú termékek listája (manuális hozzáadáshoz)
  const allConnectorProducts = useMemo(() => {
    return products.filter((p) => isConnectorCategory(p.category));
  }, [products]);

  // 3. Kizárólag a Mérődoboz termékek listája
  const allMeterBoxes = useMemo(() => {
    return products.filter((p) => {
      const cat = (p.category || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      return (
        cat.includes('mérődoboz') ||
        cat.includes('merodoboz') ||
        (cat.includes('mérő') && !cat.includes('gyártandó')) ||
        name.includes('mérődoboz') ||
        name.includes('merodoboz')
      );
    });
  }, [products]);

  // 4. Mérődobozokba beépülő komponensek térképe (meterBoxId -> Map<componentId, qty>)
  const meterBoxComponentsMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();

    allMeterBoxes.forEach((mb) => {
      const mbId = mb.productId.trim().toLowerCase();
      const compMap = new Map<string, number>();

      (componentRelations || []).forEach((rel) => {
        const parent = rel.parentProductId?.trim().toLowerCase();
        const comp = rel.componentProductId?.trim();
        const qty = typeof rel.quantity === 'number' && rel.quantity > 0 ? rel.quantity : 1;

        if (parent === mbId && comp) {
          const compLower = comp.toLowerCase();
          compMap.set(compLower, (compMap.get(compLower) || 0) + qty);
        }
      });

      map.set(mbId, compMap);
    });

    return map;
  }, [allMeterBoxes, componentRelations]);

  // 5. Gyártandó termék kiválasztása & beépülő konnektorok automatikus betöltése
  const handleSelectProduct = (prod: Product) => {
    setSelectedProductId(prod.productId);
    setProductSearchInput(prod.productId);

    // Kikeressük a kiválasztott termék beépülő alkatrészeit
    const pIdLower = prod.productId.trim().toLowerCase();
    const foundConnectors: SelectedConnectorReq[] = [];

    (componentRelations || []).forEach((rel) => {
      const parent = rel.parentProductId?.trim().toLowerCase();
      const comp = rel.componentProductId?.trim();
      const qty = typeof rel.quantity === 'number' && rel.quantity > 0 ? rel.quantity : 1;

      if (parent === pIdLower && comp) {
        const compObj = productMap.get(comp.toLowerCase());
        // Csak Konnektor kategória jöhet!
        if (compObj && isConnectorCategory(compObj.category)) {
          const mPairs = getConnectedMatingPairsForProduct(compObj.productId, matingPairRelations);
          foundConnectors.push({
            connectorId: compObj.productId,
            requiredQty: qty,
            product: compObj,
            matingPairIds: mPairs
          });
        }
      }
    });

    // Ha nincs még hozzá rögzítve konnektor, üres listával indulunk, a felhasználó szabadon hozzáadhat
    setConnectorRequirements(foundConnectors);
  };

  // Termék kiválasztás törlése
  const handleClearSelectedProduct = () => {
    setSelectedProductId(null);
    setProductSearchInput('');
    setConnectorRequirements([]);
  };

  // Új konnektor hozzáadása a listához
  const handleAddConnector = (connectorProd: Product, qty: number = 1) => {
    const cId = connectorProd.productId;
    const existingIndex = connectorRequirements.findIndex(
      (r) => r.connectorId.trim().toLowerCase() === cId.trim().toLowerCase()
    );

    const mPairs = getConnectedMatingPairsForProduct(cId, matingPairRelations);

    if (existingIndex >= 0) {
      // Ha már benne volt, megnöveljük a darabszámot
      setConnectorRequirements((prev) => {
        const copy = [...prev];
        copy[existingIndex] = {
          ...copy[existingIndex],
          requiredQty: copy[existingIndex].requiredQty + qty,
          matingPairIds: mPairs
        };
        return copy;
      });
    } else {
      setConnectorRequirements((prev) => [
        ...prev,
        {
          connectorId: cId,
          requiredQty: Math.max(1, qty),
          product: connectorProd,
          matingPairIds: mPairs
        }
      ]);
    }

    setIsAddConnectorModalOpen(false);
    setConnectorSearchInput('');
    setNewConnectorQty(1);
  };

  // Konnektor darabszám módosítása
  const handleUpdateConnectorQty = (connectorId: string, newQty: number) => {
    const validQty = Math.max(1, newQty);
    setConnectorRequirements((prev) =>
      prev.map((item) =>
        item.connectorId === connectorId ? { ...item, requiredQty: validQty } : item
      )
    );
  };

  // Konnektor törlése a listából
  const handleRemoveConnector = (connectorId: string) => {
    setConnectorRequirements((prev) =>
      prev.filter((item) => item.connectorId !== connectorId)
    );
  };

  // 6. FŐ TALÁLATI MOTOR (Match Engine)
  const matchResults: MeterBoxMatchResult[] = useMemo(() => {
    if (connectorRequirements.length === 0) return [];

    const totalReq = connectorRequirements.length;
    const results: MeterBoxMatchResult[] = [];

    allMeterBoxes.forEach((mb) => {
      const mbId = mb.productId.trim().toLowerCase();
      const mbComps = meterBoxComponentsMap.get(mbId) || new Map<string, number>();

      let matchedCount = 0;
      let sufficientQtyCount = 0;

      const breakdown: MeterBoxMatchBreakdownItem[] = connectorRequirements.map((req) => {
        const sourceProd = req.product || productMap.get(req.connectorId.toLowerCase());
        const thumb = sourceProd?.images && sourceProd.images.length > 0 ? sourceProd.images[0] : null;

        // Megkeressük, hogy a konnektor valamelyik ellenpárja benne van-e a mérődoboz beépülő alkatrészeiben
        let foundMatingPairId: string | null = null;
        let availableQty = 0;

        for (const mpId of req.matingPairIds) {
          const mpLower = mpId.trim().toLowerCase();
          if (mbComps.has(mpLower)) {
            foundMatingPairId = mpId;
            availableQty = mbComps.get(mpLower) || 0;
            break; // Az első illeszkedő ellenpár
          }
        }

        const isPresent = foundMatingPairId !== null;
        const isSufficient = isPresent && availableQty >= req.requiredQty;

        if (isPresent) {
          matchedCount++;
          if (isSufficient) {
            sufficientQtyCount++;
          }
        }

        const mpProd = foundMatingPairId ? productMap.get(foundMatingPairId.toLowerCase()) : null;
        const mpThumb = mpProd?.images && mpProd.images.length > 0 ? mpProd.images[0] : null;

        return {
          sourceConnectorId: req.connectorId,
          sourceConnectorName: sourceProd?.name,
          sourceConnectorThumb: thumb,
          requiredQty: req.requiredQty,
          matchedMatingPairId: foundMatingPairId,
          matchedMatingPairName: mpProd?.name,
          matchedMatingPairThumb: mpThumb,
          availableQtyInBox: availableQty,
          isMatingPairPresent: isPresent,
          isQtySufficient: isSufficient
        };
      });

      // Csak olyan mérődobozokat jelenítünk meg, ahol LEGALÁBB 1 ellenpár szerepel!
      if (matchedCount > 0) {
        let matchType: 'FULL' | 'QUANTITY_MISMATCH' | 'PARTIAL';

        if (matchedCount === totalReq && sufficientQtyCount === totalReq) {
          matchType = 'FULL'; // 🟢 ZÖLD: minden konnektor és darabszám megegyezik / elegendő
        } else if (matchedCount === totalReq && sufficientQtyCount < totalReq) {
          matchType = 'QUANTITY_MISMATCH'; // 🟡 SÁRGA: konnektor ellenpár megvan, de a darabszám kevesebb
        } else {
          matchType = 'PARTIAL'; // 🟠 NARANCSSÁRGA: csak részleges egyezés
        }

        results.push({
          meterBox: mb,
          matchType,
          matchedCount,
          totalRequired: totalReq,
          sufficientQtyCount,
          breakdown
        });
      }
    });

    // Rendezés: Zöld (FULL) -> Sárga (QUANTITY_MISMATCH) -> Narancssárga (PARTIAL, több egyezés előre)
    results.sort((a, b) => {
      const priorityOrder = { FULL: 1, QUANTITY_MISMATCH: 2, PARTIAL: 3 };
      const pA = priorityOrder[a.matchType];
      const pB = priorityOrder[b.matchType];

      if (pA !== pB) return pA - pB;
      if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;

      const nameA = a.meterBox.name || a.meterBox.productId || '';
      const nameB = b.meterBox.name || b.meterBox.productId || '';
      return nameA.localeCompare(nameB, 'hu', { numeric: true });
    });

    return results;
  }, [connectorRequirements, allMeterBoxes, meterBoxComponentsMap, productMap]);

  // 7. TÖBB MÉRŐDOBOZOS KOMBINÁCIÓS MOTOR (X + Y + Z + W)
  // Ha nincs egyetlen mérődoboz, amin az összes konnektor / darabszám megtalálható (vagy kombinált megoldás keresése esetén),
  // több mérődobozból rakja össze a megfelelő lefedettséget és darabszámot, külön jelölve: X + Y (+ Z + W).
  const combinationResults: MeterBoxCombinationResult[] = useMemo(() => {
    if (connectorRequirements.length === 0) return [];

    const totalReq = connectorRequirements.length;

    // Azon mérődobozok azonosítói, amelyek önmagukban is minden kritériumnak (darabszám + ellenpár) megfelelnek
    // "amikor talál egy mérődobozt ami minden kritériumnak megfelel : darabszám , ellenpár ,ez jó , de amikor kombinációt rak össze több mérődobozról , ezeket hagyja ki hiszen ezeken minden megvan"
    const fullMatchBoxIdSet = new Set<string>();
    matchResults.forEach((r) => {
      if (r.matchType === 'FULL') {
        fullMatchBoxIdSet.add(r.meterBox.productId.trim().toLowerCase());
      }
    });

    // Minden mérődobozra kigyűjtjük, mely konnektorokhoz rendelkezik beépülő ellenpárral
    interface CandidateBox {
      meterBox: Product;
      // connectorId (lowercase) -> { mpId, mpName, mpThumb, qty }
      contributions: Map<string, { mpId: string; mpName?: string; mpThumb?: string | null; qty: number }>;
    }

    const candidates: CandidateBox[] = [];

    allMeterBoxes.forEach((mb) => {
      const mbId = mb.productId.trim().toLowerCase();

      // Ha ez a mérődoboz önmagában is minden kritériumnak (darabszám + ellenpár) megfelel,
      // kihagyjuk a kombinációkból, hiszen ezen a dobozon már minden szükséges alkatrész megvan!
      if (fullMatchBoxIdSet.has(mbId)) {
        return;
      }

      const mbComps = meterBoxComponentsMap.get(mbId) || new Map<string, number>();
      const contribMap = new Map<string, { mpId: string; mpName?: string; mpThumb?: string | null; qty: number }>();

      connectorRequirements.forEach((req) => {
        for (const mpId of req.matingPairIds) {
          const mpLower = mpId.trim().toLowerCase();
          if (mbComps.has(mpLower)) {
            const availQty = mbComps.get(mpLower) || 0;
            if (availQty > 0) {
              const mpProd = productMap.get(mpLower);
              contribMap.set(req.connectorId.trim().toLowerCase(), {
                mpId,
                mpName: mpProd?.name,
                mpThumb: mpProd?.images && mpProd.images.length > 0 ? mpProd.images[0] : null,
                qty: availQty
              });
              break;
            }
          }
        }
      });

      if (contribMap.size > 0) {
        // További biztonsági szűrés: ha egy doboz a darabszámokkal együtt is önmagában teljes lefedettséget nyújt,
        // szintén kihagyjuk a kombinációkból
        const isSelfSufficient =
          contribMap.size === totalReq &&
          connectorRequirements.every((req) => {
            const found = contribMap.get(req.connectorId.trim().toLowerCase());
            return found && found.qty >= req.requiredQty;
          });

        if (!isSelfSufficient) {
          candidates.push({ meterBox: mb, contributions: contribMap });
        }
      }
    });

    if (candidates.length < 2) return [];

    // Rendezés: legtöbb konnektort tartalmazó, illetve legnagyobb hasznos darabszámot adó dobozok előre
    candidates.sort((a, b) => {
      if (b.contributions.size !== a.contributions.size) {
        return b.contributions.size - a.contributions.size;
      }
      let usefulQtyA = 0;
      let usefulQtyB = 0;
      connectorRequirements.forEach((req) => {
        const k = req.connectorId.trim().toLowerCase();
        const fA = a.contributions.get(k);
        if (fA) usefulQtyA += Math.min(fA.qty, req.requiredQty);
        const fB = b.contributions.get(k);
        if (fB) usefulQtyB += Math.min(fB.qty, req.requiredQty);
      });
      return usefulQtyB - usefulQtyA;
    });

    const combos: MeterBoxCombinationResult[] = [];
    const seenCombos = new Set<string>();

    const evaluateCombination = (
      boxes: Product[],
      contribMaps: Map<string, { mpId: string; mpName?: string; mpThumb?: string | null; qty: number }>[]
    ): MeterBoxCombinationResult | null => {
      let coveredCount = 0;
      let sufficientQtyCount = 0;

      const breakdown: MeterBoxCombinationBreakdownItem[] = connectorRequirements.map((req) => {
        const cKey = req.connectorId.trim().toLowerCase();
        const sourceProd = req.product || productMap.get(cKey);
        const sourceThumb = sourceProd?.images && sourceProd.images.length > 0 ? sourceProd.images[0] : null;

        const contributionsList: MeterBoxCombinationContribution[] = [];
        let totalAvailQty = 0;

        boxes.forEach((box, idx) => {
          const cmap = contribMaps[idx];
          const found = cmap.get(cKey);
          if (found) {
            contributionsList.push({
              meterBoxId: box.productId,
              meterBoxName: box.name,
              meterBoxFactoryCode: box.factoryCode,
              meterBoxLocation: box.location,
              meterBoxStock: box.stockQuantity,
              meterBoxThumb: box.images && box.images.length > 0 ? box.images[0] : null,
              matchedMatingPairId: found.mpId,
              matchedMatingPairName: found.mpName,
              matchedMatingPairThumb: found.mpThumb,
              providedQty: found.qty
            });
            totalAvailQty += found.qty;
          }
        });

        const isCovered = contributionsList.length > 0;
        const isQtySufficient = isCovered && totalAvailQty >= req.requiredQty;

        if (isCovered) {
          coveredCount++;
          if (isQtySufficient) {
            sufficientQtyCount++;
          }
        }

        return {
          sourceConnectorId: req.connectorId,
          sourceConnectorName: sourceProd?.name,
          sourceConnectorThumb: sourceThumb,
          requiredQty: req.requiredQty,
          totalAvailableQty: totalAvailQty,
          isCovered,
          isQtySufficient,
          contributions: contributionsList
        };
      });

      // Legalább 1 konnektort fednie kell, több elvárt konnektor esetén legalább 2-t
      const minCovered = Math.min(2, totalReq);
      if (coveredCount < minCovered) return null;

      // Kizárjuk, ha a kombinációban bármelyik doboz önmagában már teljes lefedettségű és elegendő darabszámú
      for (const box of boxes) {
        if (fullMatchBoxIdSet.has(box.productId.trim().toLowerCase())) {
          return null;
        }
      }

      // Minden egyes doboznak hozzá kell tennie a lefedettséghez vagy darabszámhoz (nem lehet felesleges passzív doboz)
      for (let i = 0; i < boxes.length; i++) {
        const thisBoxId = boxes[i].productId;
        const contributesSomething = breakdown.some((b) =>
          b.contributions.some((c) => c.meterBoxId === thisBoxId)
        );
        if (!contributesSomething) return null;
      }

      // Több dobozos kombinációknál kizárjuk, ha bármelyik szűkebb részhalmaz önmagában is 100%-os FULL lefedettséget ad
      if (boxes.length > 2) {
        for (let removeIdx = 0; removeIdx < boxes.length; removeIdx++) {
          const subBoxes = boxes.filter((_, idx) => idx !== removeIdx);
          const subMaps = contribMaps.filter((_, idx) => idx !== removeIdx);
          let subCovered = 0;
          let subSufficient = 0;

          connectorRequirements.forEach((req) => {
            const cKey = req.connectorId.trim().toLowerCase();
            let subAvailQty = 0;
            let subHasMp = false;

            subBoxes.forEach((_, sIdx) => {
              const found = subMaps[sIdx].get(cKey);
              if (found) {
                subHasMp = true;
                subAvailQty += found.qty;
              }
            });

            if (subHasMp) {
              subCovered++;
              if (subAvailQty >= req.requiredQty) {
                subSufficient++;
              }
            }
          });

          if (subCovered === totalReq && subSufficient === totalReq) {
            return null; // A kombináció felesleges dobozt tartalmaz, mert a többi már önmagában is FULL fedést nyújt
          }
        }
      }

      let matchType: 'FULL' | 'QUANTITY_MISMATCH' | 'PARTIAL';
      if (coveredCount === totalReq && sufficientQtyCount === totalReq) {
        matchType = 'FULL';
      } else if (coveredCount === totalReq && sufficientQtyCount < totalReq) {
        matchType = 'QUANTITY_MISMATCH';
      } else {
        matchType = 'PARTIAL';
      }

      // Képzett kulcs ismétlődések kizárására (pl. "boxA+boxB")
      const sortedIds = [...boxes].map((b) => b.productId).sort();
      const comboKey = sortedIds.join('+');
      if (seenCombos.has(comboKey)) return null;
      seenCombos.add(comboKey);

      const titleFormula = boxes.map((b) => b.productId).join(' + ');

      return {
        id: comboKey,
        titleFormula,
        boxes,
        matchType,
        coveredCount,
        totalRequired: totalReq,
        sufficientQtyCount,
        breakdown
      };
    };

    const combos2: MeterBoxCombinationResult[] = [];
    const combos3: MeterBoxCombinationResult[] = [];
    const combos4: MeterBoxCombinationResult[] = [];
    const combos5: MeterBoxCombinationResult[] = [];

    const minCovered = Math.min(2, totalReq);

    // 1. Két dobozos kombinációk keresése (X + Y)
    const pool2 = candidates.slice(0, 35);
    for (let i = 0; i < pool2.length; i++) {
      for (let j = i + 1; j < pool2.length; j++) {
        const c1 = pool2[i];
        const c2 = pool2[j];

        let combinedSize = 0;
        let hasQuantityAddition = false;

        connectorRequirements.forEach((req) => {
          const k = req.connectorId.trim().toLowerCase();
          const f1 = c1.contributions.get(k);
          const f2 = c2.contributions.get(k);
          if (f1 || f2) {
            combinedSize++;
          }
          if (f1 && f2) {
            if (f1.qty < req.requiredQty || f2.qty < req.requiredQty) {
              hasQuantityAddition = true;
            }
          }
        });

        if (combinedSize > Math.max(c1.contributions.size, c2.contributions.size) || hasQuantityAddition) {
          const res = evaluateCombination([c1.meterBox, c2.meterBox], [c1.contributions, c2.contributions]);
          if (res) {
            combos2.push(res);
          }
        }
      }
    }

    // 2. Három dobozos kombinációk keresése (X + Y + Z)
    if (candidates.length >= 3) {
      const pool3 = candidates.slice(0, 18);
      for (let i = 0; i < pool3.length; i++) {
        for (let j = i + 1; j < pool3.length; j++) {
          for (let k = j + 1; k < pool3.length; k++) {
            const c1 = pool3[i];
            const c2 = pool3[j];
            const c3 = pool3[k];

            let combinedSize = 0;
            connectorRequirements.forEach((req) => {
              const key = req.connectorId.trim().toLowerCase();
              if (c1.contributions.has(key) || c2.contributions.has(key) || c3.contributions.has(key)) {
                combinedSize++;
              }
            });

            if (combinedSize >= minCovered) {
              const res = evaluateCombination(
                [c1.meterBox, c2.meterBox, c3.meterBox],
                [c1.contributions, c2.contributions, c3.contributions]
              );
              if (res) {
                combos3.push(res);
              }
            }
          }
        }
      }
    }

    // 3. Négy dobozos kombinációk keresése (X + Y + Z + W)
    if (candidates.length >= 4) {
      const pool4 = candidates.slice(0, 13);
      for (let i = 0; i < pool4.length; i++) {
        for (let j = i + 1; j < pool4.length; j++) {
          for (let k = j + 1; k < pool4.length; k++) {
            for (let l = k + 1; l < pool4.length; l++) {
              const c1 = pool4[i];
              const c2 = pool4[j];
              const c3 = pool4[k];
              const c4 = pool4[l];

              let combinedSize = 0;
              connectorRequirements.forEach((req) => {
                const key = req.connectorId.trim().toLowerCase();
                if (c1.contributions.has(key) || c2.contributions.has(key) || c3.contributions.has(key) || c4.contributions.has(key)) {
                  combinedSize++;
                }
              });

              if (combinedSize >= minCovered) {
                const res = evaluateCombination(
                  [c1.meterBox, c2.meterBox, c3.meterBox, c4.meterBox],
                  [c1.contributions, c2.contributions, c3.contributions, c4.contributions]
                );
                if (res) {
                  combos4.push(res);
                }
              }
            }
          }
        }
      }
    }

    // 4. Öt dobozos kombinációk keresése (5 mérődoboz)
    if (candidates.length >= 5) {
      const pool5 = candidates.slice(0, 10);
      for (let i = 0; i < pool5.length; i++) {
        for (let j = i + 1; j < pool5.length; j++) {
          for (let k = j + 1; k < pool5.length; k++) {
            for (let l = k + 1; l < pool5.length; l++) {
              for (let m = l + 1; m < pool5.length; m++) {
                const c1 = pool5[i];
                const c2 = pool5[j];
                const c3 = pool5[k];
                const c4 = pool5[l];
                const c5 = pool5[m];

                let combinedSize = 0;
                connectorRequirements.forEach((req) => {
                  const key = req.connectorId.trim().toLowerCase();
                  if (
                    c1.contributions.has(key) ||
                    c2.contributions.has(key) ||
                    c3.contributions.has(key) ||
                    c4.contributions.has(key) ||
                    c5.contributions.has(key)
                  ) {
                    combinedSize++;
                  }
                });

                if (combinedSize >= minCovered) {
                  const res = evaluateCombination(
                    [c1.meterBox, c2.meterBox, c3.meterBox, c4.meterBox, c5.meterBox],
                    [c1.contributions, c2.contributions, c3.contributions, c4.contributions, c5.contributions]
                  );
                  if (res) {
                    combos5.push(res);
                  }
                }
              }
            }
          }
        }
      }
    }

    // Mindegyik dobozméret kategóriát külön is sorrendbe állítunk (FULL elöl)
    const sortCombos = (arr: MeterBoxCombinationResult[]) => {
      const priorityOrder = { FULL: 1, QUANTITY_MISMATCH: 2, PARTIAL: 3 };
      arr.sort((a, b) => {
        const pA = priorityOrder[a.matchType];
        const pB = priorityOrder[b.matchType];
        if (pA !== pB) return pA - pB;
        if (b.sufficientQtyCount !== a.sufficientQtyCount) return b.sufficientQtyCount - a.sufficientQtyCount;
        if (b.coveredCount !== a.coveredCount) return b.coveredCount - a.coveredCount;
        return a.titleFormula.localeCompare(b.titleFormula);
      });
    };

    sortCombos(combos2);
    sortCombos(combos3);
    sortCombos(combos4);
    sortCombos(combos5);

    // Kategóriánként megtartjuk a legjobbakat, hogy egyik dobozszám se szoruljon ki
    const top2 = combos2.slice(0, 25);
    const top3 = combos3.slice(0, 25);
    const top4 = combos4.slice(0, 20);
    const top5 = combos5.slice(0, 15);

    const allCombos = [...top2, ...top3, ...top4, ...top5];

    // Globális rendezés az összképhez:
    // 1. Zöld FULL -> Sárga QUANTITY_MISMATCH -> Narancs PARTIAL
    // 2. Kevesebb doboz előre (2 doboz megelőzi a 3-at, 4-et, 5-öt)
    // 3. Több lefedett konnektor és darabszám
    allCombos.sort((a, b) => {
      const priorityOrder = { FULL: 1, QUANTITY_MISMATCH: 2, PARTIAL: 3 };
      const pA = priorityOrder[a.matchType];
      const pB = priorityOrder[b.matchType];
      if (pA !== pB) return pA - pB;
      if (a.boxes.length !== b.boxes.length) return a.boxes.length - b.boxes.length;
      if (b.sufficientQtyCount !== a.sufficientQtyCount) return b.sufficientQtyCount - a.sufficientQtyCount;
      if (b.coveredCount !== a.coveredCount) return b.coveredCount - a.coveredCount;
      return a.titleFormula.localeCompare(b.titleFormula);
    });

    return allCombos;
  }, [connectorRequirements, allMeterBoxes, meterBoxComponentsMap, productMap, matchResults]);

  // Szűrt egyedi találati lista
  const filteredResults = useMemo(() => {
    let list = matchResults;

    if (statusFilter !== 'ALL') {
      list = list.filter((r) => r.matchType === statusFilter);
    }

    if (resultSearchQuery.trim()) {
      const q = resultSearchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.meterBox.productId.toLowerCase().includes(q) ||
          r.meterBox.name.toLowerCase().includes(q) ||
          (r.meterBox.factoryCode && r.meterBox.factoryCode.toLowerCase().includes(q)) ||
          (r.meterBox.location && r.meterBox.location.toLowerCase().includes(q))
      );
    }

    return list;
  }, [matchResults, statusFilter, resultSearchQuery]);

  // Szűrt kombinációs lista
  const filteredCombinations = useMemo(() => {
    let list = combinationResults;

    if (comboSizeFilter !== 'ALL') {
      list = list.filter((r) => r.boxes.length === comboSizeFilter);
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((r) => r.matchType === statusFilter);
    }

    if (resultSearchQuery.trim()) {
      const q = resultSearchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.titleFormula.toLowerCase().includes(q) ||
          r.boxes.some(
            (b) =>
              b.productId.toLowerCase().includes(q) ||
              b.name.toLowerCase().includes(q) ||
              (b.factoryCode && b.factoryCode.toLowerCase().includes(q)) ||
              (b.location && b.location.toLowerCase().includes(q))
          )
      );
    }

    return list;
  }, [combinationResults, comboSizeFilter, statusFilter, resultSearchQuery]);

  // Statisztikai számlálók a szűrő gombokhoz (külön egyedi és kombinált adatokkal)
  const counts = useMemo(() => {
    let singleFull = 0;
    let singleQtyMismatch = 0;
    let singlePartial = 0;

    matchResults.forEach((r) => {
      if (r.matchType === 'FULL') singleFull++;
      else if (r.matchType === 'QUANTITY_MISMATCH') singleQtyMismatch++;
      else if (r.matchType === 'PARTIAL') singlePartial++;
    });

    let comboFull = 0;
    let comboQtyMismatch = 0;
    let comboPartial = 0;
    let combo2Count = 0;
    let combo3Count = 0;
    let combo4Count = 0;
    let combo5Count = 0;

    combinationResults.forEach((r) => {
      if (r.matchType === 'FULL') comboFull++;
      else if (r.matchType === 'QUANTITY_MISMATCH') comboQtyMismatch++;
      else if (r.matchType === 'PARTIAL') comboPartial++;

      if (r.boxes.length === 2) combo2Count++;
      else if (r.boxes.length === 3) combo3Count++;
      else if (r.boxes.length === 4) combo4Count++;
      else if (r.boxes.length >= 5) combo5Count++;
    });

    return {
      singleTotal: matchResults.length,
      singleFull,
      singleQtyMismatch,
      singlePartial,
      comboTotal: combinationResults.length,
      comboFull,
      comboQtyMismatch,
      comboPartial,
      combo2Count,
      combo3Count,
      combo4Count,
      combo5Count,
      total: matchResults.length + combinationResults.length,
      full: singleFull + comboFull,
      qtyMismatch: singleQtyMismatch + comboQtyMismatch,
      partial: singlePartial + comboPartial
    };
  }, [matchResults, combinationResults]);

  // Gyártandó termék autokomplett javaslatok
  const productSuggestions = useMemo(() => {
    const q = productSearchInput.trim().toLowerCase();
    if (!q || (selectedProductId && q === selectedProductId.toLowerCase())) return [];

    return products
      .filter((p) => {
        const pid = (p.productId || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        const fcode = (p.factoryCode || '').toLowerCase();
        return pid.includes(q) || name.includes(q) || fcode.includes(q);
      })
      .slice(0, 8);
  }, [productSearchInput, selectedProductId, products]);

  // Kizárólag Konnektor kategóriájú keresési javaslatok a modalban
  const connectorSuggestions = useMemo(() => {
    const q = connectorSearchInput.trim().toLowerCase();
    if (!q) {
      return allConnectorProducts.slice(0, 12);
    }
    return allConnectorProducts
      .filter((p) => {
        const pid = (p.productId || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        const fcode = (p.factoryCode || '').toLowerCase();
        return pid.includes(q) || name.includes(q) || fcode.includes(q);
      })
      .slice(0, 15);
  }, [connectorSearchInput, allConnectorProducts]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 animate-fadeIn">
      {/* 1. Header Bár */}
      <header className="sticky top-0 z-30 bg-[#211E1B] text-white shadow-md border-b border-[#3A5D6B]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Vissza"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Mérődoboz kereső</span>
                  <span className="text-[11px] font-bold bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Konnektor Ellenpár
                  </span>
                </h1>
                <p className="text-xs text-stone-300 hidden sm:block">
                  Gyártandó termék konnektorainak egyeztetése mérődoboz beépülő alkatrészeivel
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                handleClearSelectedProduct();
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5 border border-stone-600"
              title="Keresési mezők visszaállítása"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Új keresés</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Felső Kereső & Konnektor-beállító Kártya */}
        <section className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-stone-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                  <span>1. Gyártandó termék vagy Konnektorok megadása</span>
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
                  Válasszon ki egy gyártandó terméket (a konnektorok automatikusan betöltődnek), vagy adjon hozzá közvetlenül konnektorokat.
                </p>
              </div>

              {/* + Konnektor gomb a fejlécben */}
              <button
                type="button"
                onClick={() => setIsAddConnectorModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Konnektor hozzáadása</span>
              </button>
            </div>

            {/* Termék kereső & kiválasztó mező */}
            <div className="mt-4 relative max-w-xl">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                Gyártandó Termék (Cikkszám / Név / Kód):
              </label>
              <div className="relative">
                <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={productSearchInput}
                  onChange={(e) => setProductSearchInput(e.target.value)}
                  placeholder="pl. 9220000067_00 vagy termék megnevezése..."
                  className="w-full pl-11 pr-10 py-2.5 bg-white border-2 border-stone-300 focus:border-amber-600 focus:outline-hidden rounded-xl font-mono text-sm sm:text-base font-bold text-stone-900 transition-colors shadow-2xs"
                />
                {productSearchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearchInput('');
                      setSelectedProductId(null);
                    }}
                    className="p-1 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                    title="Törlés"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Termék Autocomplete legördülő lista */}
              {productSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-stone-200 rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto divide-y divide-stone-100 animate-fadeIn">
                  {productSuggestions.map((p) => {
                    const thumb = p.images && p.images.length > 0 ? p.images[0] : null;
                    return (
                      <div
                        key={p.id || p.productId}
                        onClick={() => handleSelectProduct(p)}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-amber-50/70 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shrink-0">
                            {thumb ? (
                              <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-stone-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-mono font-black text-sm text-stone-900 flex items-center gap-2">
                              <span>{p.productId}</span>
                              {p.category && (
                                <span className="text-[10px] font-sans font-bold bg-stone-100 px-1.5 py-0.2 rounded text-stone-600">
                                  {p.category}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-stone-600 truncate">{p.name}</div>
                          </div>
                        </div>

                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 shrink-0">
                          Kiválaszt
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Kiválasztott termék visszaigazoló doboza */}
            {selectedProductId && (
              <div className="mt-3 p-3 bg-amber-100/70 border border-amber-300 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-amber-950 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Kiválasztott termék: <strong className="font-mono text-sm">{selectedProductId}</strong>
                  </span>
                  {(() => {
                    const found = productMap.get(selectedProductId.toLowerCase());
                    return found?.name ? <span className="opacity-80">({found.name})</span> : null;
                  })()}
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedProduct}
                  className="text-xs text-amber-900 hover:text-amber-950 font-extrabold underline cursor-pointer"
                >
                  Leválasztás
                </button>
              </div>
            )}
          </div>

          {/* Keresendő Konnektorok Listája */}
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                <span>Keresett Konnektorok ({connectorRequirements.length} db):</span>
              </h3>
              <span className="text-xs text-stone-500">
                A rendszer ezen konnektorok ellenpárjait keresi a mérődobozokban
              </span>
            </div>

            {connectorRequirements.length === 0 ? (
              <div className="py-10 px-4 text-center border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50/50 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <Gauge className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-stone-800">Nincs kiválasztott konnektor</h4>
                  <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                    Válasszon ki egy gyártandó terméket a fenti mezőben, vagy kattintson a <strong>+ Konnektor hozzáadása</strong> gombra a csatlakozók manuális megadásához!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddConnectorModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Konnektor Hozzáadása</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {connectorRequirements.map((req) => {
                  const prod = req.product || productMap.get(req.connectorId.toLowerCase());
                  const thumb = prod?.images && prod.images.length > 0 ? prod.images[0] : null;
                  const hasMatingPair = req.matingPairIds.length > 0;

                  return (
                    <div
                      key={req.connectorId}
                      className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 hover:border-amber-300 transition-colors flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-white border border-stone-200 overflow-hidden flex items-center justify-center shrink-0">
                          {thumb ? (
                            <img src={thumb} alt={req.connectorId} className="w-full h-full object-cover" />
                          ) : (
                            <Box className="w-5 h-5 text-stone-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="font-mono font-black text-sm text-stone-900 truncate hover:text-amber-700 cursor-pointer"
                              onClick={() => prod && onSelectProduct(prod)}
                              title="Adatlap megtekintése"
                            >
                              {req.connectorId}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveConnector(req.connectorId)}
                              className="p-1 text-stone-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                              title="Konnektor eltávolítása a keresésből"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="text-xs text-stone-600 truncate font-medium">
                            {prod?.name || 'Konnektor'}
                          </div>

                          {/* Ellenpár státusz felirat */}
                          <div className="mt-1 text-[11px] font-bold">
                            {hasMatingPair ? (
                              <span className="text-emerald-700 flex items-center gap-1">
                                <Check className="w-3 h-3 shrink-0" />
                                <span>Ellenpár: </span>
                                <strong className="font-mono">{req.matingPairIds.join(', ')}</strong>
                              </span>
                            ) : (
                              <span className="text-amber-700 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>Nincs ellenpár rögzítve</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Darabszám léptető */}
                      <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-600">Szükséges db:</span>
                        <div className="flex items-center border border-stone-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateConnectorQty(req.connectorId, req.requiredQty - 1)}
                            disabled={req.requiredQty <= 1}
                            className="px-2.5 py-1 text-stone-600 hover:bg-stone-100 disabled:opacity-30 cursor-pointer font-bold text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={req.requiredQty}
                            onChange={(e) =>
                              handleUpdateConnectorQty(req.connectorId, parseInt(e.target.value) || 1)
                            }
                            className="w-12 text-center font-mono font-black text-xs py-1 bg-transparent focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateConnectorQty(req.connectorId, req.requiredQty + 1)}
                            className="px-2.5 py-1 text-stone-600 hover:bg-stone-100 cursor-pointer font-bold text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Találati Lista Szekció */}
        {connectorRequirements.length > 0 && (
          <section className="space-y-4">
            {/* Szűrő és Találatjelző Sáv */}
            {/* Szűrő és Találatjelző Sáv */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Státusz szerinti szűrés */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase text-stone-500 mr-1">Státusz:</span>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      statusFilter === 'ALL'
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    Összes ({counts.total})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('FULL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      statusFilter === 'FULL'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Teljes egyezés ({counts.full})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('QUANTITY_MISMATCH')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      statusFilter === 'QUANTITY_MISMATCH'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Eltérő db ({counts.qtyMismatch})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('PARTIAL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      statusFilter === 'PARTIAL'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-orange-50 text-orange-950 hover:bg-orange-100 border border-orange-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    <span>Részleges ({counts.partial})</span>
                  </button>
                </div>

                {/* Találati kereső */}
                <div className="relative w-full lg:w-72">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={resultSearchQuery}
                    onChange={(e) => setResultSearchQuery(e.target.value)}
                    placeholder="Keresés (cikkszám, kód, X+Y)..."
                    className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-amber-600 focus:outline-hidden rounded-xl text-xs font-medium text-stone-900"
                  />
                </div>
              </div>

              {/* Típus szerinti megjelenítés (Összes | Csak egyedi | Csak kombinációk) */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black uppercase text-stone-500 mr-1">Típus:</span>
                  <button
                    type="button"
                    onClick={() => setViewModeFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      viewModeFilter === 'ALL'
                        ? 'bg-stone-800 text-white'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    Mind ({counts.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewModeFilter('SINGLE')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      viewModeFilter === 'SINGLE'
                        ? 'bg-amber-600 text-white'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>Csak Egyedi Mérődobozok ({counts.singleTotal})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewModeFilter('COMBOS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      viewModeFilter === 'COMBOS'
                        ? 'bg-purple-700 text-white'
                        : 'text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Csak Több Dobozos Kombinációk (X + Y + ...) ({counts.comboTotal})</span>
                  </button>
                </div>

                <div className="text-[11px] text-stone-400 font-medium">
                  {counts.singleFull > 0 ? (
                    <span className="text-emerald-700 font-bold">
                      ✓ Van közvetlen egyedi doboz teljes fedéssel
                    </span>
                  ) : counts.comboFull > 0 ? (
                    <span className="text-purple-700 font-bold">
                      ★ Több dobozos kombinációval (X + Y + ...) érhető el teljes fedés
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* FIGYELMEZTETŐ / JAVASLÓ KÁRTYA: Ha nincs egyedi teljes egyezés, de kombinációval megoldható */}
            {counts.singleFull === 0 && counts.comboFull > 0 && viewModeFilter !== 'SINGLE' && (
              <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50/60 to-white border-2 border-purple-200 rounded-2xl flex items-start gap-3 shadow-2xs">
                <Sparkles className="w-6 h-6 text-purple-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-sm font-black text-purple-950 flex items-center gap-2">
                    <span>Nincs egyetlen olyan mérődoboz, amely az összes kívánt konnektort tartalmazza!</span>
                    <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Automatikus Kombináció
                    </span>
                  </div>
                  <p className="text-xs text-purple-800">
                    A rendszer összeállította a lehetséges <strong>több mérődobozos kombinációkat (X + Y + ...)</strong>, amelyek együttesen lefedik a termék összes szükséges konnektorát. Lásd alább a kombinációs szekciót!
                  </p>
                </div>
              </div>
            )}

            {/* ÜRES TALÁLATI ÁLLAPOT */}
            {filteredResults.length === 0 && filteredCombinations.length === 0 ? (
              <div className="py-12 px-4 text-center bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2">
                <AlertCircle className="w-10 h-10 text-stone-400 mx-auto" />
                <h4 className="text-base font-black text-stone-800">Nincs megfelelő Mérődoboz találat</h4>
                <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                  A megadott konnektorok ellenpárjai közül egyik sem épül be a nyilvántartott mérődobozokba, vagy a beállított szűrő miatt nem látható találat.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. ELSŐKÉNT: EGYEDI MÉRŐDOBOZOK TALÁLATI LISTÁJA (ha van és a szűrő engedi) */}
                {viewModeFilter !== 'COMBOS' && filteredResults.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Box className="w-5 h-5 text-amber-600" />
                        <h3 className="text-base font-black text-stone-900">
                          Egyedi Mérődobozok (Egyetlen doboz)
                        </h3>
                        <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full">
                          {filteredResults.length} db
                        </span>
                      </div>
                      <span className="text-xs text-stone-500 hidden sm:inline">
                        Önálló mérődobozok egyezései
                      </span>
                    </div>

                    <div className="space-y-4">
                      {filteredResults.map((result) => {
                        const mb = result.meterBox;
                        const thumb = mb.images && mb.images.length > 0 ? mb.images[0] : null;

                        let badgeBg = '';
                        let badgeText = '';
                        let borderColor = '';
                        let statusTitle = '';

                        if (result.matchType === 'FULL') {
                          badgeBg = 'bg-emerald-600';
                          badgeText = 'text-white';
                          borderColor = 'border-emerald-400 ring-2 ring-emerald-100';
                          statusTitle = 'Minden konnektor és darabszám megegyezik';
                        } else if (result.matchType === 'QUANTITY_MISMATCH') {
                          badgeBg = 'bg-amber-500';
                          badgeText = 'text-stone-950 font-black';
                          borderColor = 'border-amber-400 ring-2 ring-amber-100';
                          statusTitle = 'Konnektor ellenpár megvan, de a darabszám kevesebb';
                        } else {
                          badgeBg = 'bg-orange-500';
                          badgeText = 'text-white';
                          borderColor = 'border-orange-400';
                          statusTitle = `Részleges egyezés (${result.matchedCount}/${result.totalRequired} konnektor)`;
                        }

                        return (
                          <div
                            key={mb.productId}
                            className={`bg-white rounded-2xl border-2 ${borderColor} shadow-xs overflow-hidden transition-all`}
                          >
                            {/* Kártya Fejléc */}
                            <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100">
                              <div className="flex items-center gap-3.5">
                                <div
                                  className="w-14 h-14 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer"
                                  onClick={() => onSelectProduct(mb)}
                                  title="Mérődoboz adatlap megnyitása"
                                >
                                  {thumb ? (
                                    <img src={thumb} alt={mb.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Gauge className="w-7 h-7 text-stone-400" />
                                  )}
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className="font-mono font-black text-base sm:text-lg text-stone-900 hover:text-amber-700 cursor-pointer hover:underline"
                                      onClick={() => onSelectProduct(mb)}
                                    >
                                      {mb.productId}
                                    </span>
                                    {mb.factoryCode && (
                                      <span className="font-mono text-xs bg-stone-100 border border-stone-200 px-2 py-0.5 rounded text-stone-700 font-bold">
                                        {mb.factoryCode}
                                      </span>
                                    )}
                                    <span
                                      className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${badgeBg} ${badgeText}`}
                                    >
                                      {statusTitle}
                                    </span>
                                  </div>

                                  <div className="text-sm font-bold text-stone-700 mt-0.5">{mb.name}</div>

                                  <div className="flex items-center gap-3 text-xs text-stone-500 mt-1">
                                    {mb.location && (
                                      <span className="flex items-center gap-1 font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                        <MapPin className="w-3 h-3" />
                                        <span>{mb.location}</span>
                                      </span>
                                    )}
                                    <span>
                                      Készlet:{' '}
                                      <strong
                                        className={
                                          mb.stockQuantity && mb.stockQuantity > 0
                                            ? 'text-emerald-700 font-mono font-bold'
                                            : 'text-stone-400 font-mono'
                                        }
                                      >
                                        {mb.stockQuantity ?? 0} db
                                      </strong>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                <button
                                  type="button"
                                  onClick={() => onSelectProduct(mb)}
                                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                  <span>Adatlap</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Részletező Párosítási Táblázat */}
                            <div className="p-4 sm:p-5 bg-stone-50/60 overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[11px] font-black">
                                    <th className="py-2 px-3">Keresett Konnektor</th>
                                    <th className="py-2 px-3 text-center">Szükséges db</th>
                                    <th className="py-2 px-3">Mérődobozban lévő Ellenpár</th>
                                    <th className="py-2 px-3 text-center">Dobozban lévő db</th>
                                    <th className="py-2 px-3 text-center w-28">Státusz</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-200/70 font-medium text-stone-800">
                                  {result.breakdown.map((item) => (
                                    <tr key={item.sourceConnectorId} className="hover:bg-white/80 transition-colors">
                                      <td className="py-2.5 px-3">
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-md bg-white border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                                            {item.sourceConnectorThumb ? (
                                              <img src={item.sourceConnectorThumb} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              <Box className="w-4 h-4 text-stone-400" />
                                            )}
                                          </div>
                                          <div>
                                            <div className="font-mono font-black text-stone-900">
                                              {item.sourceConnectorId}
                                            </div>
                                            {item.sourceConnectorName && (
                                              <div className="text-[11px] text-stone-500 truncate max-w-[200px]">
                                                {item.sourceConnectorName}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>

                                      <td className="py-2.5 px-3 text-center font-mono font-bold text-stone-900">
                                        {item.requiredQty} db
                                      </td>

                                      <td className="py-2.5 px-3">
                                        {item.isMatingPairPresent ? (
                                          <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-md bg-white border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                                              {item.matchedMatingPairThumb ? (
                                                <img src={item.matchedMatingPairThumb} alt="" className="w-full h-full object-cover" />
                                              ) : (
                                                <Box className="w-4 h-4 text-emerald-600" />
                                              )}
                                            </div>
                                            <div>
                                              <div className="font-mono font-black text-emerald-950">
                                                {item.matchedMatingPairId}
                                              </div>
                                              {item.matchedMatingPairName && (
                                                <div className="text-[11px] text-stone-500 truncate max-w-[200px]">
                                                  {item.matchedMatingPairName}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-stone-400 italic">Hiányzik a mérődobozból</span>
                                        )}
                                      </td>

                                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                                        {item.isMatingPairPresent ? (
                                          <span
                                            className={
                                              item.isQtySufficient
                                                ? 'text-emerald-700'
                                                : 'text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded'
                                            }
                                          >
                                            {item.availableQtyInBox} db
                                          </span>
                                        ) : (
                                          <span className="text-stone-300">0 db</span>
                                        )}
                                      </td>

                                      <td className="py-2.5 px-3 text-center">
                                        {item.isMatingPairPresent ? (
                                          item.isQtySufficient ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                              <Check className="w-3 h-3" />
                                              <span>Egyezik</span>
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                                              <AlertTriangle className="w-3 h-3" />
                                              <span>Kevesebb</span>
                                            </span>
                                          )
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                            <X className="w-3 h-3" />
                                            <span>Hiányzik</span>
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. MÁSODIKKÉNT (UTÁNA): TÖBB MÉRŐDOBOZOS KOMBINÁCIÓK (X + Y + Z + W + ...) */}
                {viewModeFilter !== 'SINGLE' && combinationResults.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b-2 border-purple-300 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                          <Boxes className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-purple-950 flex items-center gap-2">
                            <span>Több Mérődobozos Kombinációk</span>
                            <span className="text-xs font-mono font-bold bg-purple-600 text-white px-2.5 py-0.5 rounded-full">
                              2, 3, 4 vagy 5 doboz
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-900 font-extrabold px-2 py-0.5 rounded-md">
                              {filteredCombinations.length} megoldás
                            </span>
                          </h3>
                          <p className="text-xs text-purple-800">
                            Összetett konfigurációk, amelyek több mérődoboz (2, 3, 4 vagy 5 doboz) együttes használatával fedik le a keresett konnektorokat és darabszámokat
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dobozszám szerinti szűrő: Mind | 2 dobozos | 3 dobozos | 4 dobozos | 5 dobozos */}
                    <div className="flex items-center gap-1.5 flex-wrap p-2.5 bg-purple-50/80 border border-purple-200 rounded-xl">
                      <span className="text-xs font-black uppercase text-purple-950 mr-1 flex items-center gap-1">
                        <Boxes className="w-3.5 h-3.5 text-purple-700" />
                        <span>Dobozok száma:</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setComboSizeFilter('ALL')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          comboSizeFilter === 'ALL'
                            ? 'bg-purple-900 text-white shadow-xs'
                            : 'bg-white text-purple-900 hover:bg-purple-100 border border-purple-200'
                        }`}
                      >
                        Összes ({counts.comboTotal})
                      </button>

                      {counts.combo2Count > 0 && (
                        <button
                          type="button"
                          onClick={() => setComboSizeFilter(2)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            comboSizeFilter === 2
                              ? 'bg-purple-900 text-white shadow-xs'
                              : 'bg-white text-purple-900 hover:bg-purple-100 border border-purple-200'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-purple-400" />
                          <span>2 doboz (X + Y)</span>
                          <span className="text-[11px] font-black opacity-80">({counts.combo2Count})</span>
                        </button>
                      )}

                      {counts.combo3Count > 0 && (
                        <button
                          type="button"
                          onClick={() => setComboSizeFilter(3)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            comboSizeFilter === 3
                              ? 'bg-purple-900 text-white shadow-xs'
                              : 'bg-white text-purple-900 hover:bg-purple-100 border border-purple-200'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-indigo-400" />
                          <span>3 doboz (X + Y + Z)</span>
                          <span className="text-[11px] font-black opacity-80">({counts.combo3Count})</span>
                        </button>
                      )}

                      {counts.combo4Count > 0 && (
                        <button
                          type="button"
                          onClick={() => setComboSizeFilter(4)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            comboSizeFilter === 4
                              ? 'bg-purple-900 text-white shadow-xs'
                              : 'bg-white text-purple-900 hover:bg-purple-100 border border-purple-200'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-pink-400" />
                          <span>4 doboz (X + Y + Z + W)</span>
                          <span className="text-[11px] font-black opacity-80">({counts.combo4Count})</span>
                        </button>
                      )}

                      {counts.combo5Count > 0 && (
                        <button
                          type="button"
                          onClick={() => setComboSizeFilter(5)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            comboSizeFilter === 5
                              ? 'bg-purple-900 text-white shadow-xs'
                              : 'bg-white text-purple-900 hover:bg-purple-100 border border-purple-200'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span>5 doboz</span>
                          <span className="text-[11px] font-black opacity-80">({counts.combo5Count})</span>
                        </button>
                      )}
                    </div>

                    {filteredCombinations.length === 0 ? (
                      <div className="p-8 text-center bg-purple-50/50 rounded-xl border border-purple-200 text-stone-600 text-xs">
                        Nincs a kiválasztott szűrőknek megfelelő {comboSizeFilter !== 'ALL' ? `${comboSizeFilter} dobozos ` : ''}kombináció.
                        {comboSizeFilter !== 'ALL' && (
                          <button
                            type="button"
                            onClick={() => setComboSizeFilter('ALL')}
                            className="block mx-auto mt-2 text-purple-700 font-bold underline cursor-pointer"
                          >
                            Összes méret mutatása
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-5">
                      {filteredCombinations.map((combo) => {
                        let badgeBg = '';
                        let badgeText = '';
                        let borderColor = '';
                        let statusTitle = '';
                        let statusDesc = '';

                        if (combo.matchType === 'FULL') {
                          badgeBg = 'bg-emerald-600';
                          badgeText = 'text-white';
                          borderColor = 'border-purple-300 ring-2 ring-emerald-300';
                          statusTitle = 'Teljes fedés kombinációval';
                          statusDesc = 'Minden konnektor ellenpárja és a szükséges darabszámok is biztosítva vannak a dobozokból összerakva!';
                        } else if (combo.matchType === 'QUANTITY_MISMATCH') {
                          badgeBg = 'bg-amber-500';
                          badgeText = 'text-stone-950 font-black';
                          borderColor = 'border-purple-300 ring-2 ring-amber-300';
                          statusTitle = 'Konnektorok megvannak, de a darabszám kevesebb';
                          statusDesc = 'Az összes konnektor ellenpárja megtalálható a dobozokban, de a kombinált darabszám kisebb az elvártnál.';
                        } else {
                          badgeBg = 'bg-orange-500';
                          badgeText = 'text-white';
                          borderColor = 'border-orange-300';
                          statusTitle = `Részleges kombináció (${combo.coveredCount}/${combo.totalRequired} konnektor)`;
                          statusDesc = 'A keresett konnektorok egy része lefedhető ezekkel a dobozokkal.';
                        }

                        return (
                          <div
                            key={combo.id}
                            className={`bg-white rounded-2xl border-2 ${borderColor} shadow-md overflow-hidden transition-all`}
                          >
                            {/* Kombináció Fejléc & Képlet (X + Y + Z) */}
                            <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950 via-purple-900 to-stone-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <div className="text-[11px] font-extrabold uppercase tracking-wider text-purple-300 mb-1 flex items-center gap-1.5">
                                  <Boxes className="w-3.5 h-3.5" />
                                  <span>Összeállított Kombináció ({combo.boxes.length} mérődoboz):</span>
                                </div>

                                <div className="flex items-center gap-2.5 flex-wrap">
                                  {/* Képlet buborék: X + Y */}
                                  <div className="font-mono font-black text-base sm:text-xl text-amber-300 bg-white/10 px-3.5 py-1 rounded-xl border border-white/20 tracking-wide flex items-center gap-2">
                                    <span>{combo.titleFormula}</span>
                                  </div>

                                  <span
                                    className={`text-xs px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${badgeBg} ${badgeText}`}
                                  >
                                    {statusTitle}
                                  </span>
                                </div>

                                <p className="text-xs text-purple-200 mt-1.5">
                                  {statusDesc}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-bold bg-white/10 text-purple-200 px-3 py-1.5 rounded-xl border border-white/10">
                                  {combo.coveredCount} / {combo.totalRequired} konnektor lefedve
                                </span>
                              </div>
                            </div>

                            {/* Résztvevő Mérődobozok Kártyái */}
                            <div className="p-4 sm:p-5 bg-purple-50/40 border-b border-purple-100">
                              <div className="text-xs font-extrabold uppercase tracking-wider text-purple-900 mb-2.5">
                                A kombinációban szereplő mérődobozok adatai:
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {combo.boxes.map((box, bIdx) => {
                                  const thumb = box.images && box.images.length > 0 ? box.images[0] : null;
                                  return (
                                    <div
                                      key={box.productId}
                                      className="p-3 bg-white rounded-xl border border-purple-200 shadow-2xs flex items-center justify-between gap-3"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-12 h-12 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shrink-0">
                                          {thumb ? (
                                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <Gauge className="w-6 h-6 text-stone-400" />
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-black bg-purple-100 text-purple-900 px-1.5 py-0.2 rounded font-mono">
                                              #{bIdx + 1}
                                            </span>
                                            <span
                                              className="font-mono font-black text-sm text-stone-900 truncate hover:text-purple-700 cursor-pointer"
                                              onClick={() => onSelectProduct(box)}
                                              title="Adatlap megnyitása"
                                            >
                                              {box.productId}
                                            </span>
                                          </div>
                                          <div className="text-xs text-stone-600 truncate">{box.name}</div>
                                          <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                                            {box.location && (
                                              <span className="font-mono font-bold text-blue-700">
                                                {box.location}
                                              </span>
                                            )}
                                            <span>Készlet: <strong>{box.stockQuantity ?? 0} db</strong></span>
                                          </div>
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => onSelectProduct(box)}
                                        className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer shrink-0"
                                        title="Mérődoboz adatlap megnyitása"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Részletes Konnektor-Lefedettségi Táblázat a Kombinációhoz */}
                            <div className="p-4 sm:p-5 bg-white overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[11px] font-black">
                                    <th className="py-2 px-3">Keresett Konnektor</th>
                                    <th className="py-2 px-3 text-center">Szükséges db</th>
                                    <th className="py-2 px-3">Melyik mérődoboz adja az ellenpárt?</th>
                                    <th className="py-2 px-3 text-center">Összes elérhető db</th>
                                    <th className="py-2 px-3 text-center w-36">Státusz</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-200/70 font-medium text-stone-800">
                                  {combo.breakdown.map((item) => (
                                    <tr key={item.sourceConnectorId} className="hover:bg-purple-50/40 transition-colors">
                                      {/* Keresett konnektor */}
                                      <td className="py-2.5 px-3">
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-md bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                                            {item.sourceConnectorThumb ? (
                                              <img src={item.sourceConnectorThumb} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              <Box className="w-4 h-4 text-stone-400" />
                                            )}
                                          </div>
                                          <div>
                                            <div className="font-mono font-black text-stone-900">
                                              {item.sourceConnectorId}
                                            </div>
                                            {item.sourceConnectorName && (
                                              <div className="text-[11px] text-stone-500 truncate max-w-[180px]">
                                                {item.sourceConnectorName}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>

                                      {/* Szükséges db */}
                                      <td className="py-2.5 px-3 text-center font-mono font-bold text-stone-900">
                                        {item.requiredQty} db
                                      </td>

                                      {/* Melyik mérődoboz adja? */}
                                      <td className="py-2.5 px-3">
                                        {item.contributions.length > 0 ? (
                                          <div className="space-y-1.5">
                                            {item.contributions.map((c, cIdx) => (
                                              <div
                                                key={cIdx}
                                                className="flex items-center gap-2 p-1.5 bg-purple-50/80 rounded-lg border border-purple-200 text-[11px]"
                                              >
                                                <span className="font-mono font-black text-purple-900">
                                                  📦 {c.meterBoxId}:
                                                </span>
                                                <span className="text-stone-700">
                                                  Ellenpár:{' '}
                                                  <strong className="font-mono text-emerald-950">
                                                    {c.matchedMatingPairId}
                                                  </strong>
                                                </span>
                                                <span className="font-mono font-bold bg-white px-1.5 py-0.2 rounded border border-purple-300 text-purple-950 ml-auto">
                                                  {c.providedQty} db
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-stone-400 italic">
                                            Egyik mérődobozban sem szerepel ellenpár
                                          </span>
                                        )}
                                      </td>

                                      {/* Összes elérhető db */}
                                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                                        {item.isCovered ? (
                                          <span
                                            className={
                                              item.isQtySufficient
                                                ? 'text-emerald-700 font-black'
                                                : 'text-amber-700 bg-amber-100 px-2 py-0.5 rounded'
                                            }
                                          >
                                            {item.totalAvailableQty} db
                                          </span>
                                        ) : (
                                          <span className="text-stone-300">0 db</span>
                                        )}
                                      </td>

                                      {/* Státusz */}
                                      <td className="py-2.5 px-3 text-center">
                                        {item.isCovered ? (
                                          item.isQtySufficient ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                              <Check className="w-3 h-3" />
                                              <span>Kombinációval OK</span>
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                                              <AlertTriangle className="w-3 h-3" />
                                              <span>Kevesebb db</span>
                                            </span>
                                          )
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                            <X className="w-3 h-3" />
                                            <span>Hiányzik</span>
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              </div>
            )}
          </section>
        )}
      </main>

      {/* 3. MODAL: Konnektor hozzáadása (KIZÁRÓLAG KONNEKTOR KATEGÓRIA) */}
      {isAddConnectorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-300">
            {/* Modal Header */}
            <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Konnektor hozzáadása a kereséshez</h3>
                  <p className="text-xs text-amber-100">Kizárólag a Konnektor kategóriájú alkatrészek</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddConnectorModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Keresőmező */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-stone-600">
                  Konnektor Cikkszám vagy Név keresése:
                </label>
                <div className="relative">
                  <Search className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={connectorSearchInput}
                    onChange={(e) => setConnectorSearchInput(e.target.value)}
                    placeholder="pl. 4101621124..."
                    className="w-full pl-10 pr-3 py-2.5 border-2 border-stone-200 focus:border-amber-600 focus:outline-hidden rounded-xl font-mono text-sm font-bold text-stone-900"
                    autoFocus
                  />
                </div>
              </div>

              {/* Darabszám beállítása hozzáadáskor */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-stone-800">Alapértelmezett beépülő darabszám:</div>
                  <div className="text-[11px] text-stone-500">Hány darab épül be a termékbe?</div>
                </div>
                <div className="flex items-center border border-stone-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setNewConnectorQty(Math.max(1, newConnectorQty - 1))}
                    disabled={newConnectorQty <= 1}
                    className="px-2.5 py-1 text-stone-600 hover:bg-stone-100 disabled:opacity-30 cursor-pointer font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={newConnectorQty}
                    onChange={(e) => setNewConnectorQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 text-center font-mono font-black text-xs py-1 bg-transparent focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setNewConnectorQty(newConnectorQty + 1)}
                    className="px-2.5 py-1 text-stone-600 hover:bg-stone-100 cursor-pointer font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Konnektor lista */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase text-stone-500">
                  Válasszon konnektort ({connectorSuggestions.length}):
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-xl bg-white">
                  {connectorSuggestions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-stone-400">
                      Nincs találat a Konnektor kategóriában erre a keresésre.
                    </div>
                  ) : (
                    connectorSuggestions.map((p) => {
                      const thumb = p.images && p.images.length > 0 ? p.images[0] : null;
                      const isAlreadyIn = connectorRequirements.some(
                        (r) => r.connectorId.trim().toLowerCase() === p.productId.trim().toLowerCase()
                      );

                      return (
                        <div
                          key={p.productId}
                          onClick={() => handleAddConnector(p, newConnectorQty)}
                          className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                            isAlreadyIn ? 'bg-amber-50/80 font-bold' : 'hover:bg-amber-50/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shrink-0">
                              {thumb ? (
                                <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <Box className="w-5 h-5 text-stone-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-mono font-black text-sm text-stone-900">
                                {p.productId}
                              </div>
                              <div className="text-stone-600 truncate">{p.name}</div>
                              <div className="text-[11px] text-stone-400">
                                Készlet: {p.stockQuantity ?? 0} db
                              </div>
                            </div>
                          </div>

                          <span className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-2xs shrink-0">
                            {isAlreadyIn ? '+ Növelés' : 'Kiválaszt'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddConnectorModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 font-bold text-xs text-stone-800 transition-colors cursor-pointer"
                >
                  Bezárás
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
