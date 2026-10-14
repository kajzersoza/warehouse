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
import { ProductComponentRelation } from '../types/product';
import { sanitizeDocId } from './productService';

const COMPONENTS_COLLECTION = 'product_components';
const LOCAL_STORAGE_KEY = 'raktar_app_components_v1';

// Initial sample component relations based on user's exact sample
export const INITIAL_COMPONENT_RELATIONS: ProductComponentRelation[] = [
  {
    id: '40107_00_33__ME_911270246',
    parentProductId: '40107.00.33',
    componentProductId: 'ME.911270246',
    quantity: 1,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ME_911270246__40107_00_33',
    parentProductId: 'ME.911270246',
    componentProductId: '40107.00.33',
    quantity: 1,
    updatedAt: new Date().toISOString()
  },
  {
    id: '40107_00_33__H_ME_911270246',
    parentProductId: '40107.00.33',
    componentProductId: 'H_ME.911270246',
    quantity: 1,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'H_ME_911270246__40107_00_33',
    parentProductId: 'H_ME.911270246',
    componentProductId: '40107.00.33',
    quantity: 1,
    updatedAt: new Date().toISOString()
  }
];

export function getLocalStoredComponents(): ProductComponentRelation[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read components from localStorage:', err);
  }
  return INITIAL_COMPONENT_RELATIONS;
}

export function saveLocalComponents(components: ProductComponentRelation[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(components));
  } catch (err) {
    console.warn('Could not save components to localStorage:', err);
  }
}

/**
 * Generates consistent doc ID for a parent-component pair
 */
export function buildRelationDocId(parent: string, component: string): string {
  const p = sanitizeDocId(parent.trim());
  const c = sanitizeDocId(component.trim());
  return `${p}__${c}`;
}

/**
 * Seed initial sample components if collection is empty
 */
export async function seedInitialComponentsIfEmpty(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, COMPONENTS_COLLECTION));
    if (snapshot.empty) {
      console.log('Seeding initial component relations into Firestore...');
      const batch = writeBatch(db);
      INITIAL_COMPONENT_RELATIONS.forEach((rel) => {
        const docRef = doc(db, COMPONENTS_COLLECTION, rel.id);
        batch.set(docRef, {
          id: rel.id,
          parentProductId: rel.parentProductId,
          componentProductId: rel.componentProductId,
          quantity: rel.quantity ?? 1,
          updatedAt: rel.updatedAt || new Date().toISOString()
        });
      });
      await batch.commit();
      console.log('Seeded components successfully!');
    }
  } catch (err) {
    console.warn('Components initial seeding skipped (offline or permission):', err);
  }
}

/**
 * Subscribe to real-time component relations from Firestore
 */
export function subscribeToComponents(
  onUpdate: (relations: ProductComponentRelation[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, COMPONENTS_COLLECTION),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ProductComponentRelation[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            const rawQty = data.quantity;
            const parsedQty = typeof rawQty === 'number' && !isNaN(rawQty) && rawQty > 0
              ? rawQty
              : rawQty ? Number(rawQty) : 1;
            list.push({
              id: d.id,
              parentProductId: data.parentProductId || '',
              componentProductId: data.componentProductId || '',
              quantity: (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 1,
              updatedAt: data.updatedAt || new Date().toISOString()
            });
          });
          saveLocalComponents(list);
          onUpdate(list);
        } else {
          const local = getLocalStoredComponents();
          onUpdate(local);
        }
      },
      (error) => {
        console.warn('Firestore components listener warning:', error);
        onUpdate(getLocalStoredComponents());
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn('Failed to attach components snapshot listener:', error);
    onUpdate(getLocalStoredComponents());
    return () => {};
  }
}

/**
 * Save single component relation with quantity. Creates bidirectional connection by default so it appears on both products.
 */
