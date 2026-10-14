import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product } from '../types/product';
import { INITIAL_PRODUCTS } from '../data/initialProducts';

const PRODUCTS_COLLECTION = 'products';
const LOCAL_STORAGE_KEY = 'raktar_app_products_v1';

// Sanitize doc ID for firestore
export function sanitizeDocId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
}

export function getLocalStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read from localStorage:', err);
  }
  return INITIAL_PRODUCTS;
}

export function saveLocalProducts(products: Product[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(products));
  } catch (err) {
    console.warn('Could not save to localStorage:', err);
  }
}

/**
 * Seed initial sample products to Firestore if collection is empty
 */
export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
    if (snapshot.empty) {
      console.log('Seeding initial products into Firestore...');
      const batch = writeBatch(db);
      INITIAL_PRODUCTS.forEach((prod) => {
        const docRef = doc(db, PRODUCTS_COLLECTION, sanitizeDocId(prod.productId));
        batch.set(docRef, {
          productId: prod.productId,
          name: prod.name,
          description: prod.description || '',
          category: prod.category || '',
          manufacturer: prod.manufacturer || '',
          feeding: prod.feeding || '',
          insulationType: prod.insulationType || '',
          factoryCode: prod.factoryCode || '',
          insulationGripperType: prod.insulationGripperType || '',
          connectorType: prod.connectorType || '',
          terminalType: prod.terminalType || '',
          date: prod.date || '',
          images: prod.images || [],
          stockQuantity: prod.stockQuantity ?? 0,
          location: prod.location || '',
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
      console.log('Seeded products successfully!');
    }
  } catch (err) {
    console.warn('Initial seeding skipped or failed (offline or permission):', err);
  }
}

/**
 * Subscribe to real-time products updates from Firestore
 */
export function subscribeToProducts(
  onProductsUpdate: (products: Product[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, PRODUCTS_COLLECTION),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Product[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              productId: data.productId || d.id,
              name: data.name || '',
              description: data.description || '',
              category: data.category || '',
              manufacturer: data.manufacturer || '',
              feeding: data.feeding || '',
              insulationType: data.insulationType || '',
              factoryCode: data.factoryCode || '',
              insulationGripperType: data.insulationGripperType || '',
              connectorType: data.connectorType || '',
              terminalType: data.terminalType || '',
              date: data.date || '',
              images: Array.isArray(data.images) ? data.images : [],
              stockQuantity: typeof data.stockQuantity === 'number' ? data.stockQuantity : 0,
              location: data.location || '',
              positionsCount: typeof data.positionsCount === 'number' ? data.positionsCount : undefined,
              updatedAt: data.updatedAt || new Date().toISOString()
            });
          });
          saveLocalProducts(list);
          onProductsUpdate(list);
        } else {
          // If empty in Firestore, fallback to local storage
          const local = getLocalStoredProducts();
          onProductsUpdate(local);
        }
      },
      (error) => {
        console.warn('Firestore onSnapshot warning/error:', error);
        // Fallback to local storage
        onProductsUpdate(getLocalStoredProducts());
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn('Failed to attach Firestore snapshot listener:', error);
    onProductsUpdate(getLocalStoredProducts());
    return () => {};
  }
}

/**
 * Migrates local storage and Firestore relation references when a product ID is edited
 */
