import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product, ProductTerminalFejRelation, ProductTerminalFejDisconnection } from '../types/product';
import { sanitizeDocId } from './productService';
import { getAllCrimpRecords, normalizeKey, reloadCrimpRecords } from './crimpHeightService';
import { TerminalCrimpRecord } from '../types/crimpHeight';

export const TERMINAL_FEJ_COLLECTION = 'product_terminal_fejek';
export const TERMINAL_FEJ_DISCONNECTIONS_COLLECTION = 'product_terminal_fej_disconnections';
export const LOCAL_STORAGE_KEY = 'raktar_terminal_fejek_v1';
export const LOCAL_STORAGE_DISCONNECTIONS_KEY = 'raktar_terminal_fej_disconnections_v1';

/**
 * Normalizes a Saruzó Fej code for comparison:
 * e.g. "N°38", "N° 38", "N38", "N-38", "No. 38" -> "n38"
 * e.g. "N°1", "N1", "1" -> "n1"
 */
export function normalizeFejCode(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const m1 = trimmed.match(/^(?:n[°º#\.\s\-]*|no\.?\s*)(\d+)$/i);
  if (m1) {
    return `n${m1[1]}`;
  }
  if (/^\d+$/.test(trimmed)) {
    return `n${trimmed}`;
  }
  return trimmed
    .toLowerCase()
    .replace(/[°º#\s\-_.]/g, '')
    .replace(/^no/g, 'n');
}

/**
 * Standardizes a Saruzó Fej display code:
 * e.g. "N°1", "N° 1", "No. 1", "No 1", "1" -> "N1"
 * e.g. "N°7", "N7" -> "N7"
 * e.g. "N°38" -> "N38"
 */
export function cleanFejDisplay(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const m1 = trimmed.match(/^(?:n[°º#\.\s\-]*|no\.?\s*)(\d+)$/i);
  if (m1) {
    return `N${m1[1]}`;
  }
  if (/^\d{1,4}$/.test(trimmed)) {
    return `N${trimmed}`;
  }
  return trimmed.replace(/°/g, '').trim();
}

/**
 * Splits multiple fej codes in a single string, e.g. "N°108 , N°49" -> ["N°108", "N°49"]
 */
export function splitFejCodes(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Checks if a category or name corresponds to an alkatrész (Saruzófej Alkatrész, Beépülő alkatrész, Alkatrész, etc.)
 * Az alkatrészek nem saruzófejek és nem kapcsolódnak sarukhoz!
 */
export function isAlkatreszCategory(categoryOrName?: string): boolean {
  if (!categoryOrName) return false;
  const c = categoryOrName.toLowerCase();
  return (
    c.includes('alkatrész') ||
    c.includes('alkatresz') ||
    c.includes('alkatrsz') ||
    c.includes('beépülő') ||
    c.includes('beepulo') ||
    c.includes('alk.') ||
    c.includes('pótalkatrész') ||
    c.includes('potalkatresz') ||
    c.includes('spare part') ||
    c.includes('component')
  );
}

/**
 * Checks if a category corresponds to Saruzófej / Applikátor
 * Megjegyzés: A "Saruzófej Alkatrész" alkatrész, ezért NEM minősül saruzófejnek!
 */
export function isFejCategory(category?: string): boolean {
  if (!category) return false;
  if (isAlkatreszCategory(category)) return false;
  const c = category.toLowerCase();
  return (
    c.includes('saruzófej') ||
    c.includes('saruzofej') ||
    c.includes('saruzó fej') ||
    c.includes('applikátor') ||
    c.includes('fej')
  );
}

/**
 * Checks if a category corresponds to Saru (terminal)
 */
export function isSaruCategory(category?: string): boolean {
  if (!category) return false;
  if (isAlkatreszCategory(category)) return false;
  const c = category.toLowerCase();
  return c.includes('saru') && !isFejCategory(category);
}

/**
 * Checks if a product belongs to Saru or Saruzófej categories
 */
export function isTerminalFejRelatedCategory(category?: string): boolean {
  if (isAlkatreszCategory(category)) return false;
  return isSaruCategory(category) || isFejCategory(category);
}

/**
 * Checks if a given product corresponds to an applicator fej code (e.g. "N°1" matches product with name "N1")
 * Uses strict word/digit boundaries so N1/N°1 will NEVER match N183 or N18, and N7/N°7 will NEVER match N74!
 */
export function matchesFej(product: Product, fejCode: string): boolean {
  // Alkatrész (pl. Saruzófej alkatrész) sosem egyezhet meg saruzófejként!
  if (isAlkatreszCategory(product.category) || isAlkatreszCategory(product.name)) {
    return false;
  }
  const target = normalizeFejCode(fejCode);
  if (!target) return false;

  const normName = normalizeFejCode(product.name);
  const normId = normalizeFejCode(product.productId);
  const normFactory = normalizeFejCode(product.factoryCode);

  // 1. Direct exact match on normalized codes
  if (normName === target || normId === target || normFactory === target) {
    return true;
  }

  // 2. If target is an N-series code (e.g. "n1", "n7", "n38", "n183")
  const nMatch = target.match(/^n(\d+)$/);
  if (nMatch) {
    const num = nMatch[1];
    // Exact word boundary regex:
    // Requires boundary/non-alphanumeric, then 'N' (or 'N°' or 'No.'), then the EXACT number,
    // followed by NON-ALPHANUMERIC or end of string!
    // (This strictly prevents "n1" matching "n183" or "n10" or "n18", and "n7" matching "n74"!)
    const exactRegex = new RegExp(`(?:^|[^a-zA-Z0-9])(?:n[°º#\\.\\s\\-]*|no\\.?\\s*|)${num}(?![0-9a-zA-Z])`, 'i');

    if (product.name && exactRegex.test(product.name)) return true;
    if (product.productId && exactRegex.test(product.productId)) return true;
    if (product.factoryCode && exactRegex.test(product.factoryCode)) return true;
    if (isFejCategory(product.category) && product.description && exactRegex.test(product.description)) {
      return true;
    }
    return false;
  }

  // 3. For non-N-series codes (e.g. "MLS0185-J", "M2 Compact", "TE Ocean"):
  const fields = [product.name, product.productId, product.factoryCode].filter(Boolean) as string[];
  for (const f of fields) {
    const tokens = f.split(/[^a-zA-Z0-9]+/).map((t) => normalizeFejCode(t)).filter(Boolean);
    if (tokens.some((t) => t === target)) return true;
  }

  return false;
}

/**
 * Finds the most relevant Saruzófej product from catalog for a given applicator fej code.
 * Prioritizes exact matches, then Saruzófej category matches with strict boundaries.
 */
export function findMatchingFejProduct(cFej: string, allProducts: Product[]): Product | null {
  const normFej = normalizeFejCode(cFej);
  const cleanFej = cleanFejDisplay(cFej);
  if (!normFej) return null;

  // 1. Exact match on Fej category products (by name or productId)
  const exactFej = allProducts.find(
    (p) =>
      isFejCategory(p.category) &&
      (normalizeFejCode(p.name) === normFej || normalizeFejCode(p.productId) === normFej)
  );
  if (exactFej) return exactFej;

  // 2. Exact match on any product (by name or productId)
  const exactAny = allProducts.find(
    (p) => normalizeFejCode(p.name) === normFej || normalizeFejCode(p.productId) === normFej
  );
  if (exactAny) return exactAny;

  // 3. Word boundary match on Fej category products
  const wordFej = allProducts.find((p) => isFejCategory(p.category) && matchesFej(p, cFej));
  if (wordFej) return wordFej;

  // 4. Word boundary match on any product
  const wordAny = allProducts.find((p) => matchesFej(p, cFej));
  if (wordAny) return wordAny;

  // 5. Direct ID / clean match in catalog
  const cleanLower = cleanFej.toLowerCase();
  const byClean = allProducts.find(
    (p) => p.productId.toLowerCase() === cleanLower || (p.name && p.name.toLowerCase() === cleanLower)
  );
  if (byClean) return byClean;

  return null;
}

/**
 * Builds consistent document ID for a Saru <-> Saruzófej relation
 */
export function buildTerminalFejRelationDocId(p1: string, p2: string): string {
  const s1 = sanitizeDocId(p1.trim());
  const s2 = sanitizeDocId(p2.trim());
  return `${s1}__${s2}`;
}

/**
 * Automatically extracts Saru <-> Saruzófej relations from the Crimp Table records.
 * For example: Crimp record with saruCode "282378/1" and applicatorFej "N°38"
 * maps to a bidirectional relation between the Saru and the Saruzófej product (N38 / 40107.00.38).
 */
export function generateAutoTerminalFejRelations(products: Product[] = []): ProductTerminalFejRelation[] {
  const crimps = getAllCrimpRecords();
  const relationMap = new Map<string, ProductTerminalFejRelation>();

  // Map of normalized Fej code -> product in catalog
  const fejProductsMap = new Map<string, Product>();
  products.forEach((p) => {
    if (isFejCategory(p.category)) {
      const code = normalizeFejCode(p.name) || normalizeFejCode(p.productId);
      if (code) {
        fejProductsMap.set(code, p);
      }
    }
  });

  crimps.forEach((c) => {
    if (!c.applicatorFej || !c.applicatorFej.trim()) return;

    const fejList = splitFejCodes(c.applicatorFej);
    fejList.forEach((rawFej) => {
      const normFej = normalizeFejCode(rawFej);
      const cleanFej = cleanFejDisplay(rawFej);
      if (!normFej) return;

      // Find Saruzófej target identifier:
      // If a product exists in catalog (e.g. 40107.00.38 / N38), prefer its productId,
      // otherwise use the clean standard Fej name (e.g. N1, N7, N38)
      const matchingFejProduct =
        fejProductsMap.get(normFej) ||
        findMatchingFejProduct(rawFej, products);
      const fejId = matchingFejProduct ? matchingFejProduct.productId : cleanFej;

      // Identify candidate Saru product IDs:
      const candidateSaruIds = new Set<string>();
      if (c.saruCode) candidateSaruIds.add(c.saruCode.trim());
      if (c.productId && c.productId !== c.saruCode) candidateSaruIds.add(c.productId.trim());

      candidateSaruIds.forEach((saruId) => {
        if (!saruId || saruId.toLowerCase() === fejId.toLowerCase()) return;

        // Bidirectional pair: saruId -> fejId and fejId -> saruId
        const id1 = buildTerminalFejRelationDocId(saruId, fejId);
        if (!relationMap.has(id1)) {
          relationMap.set(id1, {
            id: id1,
            productId1: saruId,
            productId2: fejId,
            updatedAt: new Date().toISOString()
          });
        }

        const id2 = buildTerminalFejRelationDocId(fejId, saruId);
        if (!relationMap.has(id2)) {
          relationMap.set(id2, {
            id: id2,
            productId1: fejId,
            productId2: saruId,
            updatedAt: new Date().toISOString()
          });
        }
      });
    });
  });

  return Array.from(relationMap.values());
}

// Initial seed relations (including user's N°38 <-> 282378/1, 284108-1, etc.)
export const INITIAL_TERMINAL_FEJ_RELATIONS: ProductTerminalFejRelation[] = [
  {
    id: '282378/1__40107.00.38',
    productId1: '282378/1',
    productId2: '40107.00.38',
    updatedAt: new Date().toISOString()
  },
  {
    id: '40107.00.38__282378/1',
    productId1: '40107.00.38',
    productId2: '282378/1',
    updatedAt: new Date().toISOString()
  },
  {
    id: '284108-1__40107.00.38',
    productId1: '284108-1',
    productId2: '40107.00.38',
    updatedAt: new Date().toISOString()
  },
  {
    id: '40107.00.38__284108-1',
    productId1: '40107.00.38',
    productId2: '284108-1',
    updatedAt: new Date().toISOString()
  },
  {
    id: '2551120022__40107.00.38',
    productId1: '2551120022',
    productId2: '40107.00.38',
    updatedAt: new Date().toISOString()
  },
  {
    id: '40107.00.38__2551120022',
    productId1: '40107.00.38',
    productId2: '2551120022',
    updatedAt: new Date().toISOString()
  },
  {
    id: '4030610910__40107.00.33',
    productId1: '4030610910',
    productId2: '40107.00.33',
    updatedAt: new Date().toISOString()
  },
  {
    id: '40107.00.33__4030610910',
    productId1: '40107.00.33',
    productId2: '4030610910',
    updatedAt: new Date().toISOString()
  }
];

let memoryTerminalFejek: ProductTerminalFejRelation[] | null = null;
let memoryDisconnections: ProductTerminalFejDisconnection[] = [];

export function getLocalStoredTerminalFejek(): ProductTerminalFejRelation[] {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Could not read terminal-fej relations from localStorage:', err);
    }
  }
  return memoryTerminalFejek || INITIAL_TERMINAL_FEJ_RELATIONS;
}

export function saveLocalTerminalFejek(relations: ProductTerminalFejRelation[]): void {
  memoryTerminalFejek = relations;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(relations));
    } catch (err) {
      console.warn('Could not save terminal-fej relations to localStorage:', err);
    }
  }
}

/**
 * Seed initial sample Saru <-> Saruzófej relations if Firestore collection is empty
 */
export async function seedInitialTerminalFejekIfEmpty(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, TERMINAL_FEJ_COLLECTION));
    if (snapshot.empty) {
      console.log('Seeding initial Saru <-> Saruzófej relations into Firestore...');
      const batch = writeBatch(db);
      INITIAL_TERMINAL_FEJ_RELATIONS.forEach((rel) => {
        const docRef = doc(db, TERMINAL_FEJ_COLLECTION, rel.id);
        batch.set(docRef, {
          id: rel.id,
          productId1: rel.productId1,
          productId2: rel.productId2,
          updatedAt: rel.updatedAt || new Date().toISOString()
        });
      });
      await batch.commit();
      console.log('Seeded Saru <-> Saruzófej relations successfully!');
    }
  } catch (err) {
    console.warn('Terminal-fej initial seeding skipped:', err);
  }
}

/**
 * Real-time subscription to Saru <-> Saruzófej relations in Firestore
 */
export function subscribeToTerminalFejek(
  onUpdate: (relations: ProductTerminalFejRelation[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, TERMINAL_FEJ_COLLECTION),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ProductTerminalFejRelation[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            const rawQty = data.quantity;
            const parsedQty = typeof rawQty === 'number' && !isNaN(rawQty) && rawQty > 0
              ? rawQty
              : rawQty ? Number(rawQty) : 1;
            list.push({
              id: d.id,
              productId1: data.productId1 || '',
              productId2: data.productId2 || '',
              quantity: (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 1,
              updatedAt: data.updatedAt || new Date().toISOString()
            });
          });
          saveLocalTerminalFejek(list);
          onUpdate(list);
        } else {
          onUpdate(getLocalStoredTerminalFejek());
        }
      },
      (error) => {
        console.warn('Firestore terminal-fejek subscription error:', error);
        if (onError) onError(error);
        onUpdate(getLocalStoredTerminalFejek());
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to setup Firestore terminal-fejek listener:', err);
    onUpdate(getLocalStoredTerminalFejek());
    return () => {};
  }
}

