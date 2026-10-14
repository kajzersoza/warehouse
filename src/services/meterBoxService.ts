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
import { ProductMeterBoxRelation } from '../types/product';
import { sanitizeDocId } from './productService';

const METERBOX_COLLECTION = 'product_meterboxes';
const LOCAL_STORAGE_KEY = 'raktar_meterboxes_v1';

// Initial sample data from user prompt:
// 9099000079_00 <-> XINT000284
// 9099000079_00 <-> XINT0000K6
export const INITIAL_METERBOX_RELATIONS: ProductMeterBoxRelation[] = [
  {
    id: '9099000079_00__XINT000284',
    productId1: '9099000079_00',
    productId2: 'XINT000284',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'XINT000284__9099000079_00',
    productId1: 'XINT000284',
    productId2: '9099000079_00',
    updatedAt: new Date().toISOString()
  },
  {
    id: '9099000079_00__XINT0000K6',
    productId1: '9099000079_00',
    productId2: 'XINT0000K6',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'XINT0000K6__9099000079_00',
    productId1: 'XINT0000K6',
    productId2: '9099000079_00',
    updatedAt: new Date().toISOString()
  }
];

export function getLocalStoredMeterBoxes(): ProductMeterBoxRelation[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read meterbox relations from localStorage:', err);
  }
  return INITIAL_METERBOX_RELATIONS;
}

export function saveLocalMeterBoxes(relations: ProductMeterBoxRelation[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(relations));
  } catch (err) {
    console.warn('Could not save meterbox relations to localStorage:', err);
  }
}

/**
 * Builds consistent document ID for a meter box relation pair
 */
export function buildMeterBoxRelationDocId(p1: string, p2: string): string {
  const s1 = sanitizeDocId(p1.trim());
  const s2 = sanitizeDocId(p2.trim());
  return `${s1}__${s2}`;
}

/**
 * Seed initial sample relations if Firestore collection is empty
 */
export async function seedInitialMeterBoxesIfEmpty(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, METERBOX_COLLECTION));
    if (snapshot.empty) {
      console.log('Seeding initial Termék <-> Mérődoboz relations into Firestore...');
      const batch = writeBatch(db);
      INITIAL_METERBOX_RELATIONS.forEach((rel) => {
        const docRef = doc(db, METERBOX_COLLECTION, rel.id);
        batch.set(docRef, {
          id: rel.id,
          productId1: rel.productId1,
          productId2: rel.productId2,
          updatedAt: rel.updatedAt || new Date().toISOString()
        });
      });
      await batch.commit();
      console.log('Seeded Termék <-> Mérődoboz relations successfully!');
    }
  } catch (err) {
    console.warn('Meterbox initial seeding skipped:', err);
  }
}

/**
 * Subscribe to real-time Termék <-> Mérődoboz relations
 */
export function subscribeToMeterBoxes(
  onUpdate: (relations: ProductMeterBoxRelation[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, METERBOX_COLLECTION),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ProductMeterBoxRelation[] = [];
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
          saveLocalMeterBoxes(list);
          onUpdate(list);
        } else {
          onUpdate(getLocalStoredMeterBoxes());
        }
      },
      (error) => {
        console.warn('Firestore meterboxes listener warning:', error);
        onUpdate(getLocalStoredMeterBoxes());
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn('Failed to attach meterboxes snapshot listener:', error);
    onUpdate(getLocalStoredMeterBoxes());
    return () => {};
  }
}

/**
 * Save single relation pair with quantity. Creates bidirectional connection by default.
 */
