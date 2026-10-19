export const PINNED_PRODUCTS_STORAGE_KEY = 'raktar_pinned_products_v1';

export function getPinnedProductIds(): string[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(PINNED_PRODUCTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id) => typeof id === 'string' && id.trim().length > 0);
    }
  } catch (e) {
    console.warn('Could not read pinned products from localStorage:', e);
  }
  return [];
}

export function savePinnedProductIds(ids: string[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    const unique = Array.from(new Set(ids.filter((id) => Boolean(id && id.trim()))));
    localStorage.setItem(PINNED_PRODUCTS_STORAGE_KEY, JSON.stringify(unique));
  } catch (e) {
    console.warn('Could not save pinned products to localStorage:', e);
  }
}

export function addPinnedProductId(productId: string): string[] {
  const cleanId = (productId || '').trim();
  if (!cleanId) return getPinnedProductIds();
  const current = getPinnedProductIds();
  if (!current.includes(cleanId)) {
    const next = [...current, cleanId];
    savePinnedProductIds(next);
    return next;
  }
  return current;
}

export function removePinnedProductId(productId: string): string[] {
  const cleanId = (productId || '').trim();
  const current = getPinnedProductIds();
  const next = current.filter((id) => id.toLowerCase() !== cleanId.toLowerCase());
  savePinnedProductIds(next);
  return next;
}

export function togglePinnedProductId(productId: string): { pinned: boolean; ids: string[] } {
  const cleanId = (productId || '').trim();
  if (!cleanId) return { pinned: false, ids: getPinnedProductIds() };
  const current = getPinnedProductIds();
  const exists = current.some((id) => id.toLowerCase() === cleanId.toLowerCase());
  if (exists) {
    const next = removePinnedProductId(cleanId);
    return { pinned: false, ids: next };
  } else {
    const next = addPinnedProductId(cleanId);
    return { pinned: true, ids: next };
  }
}

export function clearAllPinnedProductIds(): void {
  savePinnedProductIds([]);
}

export function isProductPinned(productId: string, pinnedIds: string[]): boolean {
  if (!productId) return false;
  const lower = productId.trim().toLowerCase();
  return pinnedIds.some((id) => id.trim().toLowerCase() === lower);
}
