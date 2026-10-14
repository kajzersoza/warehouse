import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { KanbanItem, KanbanStatus } from '../types/kanban';
import { sanitizeDocId } from './productService';

const KANBAN_COLLECTION = 'kanban_items';
const LOCAL_STORAGE_KEY = 'raktar_kanban_items_v1';

/**
 * Read Kanban items from localStorage fallback
 */
export function getLocalStoredKanbanItems(): KanbanItem[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read Kanban items from localStorage:', err);
  }
  return [];
}

/**
 * Save Kanban items to localStorage
 */
export function saveLocalKanbanItems(items: KanbanItem[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('Could not save Kanban items to localStorage:', err);
  }
}

/**
 * Generate a unique ID for a Kanban item
 */
export function generateKanbanId(): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `kanban_${timestamp}_${randomStr}`;
}

/**
 * Real-time listener for Kanban items with offline localStorage fallback
 */
export function subscribeToKanbanItems(
  onUpdate: (items: KanbanItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const colRef = collection(db, KANBAN_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items: KanbanItem[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            productIds: Array.isArray(data.productIds) ? data.productIds : [],
            status: (data.status as KanbanStatus) || 'new',
            note: data.note || '',
            title: data.title || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt,
            createdBy: data.createdBy
          });
        });

        // Sort: newest first
        items.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });

        saveLocalKanbanItems(items);
        onUpdate(items);
      },
      (error) => {
        console.warn('Kanban items real-time subscription error, using local storage:', error);
        onUpdate(getLocalStoredKanbanItems());
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to Kanban items, using local storage:', err);
    onUpdate(getLocalStoredKanbanItems());
    return () => {};
  }
}

export function toKanbanFirestorePayload(item: KanbanItem): Record<string, any> {
  const payload: Record<string, any> = {
    id: item.id,
    productIds: Array.isArray(item.productIds) ? item.productIds.map((p) => p.trim()).filter(Boolean) : [],
    status: item.status || 'new',
    note: (item.note || '').trim(),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString()
  };

  if (item.title && item.title.trim()) {
    payload.title = item.title.trim();
  }
  if (item.createdBy && item.createdBy.trim()) {
    payload.createdBy = item.createdBy.trim();
  }

  return payload;
}

/**
 * Save or update a Kanban item
 */
export async function saveKanbanItem(item: KanbanItem): Promise<void> {
  const cleanId = sanitizeDocId(item.id.trim()) || generateKanbanId();
  const now = new Date().toISOString();

  const toSave: KanbanItem = {
    ...item,
    id: cleanId,
    productIds: item.productIds.map((p) => p.trim()).filter(Boolean),
    status: item.status || 'new',
    note: (item.note || '').trim(),
    createdAt: item.createdAt || now,
    updatedAt: now
  };

  // 1. Update localStorage immediately for instant feedback
  const local = getLocalStoredKanbanItems();
  const existingIndex = local.findIndex((k) => k.id === cleanId);
  let updatedLocal: KanbanItem[];
  if (existingIndex >= 0) {
    updatedLocal = [...local];
    updatedLocal[existingIndex] = toSave;
  } else {
    updatedLocal = [toSave, ...local];
  }
  saveLocalKanbanItems(updatedLocal);

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, KANBAN_COLLECTION, cleanId);
    const firestorePayload = toKanbanFirestorePayload(toSave);
    await setDoc(docRef, firestorePayload, { merge: true });
  } catch (err) {
    console.warn('Failed to save Kanban item to Firestore, saved locally:', err);
  }
}

/**
 * Delete a Kanban item
 */
export async function deleteKanbanItem(id: string): Promise<void> {
  const cleanId = sanitizeDocId(id.trim());

  // 1. Remove from localStorage
  const local = getLocalStoredKanbanItems();
  const filtered = local.filter((k) => k.id !== cleanId);
  saveLocalKanbanItems(filtered);

  // 2. Remove from Firestore
  try {
    const docRef = doc(db, KANBAN_COLLECTION, cleanId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Failed to delete Kanban item from Firestore, removed locally:', err);
  }
}

/**
 * Move / update the status of a Kanban item
 */
export async function moveKanbanItemStatus(id: string, newStatus: KanbanStatus): Promise<void> {
  const local = getLocalStoredKanbanItems();
  const found = local.find((k) => k.id === id);
  if (found) {
    const updated: KanbanItem = {
      ...found,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };
    await saveKanbanItem(updated);
  }
}

/**
 * Helper to check if a specific product is in Kanban
 */
export function getKanbanItemsForProduct(productId: string, items: KanbanItem[]): KanbanItem[] {
  if (!productId) return [];
  const normalized = productId.trim().toLowerCase();
  return items.filter((item) =>
    item.productIds.some((pId) => pId.trim().toLowerCase() === normalized)
  );
}

/**
 * Returns the most relevant Kanban item for a product (if any)
 */
export function getProductKanbanStatus(
  productId: string,
  items: KanbanItem[]
): { inKanban: boolean; item?: KanbanItem; status?: KanbanStatus } {
  const matching = getKanbanItemsForProduct(productId, items);
  if (matching.length === 0) {
    return { inKanban: false };
  }
  // If multiple, prioritize 'in_progress', then 'new', then 'completed'
  const inProgress = matching.find((m) => m.status === 'in_progress');
  if (inProgress) return { inKanban: true, item: inProgress, status: 'in_progress' };
  const newItem = matching.find((m) => m.status === 'new');
  if (newItem) return { inKanban: true, item: newItem, status: 'new' };
  return { inKanban: true, item: matching[0], status: matching[0].status };
}
