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
import { MaintenanceRecord } from '../types/maintenance';
import { sanitizeDocId } from './productService';
import { INITIAL_MAINTENANCES } from '../data/initialMaintenances';
import { normalizeKey } from './crimpHeightService';

const MAINTENANCES_COLLECTION = 'product_maintenances';
const LOCAL_STORAGE_KEY = 'raktar_app_maintenances_v1';

export function getLocalStoredMaintenances(): MaintenanceRecord[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return INITIAL_MAINTENANCES;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read maintenances from localStorage:', err);
  }
  return INITIAL_MAINTENANCES;
}

export function saveLocalMaintenances(maintenances: MaintenanceRecord[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(maintenances));
  } catch (err) {
    console.warn('Could not save maintenances to localStorage:', err);
  }
}

export function generateMaintenanceId(productId: string): string {
  const cleanProd = sanitizeDocId(productId.trim()) || 'general';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `maint_${cleanProd}_${timestamp}_${randomStr}`;
}

export function toMaintenanceFirestorePayload(record: Partial<MaintenanceRecord>): Record<string, any> {
  const payload: Record<string, any> = {
    id: record.id,
    productId: (record.productId || '').trim(),
    status: (record.status || 'Pass').trim(),
    date: (record.date || new Date().toISOString().split('T')[0]).trim(),
    updatedAt: record.updatedAt || new Date().toISOString()
  };

  if (record.description && record.description.trim()) {
    payload.description = record.description.trim();
  }
  if (record.changeItem && record.changeItem.trim()) {
    payload.changeItem = record.changeItem.trim();
  }
  if (record.changeItemName && record.changeItemName.trim()) {
    payload.changeItemName = record.changeItemName.trim();
  }
  if (record.createdAt) {
    payload.createdAt = record.createdAt;
  }

  return payload;
}

export async function seedInitialMaintenancesIfEmpty(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, MAINTENANCES_COLLECTION));
    if (snapshot.empty && INITIAL_MAINTENANCES.length > 0) {
      console.log('Seeding initial maintenance records into Firestore...');
      const batch = writeBatch(db);
      INITIAL_MAINTENANCES.forEach((record) => {
        const docRef = doc(db, MAINTENANCES_COLLECTION, record.id);
        const payload = toMaintenanceFirestorePayload(record);
        batch.set(docRef, payload, { merge: true });
      });
      await batch.commit();
      console.log('Seeded maintenances successfully!');
    }
  } catch (err) {
    console.warn('Maintenances initial seeding skipped (offline or permission):', err);
  }
}

export function subscribeToMaintenances(
  onUpdate: (maintenances: MaintenanceRecord[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const collRef = collection(db, MAINTENANCES_COLLECTION);
    const unsubscribe = onSnapshot(
      collRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: MaintenanceRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as MaintenanceRecord;
            list.push({ ...data, id: docSnap.id });
          });
          saveLocalMaintenances(list);
          onUpdate(list);
        } else {
          // If Firestore is empty, seed initial or fallback to local
          const local = getLocalStoredMaintenances();
          onUpdate(local);
          seedInitialMaintenancesIfEmpty().catch(() => {});
        }
      },
      (error) => {
        console.warn('Firestore maintenances snapshot error (using local cache):', error);
        onUpdate(getLocalStoredMaintenances());
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err: any) {
    console.warn('Firestore subscription failed, returning local cache:', err);
    onUpdate(getLocalStoredMaintenances());
    return () => {};
  }
}

