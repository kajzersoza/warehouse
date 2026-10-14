export type KanbanStatus = 'new' | 'in_progress' | 'completed';

export interface KanbanItem {
  id: string; // Unique ID (e.g. kanban_1712345678_abcde)
  title?: string; // Opcionális cím
  productIds: string[]; // Associated product IDs (e.g. ["40107.00.33", "MLS0185-J"])
  status: KanbanStatus; // 'new' (Új - piros), 'in_progress' (Folyamatban - kék), 'completed' (Befejezve - zöld)
  note?: string; // Megjegyzés
  createdAt: string; // Létrehozás dátuma (YYYY-MM-DD or formatted)
  updatedAt?: string;
  createdBy?: string; // Létrehozó felhasználó neve vagy emailje
}

export const KANBAN_STATUS_CONFIG: Record<
  KanbanStatus,
  {
    label: string;
    color: string;
    bgBadge: string;
    textBadge: string;
    borderBadge: string;
    headerBg: string;
    cardBorder: string;
    cardHoverBg: string;
    columnBg: string;
    columnBorder: string;
    dotColor: string;
  }
> = {
  new: {
    label: 'Új',
    color: 'red',
    bgBadge: 'bg-red-100',
    textBadge: 'text-red-800',
    borderBadge: 'border-red-300',
    headerBg: 'bg-red-600',
    cardBorder: 'border-red-200',
    cardHoverBg: 'hover:border-red-400',
    columnBg: 'bg-red-50/50',
    columnBorder: 'border-red-200',
    dotColor: 'bg-red-500'
  },
  in_progress: {
    label: 'Folyamatban',
    color: 'blue',
    bgBadge: 'bg-blue-100',
    textBadge: 'text-blue-800',
    borderBadge: 'border-blue-300',
    headerBg: 'bg-blue-600',
    cardBorder: 'border-blue-200',
    cardHoverBg: 'hover:border-blue-400',
    columnBg: 'bg-blue-50/50',
    columnBorder: 'border-blue-200',
    dotColor: 'bg-blue-500'
  },
  completed: {
    label: 'Befejezve',
    color: 'green',
    bgBadge: 'bg-emerald-100',
    textBadge: 'text-emerald-800',
    borderBadge: 'border-emerald-300',
    headerBg: 'bg-emerald-600',
    cardBorder: 'border-emerald-200',
    cardHoverBg: 'hover:border-emerald-400',
    columnBg: 'bg-emerald-50/50',
    columnBorder: 'border-emerald-200',
    dotColor: 'bg-emerald-500'
  }
};
