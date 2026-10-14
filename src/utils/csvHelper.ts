import Papa from 'papaparse';
import { Product, ProductNote } from '../types/product';
import { normalizeImageUrl } from './imageHelper';

/**
 * Standard CSV headers matching the user's specification
 */
export const CSV_HEADERS = [
  'Termék ID',
  'Termék név',
  'Leírás',
  'Kategória',
  'Gyártó',
  'Adagolás',
  'Szigetelés Típus',
  'Gyári Kód',
  'Szigetelésmegfogó Típusa',
  'Konektor Típusa',
  'Saru Típusa',
  'Date',
  'Kép linkek',
  'Készlet (db)',
  'Raktári hely',
  'Pozíciók száma'
];

/**
 * Normalizes header string for tolerant matching
 */
function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Parses CSV text into Product array
 */
export function parseProductCsv(csvContent: string): { products: Product[]; errors: string[] } {
  const errors: string[] = [];
  const results = Papa.parse<Record<string, any>>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim()
  });

  if (results.errors && results.errors.length > 0) {
    results.errors.slice(0, 5).forEach((e) => {
      errors.push(`Sor ${e.row ?? '?'}: ${e.message}`);
    });
  }

  const products: Product[] = [];

  results.data.forEach((row, index) => {
    // Look up normalized keys
    const entries = Object.entries(row);
    const getVal = (possibleKeys: string[]): string => {
      const match = entries.find(([k]) => {
        const norm = normalizeKey(k);
        return possibleKeys.some((target) => norm.includes(normalizeKey(target)));
      });
      return match && match[1] !== undefined && match[1] !== null ? String(match[1]).trim() : '';
    };

    const productId = getVal(['termekid', 'termek_id', 'id', 'cikkszam', 'termek azonosito']);
    const name = getVal(['termeknev', 'termek_nev', 'nev', 'megnevezes']);
    const factoryCode = getVal(['gyarikod', 'gyari_kod', 'gyaricikk', 'kod', 'partnumber']);
    const description = getVal(['leiras', 'megjegyzes']);
    const category = getVal(['kategoria', 'tipus', 'csoport']);
    const manufacturer = getVal(['gyarto', 'marka']);
    const feeding = getVal(['adagolas', 'adagolasimod']);
    const insulationType = getVal(['szigelestipus', 'szigetelestipus', 'szigeles']);
    const insulationGripperType = getVal(['szigetelesmegfogo', 'megfogotipus', 'szigetelesmegfogotipusa']);
    const connectorType = getVal(['konektortipusa', 'konektor', 'csatlakozo']);
    const terminalType = getVal(['sarutipusa', 'saru']);
    const dateVal = getVal(['date', 'datum', 'rogzites']);
    const rawImages = getVal(['keplinkek', 'kepek', 'kep', 'images', 'image']);
    const rawStock = getVal(['keszlet', 'mennyiseg', 'darab', 'db', 'stock']);
    const locationVal = getVal(['raktarihely', 'lokacio', 'polc', 'hely']);
    const rawPositions = getVal(['poziciokszama', 'poziciok', 'pozicio', 'positions', 'pin', 'pins', 'labszam']);

    let positionsCount: number | undefined = undefined;
    const catLower = (category || '').toLowerCase();
    const isConnCategory =
      !catLower.includes('saru') &&
      !catLower.includes('terminal') &&
      (catLower.includes('konnektor') ||
        catLower.includes('connector') ||
        catLower.includes('csatlakozó') ||
        catLower.includes('csatlakozo'));

    if (isConnCategory && rawPositions) {
      const p = parseInt(rawPositions, 10);
      if (!isNaN(p) && p >= 1 && p <= 999) {
        positionsCount = p;
      }
    }

    // Parse image links
    let images: string[] = [];
    if (rawImages) {
      images = rawImages
        .split(/[;,|\n]/)
        .map((u) => u.trim())
        .filter((u) => u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:image/'))
        .map(normalizeImageUrl);
    }

    // If productId or name is missing, but factoryCode is present, use fallback
    const resolvedId = productId || factoryCode || `PRD-${Date.now()}-${index + 1}`;
    const resolvedName = name || factoryCode || `Termék ${resolvedId}`;

    if (!productId && !name && !factoryCode) {
      // Empty row or unparseable
      return;
    }

    products.push({
      id: resolvedId.replace(/[^a-zA-Z0-9_\-\.]/g, '_'),
      productId: resolvedId,
      name: resolvedName,
      description,
      category,
      manufacturer,
      feeding,
      insulationType,
      factoryCode,
      insulationGripperType,
      connectorType,
      terminalType,
      date: dateVal || new Date().toISOString().split('T')[0],
      images,
      stockQuantity:
        rawStock !== undefined && rawStock !== null && rawStock.trim() !== ''
          ? parseInt(rawStock.trim(), 10) || 0
          : 0,
      location: locationVal,
      positionsCount,
      updatedAt: new Date().toISOString()
    });
  });

  return { products, errors };
}