export function getLocalStoredTerminalFejDisconnections(): ProductTerminalFejDisconnection[] {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_DISCONNECTIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Could not read terminal-fej disconnections from localStorage:', err);
    }
  }
  return memoryDisconnections || [];
}

export function saveLocalTerminalFejDisconnections(disconnections: ProductTerminalFejDisconnection[]): void {
  memoryDisconnections = disconnections;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_DISCONNECTIONS_KEY, JSON.stringify(disconnections));
    } catch (err) {
      console.warn('Could not save terminal-fej disconnections to localStorage:', err);
    }
  }
}

/**
 * Real-time subscription to Saru <-> Saruzófej disconnections (exclusions) in Firestore
 */
export function subscribeToTerminalFejDisconnections(
  onUpdate: (disconnections: ProductTerminalFejDisconnection[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, TERMINAL_FEJ_DISCONNECTIONS_COLLECTION),
      (snapshot) => {
        const list: ProductTerminalFejDisconnection[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            productId1: data.productId1 || '',
            productId2: data.productId2 || '',
            updatedAt: data.updatedAt || new Date().toISOString()
          });
        });
        saveLocalTerminalFejDisconnections(list);
        onUpdate(list);
      },
      (error) => {
        console.warn('Firestore terminal-fej disconnections subscription error:', error);
        if (onError) onError(error);
        onUpdate(getLocalStoredTerminalFejDisconnections());
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to setup Firestore terminal-fej disconnections listener:', err);
    onUpdate(getLocalStoredTerminalFejDisconnections());
    return () => {};
  }
}

