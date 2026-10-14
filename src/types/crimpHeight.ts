export interface WireCrimpSpec {
  wireSize: string; // e.g. "0.25", "0.35", "0.50", "0.75", "1.00", "1.50", "2.00", "2.50", "3.00", "4.00", "5.00", "6.00"
  setting?: string; // Row 1: e.g. "D", "22.0", "19.5/0"
  height?: string; // Row 2: crimp height in mm, e.g. "1.23", "1.34"
  note1?: string; // Row 3: e.g. "DUPLA BLANK", "0.50 DB", "2x1.50"
  note2?: string; // Row 4: e.g. "0.50"
}

export interface TerminalCrimpRecord {
  id: string;
  saruCode: string; // Column A (e.g. 0010188001 or 3-1447221-3)
  productId: string; // Column B (e.g. 2244210022.1 or 2122120061)
  row2Code?: string; // Row 2 Column A (e.g. 2122120061 or 2122120439)
  comment?: string; // Column C: Megjegyzés
  saruLocation?: string; // Column D: Saru hely
  applicatorFej?: string; // Column E: Saruzó Fej (e.g. N°120, N°155)
  fejLocation?: string; // Column F: Fej hely
  specs: WireCrimpSpec[];
}
