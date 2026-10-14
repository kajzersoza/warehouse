export interface Product {
  id: string; // Firestore document ID or internal ID
  productId: string; // Termék ID (pl. 40107.00.33)
  name: string; // Termék név (pl. N1)
  description?: string; // Leírás (pl. "F , 2 MOZGÓ ÜLLŐ")
  category?: string; // Kategória (pl. Saruzófej)
  manufacturer?: string; // Gyártó (pl. Mecal)
  feeding?: string; // Adagolás (pl. Oldal, Elöl, Hátul)
  insulationType?: string; // Szigetelés Típus (pl. Nem Gumis, Gumis)
  factoryCode?: string; // Gyári Kód (pl. MLS0185-J)
  insulationGripperType?: string; // Szigetelésmegfogó Típusa (pl. F)
  connectorType?: string; // Konektor Típusa
  terminalType?: string; // Saru Típusa
  date?: string; // Date
  images: string[]; // Képek linkjei
  stockQuantity?: number; // Készlet mennyiség (db)
  location?: string; // Raktári lokáció / polchely (pl. R-02-B)
  positionsCount?: number; // Pozíciók száma (1-999) Konnektor kategóriánál
  updatedAt?: string;
}

export interface ProductComponentRelation {
  id: string; // Doc ID: parentId__componentId
  parentProductId: string; // Termék ID 1 (Fő termék)
  componentProductId: string; // Termék ID 2 (Beépülő alkatrész)
  quantity?: number; // Mennyi alkatrész épül be az adott termékbe (db)
  updatedAt?: string;
}

export interface ProductMeterBoxRelation {
  id: string; // Doc ID: productId1__productId2
  productId1: string; // Termék ID 1 (pl. 9099000079_00 vagy XINT000284)
  productId2: string; // Termék ID 2 (pl. XINT000284 vagy 9099000079_00)
  quantity?: number; // Kapcsolódó darabszám (db)
  updatedAt?: string;
}

export interface ProductConnectorTerminalRelation {
  id: string; // Doc ID: productId1__productId2
  productId1: string; // Termék ID 1 (Konnektor vagy Saru, pl. 2122120061 vagy 4030610910)
  productId2: string; // Termék ID 2 (Saru vagy Konnektor, pl. 4030610910 vagy 2122120061)
  quantity?: number; // Kapcsolódó darabszám (db)
  updatedAt?: string;
}

export interface ProductMatingPairRelation {
  id: string; // Doc ID: productId1__productId2
  productId1: string; // Termék ID 1 (Konnektor vagy Saru)
  productId2: string; // Termék ID 2 (Ellenpár: Konnektor-Konnektor vagy Saru-Saru)
  quantity?: number; // Kapcsolódó darabszám (db)
  updatedAt?: string;
}

export interface ProductTerminalFejRelation {
  id: string; // Doc ID: productId1__productId2
  productId1: string; // Termék ID 1 (Saru vagy Saruzófej)
  productId2: string; // Termék ID 2 (Saruzófej vagy Saru)
  quantity?: number; // Kapcsolódó darabszám (db)
  updatedAt?: string;
}

export interface ProductTerminalFejDisconnection {
  id: string; // Doc ID: productId1__productId2
  productId1: string; // Saru vagy Saruzófej azonosítója
  productId2: string; // Leválasztott másik fél azonosítója
  updatedAt?: string;
}

export interface ProductNote {
  id: string; // Unique note ID
  productId: string; // Termék ID (kapcsolódó termék)
  title: string; // Név (pl. Pontozott Rajz, Eredeti Rajz, INFO, Alkatrész csere)
  description?: string; // Leírás
  date?: string; // Dátum (pl. 2025. 06. 19.)
  url?: string; // URL / Weboldal vagy Google Drive link
  nameChoice?: string; // Név választás / Címke (pl. Pontozott Rajz, pdf, KÉP)
  images?: string[]; // Külön fényképek csatolása a noteszhoz
  createdAt?: string;
  updatedAt?: string;
}

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  secondaryEmail?: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface WarehousePosition {
  id: string; // e.g. "A1", "DOBOZ 1", "Raktár H16/1"
  name: string; // e.g. "A1", "DOBOZ 1"
  description?: string;
  zone?: string; // e.g. "A-F Fő rács", "Alkatrész Zóna", "Polcok", "Dobozok", "Üzem & Részlegek", "Raktár Terület", "Egyéb Pozíciók"
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WarehouseTransaction {
  id: string; // Unique ID
  positionId: string; // Pozíció ID
  productId: string; // Termék ID / Cikkszám
  quantity: number; // Mennyiség (+ vagy -)
  date: string; // Dátum (pl. "2024. 01. 01.")
  note?: string; // Opcionális megjegyzés
  createdAt?: string;
  updatedAt?: string;
}

export type ViewMode =
  | 'list'
  | 'detail'
  | 'csv-import'
  | 'data-import'
  | 'new-product'
  | 'warehouse-stats'
  | 'users-permissions'
  | 'kanban';