/**
 * Checks if a specific pair of Fej and Saru has been explicitly disconnected by the user.
 */
export function isTerminalFejDisconnected(
  fejIdentifiers: (string | undefined | null)[],
  saruIdentifiers: (string | undefined | null)[],
  disconnections: ProductTerminalFejDisconnection[] = []
): boolean {
  if (!disconnections || disconnections.length === 0) return false;

  const validFejs = new Set<string>();
  fejIdentifiers.filter(Boolean).forEach((f) => {
    const raw = String(f).trim();
    if (!raw) return;
    validFejs.add(raw.toLowerCase());
    const norm = normalizeFejCode(raw);
    if (norm) validFejs.add(norm.toLowerCase());
    const clean = cleanFejDisplay(raw);
    if (clean) validFejs.add(clean.toLowerCase());
  });

  const validSarus = new Set<string>();
  saruIdentifiers.filter(Boolean).forEach((s) => {
    const raw = String(s).trim();
    if (!raw) return;
    validSarus.add(raw.toLowerCase());
    const norm = normalizeKey(raw);
    if (norm) validSarus.add(norm.toLowerCase());
  });

  for (const disc of disconnections) {
    const p1Raw = (disc.productId1 || '').trim().toLowerCase();
    const p2Raw = (disc.productId2 || '').trim().toLowerCase();
    const p1NormFej = normalizeFejCode(p1Raw);
    const p2NormFej = normalizeFejCode(p2Raw);
    const p1NormKey = normalizeKey(p1Raw);
    const p2NormKey = normalizeKey(p2Raw);

    // Direction 1: p1 is Fej and p2 is Saru
    const p1IsFej = validFejs.has(p1Raw) || (p1NormFej && validFejs.has(p1NormFej));
    const p2IsSaru = validSarus.has(p2Raw) || (p2NormKey && validSarus.has(p2NormKey));
    if (p1IsFej && p2IsSaru) return true;

    // Direction 2: p1 is Saru and p2 is Fej
    const p1IsSaru = validSarus.has(p1Raw) || (p1NormKey && validSarus.has(p1NormKey));
    const p2IsFej = validFejs.has(p2Raw) || (p2NormFej && validFejs.has(p2NormFej));
    if (p1IsSaru && p2IsFej) return true;
  }

  return false;
}

/**
 * Saves a bidirectional Saru <-> Saruzófej relation.
 * Also thoroughly removes ANY previous disconnection / exclusion for this pair so it becomes active again.
 */
