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
import { ProductSimilarRelation } from '../types/product';
import { sanitizeDocId } from './productService';

const SIMILAR_PRODUCT_COLLECTION = 'product_similars';
const LOCAL_STORAGE_KEY = 'raktar_product_similars_v1';

export function getLocalStoredSimilars(): ProductSimilarRelation[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read similar product relations from localStorage:', err);
  }
  return [];
}

export function saveLocalSimilars(relations: ProductSimilarRelation[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(relations));
  } catch (err) {
    console.warn('Could not save similar product relations to localStorage:', err);
  }
}

/**
 * Builds consistent document ID for a similar product relation pair
 */
export function buildSimilarRelationDocId(p1: string, p2: string): string {
  const s1 = sanitizeDocId(p1.trim());
  const s2 = sanitizeDocId(p2.trim());
  return `${s1}__${s2}`;
}

/**
 * Subscribe to real-time Similar products relations
 */
export function subscribeToSimilarProducts(
  onUpdate: (relations: ProductSimilarRelation[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, SIMILAR_PRODUCT_COLLECTION),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ProductSimilarRelation[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              productId1: data.productId1 || '',
              productId2: data.productId2 || '',
              note: data.note ? String(data.note).trim() : undefined,
              updatedAt: data.updatedAt || new Date().toISOString()
            });
          });
          saveLocalSimilars(list);
          onUpdate(list);
        } else {
          onUpdate(getLocalStoredSimilars());
        }
      },
      (error) => {
        console.warn('Firestore similar products listener warning:', error);
        onUpdate(getLocalStoredSimilars());
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn('Failed to attach similar products snapshot listener:', error);
    onUpdate(getLocalStoredSimilars());
    return () => {};
  }
}

/**
 * Save single similar product relation. Creates bidirectional connection by default.
 */
export async function saveSimilarRelation(
  productId1: string,
  productId2: string,
  bidirectional: boolean = true,
  note?: string
): Promise<ProductSimilarRelation[]> {
  const p1 = productId1.trim();
  const p2 = productId2.trim();
  if (!p1 || !p2 || p1.toLowerCase() === p2.toLowerCase()) return [];

  const nowIso = new Date().toISOString();
  const cleanNote = note?.trim() || undefined;
  const forwardId = buildSimilarRelationDocId(p1, p2);

  const forwardRel: ProductSimilarRelation = {
    id: forwardId,
    productId1: p1,
    productId2: p2,
    note: cleanNote,
    updatedAt: nowIso
  };

  const toSave: ProductSimilarRelation[] = [forwardRel];

  if (bidirectional) {
    const reverseId = buildSimilarRelationDocId(p2, p1);
    toSave.push({
      id: reverseId,
      productId1: p2,
      productId2: p1,
      note: cleanNote,
      updatedAt: nowIso
    });
  }

  try {
    const batch = writeBatch(db);
    toSave.forEach((r) => {
      const docRef = doc(db, SIMILAR_PRODUCT_COLLECTION, r.id);
      const payload: Record<string, any> = {
        id: r.id,
        productId1: r.productId1,
        productId2: r.productId2,
        updatedAt: r.updatedAt
      };
      if (r.note) {
        payload.note = r.note;
      }
      batch.set(docRef, payload, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Could not save similar product relation to Firestore:', err);
  }

  // Update local cache
  const local = getLocalStoredSimilars();
  const map = new Map<string, ProductSimilarRelation>();
  local.forEach((r) => map.set(r.id, r));
  toSave.forEach((r) => map.set(r.id, r));
  const merged = Array.from(map.values());
  saveLocalSimilars(merged);

  return toSave;
}

/**
 * Delete a similar relation (both directions by default)
 */
export async function deleteSimilarRelation(
  productId1: string,
  productId2: string,
  bothDirections: boolean = true
): Promise<void> {
  const p1 = productId1.trim();
  const p2 = productId2.trim();
  const forwardId = buildSimilarRelationDocId(p1, p2);
  const idsToDelete = [forwardId];

  if (bothDirections) {
    idsToDelete.push(buildSimilarRelationDocId(p2, p1));
  }

  try {
    const batch = writeBatch(db);
    idsToDelete.forEach((id) => {
      const docRef = doc(db, SIMILAR_PRODUCT_COLLECTION, id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (err) {
    console.error('Could not delete similar relation from Firestore:', err);
  }

  const local = getLocalStoredSimilars().filter((r) => !idsToDelete.includes(r.id));
  saveLocalSimilars(local);
}

/**
 * Returns all connected Hasonló (Similar) product IDs for a given product (bidirectional lookup with deduplication)
 */
export function getConnectedSimilarsForProduct(
  targetProductId: string,
  allRelations: ProductSimilarRelation[]
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
 * Returns a Map of connected product IDs to their relation object (for note lookup)
 */
export function getSimilarRelationsMapForProduct(
  targetProductId: string,
  allRelations: ProductSimilarRelation[]
): Map<string, ProductSimilarRelation> {
  const map = new Map<string, ProductSimilarRelation>();
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
 * Batch save similar relations from CSV upload
 */
export async function batchSaveSimilarRelations(
  pairs: { productId1: string; productId2: string; note?: string }[],
  autoMirror: boolean = true
): Promise<{ successCount: number; duplicateCount: number; errors: string[] }> {
  const errors: string[] = [];
  const uniqueMap = new Map<string, ProductSimilarRelation>();
  let duplicateCount = 0;
  const nowIso = new Date().toISOString();

  pairs.forEach((pair) => {
    const p1 = pair.productId1.trim();
    const p2 = pair.productId2.trim();
    if (!p1 || !p2 || p1.toLowerCase() === p2.toLowerCase()) return;

    const id1 = buildSimilarRelationDocId(p1, p2);
    const cleanNote = pair.note?.trim() || undefined;

    if (uniqueMap.has(id1)) {
      duplicateCount++;
    } else {
      uniqueMap.set(id1, {
        id: id1,
        productId1: p1,
        productId2: p2,
        note: cleanNote,
        updatedAt: nowIso
      });
    }

    if (autoMirror) {
      const id2 = buildSimilarRelationDocId(p2, p1);
      if (!uniqueMap.has(id2)) {
        uniqueMap.set(id2, {
          id: id2,
          productId1: p2,
          productId2: p1,
          note: cleanNote,
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
        const docRef = doc(db, SIMILAR_PRODUCT_COLLECTION, rel.id);
        const payload: Record<string, any> = {
          id: rel.id,
          productId1: rel.productId1,
          productId2: rel.productId2,
          updatedAt: rel.updatedAt
        };
        if (rel.note) payload.note = rel.note;
        batch.set(docRef, payload, { merge: true });
      });

      await batch.commit();
      successCount += chunk.length;
    }
  } catch (err: any) {
    console.error('Batch commit similar relations error:', err);
    errors.push(err?.message || 'Nem sikerült az összes Hasonló kapcsolatot rögzíteni');
  }

  // Update local cache
  const local = getLocalStoredSimilars();
  const currentMap = new Map<string, ProductSimilarRelation>();
  local.forEach((r) => currentMap.set(r.id, r));
  uniqueList.forEach((r) => currentMap.set(r.id, r));
  saveLocalSimilars(Array.from(currentMap.values()));

  return { successCount, duplicateCount, errors };
}