export async function saveMaintenanceRecord(record: Partial<MaintenanceRecord> & { productId: string }): Promise<void> {
  const current = getLocalStoredMaintenances();
  const recordId = record.id || generateMaintenanceId(record.productId);

  const dataToSave: MaintenanceRecord = {
    id: recordId,
    productId: record.productId.trim(),
    status: (record.status || 'Pass').trim(),
    description: record.description?.trim() || undefined,
    changeItem: record.changeItem?.trim() || undefined,
    date: record.date?.trim() || new Date().toISOString().split('T')[0],
    changeItemName: record.changeItemName?.trim() || undefined,
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const existingIdx = current.findIndex((m) => m.id === recordId);
  let updatedList: MaintenanceRecord[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = dataToSave;
  } else {
    updatedList = [dataToSave, ...current];
  }
  saveLocalMaintenances(updatedList);

  try {
    const docRef = doc(db, MAINTENANCES_COLLECTION, recordId);
    const firestorePayload = toMaintenanceFirestorePayload(dataToSave);
    await setDoc(docRef, firestorePayload, { merge: true });
  } catch (err) {
    console.warn('Could not sync maintenance to Firestore (saved locally):', err);
  }
}

export async function deleteMaintenanceRecord(recordId: string): Promise<void> {
  const current = getLocalStoredMaintenances();
  const updated = current.filter((m) => m.id !== recordId);
  saveLocalMaintenances(updated);

  try {
    const docRef = doc(db, MAINTENANCES_COLLECTION, recordId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Could not delete maintenance from Firestore (deleted locally):', err);
  }
}

/**
 * Deletes ALL maintenance records across the whole system (localStorage + Firestore).
 */
export async function deleteAllMaintenances(): Promise<{ count: number }> {
  const current = getLocalStoredMaintenances();
  const count = current.length;
  saveLocalMaintenances([]);

  try {
    const snapshot = await getDocs(collection(db, MAINTENANCES_COLLECTION));
    if (!snapshot.empty) {
      const CHUNK_SIZE = 450;
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const chunk = docs.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      }
    }
  } catch (err) {
    console.warn('Could not delete all maintenances from Firestore (deleted locally):', err);
  }

  return { count };
}

/**
 * Deletes all maintenance records for a specific product.
 */
export async function deleteMaintenancesForProduct(productId: string): Promise<number> {
  const current = getLocalStoredMaintenances();
  const targetPid = normalizeKey(productId);
  const toDelete = current.filter((m) => normalizeKey(m.productId) === targetPid);
  const updated = current.filter((m) => normalizeKey(m.productId) !== targetPid);
  saveLocalMaintenances(updated);

  try {
    if (toDelete.length > 0) {
      const batch = writeBatch(db);
      toDelete.forEach((m) => {
        batch.delete(doc(db, MAINTENANCES_COLLECTION, m.id));
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn('Could not delete product maintenances from Firestore (deleted locally):', err);
  }

  return toDelete.length;
}

export function getMaintenancesForProduct(
  productId?: string,
  factoryCode?: string,
  allMaintenances: MaintenanceRecord[] = []
): MaintenanceRecord[] {
  if (!productId) return [];
  const targetPid = normalizeKey(productId);
  const targetFc = factoryCode ? normalizeKey(factoryCode) : '';

  return allMaintenances.filter((m) => {
    const mPid = normalizeKey(m.productId);
    return mPid === targetPid || (targetFc && mPid === targetFc);
  });
}

export async function batchSaveMaintenances(
  recordsToImport: MaintenanceRecord[]
): Promise<{ successCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;

  if (!recordsToImport || recordsToImport.length === 0) {
    return { successCount: 0, errors: [] };
  }

  const current = getLocalStoredMaintenances();
  const map = new Map<string, MaintenanceRecord>();
  current.forEach((m) => map.set(m.id, m));

  const validRecords: MaintenanceRecord[] = [];
  recordsToImport.forEach((rec) => {
    const id = rec.id || generateMaintenanceId(rec.productId);
    const cleaned: MaintenanceRecord = {
      ...rec,
      id,
      productId: rec.productId.trim(),
      status: (rec.status || 'Pass').trim(),
      description: rec.description?.trim() || undefined,
      changeItem: rec.changeItem?.trim() || undefined,
      date: rec.date?.trim() || new Date().toISOString().split('T')[0],
      changeItemName: rec.changeItemName?.trim() || undefined,
      updatedAt: new Date().toISOString()
    };
    validRecords.push(cleaned);
    map.set(id, cleaned);
  });

  try {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < validRecords.length; i += CHUNK_SIZE) {
      const chunk = validRecords.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const docRef = doc(db, MAINTENANCES_COLLECTION, item.id);
        const payload = toMaintenanceFirestorePayload(item);
        batch.set(docRef, payload, { merge: true });
      });
      await batch.commit();
      successCount += chunk.length;
    }
  } catch (err: any) {
    console.error('Batch commit maintenances error:', err);
    errors.push(err?.message || 'Nem sikerült a karbantartásokat a felhőbe menteni');
  }

  saveLocalMaintenances(Array.from(map.values()));
  return { successCount, errors };
}
