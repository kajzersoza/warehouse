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
import { WarehousePosition, WarehouseTransaction, Product } from '../types/product';
import { INITIAL_WAREHOUSE_POSITIONS } from '../data/initialWarehousePositions';
import { INITIAL_WAREHOUSE_TRANSACTIONS } from '../data/initialWarehouseTransactions';
import { sanitizeDocId, getLocalStoredProducts, saveLocalProducts } from './productService';

export const WAREHOUSE_POSITIONS_COLLECTION = 'warehouse_positions';
export const WAREHOUSE_TRANSACTIONS_COLLECTION = 'warehouse_transactions';

const STORAGE_KEY_POSITIONS = 'raktar_warehouse_positions_v1';
const STORAGE_KEY_TRANSACTIONS = 'raktar_warehouse_transactions_v1';

let memoryPositions: WarehousePosition[] | null = null;
let memoryTransactions: WarehouseTransaction[] | null = null;

export function getLocalStoredWarehousePositions(): WarehousePosition[] {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_POSITIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read warehouse positions from localStorage:', e);
    }
  }
  return memoryPositions || INITIAL_WAREHOUSE_POSITIONS;
}

export function saveLocalWarehousePositions(positions: WarehousePosition[]): void {
  memoryPositions = positions;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(positions));
    } catch (e) {
      console.warn('Could not save warehouse positions to localStorage:', e);
    }
  }
}

export function getLocalStoredWarehouseTransactions(): WarehouseTransaction[] {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((tx) => ({
            ...tx,
            quantity:
              tx.quantity !== undefined && tx.quantity !== null && !isNaN(Number(tx.quantity))
                ? Number(tx.quantity)
                : 0
          }));
        }
      }
    } catch (e) {
      console.warn('Could not read warehouse transactions from localStorage:', e);
    }
  }
  return (memoryTransactions || INITIAL_WAREHOUSE_TRANSACTIONS).map((tx) => ({
    ...tx,
    quantity:
      tx.quantity !== undefined && tx.quantity !== null && !isNaN(Number(tx.quantity))
        ? Number(tx.quantity)
        : 0
  }));
}

export function saveLocalWarehouseTransactions(transactions: WarehouseTransaction[]): void {
  memoryTransactions = transactions;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.warn('Could not save warehouse transactions to localStorage:', e);
    }
  }
}

export function subscribeToWarehousePositions(
  onUpdate: (positions: WarehousePosition[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, WAREHOUSE_POSITIONS_COLLECTION),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: WarehousePosition[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({
              id: data.id || d.id,
              name: data.name || data.id || d.id,
              description: data.description,
              zone: data.zone,
              isCustom: data.isCustom,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
          });
          saveLocalWarehousePositions(list);
          onUpdate(list);
        } else {
          const current = getLocalStoredWarehousePositions();
          onUpdate(current);
        }
      },
      (error) => {
        console.warn('Warehouse positions snapshot error:', error);
        if (onError) onError(error);
        onUpdate(getLocalStoredWarehousePositions());
      }
    );
    return unsubscribe;
  } catch (err: any) {
    console.warn('Could not subscribe to warehouse positions:', err);
    onUpdate(getLocalStoredWarehousePositions());
    return () => {};
  }
}

export function subscribeToWarehouseTransactions(
  onUpdate: (transactions: WarehouseTransaction[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, WAREHOUSE_TRANSACTIONS_COLLECTION),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: WarehouseTransaction[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({
              id: data.id || d.id,
              positionId: data.positionId,
              productId: data.productId,
              quantity: Number(data.quantity) || 0,
              date: data.date,
              note: data.note,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
          });
          saveLocalWarehouseTransactions(list);
          onUpdate(list);
        } else {
          const current = getLocalStoredWarehouseTransactions();
          onUpdate(current);
        }
      },
      (error) => {
        console.warn('Warehouse transactions snapshot error:', error);
        if (onError) onError(error);
        onUpdate(getLocalStoredWarehouseTransactions());
      }
    );
    return unsubscribe;
  } catch (err: any) {
    console.warn('Could not subscribe to warehouse transactions:', err);
    onUpdate(getLocalStoredWarehouseTransactions());
    return () => {};
  }
}

