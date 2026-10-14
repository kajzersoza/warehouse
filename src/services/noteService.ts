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
import { ProductNote } from '../types/product';
import { sanitizeDocId } from './productService';
import { parseSeedNotes } from '../data/initialNotes';
import { normalizeKey } from './crimpHeightService';

const NOTES_COLLECTION = 'product_notes';
const LOCAL_STORAGE_KEY = 'raktar_app_notes_v1';

export const INITIAL_NOTES: ProductNote[] = parseSeedNotes();

export function getLocalStoredNotes(): ProductNote[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return INITIAL_NOTES;
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
    console.warn('Could not read notes from localStorage:', err);
  }
  return INITIAL_NOTES;
}

export function saveLocalNotes(notes: ProductNote[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));
  } catch (err) {
    console.warn('Could not save notes to localStorage:', err);
  }
}

/**
 * Generate a safe unique ID for a note
 */
export function generateNoteId(productId: string): string {
  const cleanProd = sanitizeDocId(productId.trim()) || 'general';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `note_${cleanProd}_${timestamp}_${randomStr}`;
}

/**
 * Seed initial sample notes into Firestore if empty
 */
export async function seedInitialNotesIfEmpty(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, NOTES_COLLECTION));
    if (snapshot.empty && INITIAL_NOTES.length > 0) {
      console.log('Seeding initial product notes into Firestore...');
      const batch = writeBatch(db);
      INITIAL_NOTES.forEach((note) => {
        const docRef = doc(db, NOTES_COLLECTION, note.id);
        batch.set(docRef, {
          ...note,
          updatedAt: note.updatedAt || new Date().toISOString()
        });
      });
      await batch.commit();
      console.log('Seeded notes successfully!');
    }
  } catch (err) {
    console.warn('Notes initial seeding skipped (offline or permission):', err);
  }
}

/**
 * Subscribe to real-time product notes from Firestore
 */
export function subscribeToNotes(
  onUpdate: (notes: ProductNote[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, NOTES_COLLECTION),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ProductNote[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              productId: data.productId || '',
              title: data.title || 'Megjegyzés',
              description: data.description || '',
              date: data.date || '',
              url: data.url || '',
              nameChoice: data.nameChoice || '',
              images: Array.isArray(data.images) ? data.images : [],
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString()
            });
          });
          saveLocalNotes(list);
          onUpdate(list);
        } else {
          const local = getLocalStoredNotes();
          onUpdate(local);
        }
      },
      (error) => {
        console.warn('Firestore notes listener warning:', error);
        onUpdate(getLocalStoredNotes());
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn('Failed to attach notes snapshot listener:', error);
    onUpdate(getLocalStoredNotes());
    return () => {};
  }
}

/**
 * Save or update a single note
 */
export async function saveNote(note: ProductNote): Promise<void> {
  const noteId = note.id || generateNoteId(note.productId);
  const dataToSave: ProductNote = {
    ...note,
    id: noteId,
    productId: note.productId.trim(),
    title: note.title.trim() || 'Megjegyzés',
    updatedAt: new Date().toISOString()
  };

  // Update localStorage first (optimistic)
  const current = getLocalStoredNotes();
  const existingIdx = current.findIndex((n) => n.id === noteId);
  let updatedList: ProductNote[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = dataToSave;
  } else {
    updatedList = [dataToSave, ...current];
  }
  saveLocalNotes(updatedList);

  // Sync to Firestore
  try {
    const docRef = doc(db, NOTES_COLLECTION, noteId);
    await setDoc(docRef, dataToSave, { merge: true });
  } catch (err) {
    console.warn('Could not sync note to Firestore (saved locally):', err);
  }
}

/**
 * Delete a note
 */
export async function deleteNote(noteId: string): Promise<void> {
  // Update localStorage first
  const current = getLocalStoredNotes();
  const updated = current.filter((n) => n.id !== noteId);
  saveLocalNotes(updated);

  // Sync to Firestore
  try {
    const docRef = doc(db, NOTES_COLLECTION, noteId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Could not delete note from Firestore (deleted locally):', err);
  }
}

/**
 * Filter notes for a specific product
 * Takes into account dots and suffix characters (e.g. 2182120013 vs 2182120013.10)
 */
export function getNotesForProduct(productId?: string, allNotes: ProductNote[] = []): ProductNote[] {
  if (!productId) return [];
  const normTarget = normalizeKey(productId);
  return allNotes.filter((n) => {
    const normNoteProd = normalizeKey(n.productId);
    return normNoteProd === normTarget;
  });
}

/**
 * Batch saves notes (from CSV import) to Firestore and updates local cache
 */
export async function batchSaveNotes(
  notesToImport: ProductNote[]
): Promise<{ successCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;

  if (!notesToImport || notesToImport.length === 0) {
    return { successCount: 0, errors: [] };
  }

  // Deduplicate and ensure IDs
  const current = getLocalStoredNotes();
  const notesMap = new Map<string, ProductNote>();
  current.forEach((n) => notesMap.set(n.id, n));

  const validNotes: ProductNote[] = [];
  notesToImport.forEach((n) => {
    const id = n.id || generateNoteId(n.productId);
    const cleanedNote: ProductNote = {
      ...n,
      id,
      productId: n.productId.trim(),
      title: n.title?.trim() || 'Megjegyzés',
      updatedAt: new Date().toISOString()
    };
    validNotes.push(cleanedNote);
    notesMap.set(id, cleanedNote);
  });

  // Batch commit to Firestore in chunks of 450
  try {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < validNotes.length; i += CHUNK_SIZE) {
      const chunk = validNotes.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((note) => {
        const docRef = doc(db, NOTES_COLLECTION, note.id);
        batch.set(docRef, note, { merge: true });
      });
      await batch.commit();
      successCount += chunk.length;
    }
  } catch (err: any) {
    console.error('Batch commit notes error:', err);
    errors.push(err?.message || 'Nem sikerült a bejegyzéseket a felhőbe menteni');
  }

  // Update localStorage
  saveLocalNotes(Array.from(notesMap.values()));

  return { successCount, errors };
}
