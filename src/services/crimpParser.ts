import fs from 'fs';
import path from 'path';

// Helper to determine if a cell text is a wire-specific tag (such as double crimp, wire combinations, etc.)
function isWireSpecificTag(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  const up = t.toUpperCase();
  if (
    [
      'DUPLA BLANK',
      'DUPLA DIÓDA',
      'ÓNOZNI',
      'ÓNÓZNI',
      'SZAKSZIL',
      'LASSÚBA',
      'LASSUBAN',
      'FORRASZTANI',
      '1 ERES',
      'SZ +3',
      'SZ -3',
      'SZ +6',
      'SZ -6',
      'SZ +9',
      'SZ -9',
      'SZ+3',
      'SZ-3',
      'SZ+6',
      'SZ-6',
      'SZ+9',
      'SZ-9',
      'SZ6',
      'SZ-6',
    ].includes(up)
  ) {
    return true;
  }
  // Patterns like 2x1.50, 0.50 DB, 4X2.5, 3x4+1.50, 22AWG, AWG12
  if (/^(\d+(\.\d+)?\s*(DB|GUMIVAL)?|\d+x[\d\.\+]+|\d+X[\d\.\+]+|AWG\d+|\d+AWG)$/i.test(t)) {
    return true;
  }
  if (/^[\d\.\+\s,xX\(\)=]+$/i.test(t) && t.length <= 15) {
    return true;
  }
  if (/^SZERV[OÓ][\+\-]?\d+$/i.test(up)) {
    return true;
  }
  return false;
}

function isBlankLine(line: string): boolean {
  if (!line) return true;
  return line.replace(/,/g, '').trim() === '';
}

function isTerminalHeaderRow(line: string): boolean {
  if (isBlankLine(line)) return false;
  if (line.startsWith(',,,Sarumagasság') || line.startsWith('Saru kód,')) return false;
  const c = parseCsvRow(line);
  const saru = (c[0] || '').trim();
  const prod = (c[1] || '').trim();
  const saruLoc = (c[3] || '').trim();
  const fej = (c[4] || '').trim();
  const fejLoc = (c[5] || '').trim();

  // Ha van saruzó fej (pl. N°151, N°120, stb.)
  if (fej) return true;
  // Ha van saru hely vagy fej hely
  if (saruLoc || fejLoc) return true;
  // Ha az első oszlop ki van töltve, megvizsgáljuk, hogy saru fejléc-e
  if (saru) {
    const wireCols = [8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20];
    const hasSettingFormat = wireCols.some((w) => {
      const v = (c[w] || '').trim();
      return v.includes('/') || /[A-Za-z]/.test(v);
    });
    if (hasSettingFormat) return true;
    if (prod && (c[2] || '').trim()) return true;
    if (/[\-\/\_]/.test(saru) || /[A-Za-z]/.test(saru)) return true;
  }
  return false;
}