export async function saveWarehousePosition(position: WarehousePosition): Promise<void> {
  const docId = sanitizeDocId(position.id.trim());
  const now = new Date().toISOString();
  const payload: WarehousePosition = {
    ...position,
    id: position.id.trim(),
    name: position.name.trim(),
    updatedAt: now
  };

  try {
    await setDoc(doc(db, WAREHOUSE_POSITIONS_COLLECTION, docId), payload);
  } catch (e) {
    console.warn('Firestore position save failed, saving locally:', e);
  }

  const current = getLocalStoredWarehousePositions();
  const map = new Map<string, WarehousePosition>();
  current.forEach((p) => map.set(p.id.toLowerCase(), p));
  map.set(payload.id.toLowerCase(), payload);
  saveLocalWarehousePositions(Array.from(map.values()));
}

export async function deleteWarehousePosition(positionId: string): Promise<void> {
  const docId = sanitizeDocId(positionId.trim());
  try {
    await deleteDoc(doc(db, WAREHOUSE_POSITIONS_COLLECTION, docId));
  } catch (e) {
    console.warn('Firestore position delete failed, deleting locally:', e);
  }

  const current = getLocalStoredWarehousePositions();
  const updated = current.filter((p) => p.id.toLowerCase() !== positionId.trim().toLowerCase());
  saveLocalWarehousePositions(updated);
}

export async function saveWarehouseTransaction(
  txData: Omit<WarehouseTransaction, 'id' | 'createdAt'> & { id?: string }
): Promise<WarehouseTransaction> {
  const now = new Date().toISOString();
  const txId = txData.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docId = sanitizeDocId(txId);

  const payload: WarehouseTransaction = {
    id: txId,
    positionId: txData.positionId.trim(),
    productId: txData.productId.trim(),
    quantity: Number(txData.quantity) || 0,
    date: txData.date.trim(),
    note: txData.note?.trim() || undefined,
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, WAREHOUSE_TRANSACTIONS_COLLECTION, docId), payload);
  } catch (e) {
    console.warn('Firestore transaction save failed, saving locally:', e);
  }

  const current = getLocalStoredWarehouseTransactions();
  const updated = [payload, ...current.filter((t) => t.id !== txId)];
  saveLocalWarehouseTransactions(updated);

  return payload;
}

export async function deleteWarehouseTransaction(txId: string): Promise<void> {
  const docId = sanitizeDocId(txId);
  try {
    await deleteDoc(doc(db, WAREHOUSE_TRANSACTIONS_COLLECTION, docId));
  } catch (e) {
    console.warn('Firestore transaction delete failed, deleting locally:', e);
  }

  const current = getLocalStoredWarehouseTransactions();
  const updated = current.filter((t) => t.id !== txId);
  saveLocalWarehouseTransactions(updated);
}

/**
 * Módosítja / átmozgatja egy termék raktári pozícióját egy új pozícióba.
 * Frissíti a termék korábbi tranzakcióinak pozícióját az új pozícióra.
 */
