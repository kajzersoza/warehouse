import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserRole } from '../types/product';

export const PRIMARY_ADMIN_EMAIL = 'kovacsroli@gmail.com';

const USERS_COLLECTION = 'users';
const LOCAL_CUSTOM_USER_KEY = 'ww_custom_user_session';

/**
 * Normalizes email string for consistent comparison and key lookup
 */
export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Checks if a given email is the designated primary administrator
 */
export function isPrimaryAdmin(email?: string | null): boolean {
  if (!email) return false;
  return normalizeEmail(email) === normalizeEmail(PRIMARY_ADMIN_EMAIL);
}

/**
 * Get the current user profile from Firestore or local storage, creating or upgrading it if necessary
 */
export async function syncOrCreateUserProfile(
  uid: string,
  email: string,
  displayName?: string,
  secondaryEmail?: string
): Promise<UserProfile> {
  const normEmail = normalizeEmail(email);
  const docRef = doc(db, USERS_COLLECTION, uid);

  try {
    const snap = await getDoc(docRef);
    const nowIso = new Date().toISOString();

    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      // If the email is the primary admin, ensure they always possess admin role
      const shouldBeAdmin = isPrimaryAdmin(normEmail);
      if (shouldBeAdmin && data.role !== 'admin') {
        const updatedProfile: UserProfile = {
          ...data,
          role: 'admin',
          updatedAt: nowIso
        };
        await updateDoc(docRef, { role: 'admin', updatedAt: nowIso });
        return updatedProfile;
      }
      return data;
    } else {
      // First-time registration
      const role: UserRole = isPrimaryAdmin(normEmail) ? 'admin' : 'viewer';
      const newProfile: UserProfile = {
        uid,
        email: normEmail,
        displayName: displayName || (normEmail.split('@')[0] ?? 'Felhasználó'),
        secondaryEmail: secondaryEmail || '',
        role,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      await setDoc(docRef, newProfile);
      return newProfile;
    }
  } catch (error) {
    console.warn('Error reading or creating user profile from Firestore, using offline fallback:', error);
    // Offline / fallback fallback
    const role: UserRole = isPrimaryAdmin(normEmail) ? 'admin' : 'viewer';
    return {
      uid,
      email: normEmail,
      displayName: displayName || normEmail.split('@')[0],
      secondaryEmail: secondaryEmail || '',
      role,
      createdAt: new Date().toISOString()
    };
  }
}

/**
 * Update user's personal profile (Name, Secondary / notification email)
 */
export async function updateUserProfileDetails(
  uid: string,
  updates: { displayName?: string; secondaryEmail?: string }
): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const nowIso = new Date().toISOString();
  try {
    await updateDoc(docRef, {
      ...updates,
      updatedAt: nowIso
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${uid}`);
  }
}

/**
 * Admin action: update any user's role (Admin, Editor, Viewer)
 */
export async function updateUserRoleByAdmin(
  targetUid: string,
  targetEmail: string,
  newRole: UserRole
): Promise<void> {
  // Prevent removing admin rights from the primary owner
  if (isPrimaryAdmin(targetEmail) && newRole !== 'admin') {
    throw new Error(`A(z) ${PRIMARY_ADMIN_EMAIL} címhez tartozó fő adminisztrátori jog nem vonható vissza!`);
  }

  const docRef = doc(db, USERS_COLLECTION, targetUid);
  const nowIso = new Date().toISOString();

  try {
    await updateDoc(docRef, {
      role: newRole,
      updatedAt: nowIso
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${targetUid}`);
  }
}

/**
 * Admin action: Pre-assign or add a new user profile by email with specific role
 */
export async function preAssignUserByEmail(
  email: string,
  role: UserRole,
  displayName?: string,
  secondaryEmail?: string
): Promise<UserProfile> {
  const normEmail = normalizeEmail(email);
  if (!normEmail) throw new Error('Érvényes e-mail cím megadása kötelező!');

  // Generate safe UID key from email
  const safeUid = 'usr_' + normEmail.replace(/[^a-zA-Z0-9]/g, '_');
  const docRef = doc(db, USERS_COLLECTION, safeUid);
  const nowIso = new Date().toISOString();

  const finalRole: UserRole = isPrimaryAdmin(normEmail) ? 'admin' : role;

  const profile: UserProfile = {
    uid: safeUid,
    email: normEmail,
    displayName: displayName?.trim() || normEmail.split('@')[0],
    secondaryEmail: secondaryEmail?.trim() || '',
    role: finalRole,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  try {
    await setDoc(docRef, profile, { merge: true });
    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${USERS_COLLECTION}/${safeUid}`);
  }
}

/**
 * Real-time listener for all user profiles (For Admin view)
 */
export function subscribeToAllUsers(
  onUpdate: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, USERS_COLLECTION);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((d) => {
        const item = d.data() as UserProfile;
        // Ensure primary admin is represented with admin role
        if (isPrimaryAdmin(item.email)) {
          item.role = 'admin';
        }
        list.push({ ...item, uid: d.id });
      });

      // If primary admin isn't in Firestore yet, ensure they appear at the top
      const hasPrimary = list.some((u) => isPrimaryAdmin(u.email));
      if (!hasPrimary) {
        list.unshift({
          uid: 'admin_primary',
          email: PRIMARY_ADMIN_EMAIL,
          displayName: 'Kovács Roland (Fő Admin)',
          role: 'admin',
          createdAt: new Date().toISOString()
        });
      }

      // Sort by admin first, then name
      list.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (b.role === 'admin' && a.role !== 'admin') return 1;
        return a.displayName.localeCompare(b.displayName, 'hu');
      });

      onUpdate(list);
    },
    (error) => {
      console.warn('Real-time users sync notice:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Custom non-Google login helper for workers / internal users
 */
export function getStoredCustomUserSession(): UserProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOM_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCustomUserSession(profile: UserProfile): void {
  try {
    localStorage.setItem(LOCAL_CUSTOM_USER_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save custom user session:', err);
  }
}

export function clearCustomUserSession(): void {
  try {
    localStorage.removeItem(LOCAL_CUSTOM_USER_KEY);
  } catch (err) {
    console.error('Failed to clear custom user session:', err);
  }
}
