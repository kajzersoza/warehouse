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
import { ProductConnectorTerminalRelation } from '../types/product';
import { sanitizeDocId } from './productService';

const CONNECTOR_TERMINAL_COLLECTION = 'product_connector_terminals';
const LOCAL_STORAGE_KEY = 'raktar_connector_terminals_v1';

// Initial sample data from user prompt:
// 2122120061 <-> 4030610910
// 2122120060 <-> 4030610910
export const INITIAL_CONNECTOR_TERMINAL_RELATIONS: ProductConnectorTerminalRelation[] = [
  {
    id: '2122120061__4030610910',
    productId1: '2122120061',
    productId2: '4030610910',
    updatedAt: new Date().toISOString()
  },
  {
    id: '4030610910__2122120061',
    productId1: '4030610910',
    productId2: '2122120061',
    updatedAt: new Date().toISOString()
  },
  {
    id: '2122120060__4030610910',
    productId1: '2122120060',
    productId2: '4030610910',
    updatedAt: new Date().toISOString()
  },
  {
    id: '4030610910__2122120060',
    productId1: '4030610910',
    productId2: '2122120060',
    updatedAt: new Date().toISOString()
  }
];

export function getLocalStoredConnectorTerminals(): ProductConnectorTerminalRelation[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read connector-terminal relations from localStorage:', err);
  }
  return INITIAL_CONNECTOR_TERMINAL_RELATIONS;
}

export function saveLocalConnectorTerminals(relations: ProductConnectorTerminalRelation[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(relations));
  } catch (err) {
    console.warn('Could not save connector-terminal relations to localStorage:', err);
  }
}

/**
 * Builds consistent document ID for a connector-terminal relation pair
 */
export function buildConnectorTerminalRelationDocId(p1: string, p2: string): string {
  const s1 = sanitizeDocId(p1.trim());
  const s2 = sanitizeDocId(p2.trim());
  return `${s1}__${s2}`;
}

/**
 * Seed initial sample relations if Firestore collection is empty
 */
export async function seedInitialConnectorTerminalsIfEmpty(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, CONNECTOR_TERMINAL_COLLECTION));
    if (snapshot.empty) {
      console.log('Seeding initial Konnektor <-> Saru relations into Firestore...');
      const batch = writeBatch(db);
      INITIAL_CONNECTOR_TERMINAL_RELATIONS.forEach((rel) => {
        const docRef = doc(db, CONNECTOR_TERMINAL_COLLECTION, rel.id);
        batch.set(docRef, {
          id: rel.id,
          productId1: rel.productId1,
          productId2: rel.productId2,
          updatedAt: rel.updatedAt || new Date().toISOString()
        });
      });
      await batch.commit();
      console.log('Seeded Konnektor <-> Saru relations successfully!');
    }
  } catch (err) {
    console.warn('Connector-terminal initial seeding skipped:', err);
  }
}

/**
 * Subscribe to real-time Konnektor <-> Saru relations
 */
export function subscribeToConnectorTerminals(
  onUpdate: (relations: ProductConnectorTerminalRelation[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, CONNECTOR_TERMINAL_COLLECTION),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ProductConnectorTerminalRelation[] = [];
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
          saveLocalConnectorTerminals(list);
          onUpdate(list);
        } else {
          onUpdate(getLocalStoredConnectorTerminals());
        }
      },
      (error) => {
        console.warn('Firestore connector-terminal listener warning:', error);
        onUpdate(getLocalStoredConnectorTerminals());
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn('Failed to attach connector-terminal snapshot listener:', error);
    onUpdate(getLocalStoredConnectorTerminals());
    return () => {};
  }
}

/**
 * Save single relation pair with quantity. Creates bidirectional connection by default.
 */