export async function updateProductPosition(
  productId: string,
  oldPositionId: string,
  newPositionId: string
): Promise<{ updatedCount: number }> {
  const normProdId = productId.trim().toLowerCase();
  const normOldPos = oldPositionId.trim().toLowerCase();
  const cleanNewPos = newPositionId.trim();

  const current = getLocalStoredWarehouseTransactions();
  const matching = current.filter(
    (tx) =>
      tx.productId.trim().toLowerCase() === normProdId &&
      tx.positionId.trim().toLowerCase() === normOldPos
  );

  const now = new Date().toISOString();

  if (matching.length > 0) {
    for (const tx of matching) {
      const updated: WarehouseTransaction = {
        ...tx,
        positionId: cleanNewPos,
        updatedAt: now
      };
      try {
        const docId = sanitizeDocId(tx.id);
        await setDoc(doc(db, WAREHOUSE_TRANSACTIONS_COLLECTION, docId), updated);
      } catch (e) {
        console.warn('Firestore tx update failed:', e);
      }
    }

    const updatedAll = current.map((tx) => {
      if (
        tx.productId.trim().toLowerCase() === normProdId &&
        tx.positionId.trim().toLowerCase() === normOldPos
      ) {
        return {
          ...tx,
          positionId: cleanNewPos,
          updatedAt: now
        };
      }
      return tx;
    });
    saveLocalWarehouseTransactions(updatedAll);
    return { updatedCount: matching.length };
  } else {
    const newTx: WarehouseTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: productId.trim(),
      positionId: cleanNewPos,
      quantity: 0,
      date: new Date().toISOString().split('T')[0],
      note: `Pozíció áthelyezve: ${oldPositionId} ➔ ${cleanNewPos}`,
      createdAt: now,
      updatedAt: now
    };
    try {
      const docId = sanitizeDocId(newTx.id);
      await setDoc(doc(db, WAREHOUSE_TRANSACTIONS_COLLECTION, docId), newTx);
    } catch (e) {
      console.warn('Firestore tx save failed:', e);
    }
    saveLocalWarehouseTransactions([newTx, ...current]);
    return { updatedCount: 1 };
  }
}

/**
 * Törli / leválasztja a terméket egy adott raktári pozícióból.
 * Eltávolítja az adott termékhez és pozícióhoz tartozó tranzakciókat.
 */
export async function deleteProductFromPosition(
  productId: string,
  positionId: string
): Promise<{ deletedCount: number }> {
  const normProdId = productId.trim().toLowerCase();
  const normPosId = positionId.trim().toLowerCase();

  const current = getLocalStoredWarehouseTransactions();
  const toDelete = current.filter(
    (tx) =>
      tx.productId.trim().toLowerCase() === normProdId &&
      tx.positionId.trim().toLowerCase() === normPosId
  );

  for (const tx of toDelete) {
    try {
      const docId = sanitizeDocId(tx.id);
      await deleteDoc(doc(db, WAREHOUSE_TRANSACTIONS_COLLECTION, docId));
    } catch (e) {
      console.warn('Firestore tx delete failed:', e);
    }
  }

  const remaining = current.filter(
    (tx) =>
      !(
        tx.productId.trim().toLowerCase() === normProdId &&
        tx.positionId.trim().toLowerCase() === normPosId
      )
  );
  saveLocalWarehouseTransactions(remaining);
  return { deletedCount: toDelete.length };
}

export async function batchImportWarehousePositions(
  positionNames: string[]
): Promise<{ addedCount: number; errors: string[] }> {
  const current = getLocalStoredWarehousePositions();
  const currentMap = new Map<string, WarehousePosition>();
  current.forEach((p) => currentMap.set(p.id.toLowerCase(), p));

  const newItems: WarehousePosition[] = [];
  const now = new Date().toISOString();

  positionNames.forEach((raw) => {
    const name = raw.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!currentMap.has(key)) {
      let zone = 'Egyéb Pozíciók';
      if (/^[A-F][1-9]$/.test(name)) zone = 'A-F Fő rács';
      else if (name.startsWith('Alkatrész')) zone = 'Alkatrész Zóna';
      else if (name.startsWith('POLC')) zone = 'Polcok';
      else if (name.startsWith('DOBOZ')) zone = 'Dobozok';
      else if (name.includes('Részleg') || name.includes('helyiség') || name.includes('Mérőhely') || name === 'Termelés' || name === 'TMK') zone = 'Üzem & Részlegek';
      else if (name.startsWith('Raktár')) zone = 'Raktár Terület';

      const item: WarehousePosition = {
        id: name,
        name: name,
        zone,
        isCustom: true,
        createdAt: now,
        updatedAt: now
      };
      currentMap.set(key, item);
      newItems.push(item);
    }
  });

  const errors: string[] = [];
  // Batch write to Firestore in chunks of 200
  const chunkSize = 200;
  for (let i = 0; i < newItems.length; i += chunkSize) {
    const chunk = newItems.slice(i, i + chunkSize);
    try {
      const batch = writeBatch(db);
      chunk.forEach((p) => {
        const docId = sanitizeDocId(p.id);
        batch.set(doc(db, WAREHOUSE_POSITIONS_COLLECTION, docId), p);
      });
      await batch.commit();
    } catch (err: any) {
      console.warn('Batch write positions chunk failed:', err);
      errors.push(err?.message || 'Hiba a mentéskor');
    }
  }

  saveLocalWarehousePositions(Array.from(currentMap.values()));
  return { addedCount: newItems.length, errors };
}