async function migrateProductIdReferences(oldId: string, newId: string): Promise<void> {
  if (!oldId || !newId || oldId.toLowerCase() === newId.toLowerCase()) return;

  try {
    // 1. Components: raktar_app_components_v1
    const rawComp = localStorage.getItem('raktar_app_components_v1');
    if (rawComp) {
      const list = JSON.parse(rawComp);
      if (Array.isArray(list)) {
        let changed = false;
        const updated = list.map((c: any) => {
          let pId = c.parentProductId;
          let cId = c.componentProductId;
          if (pId === oldId) { pId = newId; changed = true; }
          if (cId === oldId) { cId = newId; changed = true; }
          return { ...c, id: `${pId}__${cId}`, parentProductId: pId, componentProductId: cId };
        });
        if (changed) localStorage.setItem('raktar_app_components_v1', JSON.stringify(updated));
      }
    }

    // 2. Meter Boxes: raktar_meterboxes_v1
    const rawMB = localStorage.getItem('raktar_meterboxes_v1');
    if (rawMB) {
      const list = JSON.parse(rawMB);
      if (Array.isArray(list)) {
        let changed = false;
        const updated = list.map((m: any) => {
          let p1 = m.productId1;
          let p2 = m.productId2;
          if (p1 === oldId) { p1 = newId; changed = true; }
          if (p2 === oldId) { p2 = newId; changed = true; }
          return { ...m, id: `${sanitizeDocId(p1)}__${sanitizeDocId(p2)}`, productId1: p1, productId2: p2 };
        });
        if (changed) localStorage.setItem('raktar_meterboxes_v1', JSON.stringify(updated));
      }
    }

    // 3. Connector Terminals: raktar_connector_terminals_v1
    const rawCT = localStorage.getItem('raktar_connector_terminals_v1');
    if (rawCT) {
      const list = JSON.parse(rawCT);
      if (Array.isArray(list)) {
        let changed = false;
        const updated = list.map((c: any) => {
          let p1 = c.productId1;
          let p2 = c.productId2;
          if (p1 === oldId) { p1 = newId; changed = true; }
          if (p2 === oldId) { p2 = newId; changed = true; }
          return { ...c, id: `${sanitizeDocId(p1)}__${sanitizeDocId(p2)}`, productId1: p1, productId2: p2 };
        });
        if (changed) localStorage.setItem('raktar_connector_terminals_v1', JSON.stringify(updated));
      }
    }

    // 4. Mating Pairs: raktar_mating_pairs_v1
    const rawMP = localStorage.getItem('raktar_mating_pairs_v1');
    if (rawMP) {
      const list = JSON.parse(rawMP);
      if (Array.isArray(list)) {
        let changed = false;
        const updated = list.map((m: any) => {
          let p1 = m.productId1;
          let p2 = m.productId2;
          if (p1 === oldId) { p1 = newId; changed = true; }
          if (p2 === oldId) { p2 = newId; changed = true; }
          return { ...m, id: `${sanitizeDocId(p1)}__${sanitizeDocId(p2)}`, productId1: p1, productId2: p2 };
        });
        if (changed) localStorage.setItem('raktar_mating_pairs_v1', JSON.stringify(updated));
      }
    }

    // 5. Terminal Fejek: raktar_terminal_fejek_v1
    const rawTF = localStorage.getItem('raktar_terminal_fejek_v1');
    if (rawTF) {
      const list = JSON.parse(rawTF);
      if (Array.isArray(list)) {
        let changed = false;
        const updated = list.map((t: any) => {
          let p1 = t.productId1;
          let p2 = t.productId2;
          if (p1 === oldId) { p1 = newId; changed = true; }
          if (p2 === oldId) { p2 = newId; changed = true; }
          return { ...t, id: `${sanitizeDocId(p1)}__${sanitizeDocId(p2)}`, productId1: p1, productId2: p2 };
        });
        if (changed) localStorage.setItem('raktar_terminal_fejek_v1', JSON.stringify(updated));
      }
    }

    // 6. Notes: raktar_app_notes_v1
    const rawNotes = localStorage.getItem('raktar_app_notes_v1');
    if (rawNotes) {
      const list = JSON.parse(rawNotes);
      if (Array.isArray(list)) {
        let changed = false;
        const updated = list.map((n: any) => {
          if (n.productId === oldId) {
            changed = true;
            return { ...n, productId: newId };
          }
          return n;
        });
        if (changed) localStorage.setItem('raktar_app_notes_v1', JSON.stringify(updated));
      }
    }
  } catch (err) {
    console.warn('Error migrating local storage relation references:', err);
  }
}

/**
 * Save single product (Create or Update) in Firestore and local storage.
 * If oldProductId is provided and differs from product.productId, cleanly deletes
 * the old document from Firestore, updates local storage, and migrates relation references.
 */