export async function saveConnectorTerminalRelation(
  productId1: string,
  productId2: string,
  bidirectional: boolean = true,
  quantity?: number
): Promise<ProductConnectorTerminalRelation[]> {
  const p1 = productId1.trim();
  const p2 = productId2.trim();
  if (!p1 || !p2 || p1 === p2) return [];

  const qty = typeof quantity === 'number' && !isNaN(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
  const nowIso = new Date().toISOString();
  const forwardId = buildConnectorTerminalRelationDocId(p1, p2);
  const forwardRel: ProductConnectorTerminalRelation = {
    id: forwardId,
    productId1: p1,
    productId2: p2,
    quantity: qty,
    updatedAt: nowIso
  };

  const toSave: ProductConnectorTerminalRelation[] = [forwardRel];

  if (bidirectional) {
    const reverseId = buildConnectorTerminalRelationDocId(p2, p1);
    toSave.push({
      id: reverseId,
      productId1: p2,
      productId2: p1,
      quantity: qty,
      updatedAt: nowIso
    });
  }

  try {
    const batch = writeBatch(db);
    toSave.forEach((r) => {
      const docRef = doc(db, CONNECTOR_TERMINAL_COLLECTION, r.id);
      batch.set(docRef, r, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Could not save connector-terminal relation to Firestore:', err);
  }

  // Update local cache
  const local = getLocalStoredConnectorTerminals();
  const map = new Map<string, ProductConnectorTerminalRelation>();
  local.forEach((r) => map.set(r.id, r));
  toSave.forEach((r) => map.set(r.id, r));
  saveLocalConnectorTerminals(Array.from(map.values()));

  return toSave;
}

/**
 * Delete a relation pair (both directions by default)
 */
export async function deleteConnectorTerminalRelation(
  productId1: string,
  productId2: string,
  bothDirections: boolean = true
): Promise<void> {
  const p1 = productId1.trim();
  const p2 = productId2.trim();
  const forwardId = buildConnectorTerminalRelationDocId(p1, p2);
  const idsToDelete = [forwardId];

  if (bothDirections) {
    idsToDelete.push(buildConnectorTerminalRelationDocId(p2, p1));
  }

  try {
    const batch = writeBatch(db);
    idsToDelete.forEach((id) => {
      const docRef = doc(db, CONNECTOR_TERMINAL_COLLECTION, id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (err) {
    console.error('Could not delete connector-terminal relation from Firestore:', err);
  }

  const local = getLocalStoredConnectorTerminals().filter((r) => !idsToDelete.includes(r.id));
  saveLocalConnectorTerminals(local);
}

/**
 * Batch save relations from CSV upload
 */
export async function batchSaveConnectorTerminalRelations(
  pairs: { productId1: string; productId2: string; quantity?: number }[],
  autoMirror: boolean = true
): Promise<{ successCount: number; duplicateCount: number; errors: string[] }> {
  const errors: string[] = [];
  const uniqueMap = new Map<string, ProductConnectorTerminalRelation>();
  let duplicateCount = 0;
  const nowIso = new Date().toISOString();

  pairs.forEach((pair) => {
    const p1 = pair.productId1.trim();
    const p2 = pair.productId2.trim();
    if (!p1 || !p2 || p1 === p2) return;

    const qty = typeof pair.quantity === 'number' && !isNaN(pair.quantity) && pair.quantity > 0 ? Math.floor(pair.quantity) : 1;
    const id1 = buildConnectorTerminalRelationDocId(p1, p2);
    if (uniqueMap.has(id1)) {
      duplicateCount++;
    } else {
      uniqueMap.set(id1, {
        id: id1,
        productId1: p1,
        productId2: p2,
        quantity: qty,
        updatedAt: nowIso
      });
    }

    if (autoMirror) {
      const id2 = buildConnectorTerminalRelationDocId(p2, p1);
      if (!uniqueMap.has(id2)) {
        uniqueMap.set(id2, {
          id: id2,
          productId1: p2,
          productId2: p1,
          quantity: qty,
          updatedAt: nowIso
        });
      }
    }
  });

  const uniqueList = Array.from(uniqueMap.values());
  let successCount = 0;

  try {
    const chunkSize = 200;
    for (let i = 0; i < uniqueList.length; i += chunkSize) {
      const chunk = uniqueList.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      chunk.forEach((rel) => {
        const docRef = doc(db, CONNECTOR_TERMINAL_COLLECTION, rel.id);
        batch.set(docRef, rel, { merge: true });
      });

      await batch.commit();
      successCount += chunk.length;
    }
  } catch (err: any) {
    console.error('Batch commit connector-terminal relations error:', err);
    errors.push(err?.message || 'Nem sikerült az összes Konnektor <-> Saru kapcsolatot rögzíteni');
  }

  // Update local cache
  const local = getLocalStoredConnectorTerminals();
  const currentMap = new Map<string, ProductConnectorTerminalRelation>();
  local.forEach((r) => currentMap.set(r.id, r));
  uniqueList.forEach((r) => currentMap.set(r.id, r));
  saveLocalConnectorTerminals(Array.from(currentMap.values()));

  return { successCount, duplicateCount, errors };
}

/**
 * Returns all connected product IDs for a given product (bidirectional lookup with deduplication)
 */
export function getConnectedConnectorTerminalsForProduct(
  targetProductId: string,
  allRelations: ProductConnectorTerminalRelation[]
): string[] {
  if (!targetProductId) return [];
  const targetLower = targetProductId.trim().toLowerCase();
  const resultMap = new Map<string, string>(); // lower -> canonical display

  allRelations.forEach((rel) => {
    const p1 = (rel.productId1 || '').trim();
    const p2 = (rel.productId2 || '').trim();
    if (!p1 || !p2) return;

    if (p1.toLowerCase() === targetLower && p2.toLowerCase() !== targetLower) {
      if (!resultMap.has(p2.toLowerCase())) resultMap.set(p2.toLowerCase(), p2);
    } else if (p2.toLowerCase() === targetLower && p1.toLowerCase() !== targetLower) {
      if (!resultMap.has(p1.toLowerCase())) resultMap.set(p1.toLowerCase(), p1);
    }
  });

  return Array.from(resultMap.values());
}

/**
 * Returns a Map of connected product IDs to their relation object (for quantity lookup)
 */
export function getConnectorTerminalRelationsMapForProduct(
  targetProductId: string,
  allRelations: ProductConnectorTerminalRelation[]
): Map<string, ProductConnectorTerminalRelation> {
  const map = new Map<string, ProductConnectorTerminalRelation>();
  if (!targetProductId) return map;
  const trimmed = targetProductId.trim().toLowerCase();

  allRelations.forEach((rel) => {
    const p1 = rel.productId1?.trim().toLowerCase();
    const p2 = rel.productId2?.trim().toLowerCase();
    if (p1 === trimmed && rel.productId2) {
      map.set(rel.productId2.trim().toLowerCase(), rel);
    } else if (p2 === trimmed && rel.productId1) {
      if (!map.has(rel.productId1.trim().toLowerCase())) {
        map.set(rel.productId1.trim().toLowerCase(), rel);
      }
    }
  });

  return map;
}

/**
 * Checks if a category is "Konnektor" or "Saru" (or related variant)
 */
export function isConnectorTerminalRelatedCategory(category?: string): boolean {
  if (!category) return false;
  const norm = category.trim().toLowerCase();
  return (
    norm.includes('konnektor') ||
    norm.includes('connector') ||
    norm.includes('saru') ||
    norm.includes('terminal') ||
    norm.includes('csatlakozó') ||
    norm.includes('csatlakozo')
  );
}

/**
 * Checks strictly if a category is "Konnektor" (or connector variant, NOT Saru)
 */
export function isConnectorCategory(category?: string): boolean {
  if (!category) return false;
  const norm = category.trim().toLowerCase();
  // Must contain connector/konnektor/csatlakozó and NOT saru
  if (norm.includes('saru') || norm.includes('terminal')) {
    return false;
  }
  return (
    norm.includes('konnektor') ||
    norm.includes('connector') ||
    norm.includes('csatlakozó') ||
    norm.includes('csatlakozo')
  );
}
