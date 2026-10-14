export type MaintenanceStatus = 'Pass' | 'Repair' | 'Fail' | string;

export interface MaintenanceRecord {
  id: string;
  productId: string; // Termék ID
  status: MaintenanceStatus; // Status: Pass (zöld) | Repair (citromsárga) | Fail (piros)
  description?: string; // Leírás
  changeItem?: string; // Change Item: kicserélt alkatrész (rákattintva ugrás a termékre)
  date: string; // Date
  changeItemName?: string;
  createdAt?: string;
  updatedAt?: string;
}