export async function saveMeterBoxRelation(
  productId1: string,
  productId2: string,
  bidirectional: boolean = true,
  quantity?: number
): Promise<ProductMeterBoxRelation[]> {
  const p1 = productId1.trim();
  const p2 = productId2.trim();
  if (!p1 || !p2 || p1 === p2) return [];

  const qty = typeof quantity === 'number' && !isNaN(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
  const nowIso = new Date().toISOString();
  const forwardId = buildMeterBoxRelationDocId(p1, p2);
  const forwardRel: ProductMeterBoxRelation = {
    id: forwardId,
    productId1: p1,
    productId2: p2,
    quantity: qty,
    updatedAt: nowIso
  };

  const toSave: ProductMeterBoxRelation[] = [forwardRel];

  if (bidirectional) {
    const reverseId = buildMeterBoxRelationDocId(p2, p1);
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
      const docRef = doc(db, METERBOX_COLLECTION, r.id);
      batch.set(docRef, r, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Could not save meterbox relation to Firestore:', err);
  }

  // Update local cache
  const local = getLocalStoredMeterBoxes();
  const map = new Map<string, ProductMeterBoxRelation>();
  local.forEach((r) => map.set(r.id, r));
  toSave.forEach((r) => map.set(r.id, r));
  saveLocalMeterBoxes(Array.from(map.values()));

  return toSave;
}

/**
 * Delete a relation pair (both directions by default)
 */
export async function deleteMeterBoxRelation(
  productId1: string,
  productId2: string,
  bothDirections: boolean = true
): Promise<void> {
  const p1 = productId1.trim();
  const p2 = productId2.trim();
  const forwardId = buildMeterBoxRelationDocId(p1, p2);
  const idsToDelete = [forwardId];

  if (bothDirections) {
    idsToDelete.push(buildMeterBoxRelationDocId(p2, p1));
  }

  try {
    const batch = writeBatch(db);
    idsToDelete.forEach((id) => {
      const docRef = doc(db, METERBOX_COLLECTION, id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (err) {
    console.error('Could not delete meterbox relation from Firestore:', err);
  }

  const local = getLocalStoredMeterBoxes().filter((r) => !idsToDelete.includes(r.id));
  saveLocalMeterBoxes(local);
}

/**
 * Batch save relations from CSV upload
 */
export async function batchSaveMeterBoxRelations(
  pairs: { productId1: string; productId2: string; quantity?: number }[],
  autoMirror: boolean = true
): Promise<{ successCount: number; duplicateCount: number; errors: string[] }> {
  const errors: string[] = [];
  const uniqueMap = new Map<string, ProductMeterBoxRelation>();
  let duplicateCount = 0;
  const nowIso = new Date().toISOString();

  pairs.forEach((pair) => {
    const p1 = pair.productId1.trim();
    const p2 = pair.productId2.trim();
    if (!p1 || !p2 || p1 === p2) return;

    const qty = typeof pair.quantity === 'number' && !isNaN(pair.quantity) && pair.quantity > 0 ? Math.floor(pair.quantity) : 1;
    const id1 = buildMeterBoxRelationDocId(p1, p2);
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
      const id2 = buildMeterBoxRelationDocId(p2, p1);
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
        const docRef = doc(db, METERBOX_COLLECTION, rel.id);
        batch.set(docRef, rel, { merge: true });
      });

      await batch.commit();
      successCount += chunk.length;
    }
  } catch (err: any) {
    console.error('Batch commit meterbox relations error:', err);
    errors.push(err?.message || 'Nem sikerült az összes Termék <-> Mérődoboz kapcsolatot rögzíteni');
  }

  // Update local cache
  const local = getLocalStoredMeterBoxes();
  const currentMap = new Map<string, ProductMeterBoxRelation>();
  local.forEach((r) => currentMap.set(r.id, r));
  uniqueList.forEach((r) => currentMap.set(r.id, r));
  saveLocalMeterBoxes(Array.from(currentMap.values()));

  return { successCount, duplicateCount, errors };
}

/**
 * Returns all connected product IDs for a given product (bidirectional lookup with deduplication)
 */
export function getConnectedMeterBoxesForProduct(
  targetProductId: string,
  allRelations: ProductMeterBoxRelation[]
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
export function getMeterBoxRelationsMapForProduct(
  targetProductId: string,
  allRelations: ProductMeterBoxRelation[]
): Map<string, ProductMeterBoxRelation> {
  const map = new Map<string, ProductMeterBoxRelation>();
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
 * Checks if a category is "Gyártandó termék" or "Mérődoboz"
 */
export function isMeterBoxRelatedCategory(category?: string): boolean {
  if (!category) return false;
  const norm = category.trim().toLowerCase();
  return (
    norm.includes('gyártandó') ||
    norm.includes('gyartando') ||
    norm.includes('mérődoboz') ||
    norm.includes('merodoboz') ||
    norm.includes('mérő') ||
    norm.includes('mero')
  );
}
