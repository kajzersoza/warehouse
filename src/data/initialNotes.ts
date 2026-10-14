import { ProductNote } from '../types/product';
import { initialNotesRawCsv } from './rawNotesCsv';

export function parseSeedNotes(): ProductNote[] {
  const lines = initialNotesRawCsv.trim().split(/\r?\n/);
  const notes: ProductNote[] = [];
  // Skip header: Termék ID,Név,Leírás,Dátum,URL,Név választás,URL
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // parse CSV with quote awareness
    const parts = parseCsvLine(line);
    const productId = (parts[0] || '').trim();
    const title = (parts[1] || '').trim();
    const description = (parts[2] || '').trim();
    const date = (parts[3] || '').trim();
    const col4 = (parts[4] || '').trim();
    const nameChoice = (parts[5] || '').trim();
    const col6 = (parts[6] || '').trim();

    if (!productId && !title) continue;

    const url = col6 || (col4.startsWith('http') ? col4 : '');
    const displayLabel = col4 && !col4.startsWith('http') ? col4 : nameChoice;

    notes.push({
      id: `seed_note_${i}_${productId}`,
      productId,
      title: title || 'Megjegyzés',
      description,
      date,
      url,
      nameChoice: displayLabel,
      images: [],
      createdAt: new Date().toISOString()
    });
  }
  return notes;
}

function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur);
  return result;
}