/**
 * Generates CSV string and triggers a browser download with UTF-8 BOM
 */
export function exportProductsToCsv(products: Product[]): void {
  const rows = products.map((p) => ({
    'Termék ID': p.productId,
    'Termék név': p.name,
    'Leírás': p.description || '',
    'Kategória': p.category || '',
    'Gyártó': p.manufacturer || '',
    'Adagolás': p.feeding || '',
    'Szigetelés Típus': p.insulationType || '',
    'Gyári Kód': p.factoryCode || '',
    'Szigetelésmegfogó Típusa': p.insulationGripperType || '',
    'Konektor Típusa': p.connectorType || '',
    'Saru Típusa': p.terminalType || '',
    'Date': p.date || '',
    'Kép linkek': (p.images || []).join('; '),
    'Készlet (db)': p.stockQuantity ?? '',
    'Raktári hely': p.location || '',
    'Pozíciók száma': p.positionsCount ?? ''
  }));

  const csv = Papa.unparse(rows);
  // Add UTF-8 Byte Order Mark (BOM) so Excel opens accents cleanly without question marks
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `raktar_termekek_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Provides sample template CSV matching user's exact specification
 */
export function getSampleCsvTemplate(): string {
  return `Termék ID,Termék név,Leírás,Kategória,Gyártó,Adagolás,Szigetelés Típus,Gyári Kód,Szigetelésmegfogó Típusa,Konektor Típusa,Saru Típusa,Date,Kép linkek,Készlet (db),Raktári hely
40107.00.33,N1,"F , 2 MOZGÓ ÜLLŐ",Saruzófej,Mecal,Oldal,Nem Gumis,MLS0185-J,F,,,2026-03-15,https://images.unsplash.com/photo-1581092160607-ee22621dd758,14,A-01-Polc-3
40108.12.01,M2 Compact,"1 Mozgó üllő, mikro kivitel",Saruzófej,Mecal,Oldal,Gumis,MLS0290-K,O,JST-XH,Csapos saru,2026-02-28,https://images.unsplash.com/photo-1581092335397-9583fe92d232,8,A-01-Polc-4`;
}

/**
 * Standard component CSV sample matching the user's provided specification
 */
export function getSampleComponentCsvTemplate(): string {
  return `Termék ID 1,Termék ID 2
40107.00.33,ME.911270246
ME.911270246,40107.00.33
40107.00.33,H_ME.911270246
H_ME.911270246,40107.00.33`;
}

export interface ParsedComponentRelation {
  parentProductId: string;
  componentProductId: string;
  quantity?: number;
}

export interface ParseComponentCsvResult {
  relations: ParsedComponentRelation[];
  errors: string[];
  totalRows: number;
  uniqueCount: number;
  duplicateCount: number;
}

/**
 * Parses component CSV text into relation pairs
 * Deduplicates relations cleanly as requested
 */
export function parseComponentCsv(csvContent: string): ParseComponentCsvResult {
  const errors: string[] = [];
  const results = Papa.parse<Record<string, any>>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim()
  });

  if (results.errors && results.errors.length > 0) {
    results.errors.slice(0, 5).forEach((e) => {
      errors.push(`Sor ${e.row ?? '?'}: ${e.message}`);
    });
  }

  const rawPairs: ParsedComponentRelation[] = [];

  results.data.forEach((row, idx) => {
    const entries = Object.entries(row);
    // Find parent (Termék ID 1) and component (Termék ID 2)
    let parent = '';
    let component = '';
    let qty: number | undefined = undefined;

    entries.forEach(([k, v]) => {
      const normKey = normalizeKey(k);
      const strVal = v !== undefined && v !== null ? String(v).trim() : '';
      if (!strVal) return;

      if (normKey.includes('termekid1') || normKey === 'termek1' || normKey === 'parent' || normKey === 'fotermek') {
        parent = strVal;
      } else if (normKey.includes('termekid2') || normKey === 'termek2' || normKey === 'component' || normKey.includes('beepulo') || normKey.includes('alkatresz')) {
        component = strVal;
      } else if (normKey.includes('mennyiseg') || normKey.includes('darab') || normKey === 'db' || normKey === 'qty' || normKey === 'quantity') {
        const parsed = parseInt(strVal, 10);
        if (!isNaN(parsed) && parsed > 0) {
          qty = parsed;
        }
      }
    });

    // Fallback if headers were non-standard but row has at least 2 columns
    if (!parent && entries.length >= 1 && entries[0][1]) {
      parent = String(entries[0][1]).trim();
    }
    if (!component && entries.length >= 2 && entries[1][1]) {
      component = String(entries[1][1]).trim();
    }
    if (qty === undefined && entries.length >= 3 && entries[2][1]) {
      const parsed = parseInt(String(entries[2][1]).trim(), 10);
      if (!isNaN(parsed) && parsed > 0) qty = parsed;
    }

    if (parent && component) {
      rawPairs.push({ parentProductId: parent, componentProductId: component, quantity: qty ?? 1 });
    } else if (parent || component) {
      errors.push(`Sor ${idx + 2}: Hiányos adatpár (Termék ID 1: "${parent}", Termék ID 2: "${component}")`);
    }
  });

  // Deduplication
  const seen = new Set<string>();
  const deduplicated: ParsedComponentRelation[] = [];
  let duplicateCount = 0;

  rawPairs.forEach((pair) => {
    const key = `${pair.parentProductId}-->${pair.componentProductId}`;
    if (seen.has(key)) {
      duplicateCount++;
    } else {
      seen.add(key);
      deduplicated.push(pair);
    }
  });

  return {
    relations: deduplicated,
    errors,
    totalRows: rawPairs.length,
    uniqueCount: deduplicated.length,
    duplicateCount
  };
}

