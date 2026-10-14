import { TerminalCrimpRecord } from '../types/crimpHeight';
import { parseCrimpCsvLines } from './crimpParser';
import { rawCrimpCsv } from '../data/rawCrimpCsv';

let cachedRecords: TerminalCrimpRecord[] | null = null;
export const CUSTOM_CRIMP_CSV_KEY = 'raktar_custom_crimp_csv_v1';
export const CRIMP_LIVE_URL_KEY = 'raktar_crimp_live_url_v1';
export const CRIMP_LAST_SYNC_KEY = 'raktar_crimp_last_sync_v1';

export function getStoredCrimpLiveUrl(): string {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(CRIMP_LIVE_URL_KEY) || '';
    } catch (e) {
      console.warn('Could not read crimp live url from localStorage:', e);
    }
  }
  return '';
}

export function setStoredCrimpLiveUrl(url: string): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      if (url.trim()) {
        localStorage.setItem(CRIMP_LIVE_URL_KEY, url.trim());
      } else {
        localStorage.removeItem(CRIMP_LIVE_URL_KEY);
      }
    } catch (e) {
      console.warn('Could not save crimp live url:', e);
    }
  }
}

export function getStoredCrimpLastSync(): string {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(CRIMP_LAST_SYNC_KEY) || '';
    } catch (e) {
      console.warn('Could not read crimp last sync from localStorage:', e);
    }
  }
  return '';
}

export function setStoredCrimpLastSync(dateStr: string): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CRIMP_LAST_SYNC_KEY, dateStr);
    } catch (e) {
      console.warn('Could not save crimp last sync:', e);
    }
  }
}

/**
 * Converts a Google Sheets or Google Drive sharing link to a direct CSV export download link.
 */
export function convertToLiveCsvUrl(inputUrl: string): string {
  const url = (inputUrl || '').trim();
  if (!url) return '';

  // Google Sheets link: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=SHEET_ID
  if (url.includes('docs.google.com/spreadsheets')) {
    const docIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (docIdMatch && docIdMatch[1]) {
      const docId = docIdMatch[1];
      const gidMatch = url.match(/gid=([0-9]+)/);
      const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
      return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv${gidParam}`;
    }
  }

  // Google Drive link: https://drive.google.com/file/d/FILE_ID/view...
  if (url.includes('drive.google.com')) {
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }

  return url;
}

export function getAllCrimpRecords(): TerminalCrimpRecord[] {
  if (!cachedRecords) {
    let csvData = rawCrimpCsv;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(CUSTOM_CRIMP_CSV_KEY);
        if (stored && stored.trim().length > 50) {
          csvData = stored;
        }
      } catch (e) {
        console.warn('Could not read custom crimp csv from localStorage:', e);
      }
    }
    const lines = csvData.split(/\r?\n/);
    cachedRecords = parseCrimpCsvLines(lines);
  }
  return cachedRecords;
}

export function reloadCrimpRecords(newCsvText?: string): { count: number } {
  if (newCsvText !== undefined) {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        if (newCsvText.trim()) {
          localStorage.setItem(CUSTOM_CRIMP_CSV_KEY, newCsvText);
        } else {
          localStorage.removeItem(CUSTOM_CRIMP_CSV_KEY);
        }
      } catch (e) {
        console.warn('Could not save custom crimp csv:', e);
      }
    }
  }
  cachedRecords = null; // Invalidate cache
  const reloaded = getAllCrimpRecords();
  return { count: reloaded.length };
}

export function resetCrimpRecordsToDefault(): { count: number } {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(CUSTOM_CRIMP_CSV_KEY);
      localStorage.removeItem(CRIMP_LIVE_URL_KEY);
      localStorage.removeItem(CRIMP_LAST_SYNC_KEY);
    } catch (e) {
      console.warn('Could not remove custom crimp csv:', e);
    }
  }
  cachedRecords = null;
  const reloaded = getAllCrimpRecords();
  return { count: reloaded.length };
}

export function getCustomCrimpCsv(): string | null {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(CUSTOM_CRIMP_CSV_KEY);
    } catch (e) {
      console.warn('Could not read custom crimp csv:', e);
    }
  }
  return null;
}

export function normalizeKey(val?: string): string {
  if (!val) return '';
  // Preserve dot (.) and characters after it (e.g. 2182120013 vs 2182120013.10)
  return val.trim().toLowerCase().replace(/[\s\-_/()]/g, '');
}

export function getCrimpHeightsForProduct(
  productId?: string,
  factoryCode?: string,
  name?: string
): TerminalCrimpRecord[] {
  if (!productId && !factoryCode && !name) return [];

  const all = getAllCrimpRecords();
  const normProdId = normalizeKey(productId);
  const normFactory = normalizeKey(factoryCode);
  const normName = normalizeKey(name);

  const matched = all.filter((rec) => {
    const normRecProdId = normalizeKey(rec.productId);
    const normRecSaru = normalizeKey(rec.saruCode);
    const normRecRow2 = normalizeKey(rec.row2Code);

    // Exact matches on Product ID (preserves dots, distinguishing e.g. 2182120013 and 2182120013.10)
    if (normProdId) {
      if (normRecProdId && normRecProdId === normProdId) return true;
      if (normRecSaru && normRecSaru === normProdId) return true;
      if (normRecRow2 && normRecRow2 === normProdId) return true;
    }

    // Exact matches on Factory Code
    if (normFactory) {
      if (normRecSaru && normRecSaru === normFactory) return true;
      if (normRecProdId && normRecProdId === normFactory) return true;
      if (normRecRow2 && normRecRow2 === normFactory) return true;
    }

    // Exact matches on Name
    if (normName) {
      if (normRecProdId && normRecProdId === normName) return true;
      if (normRecSaru && normRecSaru === normName) return true;
      if (normRecRow2 && normRecRow2 === normName) return true;
    }

    return false;
  });

  // Strict deduplication: "egy adat ne jelenjen meg kétszer"
  const uniqueMatched: TerminalCrimpRecord[] = [];
  const seenSignatures = new Set<string>();

  for (const rec of matched) {
    const measurementSig = rec.specs
      .map((s) => `${s.wireSize}:${s.setting || ''}:${s.height || ''}`)
      .join(';');
    const sig = `${(rec.saruCode || '').toLowerCase().trim()}|${(rec.productId || '').toLowerCase().trim()}|${(rec.applicatorFej || '').toLowerCase().trim()}|${(rec.fejLocation || '').toLowerCase().trim()}|${measurementSig}`;

    if (!seenSignatures.has(sig)) {
      seenSignatures.add(sig);
      uniqueMatched.push(rec);
    }
  }

  return uniqueMatched;
}