export async function saveProductToFirestore(
  product: Product,
  oldProductId?: string
): Promise<void> {
  const newId = product.productId.trim();
  const newDocId = sanitizeDocId(newId || product.id || String(Date.now()));
  const payload = {
    productId: newId,
    name: product.name.trim(),
    description: (product.description || '').slice(0, 1000),
    category: (product.category || '').slice(0, 100),
    manufacturer: (product.manufacturer || '').slice(0, 100),
    feeding: (product.feeding || '').slice(0, 100),
    insulationType: (product.insulationType || '').slice(0, 100),
    factoryCode: (product.factoryCode || '').slice(0, 100),
    insulationGripperType: (product.insulationGripperType || '').slice(0, 100),
    connectorType: (product.connectorType || '').slice(0, 100),
    terminalType: (product.terminalType || '').slice(0, 100),
    date: (product.date || '').slice(0, 50),
    images: (product.images || []).slice(0, 20),
    stockQuantity: Number(product.stockQuantity) || 0,
    location: (product.location || '').slice(0, 100),
    updatedAt: new Date().toISOString()
  };

  const parsedPos =
    product.positionsCount !== undefined &&
    product.positionsCount !== null &&
    !isNaN(Number(product.positionsCount))
      ? Math.floor(Number(product.positionsCount))
      : undefined;

  if (parsedPos !== undefined && parsedPos >= 1 && parsedPos <= 999) {
    (payload as any).positionsCount = parsedPos;
  }

  const isRenaming =
    oldProductId &&
    oldProductId.trim() !== '' &&
    oldProductId.trim().toLowerCase() !== newId.toLowerCase();
  const oldDocId = isRenaming ? sanitizeDocId(oldProductId!.trim()) : null;

  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, newDocId);
    await setDoc(docRef, payload, { merge: true });

    // If ID changed, delete the old document from Firestore
    if (oldDocId && oldDocId !== newDocId) {
      try {
        await deleteDoc(doc(db, PRODUCTS_COLLECTION, oldDocId));
      } catch (delErr) {
        console.warn('Could not delete old product document from Firestore:', delErr);
      }
    }
  } catch (err) {
    console.error('Could not save product to Firestore, storing locally:', err);
  }

  // Update localStorage: remove old record (if renamed) or existing record, then insert updated
  const local = getLocalStoredProducts();
  const filtered = local.filter((p) => {
    if (
      oldDocId &&
      (p.id === oldDocId || p.productId.toLowerCase() === oldProductId!.trim().toLowerCase())
    ) {
      return false;
    }
    if (p.id === newDocId || p.productId.toLowerCase() === newId.toLowerCase()) {
      return false;
    }
    return true;
  });

  filtered.unshift({ ...product, id: newDocId, ...payload });
  saveLocalProducts(filtered);

  // If ID changed, migrate relations & notes in background
  if (isRenaming && oldProductId) {
    migrateProductIdReferences(oldProductId.trim(), newId).catch((e) =>
      console.warn('Background relation migration notice:', e)
    );
  }
}

/**
 * Delete product
 */
export async function deleteProductFromFirestore(docId: string): Promise<void> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, sanitizeDocId(docId));
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Delete error from Firestore:', err);
    const local = getLocalStoredProducts().filter(p => p.id !== docId && p.productId !== docId);
    saveLocalProducts(local);
    throw err;
  }
}

/**
 * Batch upload products from CSV to Firestore
 */
export async function batchSaveProductsToFirestore(products: Product[]): Promise<{ successCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;

  try {
    // Process in batches of 200 (Firestore limit is 500 operations per batch)
    const chunkSize = 200;
    for (let i = 0; i < products.length; i += chunkSize) {
      const chunk = products.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      chunk.forEach((p) => {
        const docId = sanitizeDocId(p.productId || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
        const docRef = doc(db, PRODUCTS_COLLECTION, docId);
        const itemPayload: Record<string, any> = {
          productId: p.productId.trim(),
          name: p.name.trim() || 'Névtelen termék',
          description: (p.description || '').slice(0, 1000),
          category: (p.category || '').slice(0, 100),
          manufacturer: (p.manufacturer || '').slice(0, 100),
          feeding: (p.feeding || '').slice(0, 100),
          insulationType: (p.insulationType || '').slice(0, 100),
          factoryCode: (p.factoryCode || '').slice(0, 100),
          insulationGripperType: (p.insulationGripperType || '').slice(0, 100),
          connectorType: (p.connectorType || '').slice(0, 100),
          terminalType: (p.terminalType || '').slice(0, 100),
          date: (p.date || '').slice(0, 50),
          images: (p.images || []).slice(0, 20),
          stockQuantity: Number(p.stockQuantity) || 0,
          location: (p.location || '').slice(0, 100),
          updatedAt: new Date().toISOString()
        };

        const batchPos =
          p.positionsCount !== undefined &&
          p.positionsCount !== null &&
          !isNaN(Number(p.positionsCount))
            ? Math.floor(Number(p.positionsCount))
            : undefined;

        if (batchPos !== undefined && batchPos >= 1 && batchPos <= 999) {
          itemPayload.positionsCount = batchPos;
        }

        batch.set(docRef, itemPayload, { merge: true });
      });

      await batch.commit();
      successCount += chunk.length;
    }
  } catch (err: any) {
    console.error('Batch commit to Firestore error:', err);
    errors.push(err?.message || 'Nem sikerült az összes adatot a felhőbe írni');
  }

  // Always update local cache
  const local = getLocalStoredProducts();
  const map = new Map<string, Product>();
  local.forEach(p => map.set(p.productId, p));
  products.forEach(p => map.set(p.productId, p));
  saveLocalProducts(Array.from(map.values()));

  return { successCount, errors };
}