/**
 * Exports component relations to CSV file
 */
export function exportComponentsToCsv(relations: ParsedComponentRelation[]): void {
  const rows = relations.map((r) => ({
    'Termék ID 1': r.parentProductId,
    'Termék ID 2': r.componentProductId,
    'Beépülő mennyiség (db)': r.quantity ?? 1
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `beepulo_alkatreszek_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Standard Termék <-> Mérődoboz CSV sample matching the user's provided specification
 */
export function getSampleMeterBoxCsvTemplate(): string {
  return `Termék ID 1,Termék ID 2
9099000079_00,XINT000284
XINT000284,9099000079_00
9099000079_00,XINT0000K6
XINT0000K6,9099000079_00`;
}

export interface ParsedMeterBoxRelation {
  productId1: string;
  productId2: string;
  quantity?: number;
}

export interface ParseMeterBoxCsvResult {
  relations: ParsedMeterBoxRelation[];
  errors: string[];
  totalRows: number;
  uniqueCount: number;
  duplicateCount: number;
}

/**
 * Parses Termék <-> Mérődoboz CSV text into relation pairs
 */
export function parseMeterBoxCsv(csvContent: string): ParseMeterBoxCsvResult {
  const errors: string[] = [];
  const results = Papa.parse<Record<string, any>>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim()
  });

  if (results.errors && results.errors.length > 0) {
    results.errors.slice(0, 5).forEach((e) => {
      errors.push(`Sor ${e.row ?? '?'}: ${e.message}`);
    });
  }

  const rawPairs: ParsedMeterBoxRelation[] = [];

  results.data.forEach((row, idx) => {
    const entries = Object.entries(row);
    let p1 = '';
    let p2 = '';
    let qty: number | undefined;

    entries.forEach(([k, v]) => {
      const normKey = normalizeKey(k);
      const strVal = v !== undefined && v !== null ? String(v).trim() : '';
      if (!strVal) return;

      if (normKey.includes('termekid1') || normKey === 'termek1' || normKey === 'termek' || normKey.includes('gyartando')) {
        p1 = strVal;
      } else if (normKey.includes('termekid2') || normKey === 'termek2' || normKey.includes('merodoboz') || normKey.includes('doboz')) {
        p2 = strVal;
      } else if (normKey.includes('mennyiseg') || normKey.includes('darab') || normKey === 'db' || normKey === 'qty' || normKey === 'quantity') {
        const parsed = parseInt(strVal, 10);
        if (!isNaN(parsed) && parsed > 0) qty = parsed;
      }
    });

    // Fallback if headers were generic/different
    if (!p1 && entries.length >= 1 && entries[0][1]) {
      p1 = String(entries[0][1]).trim();
    }
    if (!p2 && entries.length >= 2 && entries[1][1]) {
      p2 = String(entries[1][1]).trim();
    }
    if (qty === undefined && entries.length >= 3 && entries[2][1]) {
      const parsed = parseInt(String(entries[2][1]).trim(), 10);
      if (!isNaN(parsed) && parsed > 0) qty = parsed;
    }

    if (p1 && p2) {
      rawPairs.push({ productId1: p1, productId2: p2, quantity: qty ?? 1 });
    } else if (p1 || p2) {
      errors.push(`Sor ${idx + 2}: Hiányos kapcsolatpár (Termék ID 1: "${p1}", Termék ID 2: "${p2}")`);
    }
  });

  // Deduplication
  const seen = new Set<string>();
  const deduplicated: ParsedMeterBoxRelation[] = [];
  let duplicateCount = 0;

  rawPairs.forEach((pair) => {
    const key = `${pair.productId1}-->${pair.productId2}`;
    if (seen.has(key)) {
      duplicateCount++;
    } else {
      seen.add(key);
      deduplicated.push(pair);
    }
  });

  return {
    relations: deduplicated,
    errors,
    totalRows: rawPairs.length,
    uniqueCount: deduplicated.length,
    duplicateCount
  };
}

/**
 * Exports Termék <-> Mérődoboz relations to CSV file
 */
export function exportMeterBoxesToCsv(relations: ParsedMeterBoxRelation[]): void {
  const rows = relations.map((r) => ({
    'Termék ID 1': r.productId1,
    'Termék ID 2': r.productId2,
    'Mennyiség': r.quantity ?? 1
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `termek_merodoboz_kapcsolatok_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ParsedConnectorTerminalRelation {
  productId1: string;
  productId2: string;
  quantity?: number;
}

export interface ParseConnectorTerminalCsvResult {
  relations: ParsedConnectorTerminalRelation[];
  errors: string[];
  totalRows: number;
  uniqueCount: number;
  duplicateCount: number;
}

/**
 * Returns sample CSV template for Konnektor <-> Saru
 */
export function getSampleConnectorTerminalCsvTemplate(): string {
  return `Termék ID 1,Termék ID 2,Mennyiség\r\n2122120061,4030610910,1\r\n4030610910,2122120061,1\r\n2122120060,4030610910,2\r\n4030610910,2122120060,2`;
}

/**
 * Parses Konnektor <-> Saru CSV text into relation pairs
 */
export function parseConnectorTerminalCsv(csvContent: string): ParseConnectorTerminalCsvResult {
  const errors: string[] = [];
  const results = Papa.parse<Record<string, any>>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim()
  });

  if (results.errors && results.errors.length > 0) {
    results.errors.slice(0, 5).forEach((e) => {
      errors.push(`Sor ${e.row ?? '?'}: ${e.message}`);
    });
  }

  const rawPairs: ParsedConnectorTerminalRelation[] = [];

  results.data.forEach((row, idx) => {
    const entries = Object.entries(row);
    let p1 = '';
    let p2 = '';
    let qty: number | undefined;

    entries.forEach(([k, v]) => {
      const normKey = normalizeKey(k);
      const strVal = v !== undefined && v !== null ? String(v).trim() : '';
      if (!strVal) return;

      if (normKey.includes('termekid1') || normKey === 'termek1' || normKey === 'termek' || normKey.includes('konnektor') || normKey.includes('connector')) {
        p1 = strVal;
      } else if (normKey.includes('termekid2') || normKey === 'termek2' || normKey.includes('saru') || normKey.includes('terminal')) {
        p2 = strVal;
      } else if (normKey.includes('mennyiseg') || normKey.includes('darab') || normKey === 'db' || normKey === 'qty' || normKey === 'quantity') {
        const parsed = parseInt(strVal, 10);
        if (!isNaN(parsed) && parsed > 0) qty = parsed;
      }
    });

    // Fallback if headers were generic/different
    if (!p1 && entries.length >= 1 && entries[0][1]) {
      p1 = String(entries[0][1]).trim();
    }
    if (!p2 && entries.length >= 2 && entries[1][1]) {
      p2 = String(entries[1][1]).trim();
    }
    if (qty === undefined && entries.length >= 3 && entries[2][1]) {
      const parsed = parseInt(String(entries[2][1]).trim(), 10);
      if (!isNaN(parsed) && parsed > 0) qty = parsed;
    }

    if (p1 && p2) {
      rawPairs.push({ productId1: p1, productId2: p2, quantity: qty ?? 1 });
    } else if (p1 || p2) {
      errors.push(`Sor ${idx + 2}: Hiányos kapcsolatpár (Termék ID 1: "${p1}", Termék ID 2: "${p2}")`);
    }
  });

  // Deduplication
  const seen = new Set<string>();
  const deduplicated: ParsedConnectorTerminalRelation[] = [];
  let duplicateCount = 0;

  rawPairs.forEach((pair) => {
    const key = `${pair.productId1}-->${pair.productId2}`;
    if (seen.has(key)) {
      duplicateCount++;
    } else {
      seen.add(key);
      deduplicated.push(pair);
    }
  });

  return {
    relations: deduplicated,
    errors,
    totalRows: rawPairs.length,
    uniqueCount: deduplicated.length,
    duplicateCount
  };
}

/**
 * Exports Konnektor <-> Saru relations to CSV file
 */
export function exportConnectorTerminalsToCsv(relations: ParsedConnectorTerminalRelation[]): void {
  const rows = relations.map((r) => ({
    'Termék ID 1': r.productId1,
    'Termék ID 2': r.productId2,
    'Mennyiség': r.quantity ?? 1
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `konnektor_saru_kapcsolatok_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ParsedMatingPairRelation {
  productId1: string;
  productId2: string;
  quantity?: number;
}

/**
 * Returns sample CSV template for Ellenpárok (Konnektor-Konnektor, Saru-Saru)
 */
export function getSampleMatingPairCsvTemplate(): string {
  return [
    'Termék ID 1,Termék ID 2,Mennyiség',
    '2122120061,2122120060,1',
    '2122120060,2122120061,1',
    '4030610910,4030610910_DUG,1'
  ].join('\n');
}

/**
 * Parses Ellenpárok (mating pairs) CSV text into relation pairs
 */
export function parseMatingPairCsv(csvContent: string): {
  relations: ParsedMatingPairRelation[];
  errors: string[];
  totalRows: number;
  uniqueCount: number;
  duplicateCount: number;
} {
  const errors: string[] = [];
  const results = Papa.parse<Record<string, any>>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim()
  });

  if (results.errors && results.errors.length > 0) {
    results.errors.slice(0, 5).forEach((e) => {
      errors.push(`Sor ${e.row ?? '?'}: ${e.message}`);
    });
  }

  const rawPairs: ParsedMatingPairRelation[] = [];

  results.data.forEach((row, idx) => {
    const entries = Object.entries(row);
    let p1 = '';
    let p2 = '';
    let qty: number | undefined;

    entries.forEach(([k, v]) => {
      const normKey = normalizeKey(k);
      const strVal = v !== undefined && v !== null ? String(v).trim() : '';
      if (!strVal) return;

      if (
        normKey.includes('termekid1') ||
        normKey === 'termek1' ||
        normKey === 'termek' ||
        normKey.includes('ellenpar1') ||
        normKey.includes('mating1')
      ) {
        p1 = strVal;
      } else if (
        normKey.includes('termekid2') ||
        normKey === 'termek2' ||
        normKey.includes('ellenpar2') ||
        normKey.includes('mating2')
      ) {
        p2 = strVal;
      } else if (normKey.includes('mennyiseg') || normKey.includes('darab') || normKey === 'db' || normKey === 'qty' || normKey === 'quantity') {
        const parsed = parseInt(strVal, 10);
        if (!isNaN(parsed) && parsed > 0) qty = parsed;
      }
    });

    // Fallback if headers were generic
    if (!p1 && entries.length >= 1 && entries[0][1]) {
      p1 = String(entries[0][1]).trim();
    }
    if (!p2 && entries.length >= 2 && entries[1][1]) {
      p2 = String(entries[1][1]).trim();
    }
    if (qty === undefined && entries.length >= 3 && entries[2][1]) {
      const parsed = parseInt(String(entries[2][1]).trim(), 10);
      if (!isNaN(parsed) && parsed > 0) qty = parsed;
    }

    if (p1 && p2) {
      rawPairs.push({ productId1: p1, productId2: p2, quantity: qty ?? 1 });
    } else if (p1 || p2) {
      errors.push(`Sor ${idx + 2}: Hiányos ellenpár kapcsolat (Termék ID 1: "${p1}", Termék ID 2: "${p2}")`);
    }
  });

  // Deduplication
  const seen = new Set<string>();
  const deduplicated: ParsedMatingPairRelation[] = [];
  let duplicateCount = 0;

  rawPairs.forEach((pair) => {
    const key = `${pair.productId1}-->${pair.productId2}`;
    if (seen.has(key)) {
      duplicateCount++;
    } else {
      seen.add(key);
      deduplicated.push(pair);
    }
  });

  return {
    relations: deduplicated,
    errors,
    totalRows: rawPairs.length,
    uniqueCount: deduplicated.length,
    duplicateCount
  };
}

/**
 * Exports Ellenpárok relations to CSV file
 */
export function exportMatingPairsToCsv(relations: ParsedMatingPairRelation[]): void {
  const rows = relations.map((r) => ({
    'Termék ID 1': r.productId1,
    'Termék ID 2': r.productId2,
    'Mennyiség': r.quantity ?? 1
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ellenparok_kapcsolatok_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ParsedTerminalFejRelation {
  productId1: string;
  productId2: string;
}

/**
 * Returns sample CSV template for Saru <-> Saruzófej relations
 */
export function getSampleTerminalFejCsvTemplate(): string {
  return [
    'Termék ID 1,Termék ID 2',
    '282378/1,40107.00.38',
    '40107.00.38,282378/1',
    '284108-1,40107.00.38',
    '4030610910,40107.00.33'
  ].join('\n');
}

/**
 * Parses Saru <-> Saruzófej CSV text into relation pairs
 */
export function parseTerminalFejCsv(csvContent: string): {
  relations: ParsedTerminalFejRelation[];
  errors: string[];
  totalRows: number;
  uniqueCount: number;
  duplicateCount: number;
} {
  const errors: string[] = [];
  const results = Papa.parse<Record<string, any>>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim()
  });

  if (results.errors && results.errors.length > 0) {
    results.errors.slice(0, 5).forEach((e) => {
      errors.push(`Sor ${e.row ?? '?'}: ${e.message}`);
    });
  }

  const rawPairs: ParsedTerminalFejRelation[] = [];

  results.data.forEach((row, idx) => {
    const entries = Object.entries(row);
    let p1 = '';
    let p2 = '';

    entries.forEach(([k, v]) => {
      const normKey = normalizeKey(k);
      const strVal = v !== undefined && v !== null ? String(v).trim() : '';
      if (!strVal) return;

      if (
        normKey.includes('termekid1') ||
        normKey === 'termek1' ||
        normKey === 'saru' ||
        normKey.includes('saruid')
      ) {
        p1 = strVal;
      } else if (
        normKey.includes('termekid2') ||
        normKey === 'termek2' ||
        normKey.includes('saruzofej') ||
        normKey.includes('fej') ||
        normKey.includes('fejid')
      ) {
        p2 = strVal;
      }
    });

    // Fallback if headers were generic
    if (!p1 && entries.length >= 1 && entries[0][1]) {
      p1 = String(entries[0][1]).trim();
    }
    if (!p2 && entries.length >= 2 && entries[1][1]) {
      p2 = String(entries[1][1]).trim();
    }

    if (p1 && p2) {
      if (p1.toLowerCase() === p2.toLowerCase()) {
        errors.push(`Sor ${idx + 2}: Egy termék nem kapcsolható össze önmagával ("${p1}")`);
      } else {
        rawPairs.push({ productId1: p1, productId2: p2 });
      }
    } else if (p1 || p2) {
      errors.push(`Sor ${idx + 2}: Hiányos Saru-Saruzófej pár ("${p1}" <-> "${p2}")`);
    }
  });

  // Deduplicate and mirror bidirectionally
  const deduplicatedMap = new Map<string, ParsedTerminalFejRelation>();
  let duplicateCount = 0;

  rawPairs.forEach((pair) => {
    const key1 = `${pair.productId1.toLowerCase()}__${pair.productId2.toLowerCase()}`;
    const key2 = `${pair.productId2.toLowerCase()}__${pair.productId1.toLowerCase()}`;

    if (deduplicatedMap.has(key1)) {
      duplicateCount++;
    } else {
      deduplicatedMap.set(key1, pair);
    }

    if (!deduplicatedMap.has(key2)) {
      deduplicatedMap.set(key2, {
        productId1: pair.productId2,
        productId2: pair.productId1
      });
    }
  });

  const deduplicated = Array.from(deduplicatedMap.values());

  return {
    relations: deduplicated,
    errors,
    totalRows: rawPairs.length,
    uniqueCount: deduplicated.length,
    duplicateCount
  };
}

/**
 * Exports Saru <-> Saruzófej relations to CSV file
 */
export function exportTerminalFejekToCsv(relations: ParsedTerminalFejRelation[]): void {
  const rows = relations.map((r) => ({
    'Termék ID 1 (Saru/Fej)': r.productId1,
    'Termék ID 2 (Fej/Saru)': r.productId2
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `saru_saruzofej_kapcsolatok_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Returns sample CSV template for Notesz (Termék megjegyzések, pontozott rajzok, linkek)
 */
export function getSampleNotesCsvTemplate(): string {
  return [
    'Termék ID,Név,Leírás,Dátum,URL,Név választás,Kép linkek',
    '2122120061,Pontozott Rajz,Kábelbekötési és szerelési pontozott rajz a konnektorhoz,2025-06-19,https://example.com/rajz.pdf,Pontozott Rajz,https://images.unsplash.com/photo-1581092335397-9583fe92d232',
    '4030610910,Szerelési utasítás,Csak a jelölt saruzófejjel szabad szerelni!,2025-05-10,,Szerelési utasítás,',
    '3-1447221-3,INFO,Raktári feljegyzés és ellenőrzési pontok,2025-04-12,,INFO,'
  ].join('\n');
}

/**
 * Parses Notesz CSV text into ProductNote array
 */
export function parseNotesCsv(csvContent: string): {
  notes: ProductNote[];
  errors: string[];
  totalRows: number;
} {
  const errors: string[] = [];
  const results = Papa.parse<Record<string, any>>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim()
  });

  if (results.errors && results.errors.length > 0) {
    results.errors.slice(0, 5).forEach((e) => {
      errors.push(`Sor ${e.row ?? '?'}: ${e.message}`);
    });
  }

  const notes: ProductNote[] = [];

  results.data.forEach((row, idx) => {
    const entries = Object.entries(row);
    let productId = '';
    let title = '';
    let description = '';
    let date = '';
    let url = '';
    let nameChoice = '';
    let rawImages = '';

    entries.forEach(([k, v]) => {
      const normKey = normalizeKey(k);
      const strVal = v !== undefined && v !== null ? String(v).trim() : '';
      if (!strVal) return;

      if (normKey.includes('termekid') || normKey === 'termek' || normKey === 'cikkszam' || normKey === 'id') {
        productId = strVal;
      } else if (normKey.includes('nev') || normKey.includes('cim') || normKey.includes('megnevezes') || normKey.includes('targy')) {
        if (!title) title = strVal;
        else if (!nameChoice) nameChoice = strVal;
      } else if (normKey.includes('leiras') || normKey.includes('megjegyzes') || normKey.includes('reszlet')) {
        description = strVal;
      } else if (normKey.includes('datum') || normKey === 'date' || normKey.includes('ido')) {
        date = strVal;
      } else if (normKey.includes('url') || normKey.includes('link') || normKey.includes('web') || normKey.includes('pdf')) {
        url = strVal;
      } else if (normKey.includes('valasztas') || normKey.includes('cimke') || normKey.includes('kategoria') || normKey.includes('tipus')) {
        nameChoice = strVal;
      } else if (normKey.includes('kep') || normKey.includes('foto') || normKey.includes('image')) {
        rawImages = strVal;
      }
    });

    // Fallbacks if columns were unnamed or differently ordered
    if (!productId && entries.length >= 1 && entries[0][1]) {
      productId = String(entries[0][1]).trim();
    }
    if (!title && entries.length >= 2 && entries[1][1]) {
      title = String(entries[1][1]).trim();
    }

    if (productId && (title || description)) {
      const images: string[] = [];
      if (rawImages) {
        rawImages.split(/[;,|\n]+/).forEach((img) => {
          const trimmed = img.trim();
          if (trimmed) images.push(normalizeImageUrl(trimmed));
        });
      }

      notes.push({
        id: `note_${productId}_${Date.now()}_${idx}`,
        productId,
        title: title || 'Megjegyzés',
        description,
        date: date || new Date().toISOString().split('T')[0],
        url: url.trim(),
        nameChoice: nameChoice || title || 'Megjegyzés',
        images,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else if (productId || title || description) {
      errors.push(`Sor ${idx + 2}: Hiányos notesz bejegyzés (Termék ID: "${productId}", Cím: "${title}")`);
    }
  });

  return {
    notes,
    errors,
    totalRows: results.data.length
  };
}

/**
 * Exports Notes to CSV file
 */
export function exportNotesToCsv(notes: ProductNote[]): void {
  const rows = notes.map((n) => ({
    'Termék ID': n.productId,
    'Név': n.title,
    'Leírás': n.description || '',
    'Dátum': n.date || '',
    'URL': n.url || '',
    'Név választás': n.nameChoice || '',
    'Kép linkek': (n.images || []).join(';')
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notesz_export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Sample template for Warehouse Positions CSV (Pozíció ID)
 */
export function getSampleWarehousePositionsCsvTemplate(): string {
  return [
    'Pozíció ID',
    'A1',
    'A2',
    'A3',
    'B1',
    'B2',
    'DOBOZ 1',
    'DOBOZ 2',
    'POLC-01',
    'POLC-02',
    'Alkatrész Zóna',
    'TMK Részleg',
    'Raktár H16/1'
  ].join('\r\n');
}

/**
 * Sample template for Warehouse Transactions CSV (Pozíció ID, Termék ID, Mennyiség, Dátum, Megjegyzés)
 */
export function getSampleWarehouseTransactionsCsvTemplate(): string {
  return [
    'Pozíció ID,Termék ID,Mennyiség,Dátum,Megjegyzés',
    'A1,2182120013,10,2024. 03. 15.,Kezdő bevételezés',
    'A1,2182120013,-2,2024. 03. 20.,Termelésre kiadás',
    'A2,40107.00.33,5,2024. 04. 01.,Saruzófej raktározás',
    'B1,192922-1240,15,2024. 04. 05.,Bevételezés',
    'B1,192922-1240,-5,2024. 04. 12.,Összeszereléshez',
    'C3,0010013054,0,2024. 04. 15.,Üres pozíció ellenőrizve'
  ].join('\r\n');
}

/**
 * Exports Warehouse Positions to CSV file
 */
export function exportWarehousePositionsToCsv(positions: Array<{ id: string; name?: string; zone?: string }>): void {
  const rows = positions.map((p) => ({
    'Pozíció ID': p.id,
    'Megnevezés': p.name || p.id,
    'Zóna': p.zone || ''
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `raktar_poziciok_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports Warehouse Transactions to CSV file
 */
export function exportWarehouseTransactionsToCsv(
  transactions: Array<{ positionId: string; productId: string; quantity: number; date: string; note?: string }>
): void {
  const rows = transactions.map((t) => ({
    'Pozíció ID': t.positionId,
    'Termék ID': t.productId,
    'Mennyiség': t.quantity,
    'Dátum': t.date,
    'Megjegyzés': t.note || ''
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `raktar_tranzakciok_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Returns sample CSV template for Karbantartás (Exact format: Termék ID,Status,Leírás,Change Item,Date)
 */
export function getSampleMaintenanceCsvTemplate(): string {
  return [
    'Termék ID,Status,Leírás,Change Item,Date',
    '40107.00.33,Pass,100.000 ciklus utáni esedékes felülvizsgálat. Vezetősín tisztítás és kenés rendben.,XINT000284,2026-02-18',
    '40107.00.33,Repair,Mikrorepedés észlelése az üllő peremén. Elem cserélve, magasság újra kalibrálva.,9099000079_00,2025-11-04',
    '40108.12.01,Fail,Megvezető kopás miatti szorulás, szán hiba.,XINT0000K6,2026-01-22'
  ].join('\n');
}

export interface ParsedMaintenanceRecord {
  id?: string;
  productId: string;
  status: string;
  description?: string;
  changeItem?: string;
  date: string;
  changeItemName?: string;
}

/**
 * Parses Maintenance CSV text with exact columns: Termék ID, Status, Leírás, Change Item, Date
 */
export function parseMaintenanceCsv(csvContent: string): {
  records: ParsedMaintenanceRecord[];
  errors: string[];
  totalRows: number;
} {
  const errors: string[] = [];
  const results = Papa.parse<Record<string, any>>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim()
  });

  if (results.errors && results.errors.length > 0) {
    results.errors.forEach((err) => {
      errors.push(`Sor ${err.row !== undefined ? err.row + 2 : '?'}: ${err.message}`);
    });
  }

  const records: ParsedMaintenanceRecord[] = [];

  results.data.forEach((row, idx) => {
    const pId = (
      row['Termék ID'] ||
      row['Termek ID'] ||
      row['productId'] ||
      row['ProductId'] ||
      row['Cikkszám'] ||
      row['ID'] ||
      ''
    ).toString().trim();

    if (!pId) {
      errors.push(`Sor ${idx + 2}: Hiányzó Termék ID!`);
      return;
    }

    const rawStatus = (
      row['Status'] ||
      row['status'] ||
      row['Státusz'] ||
      row['statusz'] ||
      row['Állapot'] ||
      row['Típus / Megnevezés'] ||
      row['Típus'] ||
      ''
    ).toString().trim();

    // Normalize status: Pass / Repair / Fail or custom
    let statusVal = 'Pass';
    if (rawStatus) {
      const lower = rawStatus.toLowerCase();
      if (lower === 'pass' || lower === 'megfelelt' || lower === 'ok') statusVal = 'Pass';
      else if (lower === 'repair' || lower === 'javítás' || lower === 'javitas' || lower === 'csere') statusVal = 'Repair';
      else if (lower === 'fail' || lower === 'nem felelt meg' || lower === 'hiba') statusVal = 'Fail';
      else statusVal = rawStatus;
    }

    const descVal = (
      row['Leírás'] ||
      row['Leiras'] ||
      row['Leírás / Munkalap'] ||
      row['description'] ||
      row['Description'] ||
      row['Megjegyzés'] ||
      ''
    ).toString().trim();

    const changeItemVal = (
      row['Alkatrész csere'] ||
      row['Alkatresz csere'] ||
      row['Change Item'] ||
      row['ChangeItem'] ||
      row['changeItem'] ||
      row['change item'] ||
      row['Kicserélt alkatrész (Change Item)'] ||
      row['Kicserélt alkatrész'] ||
      row['Kicserelt alkatresz'] ||
      row['Alkatrész'] ||
      ''
    ).toString().trim();

    const dateVal = (
      row['Date'] ||
      row['date'] ||
      row['Dátum'] ||
      row['Datum'] ||
      ''
    ).toString().trim() || new Date().toISOString().split('T')[0];

    records.push({
      productId: pId,
      status: statusVal,
      description: descVal || undefined,
      changeItem: changeItemVal || undefined,
      date: dateVal
    });
  });

  return {
    records,
    errors,
    totalRows: results.data.length
  };
}

/**
 * Exports Maintenances to CSV file with exact columns: Termék ID, Status, Leírás, Change Item, Date
 */
export function exportMaintenancesToCsv(
  maintenances: Array<{
    productId: string;
    status?: string;
    description?: string;
    changeItem?: string;
    date: string;
  }>
): void {
  const rows = maintenances.map((m) => ({
    'Termék ID': m.productId,
    'Status': m.status || 'Pass',
    'Leírás': m.description || '',
    'Change Item': m.changeItem || '',
    'Date': m.date
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `termek_karbantartasok_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}