export async function saveTerminalFejRelation(
  p1: string,
  p2: string,
  allProducts: Product[] = [],
  specificDocId?: string,
  quantity?: number
): Promise<{ success: boolean; error?: string; relations?: ProductTerminalFejRelation[] }> {
  const s1 = p1.trim();
  const s2 = p2.trim();
  if (!s1 || !s2 || s1.toLowerCase() === s2.toLowerCase()) {
    return { success: false, error: 'Érvénytelen Saru vagy Saruzófej azonosítók!' };
  }

  const qty = typeof quantity === 'number' && !isNaN(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
  const id1 = buildTerminalFejRelationDocId(s1, s2);
  const id2 = buildTerminalFejRelationDocId(s2, s1);
  const now = new Date().toISOString();

  // Find products for s1 and s2
  const prod1 = allProducts.find(
    (p) =>
      p.productId.toLowerCase() === s1.toLowerCase() ||
      (p.name && p.name.toLowerCase() === s1.toLowerCase()) ||
      (p.factoryCode && p.factoryCode.toLowerCase() === s1.toLowerCase())
  );
  const prod2 = allProducts.find(
    (p) =>
      p.productId.toLowerCase() === s2.toLowerCase() ||
      (p.name && p.name.toLowerCase() === s2.toLowerCase()) ||
      (p.factoryCode && p.factoryCode.toLowerCase() === s2.toLowerCase())
  );

  const is1Fej = prod1 ? isFejCategory(prod1.category) : /^(?:n[°º#\.\s\-]*|no\.?\s*)?\d{1,4}$/i.test(s1);
  const is2Fej = prod2 ? isFejCategory(prod2.category) : /^(?:n[°º#\.\s\-]*|no\.?\s*)?\d{1,4}$/i.test(s2);

  const keys1 = new Set<string>([s1]);
  if (prod1) {
    keys1.add(prod1.productId);
    if (prod1.name) keys1.add(prod1.name);
    if (prod1.factoryCode) keys1.add(prod1.factoryCode);
  }
  if (is1Fej) {
    const clean = cleanFejDisplay(s1);
    if (clean) keys1.add(clean);
    const norm = normalizeFejCode(s1);
    if (norm) keys1.add(norm);
    if (prod1?.name) {
      const c = cleanFejDisplay(prod1.name);
      if (c) keys1.add(c);
      const n = normalizeFejCode(prod1.name);
      if (n) keys1.add(n);
    }
  } else {
    const norm = normalizeKey(s1);
    if (norm) keys1.add(norm);
    if (prod1?.productId) {
      const n = normalizeKey(prod1.productId);
      if (n) keys1.add(n);
    }
  }

  const keys2 = new Set<string>([s2]);
  if (prod2) {
    keys2.add(prod2.productId);
    if (prod2.name) keys2.add(prod2.name);
    if (prod2.factoryCode) keys2.add(prod2.factoryCode);
  }
  if (is2Fej) {
    const clean = cleanFejDisplay(s2);
    if (clean) keys2.add(clean);
    const norm = normalizeFejCode(s2);
    if (norm) keys2.add(norm);
    if (prod2?.name) {
      const c = cleanFejDisplay(prod2.name);
      if (c) keys2.add(c);
      const n = normalizeFejCode(prod2.name);
      if (n) keys2.add(n);
    }
  } else {
    const norm = normalizeKey(s2);
    if (norm) keys2.add(norm);
    if (prod2?.productId) {
      const n = normalizeKey(prod2.productId);
      if (n) keys2.add(n);
    }
  }

  const disconnectionIdsToRemove = new Set<string>();
  if (specificDocId) {
    disconnectionIdsToRemove.add(specificDocId);
  }

  keys1.forEach((k1) => {
    keys2.forEach((k2) => {
      disconnectionIdsToRemove.add(buildTerminalFejRelationDocId(k1, k2));
      disconnectionIdsToRemove.add(buildTerminalFejRelationDocId(k2, k1));
    });
  });

  const fejSide = Array.from(is1Fej ? keys1 : keys2);
  const saruSide = Array.from(is1Fej ? keys2 : keys1);
  const keys1Lower = new Set(Array.from(keys1).map((k) => k.toLowerCase()));
  const keys2Lower = new Set(Array.from(keys2).map((k) => k.toLowerCase()));

  // 1. Scan locally stored disconnections
  const currentDiscs = getLocalStoredTerminalFejDisconnections();
  currentDiscs.forEach((d) => {
    const p1Low = (d.productId1 || '').trim().toLowerCase();
    const p2Low = (d.productId2 || '').trim().toLowerCase();
    const directMatch =
      (keys1Lower.has(p1Low) && keys2Lower.has(p2Low)) ||
      (keys2Lower.has(p1Low) && keys1Lower.has(p2Low));
    const isDisc = isTerminalFejDisconnected(fejSide, saruSide, [d]);
    if (directMatch || isDisc || disconnectionIdsToRemove.has(d.id)) {
      disconnectionIdsToRemove.add(d.id);
    }
  });

  // 2. Scan Firestore disconnections collection so remote exclusions are also purged
  try {
    const snap = await getDocs(collection(db, TERMINAL_FEJ_DISCONNECTIONS_COLLECTION));
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const p1Low = (data.productId1 || '').trim().toLowerCase();
      const p2Low = (data.productId2 || '').trim().toLowerCase();
      const directMatch =
        (keys1Lower.has(p1Low) && keys2Lower.has(p2Low)) ||
        (keys2Lower.has(p1Low) && keys1Lower.has(p2Low));
      const testItem: ProductTerminalFejDisconnection = {
        id: docSnap.id,
        productId1: data.productId1 || '',
        productId2: data.productId2 || ''
      };
      const isDisc = isTerminalFejDisconnected(fejSide, saruSide, [testItem]);
      if (directMatch || isDisc || disconnectionIdsToRemove.has(docSnap.id)) {
        disconnectionIdsToRemove.add(docSnap.id);
      }
    });
  } catch (err) {
    console.warn('Could not scan firestore disconnections collection during save:', err);
  }

  // 3. Save relation to Firestore and delete all matching disconnections
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, TERMINAL_FEJ_COLLECTION, id1), {
      id: id1,
      productId1: s1,
      productId2: s2,
      quantity: qty,
      updatedAt: now
    });
    batch.set(doc(db, TERMINAL_FEJ_COLLECTION, id2), {
      id: id2,
      productId1: s2,
      productId2: s1,
      quantity: qty,
      updatedAt: now
    });

    disconnectionIdsToRemove.forEach((dId) => {
      batch.delete(doc(db, TERMINAL_FEJ_DISCONNECTIONS_COLLECTION, dId));
    });

    await batch.commit();
  } catch (err) {
    console.warn('Firestore terminal-fej write error, saving locally:', err);
  }

  // 4. Update local storage for relations
  const current = getLocalStoredTerminalFejek();
  const filtered = current.filter((r) => r.id !== id1 && r.id !== id2);
  const rel1: ProductTerminalFejRelation = { id: id1, productId1: s1, productId2: s2, quantity: qty, updatedAt: now };
  const rel2: ProductTerminalFejRelation = { id: id2, productId1: s2, productId2: s1, quantity: qty, updatedAt: now };
  filtered.push(rel1, rel2);
  saveLocalTerminalFejek(filtered);

  // 5. Update local storage for disconnections
  const updatedDiscs = currentDiscs.filter((d) => !disconnectionIdsToRemove.has(d.id));
  saveLocalTerminalFejDisconnections(updatedDiscs);

  return { success: true, relations: [rel1, rel2] };
}