// Parse raw CSV content into TerminalCrimpRecord[]
export function parseCrimpCsvLines(lines: string[]) {
  const wireSizes = ['0.25', '0.35', '0.50', '0.75', '1.00', '1.50', '2.00', '2.50', '3.00', '4.00', '5.00', '6.00'];
  const wireColIndices = [8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20];
  const records = [];

  let i = 0;
  while (i < lines.length) {
    if (!isTerminalHeaderRow(lines[i])) {
      i++;
      continue;
    }

    const cols1 = parseCsvRow(lines[i]);
    const saruCode = (cols1[0] || '').trim();
    const prodId1 = (cols1[1] || '').trim();
    let comment = (cols1[2] || '').trim();
    const saruLoc = (cols1[3] || '').trim();
    const fej = (cols1[4] || '').trim();
    const fejLoc = (cols1[5] || '').trim();

    // 2. sor megkeresése (sarumagasságok sora), az üres sorokat átugorva
    let row2Idx = i + 1;
    while (row2Idx < lines.length && isBlankLine(lines[row2Idx])) {
      row2Idx++;
    }

    let cols2: string[] = [];
    if (row2Idx < lines.length && !isTerminalHeaderRow(lines[row2Idx])) {
      cols2 = parseCsvRow(lines[row2Idx]);
    } else {
      row2Idx = i;
    }

    const row2Code = (cols2[0] || '').trim();
    const prodId2 = (cols2[1] || cols2[0] || '').trim();
    const finalProdId = prodId1 || prodId2 || saruCode;

    // 3., 4., stb. sorok (megjegyzések, speciális vezetékek) összegyűjtése a következő saru fejlécig
    let k = row2Idx + 1;
    const noteRows: string[][] = [];
    while (k < lines.length) {
      if (isBlankLine(lines[k])) {
        k++;
        continue;
      }
      if (isTerminalHeaderRow(lines[k])) {
        break;
      }
      noteRows.push(parseCsvRow(lines[k]));
      k++;
    }

    const cols3 = noteRows[0] || [];
    const cols4 = noteRows[1] || [];

    // Megjegyzések összegyűjtése (a C oszlopból és a noteRows-ból, pl. a 0.25-ből)
    const candidateNotes: string[] = [];
    noteRows.forEach((row) => {
      const v025 = (row[8] || '').trim();
      if (v025 && !isWireSpecificTag(v025) && !candidateNotes.includes(v025)) {
        candidateNotes.push(v025);
      }
      for (const val of row) {
        const v = (val || '').trim();
        if (v && !isWireSpecificTag(v)) {
          if (comment && (v === comment || v.includes(comment) || comment.includes(v))) {
            if (!candidateNotes.includes(v)) candidateNotes.push(v);
          } else if (v.length > 25 && !candidateNotes.includes(v)) {
            candidateNotes.push(v);
          }
        }
      }
    });

    candidateNotes.forEach((cn) => {
      if (!comment) {
        comment = cn;
      } else if (comment === cn || comment.includes(cn)) {
        // már benne van
      } else if (cn.includes(comment)) {
        comment = cn;
      } else {
        comment = `${comment} — ${cn}`;
      }
    });

    const specs = wireSizes.map((ws, wIdx) => {
      const colIdx = wireColIndices[wIdx];
      const setting = cols1[colIdx] ? cols1[colIdx].trim() : '';
      const height = cols2[colIdx] ? cols2[colIdx].trim() : '';
      let note1 = cols3[colIdx] ? cols3[colIdx].trim() : '';
      let note2 = cols4[colIdx] ? cols4[colIdx].trim() : '';

      if (note1 && (!isWireSpecificTag(note1) || (comment && (comment.includes(note1) || note1 === comment)))) {
        note1 = '';
      }
      if (note2 && (!isWireSpecificTag(note2) || (comment && (comment.includes(note2) || note2 === comment)))) {
        note2 = '';
      }

      return { wireSize: ws, setting, height, note1, note2 };
    });

    // Csak olyan rekordot rögzítünk, amely valódi sarumagasság (height) vagy gépbeállítás (setting) adattal bír
    const hasAnyMeasurement = specs.some(
      (s) => (s.setting && s.setting.trim() !== '') || (s.height && s.height.trim() !== '')
    );

    if (hasAnyMeasurement) {
      records.push({
        id: `${saruCode || finalProdId}_${fej}_${i}`,
        saruCode,
        productId: prodId1 || prodId2 || finalProdId,
        row2Code,
        comment,
        saruLocation: saruLoc,
        applicatorFej: fej,
        fejLocation: fejLoc,
        specs
      });
    }

    i = Math.max(i + 1, k);
  }

  // Szigorú duplikáció-szűrés: "egy adat ne jelenjen meg kétszer"
  const uniqueRecords: typeof records = [];
  const seenSignatures = new Set<string>();

  for (const rec of records) {
    const measurementSig = rec.specs
      .map((s) => `${s.wireSize}:${s.setting || ''}:${s.height || ''}:${s.note1 || ''}:${s.note2 || ''}`)
      .join(';');
    const sig = `${(rec.saruCode || '').toLowerCase().trim()}|${(rec.productId || '').toLowerCase().trim()}|${(rec.applicatorFej || '').toLowerCase().trim()}|${(rec.row2Code || '').toLowerCase().trim()}|${(rec.saruLocation || '').toLowerCase().trim()}|${(rec.fejLocation || '').toLowerCase().trim()}|${measurementSig}`;

    if (!seenSignatures.has(sig)) {
      seenSignatures.add(sig);
      uniqueRecords.push(rec);
    }
  }

  return uniqueRecords;
}

function parseCsvRow(text: string): string[] {
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