export async function saveComponentRelation(
  parentProductId: string,
  componentProductId: string,
  quantity?: number,
  bidirectional: boolean = true
): Promise<ProductComponentRelation[]> {
  const p1 = parentProductId.trim();
  const p2 = componentProductId.trim();
  if (!p1 || !p2 || p1.toLowerCase() === p2.toLowerCase()) return [];

  const qty = typeof quantity === 'number' && !isNaN(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
  const nowIso = new Date().toISOString();

  const forwardId = buildRelationDocId(p1, p2);
  const forwardRel: ProductComponentRelation = {
    id: forwardId,
    parentProductId: p1,
    componentProductId: p2,
    quantity: qty,
    updatedAt: nowIso
  };

  const toSave: ProductComponentRelation[] = [forwardRel];

  if (bidirectional) {
    const reverseId = buildRelationDocId(p2, p1);
    toSave.push({
      id: reverseId,
      parentProductId: p2,
      componentProductId: p1,
      quantity: qty,
      updatedAt: nowIso
    });
  }

  try {
    const batch = writeBatch(db);
    toSave.forEach((rel) => {
      const docRef = doc(db, COMPONENTS_COLLECTION, rel.id);
      batch.set(docRef, rel, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Could not save component relation to Firestore:', err);
  }

  // Update local storage
  const local = getLocalStoredComponents();
  const map = new Map<string, ProductComponentRelation>();
  local.forEach((r) => map.set(r.id, r));
  toSave.forEach((r) => map.set(r.id, r));
  saveLocalComponents(Array.from(map.values()));

  return toSave;
}

/**
 * Delete a component relation (both directions by default)
 */
export async function deleteComponentRelation(
  parentProductId: string,
  componentProductId: string,
  bothDirections: boolean = true
): Promise<void> {
  const p1 = parentProductId.trim();
  const p2 = componentProductId.trim();
  const forwardId = buildRelationDocId(p1, p2);
  const idsToDelete = [forwardId];

  if (bothDirections) {
    idsToDelete.push(buildRelationDocId(p2, p1));
  }

  try {
    const batch = writeBatch(db);
    idsToDelete.forEach((id) => {
      const docRef = doc(db, COMPONENTS_COLLECTION, id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (err) {
    console.error('Could not delete component relation from Firestore:', err);
  }

  // Update local storage
  const local = getLocalStoredComponents().filter((r) => !idsToDelete.includes(r.id));
  saveLocalComponents(local);
}

/**
 * Batch save component relations from CSV
 * Deduplicates relations before saving with autoMirror option
 */
export async function batchSaveComponentRelations(
  relations: { parentProductId: string; componentProductId: string; quantity?: number }[],
  autoMirror: boolean = true
): Promise<{ successCount: number; duplicateCount: number; errors: string[] }> {
  const errors: string[] = [];
  const uniqueMap = new Map<string, ProductComponentRelation>();
  let duplicateCount = 0;
  const nowIso = new Date().toISOString();

  // Deduplicate incoming pairs
  relations.forEach((r) => {
    const p = r.parentProductId.trim();
    const c = r.componentProductId.trim();
    if (!p || !c || p.toLowerCase() === c.toLowerCase()) return;

    const docId1 = buildRelationDocId(p, c);
    const qty = typeof r.quantity === 'number' && !isNaN(r.quantity) && r.quantity > 0 ? Math.floor(r.quantity) : 1;
    if (uniqueMap.has(docId1)) {
      duplicateCount++;
    } else {
      uniqueMap.set(docId1, {
        id: docId1,
        parentProductId: p,
        componentProductId: c,
        quantity: qty,
        updatedAt: nowIso
      });
    }

    if (autoMirror) {
      const docId2 = buildRelationDocId(c, p);
      if (!uniqueMap.has(docId2)) {
        uniqueMap.set(docId2, {
          id: docId2,
          parentProductId: c,
          componentProductId: p,
          quantity: qty,
          updatedAt: nowIso
        });
      }
    }
  });

  const uniqueRelations = Array.from(uniqueMap.values());
  let successCount = 0;

  try {
    const chunkSize = 200;
    for (let i = 0; i < uniqueRelations.length; i += chunkSize) {
      const chunk = uniqueRelations.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      chunk.forEach((rel) => {
        const docRef = doc(db, COMPONENTS_COLLECTION, rel.id);
        batch.set(docRef, rel, { merge: true });
      });

      await batch.commit();
      successCount += chunk.length;
    }
  } catch (err: any) {
    console.error('Batch commit component relations error:', err);
    errors.push(err?.message || 'Nem sikerült az összes alkatrész-kapcsolatot a felhőbe írni');
  }

  // Always update local cache
  const local = getLocalStoredComponents();
  const currentMap = new Map<string, ProductComponentRelation>();
  local.forEach((r) => currentMap.set(r.id, r));
  uniqueRelations.forEach((r) => currentMap.set(r.id, r));
  saveLocalComponents(Array.from(currentMap.values()));

  return { successCount, duplicateCount, errors };
}

/**
 * Given a parent product ID and all known relations, returns unique component product IDs
 * (bidirectional lookup by default so it finds relations in either direction)
 * "ha többször szerepel természetesen akkor csak egyszer jelenítse meg"
 */
export function getUniqueComponentsForProduct(
  parentProductId: string,
  allRelations: ProductComponentRelation[],
  bidirectional: boolean = true
): string[] {
  if (!parentProductId) return [];
  const trimmed = parentProductId.trim().toLowerCase();
  const componentSet = new Set<string>();

  allRelations.forEach((rel) => {
    const p = rel.parentProductId?.trim();
    const c = rel.componentProductId?.trim();
    if (p && p.toLowerCase() === trimmed && c) {
      componentSet.add(c);
    } else if (bidirectional && c && c.toLowerCase() === trimmed && p) {
      componentSet.add(p);
    }
  });

  return Array.from(componentSet);
}

/**
 * Given a component product ID, returns unique parent product IDs (where this part is used)
 */
export function getUniqueParentsForComponent(
  componentProductId: string,
  allRelations: ProductComponentRelation[]
): string[] {
  if (!componentProductId) return [];
  const trimmed = componentProductId.trim();
  const parentSet = new Set<string>();

  allRelations.forEach((rel) => {
    if (rel.componentProductId === trimmed && rel.parentProductId) {
      parentSet.add(rel.parentProductId.trim());
    }
  });

  return Array.from(parentSet);
}