/**
 * Reconnects a previously disconnected Saru <-> Saruzófej relation.
 * Clears all matching disconnection exclusions from both Firestore and local storage,
 * and saves the active relation.
 */
export async function reconnectTerminalFejRelation(
  p1: string,
  p2: string,
  allProducts: Product[] = [],
  specificDocId?: string
): Promise<{ success: boolean; error?: string }> {
  return saveTerminalFejRelation(p1, p2, allProducts, specificDocId);
}

/**
 * Deletes a bidirectional Saru <-> Saruzófej relation.
 * Records the disconnection so that even if the relation originates from the Crimp Table (Sarumagasság táblázat),
 * it is properly disconnected and hidden as requested by the user.
 */
export async function deleteTerminalFejRelation(
  p1: string,
  p2: string,
  allProducts: Product[] = []
): Promise<{ success: boolean; error?: string }> {
  const s1 = p1.trim();
  const s2 = p2.trim();
  if (!s1 || !s2) return { success: false, error: 'Érvénytelen azonosítók' };

  const id1 = buildTerminalFejRelationDocId(s1, s2);
  const id2 = buildTerminalFejRelationDocId(s2, s1);
  const now = new Date().toISOString();

  // Find products
  const prod1 = allProducts.find(
    (p) =>
      p.productId.toLowerCase() === s1.toLowerCase() ||
      (p.name && p.name.toLowerCase() === s1.toLowerCase()) ||
      (p.factoryCode && p.factoryCode.toLowerCase() === s1.toLowerCase())
  );
  const prod2 = allProducts.find(
    (p) =>
      p.productId.toLowerCase() === s2.toLowerCase() ||
      (p.name && p.name.toLowerCase() === s2.toLowerCase()) ||
      (p.factoryCode && p.factoryCode.toLowerCase() === s2.toLowerCase())
  );

  const is1Fej = prod1 ? isFejCategory(prod1.category) : /^(?:n[°º#\.\s\-]*|no\.?\s*)?\d{1,4}$/i.test(s1);
  const is2Fej = prod2 ? isFejCategory(prod2.category) : /^(?:n[°º#\.\s\-]*|no\.?\s*)?\d{1,4}$/i.test(s2);

  const keys1 = new Set<string>([s1]);
  if (prod1) {
    keys1.add(prod1.productId);
    if (prod1.name) keys1.add(prod1.name);
    if (prod1.factoryCode) keys1.add(prod1.factoryCode);
  }
  if (is1Fej) {
    const clean1 = cleanFejDisplay(s1);
    if (clean1) keys1.add(clean1);
    const norm1 = normalizeFejCode(s1);
    if (norm1) keys1.add(norm1);
    if (prod1?.name) {
      const c = cleanFejDisplay(prod1.name);
      if (c) keys1.add(c);
    }
  }

  const keys2 = new Set<string>([s2]);
  if (prod2) {
    keys2.add(prod2.productId);
    if (prod2.name) keys2.add(prod2.name);
    if (prod2.factoryCode) keys2.add(prod2.factoryCode);
  }
  if (is2Fej) {
    const clean2 = cleanFejDisplay(s2);
    if (clean2) keys2.add(clean2);
    const norm2 = normalizeFejCode(s2);
    if (norm2) keys2.add(norm2);
    if (prod2?.name) {
      const c = cleanFejDisplay(prod2.name);
      if (c) keys2.add(c);
    }
  }

  const newDisconnections: ProductTerminalFejDisconnection[] = [];
  keys1.forEach((k1) => {
    keys2.forEach((k2) => {
      const dId1 = buildTerminalFejRelationDocId(k1, k2);
      const dId2 = buildTerminalFejRelationDocId(k2, k1);
      newDisconnections.push(
        { id: dId1, productId1: k1, productId2: k2, updatedAt: now },
        { id: dId2, productId1: k2, productId2: k1, updatedAt: now }
      );
    });
  });

  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, TERMINAL_FEJ_COLLECTION, id1));
    batch.delete(doc(db, TERMINAL_FEJ_COLLECTION, id2));

    // Also delete any other Cartesian combinations from TERMINAL_FEJ_COLLECTION
    keys1.forEach((k1) => {
      keys2.forEach((k2) => {
        batch.delete(doc(db, TERMINAL_FEJ_COLLECTION, buildTerminalFejRelationDocId(k1, k2)));
        batch.delete(doc(db, TERMINAL_FEJ_COLLECTION, buildTerminalFejRelationDocId(k2, k1)));
      });
    });

    newDisconnections.forEach((disc) => {
      batch.set(doc(db, TERMINAL_FEJ_DISCONNECTIONS_COLLECTION, disc.id), {
        id: disc.id,
        productId1: disc.productId1,
        productId2: disc.productId2,
        updatedAt: disc.updatedAt
      });
    });

    await batch.commit();
  } catch (err) {
    console.warn('Firestore terminal-fej delete / disconnect error:', err);
  }

  // Update local storage for relations
  const current = getLocalStoredTerminalFejek();
  const relDocIdsToRemove = new Set<string>([id1, id2]);
  keys1.forEach((k1) => {
    keys2.forEach((k2) => {
      relDocIdsToRemove.add(buildTerminalFejRelationDocId(k1, k2));
      relDocIdsToRemove.add(buildTerminalFejRelationDocId(k2, k1));
    });
  });
  const updatedRels = current.filter((r) => !relDocIdsToRemove.has(r.id));
  saveLocalTerminalFejek(updatedRels);

  // Update local storage for disconnections
  const currentDiscs = getLocalStoredTerminalFejDisconnections();
  const discMap = new Map<string, ProductTerminalFejDisconnection>();
  currentDiscs.forEach((d) => discMap.set(d.id, d));
  newDisconnections.forEach((d) => discMap.set(d.id, d));
  saveLocalTerminalFejDisconnections(Array.from(discMap.values()));

  return { success: true };
}

/**
 * Batch saves Saru <-> Saruzófej relations (used in CSV import)
 */
export async function batchSaveTerminalFejRelations(
  relations: { productId1: string; productId2: string; quantity?: number }[]
): Promise<{ successCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;
  const now = new Date().toISOString();

  const pairsToCommit: ProductTerminalFejRelation[] = [];
  relations.forEach((rel) => {
    const s1 = rel.productId1.trim();
    const s2 = rel.productId2.trim();
    if (!s1 || !s2 || s1.toLowerCase() === s2.toLowerCase()) return;

    const qty = typeof rel.quantity === 'number' && !isNaN(rel.quantity) && rel.quantity > 0 ? Math.floor(rel.quantity) : 1;
    const id1 = buildTerminalFejRelationDocId(s1, s2);
    const id2 = buildTerminalFejRelationDocId(s2, s1);

    pairsToCommit.push({ id: id1, productId1: s1, productId2: s2, quantity: qty, updatedAt: now });
    pairsToCommit.push({ id: id2, productId1: s2, productId2: s1, quantity: qty, updatedAt: now });
  });

  const chunkSize = 200;
  for (let i = 0; i < pairsToCommit.length; i += chunkSize) {
    const chunk = pairsToCommit.slice(i, i + chunkSize);
    try {
      const batch = writeBatch(db);
      chunk.forEach((rel) => {
        batch.set(doc(db, TERMINAL_FEJ_COLLECTION, rel.id), {
          id: rel.id,
          productId1: rel.productId1,
          productId2: rel.productId2,
          quantity: rel.quantity,
          updatedAt: rel.updatedAt
        });
      });
      await batch.commit();
      successCount += chunk.length / 2;
    } catch (err: any) {
      console.warn('Batch write chunk failed:', err);
      errors.push(`Hiba: ${err?.message || 'Ismeretlen hiba'}`);
    }
  }

  // Update local storage
  const current = getLocalStoredTerminalFejek();
  const newMap = new Map<string, ProductTerminalFejRelation>();
  current.forEach((r) => newMap.set(r.id, r));
  pairsToCommit.forEach((r) => newMap.set(r.id, r));
  saveLocalTerminalFejek(Array.from(newMap.values()));

  return { successCount, errors };
}

export interface ConnectedTerminalFejItem {
  id: string; // The relation ID
  relatedProductId: string; // The other product ID (or name)
  relatedProduct: Product | null; // The loaded product object if found in catalog
  source: 'database' | 'crimp_auto'; // Whether from DB or derived automatically from crimp table
  quantity?: number; // Kapcsolódó darabszám (db)
}

/**
 * Returns all connected Saru <-> Saruzófej items for a given product.
 * Combines explicit relations from DB / localStorage with automatically derived relations
 * from the Crimp Table (Sarumagasság és Fejbeállítás Táblázat), filtering out any explicitly disconnected items.
 */
export function getConnectedTerminalFejekForProduct(
  currentProduct: Product,
  allRelations: ProductTerminalFejRelation[],
  allProducts: Product[] = [],
  disconnections: ProductTerminalFejDisconnection[] = []
): ConnectedTerminalFejItem[] {
  // Saruzófej Alkatrész esetén nem kapcsolódnak saruk, nem tartoznak össze
  if (
    isAlkatreszCategory(currentProduct.category) ||
    isAlkatreszCategory(currentProduct.name)
  ) {
    return [];
  }

  const activeDisconnections =
    disconnections && disconnections.length > 0
      ? disconnections
      : getLocalStoredTerminalFejDisconnections();

  const currentId = currentProduct.productId.trim().toLowerCase();
  const currentName = (currentProduct.name || '').trim().toLowerCase();
  const currentNormFej = normalizeFejCode(currentProduct.name) || normalizeFejCode(currentProduct.productId);
  const isCurrentFej = isFejCategory(currentProduct.category);
  const isCurrentSaru = isSaruCategory(currentProduct.category);

  // Map to index products by productId, factoryCode, name (lowercased)
  const productLookup = new Map<string, Product>();
  allProducts.forEach((p) => {
    productLookup.set(p.productId.trim().toLowerCase(), p);
    if (p.factoryCode) productLookup.set(p.factoryCode.trim().toLowerCase(), p);
    productLookup.set(p.name.trim().toLowerCase(), p);
  });

  const resultMap = new Map<string, ConnectedTerminalFejItem>();

  // Deduplication tracker: keeps track of all observed product IDs, Fej codes, and Saru codes
  const seenProductIds = new Set<string>();
  const seenFejCodes = new Set<string>();
  const seenSaruCodes = new Set<string>();

  const registerSeen = (itemProdId: string, prod?: Product | null, fejOrSaruRaw?: string) => {
    const p1 = itemProdId.trim().toLowerCase();
    if (p1) seenProductIds.add(p1);
    if (prod?.productId) seenProductIds.add(prod.productId.trim().toLowerCase());
    if (prod?.factoryCode) seenProductIds.add(prod.factoryCode.trim().toLowerCase());

    const fCodes = [itemProdId, prod?.name, prod?.productId, fejOrSaruRaw].filter(Boolean);
    fCodes.forEach((fc) => {
      const n = normalizeFejCode(fc);
      if (n) seenFejCodes.add(n);
    });

    const sCodes = [itemProdId, prod?.productId, prod?.name, prod?.factoryCode, fejOrSaruRaw].filter(Boolean);
    sCodes.forEach((sc) => {
      const n = normalizeKey(sc);
      if (n) seenSaruCodes.add(n);
    });
  };

  const isDuplicate = (itemProdId: string, prod?: Product | null, fejOrSaruRaw?: string): boolean => {
    const p1 = itemProdId.trim().toLowerCase();
    if (p1 && seenProductIds.has(p1)) return true;
    if (prod?.productId && seenProductIds.has(prod.productId.trim().toLowerCase())) return true;
    if (prod?.factoryCode && seenProductIds.has(prod.factoryCode.trim().toLowerCase())) return true;

    if (isCurrentSaru || !isCurrentFej) {
      // Related items are Fejek: check normalized fej codes
      const fCodes = [itemProdId, prod?.name, prod?.productId, fejOrSaruRaw].filter(Boolean);
      for (const fc of fCodes) {
        const n = normalizeFejCode(fc);
        if (n && seenFejCodes.has(n)) return true;
      }
    } else {
      // Related items are Saruk: check normalized saru codes
      const sCodes = [itemProdId, prod?.productId, prod?.name, prod?.factoryCode, fejOrSaruRaw].filter(Boolean);
      for (const sc of sCodes) {
        const n = normalizeKey(sc);
        if (n && seenSaruCodes.has(n)) return true;
      }
    }
    return false;
  };

  // 1. Check explicit relations (bidirectional lookup)
  allRelations.forEach((rel) => {
    const p1Raw = (rel.productId1 || '').trim();
    const p2Raw = (rel.productId2 || '').trim();
    if (!p1Raw || !p2Raw) return;

    const p1Lower = p1Raw.toLowerCase();
    const p2Lower = p2Raw.toLowerCase();

    // Candidate pairs: (p1 is current, p2 is target) OR (p2 is current, p1 is target)
    const checkPairs = [
      { sourceLower: p1Lower, sourceRaw: p1Raw, targetLower: p2Lower, targetRaw: p2Raw },
      { sourceLower: p2Lower, sourceRaw: p2Raw, targetLower: p1Lower, targetRaw: p1Raw }
    ];

    checkPairs.forEach(({ sourceLower, sourceRaw, targetLower, targetRaw }) => {
      let matches = sourceLower === currentId;
      if (!matches && isCurrentFej && currentNormFej) {
        const normSource = normalizeFejCode(sourceRaw);
        if (normSource === currentNormFej) matches = true;
      }

      if (matches && targetLower !== currentId) {
        const relatedProd =
          productLookup.get(targetLower) ||
          findMatchingFejProduct(targetRaw, allProducts) ||
          null;
        const canonicalKey = relatedProd ? relatedProd.productId.toLowerCase() : targetLower;

        // Check if this pair is disconnected
        const fejSide = isCurrentFej
          ? [currentProduct.productId, currentProduct.name, currentNormFej]
          : [targetRaw, relatedProd?.productId, relatedProd?.name];
        const saruSide = isCurrentFej
          ? [targetRaw, relatedProd?.productId, relatedProd?.name]
          : [currentProduct.productId, currentProduct.name, currentProduct.factoryCode];

        if (isTerminalFejDisconnected(fejSide, saruSide, activeDisconnections)) {
          return;
        }

        if (!resultMap.has(canonicalKey) && !isDuplicate(canonicalKey, relatedProd, targetRaw)) {
          registerSeen(canonicalKey, relatedProd, targetRaw);
          const relQty = typeof rel.quantity === 'number' && !isNaN(rel.quantity) && rel.quantity > 0 ? Math.floor(rel.quantity) : 1;
          resultMap.set(canonicalKey, {
            id: rel.id,
            relatedProductId: relatedProd ? relatedProd.productId : targetRaw,
            relatedProduct: relatedProd,
            source: 'database',
            quantity: relQty
          });
        }
      }
    });
  });

  // 2. Automatically derive relations from the Crimp Table (Sarumagasság és Fejbeállítás Táblázat)
  const crimps = getAllCrimpRecords();
  const normCurrentId = normalizeKey(currentProduct.productId);
  const normCurrentFactory = normalizeKey(currentProduct.factoryCode);
  const normCurrentName = normalizeKey(currentProduct.name);

  crimps.forEach((c) => {
    if (!c.applicatorFej || !c.applicatorFej.trim()) return;

    const cSaru = (c.saruCode || '').trim();
    const cProd = (c.productId || '').trim();
    const cRow2 = (c.row2Code || '').trim();
    const rawFejString = c.applicatorFej.trim();
    const fejList = splitFejCodes(rawFejString);

    // Case A: The current product is a Saruzófej (e.g. N38, N1, etc.)
    const matchesFejInRow = fejList.some((rf) => normalizeFejCode(rf) === currentNormFej);
    if (isCurrentFej && currentNormFej && matchesFejInRow) {
      // Connect all Saruk mentioned in this crimp record
      const candidates = [cSaru, cProd, cRow2].filter(Boolean);
      candidates.forEach((cand) => {
        const candLower = cand.toLowerCase();
        if (candLower === currentId) return;

        let relatedProd = productLookup.get(candLower) || null;
        if (!relatedProd) {
          const normCand = normalizeKey(cand);
          if (normCand) {
            relatedProd =
              allProducts.find((p) => {
                const pNormId = normalizeKey(p.productId);
                const pNormFact = normalizeKey(p.factoryCode);
                const pNormName = normalizeKey(p.name);
                return (
                  pNormId === normCand ||
                  (pNormFact && pNormFact === normCand) ||
                  (pNormName && pNormName === normCand)
                );
              }) || null;
          }
        }

        // Check if disconnected! Only check this specific candidate's identifiers:
        const fejSide = [currentProduct.productId, currentProduct.name, currentNormFej, rawFejString].filter(Boolean) as string[];
        const saruSide = [cand, relatedProd?.productId, relatedProd?.name, relatedProd?.factoryCode, normalizeKey(cand)].filter(Boolean) as string[];
        if (isTerminalFejDisconnected(fejSide, saruSide, activeDisconnections)) {
          return;
        }

        const canonicalKey = relatedProd ? relatedProd.productId.toLowerCase() : candLower;

        if (!resultMap.has(canonicalKey) && !isDuplicate(canonicalKey, relatedProd, cand)) {
          registerSeen(canonicalKey, relatedProd, cand);
          const displayProd: Product = relatedProd || {
            id: cand,
            productId: cand,
            name: `Saru (${cand})`,
            category: 'Saru',
            images: [],
            stockQuantity: 0,
            factoryCode: ''
          };

          resultMap.set(canonicalKey, {
            id: `auto__${currentProduct.productId}__${cand}`,
            relatedProductId: relatedProd ? relatedProd.productId : cand,
            relatedProduct: displayProd,
            source: 'crimp_auto',
            quantity: 1
          });
        }
      });
    }

    // Case B: The current product is a Saru (or matches crimp's saruCode / productId / row2Code)
    const normSaru = normalizeKey(cSaru);
    const normProd = normalizeKey(cProd);
    const normRow2 = normalizeKey(cRow2);

    const matchesCurrentSaru =
      (normSaru && (normSaru === normCurrentId || (normCurrentFactory && normSaru === normCurrentFactory) || (normCurrentName && normSaru === normCurrentName))) ||
      (normProd && (normProd === normCurrentId || (normCurrentFactory && normProd === normCurrentFactory) || (normCurrentName && normProd === normCurrentName))) ||
      (normRow2 && (normRow2 === normCurrentId || (normCurrentFactory && normRow2 === normCurrentFactory) || (normCurrentName && normRow2 === normCurrentName)));

    if (matchesCurrentSaru) {
      fejList.forEach((rawFej) => {
        const normFej = normalizeFejCode(rawFej);
        const cleanFej = cleanFejDisplay(rawFej);
        if (!normFej || !cleanFej) return;

        // Find matching Saruzófej product for rawFej (exact match preferred, strict word boundaries)
        const relatedProd = findMatchingFejProduct(rawFej, allProducts);

        // Check if disconnected!
        const fejSide = [rawFej, cleanFej, normFej, relatedProd?.productId, relatedProd?.name, relatedProd?.factoryCode].filter(Boolean) as string[];
        const saruSide = [currentProduct.productId, currentProduct.name, currentProduct.factoryCode, normalizeKey(currentProduct.productId)].filter(Boolean) as string[];
        if (isTerminalFejDisconnected(fejSide, saruSide, activeDisconnections)) {
          return;
        }

        // Canonical key: prefer the matching product's productId so it matches explicit DB relations!
        const canonicalKey = relatedProd
          ? relatedProd.productId.toLowerCase()
          : (cleanFej.toLowerCase() || normFej);

        // Strict deduplication: check if either the canonical key or normalized fej code is already present!
        if (!resultMap.has(canonicalKey) && !isDuplicate(canonicalKey, relatedProd, rawFej)) {
          registerSeen(canonicalKey, relatedProd, rawFej);
          const displayProd: Product = relatedProd || {
            id: cleanFej,
            productId: cleanFej,
            name: cleanFej,
            description: `Saruzófej (${cleanFej})`,
            category: 'Saruzófej',
            images: [],
            stockQuantity: 0,
            factoryCode: ''
          };

          resultMap.set(canonicalKey, {
            id: `auto__${currentProduct.productId}__${cleanFej}`,
            relatedProductId: relatedProd ? relatedProd.productId : cleanFej,
            relatedProduct: displayProd,
            source: 'crimp_auto',
            quantity: 1
          });
        }
      });
    }
  });

  return Array.from(resultMap.values());
}

/**
 * Synchronizes and updates all Saru <-> Saruzófej relations based on the Crimp Height Table records.
 * Reloads crimp data, generates candidate connections, respects exclusions,
 * saves to Firestore & local storage, and returns statistics.
 */
export async function syncTerminalFejRelationsFromCrimpTable(
  allProducts: Product[] = []
): Promise<{ success: boolean; generatedCount: number; crimpRecordsCount: number; error?: string }> {
  try {
    reloadCrimpRecords();
    const crimps = getAllCrimpRecords();
    const generated = generateAutoTerminalFejRelations(allProducts);

    const activeDisconnections = getLocalStoredTerminalFejDisconnections();
    const validGenerated = generated.filter((rel) => {
      return !isTerminalFejDisconnected(
        [rel.productId1],
        [rel.productId2],
        activeDisconnections
      );
    });

    const res = await batchSaveTerminalFejRelations(
      validGenerated.map((g) => ({ productId1: g.productId1, productId2: g.productId2 }))
    );

    return {
      success: true,
      generatedCount: res.successCount > 0 ? Math.round(res.successCount / 2) : Math.round(validGenerated.length / 2),
      crimpRecordsCount: crimps.length
    };
  } catch (err: any) {
    console.error('Failed to sync terminal-fej relations from crimp table:', err);
    return {
      success: false,
      generatedCount: 0,
      crimpRecordsCount: 0,
      error: err?.message || 'Hiba történt a szinkronizáció során.'
    };
  }
}

/**
 * Returns all explicitly disconnected (excluded) Saru <-> Saruzófej items for a given product.
 */
export function getDisconnectedTerminalFejekForProduct(
  currentProduct: Product,
  allProducts: Product[] = [],
  disconnections: ProductTerminalFejDisconnection[] = []
): ConnectedTerminalFejItem[] {
  const activeDisconnections =
    disconnections && disconnections.length > 0
      ? disconnections
      : getLocalStoredTerminalFejDisconnections();

  const currentId = currentProduct.productId.trim().toLowerCase();
  const currentName = (currentProduct.name || '').trim().toLowerCase();
  const currentNormFej = normalizeFejCode(currentProduct.name) || normalizeFejCode(currentProduct.productId);
  const isCurrentFej = isFejCategory(currentProduct.category);

  const productLookup = new Map<string, Product>();
  allProducts.forEach((p) => {
    productLookup.set(p.productId.trim().toLowerCase(), p);
    if (p.factoryCode) productLookup.set(p.factoryCode.trim().toLowerCase(), p);
    productLookup.set(p.name.trim().toLowerCase(), p);
  });

  const resultMap = new Map<string, ConnectedTerminalFejItem>();

  activeDisconnections.forEach((disc) => {
    const p1 = (disc.productId1 || '').trim().toLowerCase();
    const p2 = (disc.productId2 || '').trim();
    const p2Lower = p2.toLowerCase();

    // Direction 1: p1 matches current product, p2 is the other side
    let matchesDir1 = p1 === currentId || p1 === currentName;
    if (!matchesDir1 && isCurrentFej && currentNormFej) {
      if (normalizeFejCode(p1) === currentNormFej) matchesDir1 = true;
    }

    // Direction 2: p2 matches current product, p1 is the other side
    let matchesDir2 = p2Lower === currentId || p2Lower === currentName;
    if (!matchesDir2 && isCurrentFej && currentNormFej) {
      if (normalizeFejCode(p2) === currentNormFej) matchesDir2 = true;
    }

    let otherRaw = '';
    if (matchesDir1 && p2Lower !== currentId) {
      otherRaw = p2;
    } else if (matchesDir2 && p1 !== currentId) {
      otherRaw = (disc.productId1 || '').trim();
    }

    if (!otherRaw) return;
    const otherLower = otherRaw.toLowerCase();

    const relatedProd =
      productLookup.get(otherLower) ||
      findMatchingFejProduct(otherRaw, allProducts) ||
      null;
    const canonicalKey = relatedProd ? relatedProd.productId.toLowerCase() : otherLower;

    if (!resultMap.has(canonicalKey)) {
      const displayProd: Product = relatedProd || {
        id: otherRaw,
        productId: otherRaw,
        name: isCurrentFej ? `Saru (${otherRaw})` : cleanFejDisplay(otherRaw),
        category: isCurrentFej ? 'Saru' : 'Saruzófej',
        images: [],
        stockQuantity: 0,
        factoryCode: ''
      };

      resultMap.set(canonicalKey, {
        id: disc.id,
        relatedProductId: relatedProd ? relatedProd.productId : otherRaw,
        relatedProduct: displayProd,
        source: 'database'
      });
    }
  });

  return Array.from(resultMap.values());
}
