import { MaintenanceRecord } from '../types/maintenance';

export const INITIAL_MAINTENANCES: MaintenanceRecord[] = [
  {
    id: 'maint_40107_01',
    productId: '40107.00.33',
    status: 'Pass',
    description: '100.000 ciklus utáni esedékes felülvizsgálat. Vezetősín tisztítás és kenés rendben.',
    changeItem: 'XINT000284',
    date: '2026-02-18',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'maint_40107_02',
    productId: '40107.00.33',
    status: 'Repair',
    description: 'Mikrorepedés észlelése az üllő peremén. Elem cserélve, magasság újra kalibrálva.',
    changeItem: '9099000079_00',
    date: '2025-11-04',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'maint_40108_01',
    productId: '40108.12.01',
    status: 'Fail',
    description: 'Megvezető kopás miatti szorulás, szán hiba.',
    changeItem: 'XINT0000K6',
    date: '2026-01-22',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