export async function batchImportWarehouseTransactions(
  records: Array<{
    positionId: string;
    productId: string;
    quantity: number;
    date: string;
    note?: string;
  }>
): Promise<{ addedCount: number; errors: string[] }> {
  const current = getLocalStoredWarehouseTransactions();
  const newTxList: WarehouseTransaction[] = [];
  const now = new Date().toISOString();

  records.forEach((r, idx) => {
    const posId = (r.positionId || '').trim();
    const prodId = (r.productId || '').trim();
    if (!posId || !prodId) return;

    const txId = `tx_imp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
    const quantity =
      r.quantity !== undefined && r.quantity !== null && !isNaN(Number(r.quantity))
        ? Number(r.quantity)
        : 0;

    newTxList.push({
      id: txId,
      positionId: posId,
      productId: prodId,
      quantity,
      date: (r.date || '').trim() || new Date().toISOString().slice(0, 10).replace(/-/g, '. ') + '.',
      note: r.note?.trim() || 'CSV import',
      createdAt: now,
      updatedAt: now
    });
  });

  const errors: string[] = [];
  const chunkSize = 200;
  for (let i = 0; i < newTxList.length; i += chunkSize) {
    const chunk = newTxList.slice(i, i + chunkSize);
    try {
      const batch = writeBatch(db);
      chunk.forEach((tx) => {
        const docId = sanitizeDocId(tx.id);
        batch.set(doc(db, WAREHOUSE_TRANSACTIONS_COLLECTION, docId), tx);
      });
      await batch.commit();
    } catch (err: any) {
      console.warn('Batch write transactions chunk failed:', err);
      errors.push(err?.message || 'Hiba a mentéskor');
    }
  }

  const updated = [...newTxList, ...current];
  saveLocalWarehouseTransactions(updated);
  return { addedCount: newTxList.length, errors };
}

/**
 * Calculates current aggregate stock and positions for a specific product.
 */
export function getProductStockFromTransactions(
  productId: string,
  transactions: WarehouseTransaction[]
): { totalQuantity: number; positions: Array<{ positionId: string; quantity: number }> } {
  const normId = productId.trim().toLowerCase();
  const posMap = new Map<string, number>();

  transactions.forEach((tx) => {
    if (tx.productId.trim().toLowerCase() === normId) {
      const current = posMap.get(tx.positionId) || 0;
      const q =
        tx.quantity !== undefined && tx.quantity !== null && !isNaN(Number(tx.quantity))
          ? Number(tx.quantity)
          : 0;
      posMap.set(tx.positionId, current + q);
    }
  });

  const positions: Array<{ positionId: string; quantity: number }> = [];
  let totalQuantity = 0;

  posMap.forEach((qty, posId) => {
    totalQuantity += qty;
    // CRITICAL: Ahol üres/0 a darabszám, a pozíció megvan - jelenítsük meg a pozíciót!
    positions.push({ positionId: posId, quantity: qty });
  });

  return { totalQuantity, positions };
}

/**
 * Parses CSV containing Warehouse Positions (Pozíció ID)
 */
export function parseWarehousePositionsCsv(csvText: string): string[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: string[] = [];
  const seen = new Set<string>();

  lines.forEach((line, idx) => {
    let cleaned = line;
    // Remove quotes
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    // Take first column if comma separated
    const parts = cleaned.split(/[,;\t]/);
    const posId = (parts[0] || '').trim();
    if (!posId) return;

    // Skip header if line 0 is "Pozíció ID" or "Pozicio ID"
    if (idx === 0 && /^poz[ií]ci[oó]\s*(id)?$/i.test(posId)) {
      return;
    }

    const key = posId.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      results.push(posId);
    }
  });

  return results;
}

/**
 * Parses CSV containing Warehouse Transactions: Pozíció ID, Termék ID, Mennyiség, Dátum
 */
export function parseWarehouseTransactionsCsv(
  csvText: string
): Array<{ positionId: string; productId: string; quantity: number; date: string; note?: string }> {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: Array<{ positionId: string; productId: string; quantity: number; date: string; note?: string }> = [];

  lines.forEach((line, idx) => {
    const cols = line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 2) return;

    // Check if header row
    if (
      idx === 0 &&
      (/^poz[ií]ci[oó]/i.test(cols[0]) || /^term[eé]k/i.test(cols[1]))
    ) {
      return;
    }

    const positionId = cols[0] || '';
    const productId = cols[1] || '';
    if (!positionId || !productId) return;

    // CRITICAL: Ahol nincs érték, az 0-nak felel meg! (Where there is no value, it corresponds to 0)
    const rawQty = cols[2] !== undefined && cols[2] !== null ? cols[2].trim() : '';
    const quantity = rawQty === '' ? 0 : (parseFloat(rawQty.replace(',', '.')) || 0);
    const date = (cols[3] && cols[3].trim()) ? cols[3].trim() : new Date().toISOString().slice(0, 10).replace(/-/g, '. ') + '.';
    const note = cols[4]?.trim() || undefined;

    results.push({
      positionId,
      productId,
      quantity,
      date,
      note
    });
  });

  return results;
}

/**
 * Resets the entire warehouse stock to 0:
 * 1. Deletes all warehouse transactions (both in Firestore and locally).
 * 2. Sets stockQuantity to 0 on all products (both in Firestore and locally).
 * 3. Keeps all warehouse positions intact (positions now reflect 0 stock).
 */
export async function resetAllWarehouseStockToZero(): Promise<{
  deletedTransactionsCount: number;
  updatedProductsCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let deletedTransactionsCount = 0;
  let updatedProductsCount = 0;

  // 1. Delete all transactions from Firestore
  try {
    const txSnapshot = await getDocs(collection(db, WAREHOUSE_TRANSACTIONS_COLLECTION));
    deletedTransactionsCount = txSnapshot.size;
    const docs = txSnapshot.docs;
    const chunkSize = 200;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err: any) {
    console.warn('Failed to delete transactions from Firestore:', err);
    errors.push(err?.message || 'Nem sikerült törölni a tranzakciókat a felhőből');
  }

  // 2. Clear local storage transactions
  saveLocalWarehouseTransactions([]);

  // 3. Update products stockQuantity to 0 in Firestore
  try {
    const prodSnapshot = await getDocs(collection(db, 'products'));
    updatedProductsCount = prodSnapshot.size;
    const docs = prodSnapshot.docs;
    const chunkSize = 200;
    const now = new Date().toISOString();
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((d) => {
        batch.update(d.ref, { stockQuantity: 0, updatedAt: now });
      });
      await batch.commit();
    }
  } catch (err: any) {
    console.warn('Failed to zero product stock in Firestore:', err);
    errors.push(err?.message || 'Nem sikerült frissíteni a termékek készletét Firestore-ban');
  }

  // 4. Update local products stockQuantity to 0
  try {
    const localProds = getLocalStoredProducts();
    const updated = localProds.map((p) => ({ ...p, stockQuantity: 0 }));
    saveLocalProducts(updated);
  } catch (e) {
    console.warn('Failed to update local products stock:', e);
  }

  return { deletedTransactionsCount, updatedProductsCount, errors };
}
