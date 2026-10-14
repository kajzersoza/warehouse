import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Trash2,
  Edit3,
  Calendar,
  Layers,
  Tag,
  Factory,
  CheckCircle2,
  Box,
  MapPin,
  Clock,
  Share2,
  Puzzle,
  ExternalLink,
  Plus,
  Search,
  Image as ImageIcon,
  ChevronRight,
  UploadCloud,
  Check,
  X,
  Eye,
  Gauge,
  ChevronDown,
  Link2,
  Plug,
  GitCompare,
  BookOpen,
  Wrench,
  Barcode,
  AlertTriangle,
  RotateCcw,
  ArrowRightLeft,
  Minus,
  Info
} from 'lucide-react';
import { Product, ProductComponentRelation, ProductMeterBoxRelation, ProductConnectorTerminalRelation, ProductMatingPairRelation, ProductTerminalFejRelation, ProductTerminalFejDisconnection, ProductNote, WarehouseTransaction } from '../types/product';
import { ImageGalleryWithZoom } from './ImageGalleryWithZoom';
import { ComboboxInput } from './ComboboxInput';
import {
  getConnectedMeterBoxesForProduct,
  getMeterBoxRelationsMapForProduct,
  isMeterBoxRelatedCategory
} from '../services/meterBoxService';
import {
  getConnectedConnectorTerminalsForProduct,
  getConnectorTerminalRelationsMapForProduct,
  isConnectorTerminalRelatedCategory,
  isConnectorCategory
} from '../services/connectorTerminalService';
import {
  getConnectedMatingPairsForProduct,
  getMatingPairRelationsMapForProduct,
  isMatingPairRelatedCategory
} from '../services/matingPairService';
import {
  getConnectedTerminalFejekForProduct,
  getDisconnectedTerminalFejekForProduct,
  isTerminalFejRelatedCategory,
  isFejCategory,
  isSaruCategory,
  isAlkatreszCategory,
  ConnectedTerminalFejItem
} from '../services/terminalFejService';
import { CrimpHeightTableCard } from './CrimpHeightTableCard';
import { getCrimpHeightsForProduct } from '../services/crimpHeightService';
import { ProductNotesSection } from './ProductNotesSection';
import { getNotesForProduct } from '../services/noteService';
import { MaintenanceRecord } from '../types/maintenance';
import { ProductMaintenanceSection } from './ProductMaintenanceSection';
import { getMaintenancesForProduct } from '../services/maintenanceService';
import { KanbanItem, KANBAN_STATUS_CONFIG } from '../types/kanban';
import { getProductKanbanStatus } from '../services/kanbanService';

interface ProductDetailProps {
  product: Product;
  allProducts?: Product[];
  componentRelations?: ProductComponentRelation[];
  meterBoxRelations?: ProductMeterBoxRelation[];
  connectorTerminalRelations?: ProductConnectorTerminalRelation[];
  matingPairRelations?: ProductMatingPairRelation[];
  terminalFejRelations?: ProductTerminalFejRelation[];
  productNotes?: ProductNote[];
  maintenances?: MaintenanceRecord[];
  kanbanItems?: KanbanItem[];
  onBack: () => void;
  onGoToList?: () => void;
  previousProduct?: Product | null;
  onSave: (updated: Product, oldProductId?: string) => Promise<void>;
  onDelete: (productId: string) => Promise<void>;
  onSelectProduct?: (product: Product) => void;
  onOpenKanbanModal?: (productId: string) => void;
  onNavigateToKanban?: () => void;
  onFilterBy?: (type: 'category' | 'manufacturer' | 'feeding', value: string) => void;
  onNavigateToDataImport?: (tab: 'products' | 'components' | 'meterboxes' | 'connector-terminals' | 'mating-pairs' | 'notes' | 'warehouse-positions' | 'warehouse-transactions' | 'maintenances') => void;
  onAddComponentRelation?: (parentProductId: string, componentProductId: string, quantity?: number) => Promise<void>;
  onDeleteComponentRelation?: (parentProductId: string, componentProductId: string) => Promise<void>;
  onAddMeterBoxRelation?: (productId1: string, productId2: string, quantity?: number) => Promise<void>;
  onDeleteMeterBoxRelation?: (productId1: string, productId2: string) => Promise<void>;
  onAddConnectorTerminalRelation?: (productId1: string, productId2: string, quantity?: number) => Promise<void>;
  onDeleteConnectorTerminalRelation?: (productId1: string, productId2: string) => Promise<void>;
  onAddMatingPairRelation?: (productId1: string, productId2: string, quantity?: number) => Promise<void>;
  onDeleteMatingPairRelation?: (productId1: string, productId2: string) => Promise<void>;
  onAddTerminalFejRelation?: (productId1: string, productId2: string, quantity?: number) => Promise<void>;
  onDeleteTerminalFejRelation?: (productId1: string, productId2: string) => Promise<void>;
  terminalFejDisconnections?: ProductTerminalFejDisconnection[];
  warehouseTransactions?: WarehouseTransaction[];
  onNavigateToWarehousePosition?: (positionId: string) => void;
  onNavigateToWarehouseMovement?: (productId: string, positionId?: string) => void;
  onSaveProductNote?: (note: ProductNote) => Promise<void>;
  onDeleteProductNote?: (noteId: string) => Promise<void>;
  onSaveMaintenance?: (record: Partial<MaintenanceRecord> & { productId: string }) => Promise<void>;
  onDeleteMaintenance?: (recordId: string) => Promise<void>;
  onDeleteAllMaintenanceForProduct?: (productId: string) => Promise<void>;
  canEdit?: boolean;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  allProducts = [],
  componentRelations = [],
  meterBoxRelations = [],
  connectorTerminalRelations = [],
  matingPairRelations = [],
  terminalFejRelations = [],
  terminalFejDisconnections = [],
  warehouseTransactions = [],
  productNotes = [],
  maintenances = [],
  kanbanItems = [],
  onBack,
  onGoToList,
  previousProduct,
  onSave,
  onDelete,
  onSelectProduct,
  onOpenKanbanModal,
  onNavigateToKanban,
  onFilterBy,
  onNavigateToDataImport,
  onNavigateToWarehousePosition,
  onNavigateToWarehouseMovement,
  onAddComponentRelation,
  onDeleteComponentRelation,
  onAddMeterBoxRelation,
  onDeleteMeterBoxRelation,
  onAddConnectorTerminalRelation,
  onDeleteConnectorTerminalRelation,
  onAddMatingPairRelation,
  onDeleteMatingPairRelation,
  onAddTerminalFejRelation,
  onDeleteTerminalFejRelation,
  onSaveProductNote,
  onDeleteProductNote,
  onSaveMaintenance,
  onDeleteMaintenance,
  onDeleteAllMaintenanceForProduct,
  canEdit = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Product>({ ...product });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isRelationMenuOpen, setIsRelationMenuOpen] = useState(false);
  const [isAddMaintenanceModalOpen, setIsAddMaintenanceModalOpen] = useState(false);

  // Sync internal form data whenever the viewed product changes
  React.useEffect(() => {
    setFormData({ ...product });
    setIsEditing(false);
    setIsRelationMenuOpen(false);
    setPartSearchTerm('');
    setShowAddPartModal(false);
    setPartActionMessage(null);
    setMeterBoxSearchTerm('');
    setShowAddMeterBoxModal(false);
    setMeterBoxActionMessage(null);
    setConnectorTerminalSearchTerm('');
    setShowAddConnectorTerminalModal(false);
    setConnectorTerminalActionMessage(null);
    setMatingPairSearchTerm('');
    setShowAddMatingPairModal(false);
    setMatingPairActionMessage(null);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product.id, product.productId, product.updatedAt]);

  // Real-time Termék ID Uniqueness & Validation Check
  const enteredId = (formData.productId || '').trim();
  const isIdEmpty = enteredId === '';
  const isIdChanged = enteredId.toLowerCase() !== product.productId.trim().toLowerCase();

  const conflictingProduct = useMemo(() => {
    if (!enteredId || !isIdChanged) return null;
    const lower = enteredId.toLowerCase();
    return (
      allProducts.find(
        (p) =>
          (p.productId.trim().toLowerCase() === lower ||
            p.id.trim().toLowerCase() === lower) &&
          p.id !== product.id &&
          p.productId.trim().toLowerCase() !== product.productId.trim().toLowerCase()
      ) || null
    );
  }, [enteredId, isIdChanged, allProducts, product.id, product.productId]);

  const isDuplicateId = conflictingProduct !== null;

  // Component management state (Beépülő alkatrészek)
  const [partSearchTerm, setPartSearchTerm] = useState('');
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [newPartIdInput, setNewPartIdInput] = useState('');
  const [newPartQuantity, setNewPartQuantity] = useState<number>(1);
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [partActionMessage, setPartActionMessage] = useState<string | null>(null);

  // Component quantity inline editing
  const [editingPartQuantityId, setEditingPartQuantityId] = useState<string | null>(null);
  const [editPartQuantityValue, setEditPartQuantityValue] = useState<number>(1);
  const [isUpdatingPartQuantity, setIsUpdatingPartQuantity] = useState(false);

  // MeterBox relations state (Termék <-> Mérődoboz)
  const [meterBoxSearchTerm, setMeterBoxSearchTerm] = useState('');
  const [showAddMeterBoxModal, setShowAddMeterBoxModal] = useState(false);
  const [newMeterBoxIdInput, setNewMeterBoxIdInput] = useState('');
  const [newMeterBoxQuantity, setNewMeterBoxQuantity] = useState<number>(1);
  const [editingMeterBoxQuantityId, setEditingMeterBoxQuantityId] = useState<string | null>(null);
  const [editMeterBoxQuantityValue, setEditMeterBoxQuantityValue] = useState<number>(1);
  const [isUpdatingMeterBoxQuantity, setIsUpdatingMeterBoxQuantity] = useState(false);
  const [isAddingMeterBox, setIsAddingMeterBox] = useState(false);
  const [meterBoxActionMessage, setMeterBoxActionMessage] = useState<string | null>(null);

  // Connector-Terminal relations state (Konnektor <-> Saru)
  const [connectorTerminalSearchTerm, setConnectorTerminalSearchTerm] = useState('');
  const [showAddConnectorTerminalModal, setShowAddConnectorTerminalModal] = useState(false);
  const [newConnectorTerminalIdInput, setNewConnectorTerminalIdInput] = useState('');
  const [newConnectorTerminalQuantity, setNewConnectorTerminalQuantity] = useState<number>(1);
  const [editingConnectorTerminalQuantityId, setEditingConnectorTerminalQuantityId] = useState<string | null>(null);
  const [editConnectorTerminalQuantityValue, setEditConnectorTerminalQuantityValue] = useState<number>(1);
  const [isUpdatingConnectorTerminalQuantity, setIsUpdatingConnectorTerminalQuantity] = useState(false);
  const [isAddingConnectorTerminal, setIsAddingConnectorTerminal] = useState(false);
  const [connectorTerminalActionMessage, setConnectorTerminalActionMessage] = useState<string | null>(null);

  // Mating Pair relations state (Ellenpárok: Konnektor <-> Konnektor, Saru <-> Saru)
  const [matingPairSearchTerm, setMatingPairSearchTerm] = useState('');
  const [showAddMatingPairModal, setShowAddMatingPairModal] = useState(false);
  const [newMatingPairIdInput, setNewMatingPairIdInput] = useState('');
  const [newMatingPairQuantity, setNewMatingPairQuantity] = useState<number>(1);
  const [editingMatingPairQuantityId, setEditingMatingPairQuantityId] = useState<string | null>(null);
  const [editMatingPairQuantityValue, setEditMatingPairQuantityValue] = useState<number>(1);
  const [isUpdatingMatingPairQuantity, setIsUpdatingMatingPairQuantity] = useState(false);
  const [isAddingMatingPair, setIsAddingMatingPair] = useState(false);
  const [matingPairActionMessage, setMatingPairActionMessage] = useState<string | null>(null);

  // Saru <-> Saruzófej relations state (Halvány narancssárga téma)
  const [terminalFejSearchTerm, setTerminalFejSearchTerm] = useState('');
  const [showAddTerminalFejModal, setShowAddTerminalFejModal] = useState(false);
  const [newTerminalFejIdInput, setNewTerminalFejIdInput] = useState('');
  const [newTerminalFejQuantity, setNewTerminalFejQuantity] = useState<number>(1);
  const [editingTerminalFejQuantityId, setEditingTerminalFejQuantityId] = useState<string | null>(null);
  const [editTerminalFejQuantityValue, setEditTerminalFejQuantityValue] = useState<number>(1);
  const [isUpdatingTerminalFejQuantity, setIsUpdatingTerminalFejQuantity] = useState(false);
  const [isAddingTerminalFej, setIsAddingTerminalFej] = useState(false);
  const [terminalFejActionMessage, setTerminalFejActionMessage] = useState<string | null>(null);

  // Notesz state (#FA4646)
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const thisProductNotes = useMemo(() => {
    return getNotesForProduct(product.productId, productNotes || []);
  }, [product.productId, productNotes]);

  // Karbantartás state (Barna szín, termékhez tartozó karbantartások)
  const thisProductMaintenances = useMemo(() => {
    return getMaintenancesForProduct(product.productId, product.factoryCode, maintenances || []);
  }, [product.productId, product.factoryCode, maintenances]);

  // 1. Compute UNIQUE built-in components for this product (bidirectional lookup)
  // "ha többször szerepel természetesen akkor csak egyszer jelenítse meg"
  // "ha egy termékhez elmentek az automatikusan ahonnan elmentem az a másik oldalon is jelenjen meg"
  const uniqueComponentIds = useMemo(() => {
    const targetId = (product.productId || '').trim().toLowerCase();
    const set = new Set<string>();
    (componentRelations || []).forEach((rel) => {
      const p = rel.parentProductId?.trim();
      const c = rel.componentProductId?.trim();
      if (p && p.toLowerCase() === targetId && c) {
        set.add(c);
      } else if (c && c.toLowerCase() === targetId && p) {
        set.add(p);
      }
    });
    return Array.from(set);
  }, [componentRelations, product.productId]);

  // Map of related productId -> relation object (for quantity and editing)
  const componentRelationsMap = useMemo(() => {
    const targetId = (product.productId || '').trim().toLowerCase();
    const map = new Map<string, ProductComponentRelation>();
    (componentRelations || []).forEach((rel) => {
      const p = rel.parentProductId?.trim();
      const c = rel.componentProductId?.trim();
      if (p && p.toLowerCase() === targetId && c) {
        map.set(c.toLowerCase(), rel);
      } else if (c && c.toLowerCase() === targetId && p) {
        if (!map.has(p.toLowerCase())) {
          map.set(p.toLowerCase(), rel);
        }
      }
    });
    return map;
  }, [componentRelations, product.productId]);

  // 2. Resolve each component ID to a Product entry from inventory & SORT BY NAME
  // "megnevezés szerint legyen rendezve a lista"
  const resolvedComponents = useMemo(() => {
    const productMap = new Map<string, Product>();
    allProducts.forEach((p) => {
      if (p.productId) productMap.set(p.productId.trim().toLowerCase(), p);
      if (p.factoryCode) productMap.set(p.factoryCode.trim().toLowerCase(), p);
      if (p.id) productMap.set(p.id.trim().toLowerCase(), p);
    });

    const list = uniqueComponentIds.map((cId) => {
      const found = productMap.get(cId.trim().toLowerCase());
      const rel = componentRelationsMap.get(cId.trim().toLowerCase());
      const qty = typeof rel?.quantity === 'number' && rel.quantity > 0 ? rel.quantity : 1;
      if (found) {
        return { id: cId, product: found, isRegistered: true, quantity: qty };
      }
      return {
        id: cId,
        product: {
          id: cId,
          productId: cId,
          name: `Beépülő alkatrész (${cId})`,
          category: 'Beépülő alkatrész',
          images: [],
          stockQuantity: 0,
          factoryCode: ''
        } as Product,
        isRegistered: false,
        quantity: qty
      };
    });

    // Megnevezés szerinti természetes magyar rendezés
    return list.sort((a, b) => {
      const nameA = a.product.name || a.product.productId || '';
      const nameB = b.product.name || b.product.productId || '';
      return nameA.localeCompare(nameB, 'hu', { numeric: true, sensitivity: 'base' });
    });
  }, [uniqueComponentIds, allProducts, componentRelationsMap]);

  // Real-time dynamic search suggestions in the attach component modal
  const searchPartSuggestions = useMemo(() => {
    const q = newPartIdInput.trim().toLowerCase();
    const currentPid = (product.productId || '').trim().toLowerCase();

    const candidates = allProducts.filter(
      (p) => p && p.productId && p.productId.trim().toLowerCase() !== currentPid
    );

    if (!q) {
      return candidates
        .filter((p) => !uniqueComponentIds.some((id) => id.trim().toLowerCase() === p.productId.trim().toLowerCase()))
        .slice(0, 15);
    }

    const matched = candidates.filter((p) => {
      const pid = (p.productId || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const factory = (p.factoryCode || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return pid.includes(q) || name.includes(q) || factory.includes(q) || cat.includes(q);
    });

    matched.sort((a, b) => {
      const aId = (a.productId || '').toLowerCase();
      const bId = (b.productId || '').toLowerCase();
      const aExact = aId === q;
      const bExact = bId === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = aId.startsWith(q);
      const bStarts = bId.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return (a.name || '').localeCompare(b.name || '', 'hu', { numeric: true });
    });

    return matched.slice(0, 20);
  }, [newPartIdInput, allProducts, product.productId, uniqueComponentIds]);

  const exactMatchedProduct = useMemo(() => {
    const q = newPartIdInput.trim().toLowerCase();
    if (!q) return null;
    return allProducts.find(
      (p) =>
        p &&
        p.productId &&
        p.productId.trim().toLowerCase() !== (product.productId || '').trim().toLowerCase() &&
        (p.productId.trim().toLowerCase() === q ||
          (p.factoryCode && p.factoryCode.trim().toLowerCase() === q))
    ) || null;
  }, [newPartIdInput, allProducts, product.productId]);

  const isSelectedPartAlreadyAttached = useMemo(() => {
    const q = newPartIdInput.trim().toLowerCase();
    if (!q) return false;
    return uniqueComponentIds.some((id) => id.trim().toLowerCase() === q);
  }, [newPartIdInput, uniqueComponentIds]);

  // 3. Filtered components if user searches inside the component list
  const filteredResolvedComponents = useMemo(() => {
    if (!partSearchTerm.trim()) return resolvedComponents;
    const q = partSearchTerm.trim().toLowerCase();
    return resolvedComponents.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.product.name.toLowerCase().includes(q) ||
        (item.product.factoryCode && item.product.factoryCode.toLowerCase().includes(q)) ||
        (item.product.category && item.product.category.toLowerCase().includes(q))
    );
  }, [resolvedComponents, partSearchTerm]);

  const hasAnyConnectorComponent = useMemo(() => {
    return resolvedComponents.some((c) =>
      isConnectorCategory(c.product.category)
    );
  }, [resolvedComponents]);

  // --- 4. MeterBox Relations (Termék <-> Mérődoboz) ---
  const uniqueMeterBoxIds = useMemo(() => {
    return getConnectedMeterBoxesForProduct(product.productId, meterBoxRelations);
  }, [product.productId, meterBoxRelations]);

  const meterBoxRelationsMap = useMemo(() => {
    return getMeterBoxRelationsMapForProduct(product.productId, meterBoxRelations);
  }, [product.productId, meterBoxRelations]);

  const resolvedMeterBoxes = useMemo(() => {
    const productMap = new Map<string, Product>();
    allProducts.forEach((p) => {
      if (p.productId) productMap.set(p.productId.trim().toLowerCase(), p);
      if (p.factoryCode) productMap.set(p.factoryCode.trim().toLowerCase(), p);
      if (p.id) productMap.set(p.id.trim().toLowerCase(), p);
    });

    const currentCatLower = (product.category || '').toLowerCase();
    const isCurrentGyartando = currentCatLower.includes('gyártandó') || currentCatLower.includes('gyartando');

    const list = uniqueMeterBoxIds.map((mId) => {
      const found = productMap.get(mId.trim().toLowerCase());
      const rel = meterBoxRelationsMap.get(mId.trim().toLowerCase());
      const qty = typeof rel?.quantity === 'number' && rel.quantity > 0 ? rel.quantity : 1;
      if (found) {
        return { id: mId, product: found, isRegistered: true, quantity: qty };
      }
      return {
        id: mId,
        product: {
          id: mId,
          productId: mId,
          name: isCurrentGyartando ? `Mérődoboz (${mId})` : `Gyártandó termék (${mId})`,
          category: isCurrentGyartando ? 'Mérődoboz' : 'Gyártandó termék',
          images: [],
          stockQuantity: 0,
          factoryCode: ''
        } as Product,
        isRegistered: false,
        quantity: qty
      };
    });

    return list.sort((a, b) => {
      const nameA = a.product.name || a.product.productId || '';
      const nameB = b.product.name || b.product.productId || '';
      return nameA.localeCompare(nameB, 'hu', { numeric: true, sensitivity: 'base' });
    });
  }, [uniqueMeterBoxIds, allProducts, product.category, meterBoxRelationsMap]);

  // Real-time dynamic search suggestions in the attach MeterBox modal
  const searchMeterBoxSuggestions = useMemo(() => {
    const q = newMeterBoxIdInput.trim().toLowerCase();
    const currentPid = (product.productId || '').trim().toLowerCase();

    const candidates = allProducts.filter(
      (p) => p && p.productId && p.productId.trim().toLowerCase() !== currentPid
    );

    if (!q) {
      return candidates
        .filter((p) => !uniqueMeterBoxIds.some((id) => id.trim().toLowerCase() === p.productId.trim().toLowerCase()))
        .slice(0, 15);
    }

    const matched = candidates.filter((p) => {
      const pid = (p.productId || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const factory = (p.factoryCode || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return pid.includes(q) || name.includes(q) || factory.includes(q) || cat.includes(q);
    });

    matched.sort((a, b) => {
      const aId = (a.productId || '').toLowerCase();
      const bId = (b.productId || '').toLowerCase();
      if (aId === q && bId !== q) return -1;
      if (aId !== q && bId === q) return 1;
      return (a.name || '').localeCompare(b.name || '', 'hu', { numeric: true });
    });

    return matched.slice(0, 20);
  }, [newMeterBoxIdInput, allProducts, product.productId, uniqueMeterBoxIds]);

  const exactMatchedMeterBox = useMemo(() => {
    const q = newMeterBoxIdInput.trim().toLowerCase();
    if (!q) return null;
    return allProducts.find(
      (p) =>
        p &&
        p.productId &&
        p.productId.trim().toLowerCase() !== (product.productId || '').trim().toLowerCase() &&
        (p.productId.trim().toLowerCase() === q ||
          (p.factoryCode && p.factoryCode.trim().toLowerCase() === q))
    ) || null;
  }, [newMeterBoxIdInput, allProducts, product.productId]);

  const isSelectedMeterBoxAlreadyAttached = useMemo(() => {
    const q = newMeterBoxIdInput.trim().toLowerCase();
    if (!q) return false;
    return uniqueMeterBoxIds.some((id) => id.trim().toLowerCase() === q);
  }, [newMeterBoxIdInput, uniqueMeterBoxIds]);

  const filteredResolvedMeterBoxes = useMemo(() => {
    if (!meterBoxSearchTerm.trim()) return resolvedMeterBoxes;
    const q = meterBoxSearchTerm.trim().toLowerCase();
    return resolvedMeterBoxes.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.product.name.toLowerCase().includes(q) ||
        (item.product.factoryCode && item.product.factoryCode.toLowerCase().includes(q)) ||
        (item.product.category && item.product.category.toLowerCase().includes(q))
    );
  }, [resolvedMeterBoxes, meterBoxSearchTerm]);

  const isMeterBoxRelevant = useMemo(() => {
    return isMeterBoxRelatedCategory(product.category) || uniqueMeterBoxIds.length > 0;
  }, [product.category, uniqueMeterBoxIds.length]);

  // --- 5. Connector <-> Terminal Relations (Konnektor <-> Saru) ---
  const uniqueConnectorTerminalIds = useMemo(() => {
    return getConnectedConnectorTerminalsForProduct(product.productId, connectorTerminalRelations);
  }, [product.productId, connectorTerminalRelations]);

  const connectorTerminalRelationsMap = useMemo(() => {
    return getConnectorTerminalRelationsMapForProduct(product.productId, connectorTerminalRelations);
  }, [product.productId, connectorTerminalRelations]);

  const resolvedConnectorTerminals = useMemo(() => {
    const productMap = new Map<string, Product>();
    allProducts.forEach((p) => {
      if (p.productId) productMap.set(p.productId.trim().toLowerCase(), p);
      if (p.factoryCode) productMap.set(p.factoryCode.trim().toLowerCase(), p);
      if (p.id) productMap.set(p.id.trim().toLowerCase(), p);
    });

    const currentCatLower = (product.category || '').toLowerCase();
    const isCurrentConnector =
      currentCatLower.includes('konnektor') ||
      currentCatLower.includes('connector') ||
      currentCatLower.includes('csatlakozó') ||
      currentCatLower.includes('csatlakozo');

    const list = uniqueConnectorTerminalIds.map((cId) => {
      const found = productMap.get(cId.trim().toLowerCase());
      const rel = connectorTerminalRelationsMap.get(cId.trim().toLowerCase());
      const qty = typeof rel?.quantity === 'number' && rel.quantity > 0 ? rel.quantity : 1;
      if (found) {
        return { id: cId, product: found, isRegistered: true, quantity: qty };
      }
      return {
        id: cId,
        product: {
          id: cId,
          productId: cId,
          name: isCurrentConnector ? `Saru (${cId})` : `Konnektor (${cId})`,
          category: isCurrentConnector ? 'Saru' : 'Konnektor',
          images: [],
          stockQuantity: 0,
          factoryCode: ''
        } as Product,
        isRegistered: false,
        quantity: qty
      };
    });

    return list.sort((a, b) => {
      const nameA = a.product.name || a.product.productId || '';
      const nameB = b.product.name || b.product.productId || '';
      return nameA.localeCompare(nameB, 'hu', { numeric: true, sensitivity: 'base' });
    });
  }, [uniqueConnectorTerminalIds, allProducts, product.category, connectorTerminalRelationsMap]);

  // Real-time dynamic search suggestions in the attach ConnectorTerminal modal
  const searchConnectorTerminalSuggestions = useMemo(() => {
    const q = newConnectorTerminalIdInput.trim().toLowerCase();
    const currentPid = (product.productId || '').trim().toLowerCase();

    const candidates = allProducts.filter(
      (p) => p && p.productId && p.productId.trim().toLowerCase() !== currentPid
    );

    if (!q) {
      return candidates
        .filter((p) => !uniqueConnectorTerminalIds.some((id) => id.trim().toLowerCase() === p.productId.trim().toLowerCase()))
        .slice(0, 15);
    }

    const matched = candidates.filter((p) => {
      const pid = (p.productId || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const factory = (p.factoryCode || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return pid.includes(q) || name.includes(q) || factory.includes(q) || cat.includes(q);
    });

    matched.sort((a, b) => {
      const aId = (a.productId || '').toLowerCase();
      const bId = (b.productId || '').toLowerCase();
      if (aId === q && bId !== q) return -1;
      if (aId !== q && bId === q) return 1;
      return (a.name || '').localeCompare(b.name || '', 'hu', { numeric: true });
    });

    return matched.slice(0, 20);
  }, [newConnectorTerminalIdInput, allProducts, product.productId, uniqueConnectorTerminalIds]);

  const exactMatchedConnectorTerminal = useMemo(() => {
    const q = newConnectorTerminalIdInput.trim().toLowerCase();
    if (!q) return null;
    return allProducts.find(
      (p) =>
        p &&
        p.productId &&
        p.productId.trim().toLowerCase() !== (product.productId || '').trim().toLowerCase() &&
        (p.productId.trim().toLowerCase() === q ||
          (p.factoryCode && p.factoryCode.trim().toLowerCase() === q))
    ) || null;
  }, [newConnectorTerminalIdInput, allProducts, product.productId]);

  const isSelectedConnectorTerminalAlreadyAttached = useMemo(() => {
    const q = newConnectorTerminalIdInput.trim().toLowerCase();
    if (!q) return false;
    return uniqueConnectorTerminalIds.some((id) => id.trim().toLowerCase() === q);
  }, [newConnectorTerminalIdInput, uniqueConnectorTerminalIds]);

  const filteredResolvedConnectorTerminals = useMemo(() => {
    if (!connectorTerminalSearchTerm.trim()) return resolvedConnectorTerminals;
    const q = connectorTerminalSearchTerm.trim().toLowerCase();
    return resolvedConnectorTerminals.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.product.name.toLowerCase().includes(q) ||
        (item.product.factoryCode && item.product.factoryCode.toLowerCase().includes(q)) ||
        (item.product.category && item.product.category.toLowerCase().includes(q))
    );
  }, [resolvedConnectorTerminals, connectorTerminalSearchTerm]);

  const isConnectorTerminalRelevant = useMemo(() => {
    return isConnectorTerminalRelatedCategory(product.category) || uniqueConnectorTerminalIds.length > 0;
  }, [product.category, uniqueConnectorTerminalIds.length]);

  const hasAnyConnectorInConnectorTerminals = useMemo(() => {
    return filteredResolvedConnectorTerminals.some((item) =>
      isConnectorCategory(item.product.category)
    );
  }, [filteredResolvedConnectorTerminals]);

  // --- 6. Mating Pair Relations (Ellenpárok: Konnektor <-> Konnektor, Saru <-> Saru) ---
  const uniqueMatingPairIds = useMemo(() => {
    return getConnectedMatingPairsForProduct(product.productId, matingPairRelations);
  }, [product.productId, matingPairRelations]);

  const matingPairRelationsMap = useMemo(() => {
    return getMatingPairRelationsMapForProduct(product.productId, matingPairRelations);
  }, [product.productId, matingPairRelations]);

  const resolvedMatingPairs = useMemo(() => {
    const productMap = new Map<string, Product>();
    allProducts.forEach((p) => {
      if (p.productId) productMap.set(p.productId.trim().toLowerCase(), p);
      if (p.factoryCode) productMap.set(p.factoryCode.trim().toLowerCase(), p);
      if (p.id) productMap.set(p.id.trim().toLowerCase(), p);
    });

    const currentCatLower = (product.category || '').toLowerCase();
    const isCurrentConnector =
      currentCatLower.includes('konnektor') ||
      currentCatLower.includes('connector') ||
      currentCatLower.includes('csatlakozó') ||
      currentCatLower.includes('csatlakozo');

    const defaultCatName = isCurrentConnector ? 'Konnektor' : 'Saru';

    const list = uniqueMatingPairIds.map((mId) => {
      const found = productMap.get(mId.trim().toLowerCase());
      const rel = matingPairRelationsMap.get(mId.trim().toLowerCase());
      const qty = typeof rel?.quantity === 'number' && rel.quantity > 0 ? rel.quantity : 1;
      if (found) {
        return { id: mId, product: found, isRegistered: true, quantity: qty };
      }
      return {
        id: mId,
        product: {
          id: mId,
          productId: mId,
          name: `Ellenpár (${mId})`,
          category: defaultCatName,
          images: [],
          stockQuantity: 0,
          factoryCode: ''
        } as Product,
        isRegistered: false,
        quantity: qty
      };
    });

    return list.sort((a, b) => {
      const nameA = a.product.name || a.product.productId || '';
      const nameB = b.product.name || b.product.productId || '';
      return nameA.localeCompare(nameB, 'hu', { numeric: true, sensitivity: 'base' });
    });
  }, [uniqueMatingPairIds, allProducts, product.category, matingPairRelationsMap]);

  // Real-time dynamic search suggestions in the attach MatingPair modal
  const searchMatingPairSuggestions = useMemo(() => {
    const q = newMatingPairIdInput.trim().toLowerCase();
    const currentPid = (product.productId || '').trim().toLowerCase();

    const candidates = allProducts.filter(
      (p) => p && p.productId && p.productId.trim().toLowerCase() !== currentPid
    );

    if (!q) {
      return candidates
        .filter((p) => !uniqueMatingPairIds.some((id) => id.trim().toLowerCase() === p.productId.trim().toLowerCase()))
        .slice(0, 15);
    }

    const matched = candidates.filter((p) => {
      const pid = (p.productId || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const factory = (p.factoryCode || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return pid.includes(q) || name.includes(q) || factory.includes(q) || cat.includes(q);
    });

    matched.sort((a, b) => {
      const aId = (a.productId || '').toLowerCase();
      const bId = (b.productId || '').toLowerCase();
      if (aId === q && bId !== q) return -1;
      if (aId !== q && bId === q) return 1;
      return (a.name || '').localeCompare(b.name || '', 'hu', { numeric: true });
    });

    return matched.slice(0, 20);
  }, [newMatingPairIdInput, allProducts, product.productId, uniqueMatingPairIds]);

  const exactMatchedMatingPair = useMemo(() => {
    const q = newMatingPairIdInput.trim().toLowerCase();
    if (!q) return null;
    return allProducts.find(
      (p) =>
        p &&
        p.productId &&
        p.productId.trim().toLowerCase() !== (product.productId || '').trim().toLowerCase() &&
        (p.productId.trim().toLowerCase() === q ||
          (p.factoryCode && p.factoryCode.trim().toLowerCase() === q))
    ) || null;
  }, [newMatingPairIdInput, allProducts, product.productId]);

  const isSelectedMatingPairAlreadyAttached = useMemo(() => {
    const q = newMatingPairIdInput.trim().toLowerCase();
    if (!q) return false;
    return uniqueMatingPairIds.some((id) => id.trim().toLowerCase() === q);
  }, [newMatingPairIdInput, uniqueMatingPairIds]);

  const filteredResolvedMatingPairs = useMemo(() => {
    if (!matingPairSearchTerm.trim()) return resolvedMatingPairs;
    const q = matingPairSearchTerm.trim().toLowerCase();
    return resolvedMatingPairs.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.product.name.toLowerCase().includes(q) ||
        (item.product.factoryCode && item.product.factoryCode.toLowerCase().includes(q)) ||
        (item.product.category && item.product.category.toLowerCase().includes(q))
    );
  }, [resolvedMatingPairs, matingPairSearchTerm]);

  const isMatingPairRelevant = useMemo(() => {
    return isMatingPairRelatedCategory(product.category) || uniqueMatingPairIds.length > 0;
  }, [product.category, uniqueMatingPairIds.length]);

  const hasAnyConnectorInMatingPairs = useMemo(() => {
    return filteredResolvedMatingPairs.some((item) =>
      isConnectorCategory(item.product.category)
    );
  }, [filteredResolvedMatingPairs]);

  // --- 7. Saru <-> Saruzófej Relations (Halvány narancssárga téma) ---
  const resolvedTerminalFejek = useMemo(() => {
    return getConnectedTerminalFejekForProduct(
      product,
      terminalFejRelations,
      allProducts,
      terminalFejDisconnections
    );
  }, [product, terminalFejRelations, allProducts, terminalFejDisconnections]);

  const disconnectedTerminalFejek = useMemo(() => {
    return getDisconnectedTerminalFejekForProduct(
      product,
      allProducts,
      terminalFejDisconnections
    );
  }, [product, allProducts, terminalFejDisconnections]);

  const filteredResolvedTerminalFejek = useMemo(() => {
    if (!terminalFejSearchTerm.trim()) return resolvedTerminalFejek;
    const q = terminalFejSearchTerm.trim().toLowerCase();
    return resolvedTerminalFejek.filter((item) => {
      const idMatch = item.relatedProductId.toLowerCase().includes(q);
      const nameMatch = item.relatedProduct?.name?.toLowerCase().includes(q) || false;
      const catMatch = item.relatedProduct?.category?.toLowerCase().includes(q) || false;
      const factMatch = item.relatedProduct?.factoryCode?.toLowerCase().includes(q) || false;
      return idMatch || nameMatch || catMatch || factMatch;
    });
  }, [resolvedTerminalFejek, terminalFejSearchTerm]);

  // Real-time dynamic search suggestions in the attach TerminalFej modal
  const searchTerminalFejSuggestions = useMemo(() => {
    const q = newTerminalFejIdInput.trim().toLowerCase();
    const currentPid = (product.productId || '').trim().toLowerCase();

    const candidates = allProducts.filter(
      (p) => p && p.productId && p.productId.trim().toLowerCase() !== currentPid
    );

    if (!q) {
      return candidates
        .filter((p) => !resolvedTerminalFejek.some((item) => item.relatedProductId.trim().toLowerCase() === p.productId.trim().toLowerCase()))
        .slice(0, 15);
    }

    const matched = candidates.filter((p) => {
      const pid = (p.productId || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const factory = (p.factoryCode || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return pid.includes(q) || name.includes(q) || factory.includes(q) || cat.includes(q);
    });

    matched.sort((a, b) => {
      const aId = (a.productId || '').toLowerCase();
      const bId = (b.productId || '').toLowerCase();
      if (aId === q && bId !== q) return -1;
      if (aId !== q && bId === q) return 1;
      return (a.name || '').localeCompare(b.name || '', 'hu', { numeric: true });
    });

    return matched.slice(0, 20);
  }, [newTerminalFejIdInput, allProducts, product.productId, resolvedTerminalFejek]);

  const exactMatchedTerminalFej = useMemo(() => {
    const q = newTerminalFejIdInput.trim().toLowerCase();
    if (!q) return null;
    return allProducts.find(
      (p) =>
        p &&
        p.productId &&
        p.productId.trim().toLowerCase() !== (product.productId || '').trim().toLowerCase() &&
        (p.productId.trim().toLowerCase() === q ||
          (p.factoryCode && p.factoryCode.trim().toLowerCase() === q))
    ) || null;
  }, [newTerminalFejIdInput, allProducts, product.productId]);

  const isSelectedTerminalFejAlreadyAttached = useMemo(() => {
    const q = newTerminalFejIdInput.trim().toLowerCase();
    if (!q) return false;
    return resolvedTerminalFejek.some((item) => item.relatedProductId.trim().toLowerCase() === q);
  }, [newTerminalFejIdInput, resolvedTerminalFejek]);

  const isTerminalFejRelevant = useMemo(() => {
    // Saruzófej Alkatrész és Alkatrész termékek esetén a kapcsolódó saruk szekció nem jelenhet meg, nem tartoznak össze
    if (
      isAlkatreszCategory(product.category) ||
      isAlkatreszCategory(product.name) ||
      (product.category && product.category.toLowerCase().includes('alkatr'))
    ) {
      return false;
    }
    return (
      isTerminalFejRelatedCategory(product.category) ||
      resolvedTerminalFejek.length > 0 ||
      disconnectedTerminalFejek.length > 0
    );
  }, [product.category, product.name, resolvedTerminalFejek.length, disconnectedTerminalFejek.length]);

  // Sarumagasság adatok betöltése B oszlop (productId), cikkszám vagy gyári kód alapján
  const crimpRecords = useMemo(() => {
    return getCrimpHeightsForProduct(product.productId, product.factoryCode, product.name);
  }, [product.productId, product.factoryCode, product.name]);

  // Teljes raktári készlet- és pozíciótérkép minden termékhez a raktári tranzakciók alapján
  const productWarehouseMap = useMemo(() => {
    const map = new Map<string, { totalQuantity: number; positions: string[] }>();
    if (!warehouseTransactions || warehouseTransactions.length === 0) return map;

    const addStockToMap = (key: string, qty: number, pos: string) => {
      const cleanKey = key.trim().toLowerCase();
      if (!cleanKey) return;
      let entry = map.get(cleanKey);
      if (!entry) {
        entry = { totalQuantity: 0, positions: [] };
        map.set(cleanKey, entry);
      }
      entry.totalQuantity += qty;
      if (pos && !entry.positions.includes(pos)) {
        entry.positions.push(pos);
      }
    };

    warehouseTransactions.forEach((tx) => {
      const pid = (tx.productId || '').trim();
      if (!pid) return;
      const q =
        tx.quantity !== undefined && tx.quantity !== null && !isNaN(Number(tx.quantity))
          ? Number(tx.quantity)
          : 0;
      const pos = (tx.positionId || '').trim();
      addStockToMap(pid, q, pos);
    });

    // Kereszt-hivatkozás: cikkszám és gyári kód összekapcsolása
    allProducts.forEach((p) => {
      const pIdClean = p.productId?.trim().toLowerCase();
      const fCodeClean = p.factoryCode?.trim().toLowerCase();
      const idClean = p.id?.trim().toLowerCase();

      const existingEntry =
        (pIdClean && map.get(pIdClean)) ||
        (fCodeClean && map.get(fCodeClean)) ||
        (idClean && map.get(idClean));

      if (existingEntry) {
        if (pIdClean && !map.has(pIdClean)) map.set(pIdClean, existingEntry);
        if (fCodeClean && !map.has(fCodeClean)) map.set(fCodeClean, existingEntry);
        if (idClean && !map.has(idClean)) map.set(idClean, existingEntry);
      }
    });

    return map;
  }, [warehouseTransactions, allProducts]);

  // Segédfüggvény: bármely termék valós raktárkészletének lekérdezése a raktárkészlet alapján
  const getProductStock = useCallback(
    (prod?: Product | null, prodId?: string): number => {
      const targetId = (prod?.productId || prodId || '').trim().toLowerCase();
      const targetFc = (prod?.factoryCode || '').trim().toLowerCase();
      const targetDbId = (prod?.id || '').trim().toLowerCase();

      // 1. Keresés a raktári tranzakciós térképben
      if (targetId && productWarehouseMap.has(targetId)) {
        return productWarehouseMap.get(targetId)!.totalQuantity;
      }
      if (targetFc && productWarehouseMap.has(targetFc)) {
        return productWarehouseMap.get(targetFc)!.totalQuantity;
      }
      if (targetDbId && productWarehouseMap.has(targetDbId)) {
        return productWarehouseMap.get(targetDbId)!.totalQuantity;
      }

      // 2. Keresés allProducts-ban a valós termék kikereséséhez
      if (targetId || targetFc) {
        const found = allProducts.find(
          (p) =>
            (targetId && (p.productId.trim().toLowerCase() === targetId || (p.factoryCode && p.factoryCode.trim().toLowerCase() === targetId))) ||
            (targetFc && (p.productId.trim().toLowerCase() === targetFc || (p.factoryCode && p.factoryCode.trim().toLowerCase() === targetFc)))
        );
        if (found) {
          const foundPid = found.productId?.trim().toLowerCase();
          const foundFc = found.factoryCode?.trim().toLowerCase();
          if (foundPid && productWarehouseMap.has(foundPid)) {
            return productWarehouseMap.get(foundPid)!.totalQuantity;
          }
          if (foundFc && productWarehouseMap.has(foundFc)) {
            return productWarehouseMap.get(foundFc)!.totalQuantity;
          }
          if (found.stockQuantity !== undefined && !isNaN(Number(found.stockQuantity))) {
            return Number(found.stockQuantity);
          }
        }
      }

      if (prod && prod.stockQuantity !== undefined && prod.stockQuantity !== null && !isNaN(Number(prod.stockQuantity))) {
        return Number(prod.stockQuantity);
      }
      return 0;
    },
    [productWarehouseMap, allProducts]
  );

  // Segédfüggvény: bármely termék raktári pozícióinak lekérdezése
  const getProductPositions = useCallback(
    (prod?: Product | null, prodId?: string): string[] => {
      const targetId = (prod?.productId || prodId || '').trim().toLowerCase();
      const targetFc = (prod?.factoryCode || '').trim().toLowerCase();
      const targetDbId = (prod?.id || '').trim().toLowerCase();

      if (targetId && productWarehouseMap.has(targetId)) {
        const pos = productWarehouseMap.get(targetId)!.positions;
        if (pos.length > 0) return pos;
      }
      if (targetFc && productWarehouseMap.has(targetFc)) {
        const pos = productWarehouseMap.get(targetFc)!.positions;
        if (pos.length > 0) return pos;
      }
      if (targetDbId && productWarehouseMap.has(targetDbId)) {
        const pos = productWarehouseMap.get(targetDbId)!.positions;
        if (pos.length > 0) return pos;
      }

      if (targetId || targetFc) {
        const found = allProducts.find(
          (p) =>
            (targetId && (p.productId.trim().toLowerCase() === targetId || (p.factoryCode && p.factoryCode.trim().toLowerCase() === targetId))) ||
            (targetFc && (p.productId.trim().toLowerCase() === targetFc || (p.factoryCode && p.factoryCode.trim().toLowerCase() === targetFc)))
        );
        if (found) {
          const foundPid = found.productId?.trim().toLowerCase();
          const foundFc = found.factoryCode?.trim().toLowerCase();
          if (foundPid && productWarehouseMap.has(foundPid) && productWarehouseMap.get(foundPid)!.positions.length > 0) {
            return productWarehouseMap.get(foundPid)!.positions;
          }
          if (foundFc && productWarehouseMap.has(foundFc) && productWarehouseMap.get(foundFc)!.positions.length > 0) {
            return productWarehouseMap.get(foundFc)!.positions;
          }
          return found.location ? [found.location] : [];
        }
      }

      return prod?.location ? [prod.location] : [];
    },
    [productWarehouseMap, allProducts]
  );

  // Raktári készletmozgások és pozíciók ehhez a konkrét termékhez
  const productWarehouseTransactions = useMemo(() => {
    if (!warehouseTransactions || warehouseTransactions.length === 0) return [];
    const pid = product.productId.trim().toLowerCase();
    const fc = product.factoryCode ? product.factoryCode.trim().toLowerCase() : '';
    return warehouseTransactions.filter((tx) => {
      const txPid = (tx.productId || '').trim().toLowerCase();
      return txPid === pid || (fc && txPid === fc);
    });
  }, [product.productId, product.factoryCode, warehouseTransactions]);

  const productTotalStock = useMemo(() => {
    return getProductStock(product, product.productId);
  }, [getProductStock, product]);

  const activeWarehousePositions = useMemo(() => {
    const posMap = new Map<string, number>();
    productWarehouseTransactions.forEach((tx) => {
      const pos = (tx.positionId || '').trim();
      if (!pos) return;
      const curr = posMap.get(pos) || 0;
      posMap.set(pos, curr + (Number(tx.quantity) || 0));
    });
    const list: Array<{ positionId: string; quantity: number }> = [];
    posMap.forEach((qty, posId) => {
      list.push({ positionId: posId, quantity: qty });
    });
    if (list.length === 0 && product.location) {
      list.push({ positionId: product.location, quantity: productTotalStock });
    }
    return list;
  }, [productWarehouseTransactions, product.location, productTotalStock]);

  // Gyűjtsük ki a meglévő termékekből az eddigi értékeket mezőnként (kategória, gyártó, adagolás, stb.)
  const existingOptionsByField = useMemo(() => {
    const map: Record<string, string[]> = {};
    const fieldsToCheck: (keyof Product)[] = [
      'category',
      'manufacturer',
      'feeding',
      'insulationType',
      'insulationGripperType',
      'connectorType',
      'terminalType',
      'location'
    ];

    fieldsToCheck.forEach((f) => {
      const set = new Set<string>();
      allProducts.forEach((p) => {
        const val = p[f];
        if (typeof val === 'string' && val.trim().length > 0) {
          set.add(val.trim());
        }
      });
      // Ipari alapértelmezések ha üres lenne
      if (f === 'category') {
        ['Saruzófej', 'Konnektor', 'Présszerszám', 'Beépülő alkatrész', 'Kábelmegmunkáló'].forEach((v) =>
          set.add(v)
        );
      } else if (f === 'feeding') {
        ['Oldal', 'Elöl', 'Hátul', 'Közép'].forEach((v) => set.add(v));
      } else if (f === 'insulationType') {
        ['Nem Gumis', 'Gumis', 'Standard'].forEach((v) => set.add(v));
      } else if (f === 'insulationGripperType') {
        ['F', 'O', 'B'].forEach((v) => set.add(v));
      }
      map[f] = Array.from(set).sort((a, b) => a.localeCompare(b, 'hu'));
    });

    return map;
  }, [allProducts]);

  const handleFieldChange = (field: keyof Product, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImagesUpdate = async (newImages: string[]) => {
    const updated = { ...formData, images: newImages };
    setFormData(updated);
    try {
      await onSave(updated);
    } catch (e) {
      console.error('Error saving image updates:', e);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.productId || !formData.productId.trim()) {
      setErrorMessage('A Termék ID megadása kötelező, nem lehet üres!');
      return;
    }

    if (isDuplicateId) {
      setErrorMessage(
        `A megadott Termék ID (${formData.productId.trim()}) már létezik egy másik terméknél! Kérjük, adjon meg egyedi azonosítót.`
      );
      return;
    }

    // Validáció: CSAK akkor mentünk pozíciók számát, ha a kategória Konnektor
    const isConn = isConnectorCategory(formData.category);
    const dataToSave = { ...formData, productId: formData.productId.trim() };

    if (isConn) {
      if (formData.positionsCount !== undefined && formData.positionsCount !== null && String(formData.positionsCount).trim() !== '') {
        const num = Number(formData.positionsCount);
        if (isNaN(num) || num < 1 || num > 999) {
          setErrorMessage('A pozíciók száma csak 1 és 999 közötti szám lehet!');
          return;
        }
        dataToSave.positionsCount = Math.floor(num);
      }
    } else {
      // Ha a kategória nem Konnektor (pl. Saru), töröljük a pozíciók számát
      delete dataToSave.positionsCount;
    }

    const oldId = product.productId?.trim();
    const newId = dataToSave.productId;

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onSave(dataToSave, oldId !== newId ? oldId : undefined);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Save failed:', error);
      setErrorMessage('Hiba történt a mentés során!');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(product.id || product.productId);
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Delete failed:', err);
      setErrorMessage('Hiba történt a törlés során!');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleAddPart = async () => {
    const inputVal = newPartIdInput.trim();
    if (!inputVal) return;

    if (uniqueComponentIds.some((id) => id.trim().toLowerCase() === inputVal.toLowerCase())) {
      setPartActionMessage('Ez az alkatrész már csatolva van ehhez a termékhez!');
      setTimeout(() => setPartActionMessage(null), 3500);
      return;
    }

    const qty = typeof newPartQuantity === 'number' && !isNaN(newPartQuantity) && newPartQuantity > 0 ? Math.floor(newPartQuantity) : 1;

    setIsAddingPart(true);
    try {
      if (onAddComponentRelation) {
        await onAddComponentRelation(product.productId, inputVal, qty);
      }
      setNewPartIdInput('');
      setNewPartQuantity(1);
      setShowAddPartModal(false);
      setPartActionMessage(`Alkatrész (${inputVal}) sikeresen csatolva (${qty} db)!`);
      setTimeout(() => setPartActionMessage(null), 3500);
    } catch (err) {
      console.error('Error adding component relation:', err);
      setPartActionMessage('Hiba történt az alkatrész csatolásakor.');
      setTimeout(() => setPartActionMessage(null), 3500);
    } finally {
      setIsAddingPart(false);
    }
  };

  const handleUpdatePartQuantity = async (componentId: string, newQty: number) => {
    if (newQty < 1 || isNaN(newQty)) return;
    const cleanQty = Math.floor(newQty);
    setIsUpdatingPartQuantity(true);
    try {
      if (onAddComponentRelation) {
        await onAddComponentRelation(product.productId, componentId, cleanQty);
      }
      setPartActionMessage(`Alkatrész (${componentId}) beépülő mennyisége sikeresen módosítva: ${cleanQty} db`);
      setTimeout(() => setPartActionMessage(null), 4000);
      setEditingPartQuantityId(null);
    } catch (err) {
      console.error('Error updating component quantity:', err);
      setPartActionMessage('Hiba történt a darabszám mentése során.');
      setTimeout(() => setPartActionMessage(null), 3500);
    } finally {
      setIsUpdatingPartQuantity(false);
    }
  };

  const handleRemovePart = async (componentId: string) => {
    try {
      if (onDeleteComponentRelation) {
        await onDeleteComponentRelation(product.productId, componentId);
      }
      setPartActionMessage(`Alkatrész (${componentId}) leválasztva.`);
      setTimeout(() => setPartActionMessage(null), 3500);
    } catch (err) {
      console.error('Error removing component relation:', err);
      setPartActionMessage('Hiba történt az alkatrész leválasztásakor.');
      setTimeout(() => setPartActionMessage(null), 3500);
    }
  };

  const handleAddMeterBox = async () => {
    const inputVal = newMeterBoxIdInput.trim();
    if (!inputVal) return;

    if (uniqueMeterBoxIds.some((id) => id.trim().toLowerCase() === inputVal.toLowerCase())) {
      setMeterBoxActionMessage('Ez a Termék ↔ Mérődoboz kapcsolat már rögzítve van!');
      setTimeout(() => setMeterBoxActionMessage(null), 3500);
      return;
    }

    const qty = typeof newMeterBoxQuantity === 'number' && !isNaN(newMeterBoxQuantity) && newMeterBoxQuantity > 0 ? Math.floor(newMeterBoxQuantity) : 1;

    setIsAddingMeterBox(true);
    try {
      if (onAddMeterBoxRelation) {
        await onAddMeterBoxRelation(product.productId, inputVal, qty);
      }
      setNewMeterBoxIdInput('');
      setNewMeterBoxQuantity(1);
      setShowAddMeterBoxModal(false);
      setMeterBoxActionMessage(`Termék <-> Mérődoboz kapcsolat (${inputVal}) sikeresen rögzítve (${qty} db)!`);
      setTimeout(() => setMeterBoxActionMessage(null), 3500);
    } catch (err) {
      console.error('Error adding meterbox relation:', err);
      setMeterBoxActionMessage('Hiba történt a kapcsolat létrehozásakor.');
      setTimeout(() => setMeterBoxActionMessage(null), 3500);
    } finally {
      setIsAddingMeterBox(false);
    }
  };

  const handleUpdateMeterBoxQuantity = async (targetId: string, newQty: number) => {
    if (newQty < 1 || isNaN(newQty)) return;
    const cleanQty = Math.floor(newQty);
    setIsUpdatingMeterBoxQuantity(true);
    try {
      if (onAddMeterBoxRelation) {
        await onAddMeterBoxRelation(product.productId, targetId, cleanQty);
      }
      setMeterBoxActionMessage(`Mérődoboz kapcsolat (${targetId}) darabszáma sikeresen módosítva: ${cleanQty} db`);
      setTimeout(() => setMeterBoxActionMessage(null), 4000);
      setEditingMeterBoxQuantityId(null);
    } catch (err) {
      console.error('Error updating meterbox quantity:', err);
      setMeterBoxActionMessage('Hiba történt a darabszám mentése során.');
      setTimeout(() => setMeterBoxActionMessage(null), 3500);
    } finally {
      setIsUpdatingMeterBoxQuantity(false);
    }
  };

  const handleRemoveMeterBox = async (targetId: string) => {
    try {
      if (onDeleteMeterBoxRelation) {
        await onDeleteMeterBoxRelation(product.productId, targetId);
      }
      setMeterBoxActionMessage(`Kapcsolat (${targetId}) eltávolítva.`);
      setTimeout(() => setMeterBoxActionMessage(null), 3500);
    } catch (err) {
      console.error('Error removing meterbox relation:', err);
      setMeterBoxActionMessage('Hiba történt a kapcsolat eltávolításakor.');
      setTimeout(() => setMeterBoxActionMessage(null), 3500);
    }
  };

  const handleAddConnectorTerminal = async () => {
    const inputVal = newConnectorTerminalIdInput.trim();
    if (!inputVal) return;

    if (uniqueConnectorTerminalIds.some((id) => id.trim().toLowerCase() === inputVal.toLowerCase())) {
      setConnectorTerminalActionMessage('Ez a Konnektor ↔ Saru kapcsolat már rögzítve van!');
      setTimeout(() => setConnectorTerminalActionMessage(null), 3500);
      return;
    }

    const qty = typeof newConnectorTerminalQuantity === 'number' && !isNaN(newConnectorTerminalQuantity) && newConnectorTerminalQuantity > 0 ? Math.floor(newConnectorTerminalQuantity) : 1;

    setIsAddingConnectorTerminal(true);
    try {
      if (onAddConnectorTerminalRelation) {
        await onAddConnectorTerminalRelation(product.productId, inputVal, qty);
      }
      setNewConnectorTerminalIdInput('');
      setNewConnectorTerminalQuantity(1);
      setShowAddConnectorTerminalModal(false);
      setConnectorTerminalActionMessage(`Konnektor <-> Saru kapcsolat (${inputVal}) sikeresen rögzítve (${qty} db)!`);
      setTimeout(() => setConnectorTerminalActionMessage(null), 3500);
    } catch (err) {
      console.error('Error adding connector-terminal relation:', err);
      setConnectorTerminalActionMessage('Hiba történt a kapcsolat létrehozásakor.');
      setTimeout(() => setConnectorTerminalActionMessage(null), 3500);
    } finally {
      setIsAddingConnectorTerminal(false);
    }
  };

  const handleUpdateConnectorTerminalQuantity = async (targetId: string, newQty: number) => {
    if (newQty < 1 || isNaN(newQty)) return;
    const cleanQty = Math.floor(newQty);
    setIsUpdatingConnectorTerminalQuantity(true);
    try {
      if (onAddConnectorTerminalRelation) {
        await onAddConnectorTerminalRelation(product.productId, targetId, cleanQty);
      }
      setConnectorTerminalActionMessage(`Konnektor <-> Saru kapcsolat (${targetId}) darabszáma sikeresen módosítva: ${cleanQty} db`);
      setTimeout(() => setConnectorTerminalActionMessage(null), 4000);
      setEditingConnectorTerminalQuantityId(null);
    } catch (err) {
      console.error('Error updating connector-terminal quantity:', err);
      setConnectorTerminalActionMessage('Hiba történt a darabszám mentése során.');
      setTimeout(() => setConnectorTerminalActionMessage(null), 3500);
    } finally {
      setIsUpdatingConnectorTerminalQuantity(false);
    }
  };

  const handleRemoveConnectorTerminal = async (targetId: string) => {
    try {
      if (onDeleteConnectorTerminalRelation) {
        await onDeleteConnectorTerminalRelation(product.productId, targetId);
      }
      setConnectorTerminalActionMessage(`Kapcsolat (${targetId}) eltávolítva.`);
      setTimeout(() => setConnectorTerminalActionMessage(null), 3500);
    } catch (err) {
      console.error('Error removing connector-terminal relation:', err);
      setConnectorTerminalActionMessage('Hiba történt a kapcsolat eltávolításakor.');
      setTimeout(() => setConnectorTerminalActionMessage(null), 3500);
    }
  };

  const handleAddMatingPair = async () => {
    const inputVal = newMatingPairIdInput.trim();
    if (!inputVal) return;

    if (uniqueMatingPairIds.some((id) => id.trim().toLowerCase() === inputVal.toLowerCase())) {
      setMatingPairActionMessage('Ez az ellenpár kapcsolat már rögzítve van!');
      setTimeout(() => setMatingPairActionMessage(null), 3500);
      return;
    }

    const qty = typeof newMatingPairQuantity === 'number' && !isNaN(newMatingPairQuantity) && newMatingPairQuantity > 0 ? Math.floor(newMatingPairQuantity) : 1;

    setIsAddingMatingPair(true);
    try {
      if (onAddMatingPairRelation) {
        await onAddMatingPairRelation(product.productId, inputVal, qty);
      }
      setNewMatingPairIdInput('');
      setNewMatingPairQuantity(1);
      setShowAddMatingPairModal(false);
      setMatingPairActionMessage(`Ellenpár kapcsolat (${inputVal}) sikeresen rögzítve (${qty} db)!`);
      setTimeout(() => setMatingPairActionMessage(null), 3500);
    } catch (err) {
      console.error('Error adding mating pair relation:', err);
      setMatingPairActionMessage('Hiba történt a kapcsolat létrehozásakor.');
      setTimeout(() => setMatingPairActionMessage(null), 3500);
    } finally {
      setIsAddingMatingPair(false);
    }
  };

  const handleUpdateMatingPairQuantity = async (targetId: string, newQty: number) => {
    if (newQty < 1 || isNaN(newQty)) return;
    const cleanQty = Math.floor(newQty);
    setIsUpdatingMatingPairQuantity(true);
    try {
      if (onAddMatingPairRelation) {
        await onAddMatingPairRelation(product.productId, targetId, cleanQty);
      }
      setMatingPairActionMessage(`Ellenpár kapcsolat (${targetId}) darabszáma sikeresen módosítva: ${cleanQty} db`);
      setTimeout(() => setMatingPairActionMessage(null), 4000);
      setEditingMatingPairQuantityId(null);
    } catch (err) {
      console.error('Error updating mating pair quantity:', err);
      setMatingPairActionMessage('Hiba történt a darabszám mentése során.');
      setTimeout(() => setMatingPairActionMessage(null), 3500);
    } finally {
      setIsUpdatingMatingPairQuantity(false);
    }
  };

  const handleRemoveMatingPair = async (targetId: string) => {
    try {
      if (onDeleteMatingPairRelation) {
        await onDeleteMatingPairRelation(product.productId, targetId);
      }
      setMatingPairActionMessage(`Ellenpár kapcsolat (${targetId}) eltávolítva.`);
      setTimeout(() => setMatingPairActionMessage(null), 3500);
    } catch (err) {
      console.error('Error removing mating pair relation:', err);
      setMatingPairActionMessage('Hiba történt a kapcsolat eltávolításakor.');
      setTimeout(() => setMatingPairActionMessage(null), 3500);
    }
  };

  const handleAddTerminalFej = async () => {
    const inputVal = newTerminalFejIdInput.trim();
    if (!inputVal) return;

    const alreadyExists = resolvedTerminalFejek.some(
      (item) => item.relatedProductId.toLowerCase() === inputVal.toLowerCase()
    );
    if (alreadyExists) {
      setTerminalFejActionMessage('Ez a Saru ↔ Saruzófej kapcsolat már rögzítve van!');
      setTimeout(() => setTerminalFejActionMessage(null), 3500);
      return;
    }

    const qty = typeof newTerminalFejQuantity === 'number' && !isNaN(newTerminalFejQuantity) && newTerminalFejQuantity > 0 ? Math.floor(newTerminalFejQuantity) : 1;

    setIsAddingTerminalFej(true);
    try {
      if (onAddTerminalFejRelation) {
        await onAddTerminalFejRelation(product.productId, inputVal, qty);
      }
      setNewTerminalFejIdInput('');
      setNewTerminalFejQuantity(1);
      setShowAddTerminalFejModal(false);
      setTerminalFejActionMessage(`Saru ↔ Saruzófej kapcsolat (${inputVal}) sikeresen rögzítve (${qty} db)!`);
      setTimeout(() => setTerminalFejActionMessage(null), 3500);
    } catch (err) {
      console.error('Error adding terminal fej relation:', err);
      setTerminalFejActionMessage('Hiba történt a kapcsolat létrehozásakor.');
      setTimeout(() => setTerminalFejActionMessage(null), 3500);
    } finally {
      setIsAddingTerminalFej(false);
    }
  };

  const handleUpdateTerminalFejQuantity = async (targetId: string, newQty: number) => {
    if (newQty < 1 || isNaN(newQty)) return;
    const cleanQty = Math.floor(newQty);
    setIsUpdatingTerminalFejQuantity(true);
    try {
      if (onAddTerminalFejRelation) {
        await onAddTerminalFejRelation(product.productId, targetId, cleanQty);
      }
      setTerminalFejActionMessage(`Saru ↔ Saruzófej kapcsolat (${targetId}) darabszáma sikeresen módosítva: ${cleanQty} db`);
      setTimeout(() => setTerminalFejActionMessage(null), 4000);
      setEditingTerminalFejQuantityId(null);
    } catch (err) {
      console.error('Error updating terminal fej quantity:', err);
      setTerminalFejActionMessage('Hiba történt a darabszám mentése során.');
      setTimeout(() => setTerminalFejActionMessage(null), 3500);
    } finally {
      setIsUpdatingTerminalFejQuantity(false);
    }
  };

  const handleRemoveTerminalFej = async (targetId: string) => {
    try {
      if (onDeleteTerminalFejRelation) {
        await onDeleteTerminalFejRelation(product.productId, targetId);
      }
      setTerminalFejActionMessage(`Saru ↔ Saruzófej kapcsolat (${targetId}) sikeresen leválasztva.`);
      setTimeout(() => setTerminalFejActionMessage(null), 3500);
    } catch (err) {
      console.error('Error removing terminal-fej relation:', err);
      setTerminalFejActionMessage('Hiba történt a kapcsolat eltávolításakor.');
      setTimeout(() => setTerminalFejActionMessage(null), 3500);
    }
  };

  const handleReconnectTerminalFej = async (targetId: string) => {
    try {
      if (onAddTerminalFejRelation) {
        await onAddTerminalFejRelation(product.productId, targetId);
      }
      setTerminalFejActionMessage(`Saru ↔ Saruzófej kapcsolat (${targetId}) sikeresen visszacsatolva!`);
      setTimeout(() => setTerminalFejActionMessage(null), 3500);
    } catch (err) {
      console.error('Error reconnecting terminal-fej relation:', err);
      setTerminalFejActionMessage('Hiba történt a kapcsolat visszacsatolásakor.');
      setTimeout(() => setTerminalFejActionMessage(null), 3500);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Action Bar with Vissza (1 lépést vissza) & Vissza a listához */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-[#DBD8D5] shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Vissza (1 lépést vissza az előző termékre vagy oldalra) */}
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-[#DBD8D5]/60 hover:bg-[#DBD8D5] text-[#211E1B] font-extrabold text-base sm:text-lg transition-colors cursor-pointer border border-[#DBD8D5] shadow-2xs"
            title={
              previousProduct
                ? `Visszalépés 1 lépést: ${previousProduct.name} (${previousProduct.productId})`
                : 'Visszalépés 1 lépést az előző oldalra'
            }
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#3A5D6B]" />
            <span>Vissza</span>
            {previousProduct && (
              <span className="hidden sm:inline font-mono text-sm text-[#3A5D6B] font-bold">
                ({previousProduct.productId})
              </span>
            )}
          </button>

          {/* 2. Vissza a listához (fő listára vezet, szűrés megmarad) */}
          {onGoToList && (
            <button
              type="button"
              onClick={onGoToList}
              className="flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-extrabold text-base sm:text-lg transition-colors cursor-pointer border-2 border-emerald-300 shadow-2xs"
              title="Vissza a fő terméklistához (a beállított szűrők és keresések megmaradnak)"
            >
              <Layers className="w-5 h-5 text-emerald-700" />
              <span>Vissza a listához</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Össz darabszám a felső címsor jobb oldalán */}
          <div
            className={`hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl border shadow-2xs font-extrabold text-sm ${
              productTotalStock > 0
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-red-50 text-red-800 border-red-300'
            }`}
            title={`Összes raktári darabszám: ${productTotalStock} db${
              activeWarehousePositions.length === 1
                ? ` (${activeWarehousePositions[0].positionId} pozícióban)`
                : activeWarehousePositions.length > 1
                ? ` (${activeWarehousePositions.length} helyen: ${activeWarehousePositions.map((p) => p.positionId).join(', ')})`
                : ''
            }`}
          >
            <span className="text-[11px] uppercase font-black opacity-75">Összkészlet:</span>
            <span className="font-mono font-black text-base">{productTotalStock} db</span>
            {activeWarehousePositions.length === 1 ? (
              <span className="text-xs font-bold opacity-80 pl-1.5 border-l border-current/20 inline-flex items-center gap-0.5">
                <MapPin className="w-3 h-3 opacity-70" />
                <span>{activeWarehousePositions[0].positionId} pozícióban</span>
              </span>
            ) : activeWarehousePositions.length > 1 ? (
              <span className="text-xs font-bold opacity-80 pl-1.5 border-l border-current/20 inline-flex items-center gap-0.5">
                <MapPin className="w-3 h-3 opacity-70" />
                <span>{activeWarehousePositions.length} helyen szerepel</span>
              </span>
            ) : (
              <span className="text-xs font-bold opacity-60 pl-1.5 border-l border-current/20 inline-flex items-center gap-0.5">
                <span>0 pozícióban</span>
              </span>
            )}
          </div>

          {onNavigateToWarehouseMovement && (
            <button
              type="button"
              onClick={() =>
                onNavigateToWarehouseMovement(
                  formData.productId,
                  activeWarehousePositions[0]?.positionId
                )
              }
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-900 border border-blue-200 text-xs sm:text-sm font-black transition-all cursor-pointer shadow-2xs group"
              title={`Készletmozgás rögzítése (${formData.productId})`}
            >
              <ArrowRightLeft className="w-4 h-4 text-blue-700 group-hover:text-white" />
              <span className="hidden sm:inline">+ Készletmozgás</span>
              <span className="sm:hidden">Mozgás</span>
            </button>
          )}

          {/* Kanban Jelvény & Művelet Gomb */}
          {(() => {
            const kanbanInfo = getProductKanbanStatus(formData.productId, kanbanItems || []);
            const cfg = kanbanInfo.status ? KANBAN_STATUS_CONFIG[kanbanInfo.status] : null;

            return (
              <div className="flex items-center gap-2">
                {kanbanInfo.inKanban && cfg ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenKanbanModal) onOpenKanbanModal(formData.productId);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-black border shadow-2xs cursor-pointer transition-transform hover:scale-102 ${cfg.bgBadge} ${cfg.textBadge} ${cfg.borderBadge}`}
                    title={`Bent van a Kanbanban: ${cfg.label}${kanbanInfo.item?.note ? `\nMegjegyzés: ${kanbanInfo.item.note}` : ''}\nKattints a szerkesztéshez!`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor} shrink-0`} />
                    <span>Kanban: {cfg.label}</span>
                    {kanbanInfo.item?.note && (
                      <span className="hidden xl:inline text-xs font-semibold opacity-75 max-w-[130px] truncate">
                        ({kanbanInfo.item.note})
                      </span>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenKanbanModal) onOpenKanbanModal(formData.productId);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-900 border border-purple-200 text-xs sm:text-sm font-black transition-all cursor-pointer shadow-2xs group"
                    title={`Hozzáadás a Kanbanhoz (${formData.productId})`}
                  >
                    <Layers className="w-4 h-4 text-purple-700 group-hover:text-white" />
                    <span>+ Kanban</span>
                  </button>
                )}
              </div>
            );
          })()}

          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold text-base bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Sikeresen mentve!
            </span>
          )}

          {canEdit ? (
            !isEditing ? (
              <div className="flex items-center gap-2">
                {/* Kapcsolat Hozzáadása gomb és legördülő menü */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRelationMenuOpen(!isRelationMenuOpen)}
                    className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white hover:bg-[#3A5D6B]/5 text-[#3A5D6B] font-extrabold text-sm sm:text-base transition-all cursor-pointer border-2 border-[#3A5D6B] shadow-2xs"
                    title="Új kapcsolat hozzáadása ehhez a termékhez"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-[#3A5D6B]" />
                    <span>Kapcsolat</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#3A5D6B] transition-transform duration-200 ${
                        isRelationMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isRelationMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setIsRelationMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border-2 border-[#DBD8D5] p-2 z-40 animate-fadeIn space-y-1">
                        <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase text-gray-500 tracking-wider">
                            Új Kapcsolat
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">
                            {product.productId}
                          </span>
                        </div>

                        {/* 1. Opció: Notesz hozzáadása - MINDEN terméknél elérhető, legelső helyen (Szín: #FA4646) */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsRelationMenuOpen(false);
                            setShowAddNoteModal(true);
                          }}
                          className="w-full text-left p-2.5 sm:p-3 rounded-xl hover:bg-red-50 transition-colors cursor-pointer flex items-start gap-3 group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-red-100 text-[#FA4646] flex items-center justify-center shrink-0 group-hover:bg-[#FA4646] group-hover:text-white transition-colors">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold text-sm text-gray-900 group-hover:text-[#FA4646] leading-tight flex items-center gap-1.5">
                              <span>{thisProductNotes.length === 0 ? '+ Notesz hozzáadása' : '+ Új Notesz bejegyzés'}</span>
                              {thisProductNotes.length > 0 && (
                                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-red-100 text-[#FA4646]">
                                  {thisProductNotes.length} db
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 leading-snug">
                              {thisProductNotes.length === 0
                                ? 'Új notesz, pontozott rajz, fénykép vagy feljegyzés csatolása'
                                : 'További notesz bejegyzés vagy fotó csatolása'}
                            </div>
                          </div>
                        </button>

                        {/* 1b. Opció: Karbantartás hozzáadása - MINDEN terméknél elérhető, barna téma (#7B4B29) */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsRelationMenuOpen(false);
                            setIsAddMaintenanceModalOpen(true);
                          }}
                          className="w-full text-left p-2.5 sm:p-3 rounded-xl hover:bg-amber-50 transition-colors cursor-pointer flex items-start gap-3 group border-t border-gray-100"
                        >
                          <div className="w-9 h-9 rounded-lg bg-amber-100 text-[#7B4B29] flex items-center justify-center shrink-0 group-hover:bg-[#7B4B29] group-hover:text-white transition-colors">
                            <Wrench className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold text-sm text-stone-900 group-hover:text-[#7B4B29] leading-tight flex items-center gap-1.5">
                              <span>{thisProductMaintenances.length === 0 ? '+ Karbantartás rögzítése' : '+ Új Karbantartás bejegyzés'}</span>
                              {thisProductMaintenances.length > 0 && (
                                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-[#7B4B29]">
                                  {thisProductMaintenances.length} db
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-stone-500 mt-0.5 leading-snug">
                              Karbantartási napló és kicserélt alkatrész (Change Item) rögzítése
                            </div>
                          </div>
                        </button>

                        {/* 2. Opció: Beépülő alkatrész - MINDEN terméknél megjelenik */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsRelationMenuOpen(false);
                            setNewPartIdInput('');
                            setShowAddPartModal(true);
                          }}
                          className="w-full text-left p-2.5 sm:p-3 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer flex items-start gap-3 group border-t border-gray-100"
                        >
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                            <Puzzle className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold text-sm text-emerald-950 group-hover:text-emerald-900 leading-tight">
                              Beépülő alkatrész
                            </div>
                            <div className="text-xs text-emerald-800/80 mt-0.5 leading-snug">
                              Alkatrész vagy tartozék csatolása a termékhez
                            </div>
                          </div>
                        </button>

                        {/* 3. Opció: Termék <-> Mérődoboz - CSAK "Gyártandó termék" vagy "Mérődoboz" kategóriájú termékeknél */}
                        {isMeterBoxRelatedCategory(product.category) && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsRelationMenuOpen(false);
                              setNewMeterBoxIdInput('');
                              setShowAddMeterBoxModal(true);
                            }}
                            className="w-full text-left p-2.5 sm:p-3 rounded-xl hover:bg-orange-50 transition-colors cursor-pointer flex items-start gap-3 group border-t border-gray-50"
                          >
                            <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 group-hover:bg-orange-200 transition-colors">
                              <Gauge className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-sm text-orange-950 group-hover:text-orange-900 leading-tight">
                                Termék ↔ Mérődoboz
                              </div>
                              <div className="text-xs text-orange-900/80 mt-0.5 leading-snug">
                                Gyártandó termék és mérődoboz összekapcsolása
                              </div>
                            </div>
                          </button>
                        )}

                        {/* 4. Opció: Konnektor <-> Saru - CSAK "Konnektor" vagy "Saru" kategóriájú termékeknél */}
                        {isConnectorTerminalRelatedCategory(product.category) && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsRelationMenuOpen(false);
                              setNewConnectorTerminalIdInput('');
                              setShowAddConnectorTerminalModal(true);
                            }}
                            className="w-full text-left p-2.5 sm:p-3 rounded-xl hover:bg-orange-50 transition-colors cursor-pointer flex items-start gap-3 group border-t border-gray-50"
                          >
                            <div className="w-9 h-9 rounded-lg bg-amber-100 text-orange-700 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                              <Plug className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-sm text-orange-950 group-hover:text-orange-900 leading-tight">
                                Konnektor ↔ Saru
                              </div>
                              <div className="text-xs text-orange-900/80 mt-0.5 leading-snug">
                                Konnektor és saru elemek összekapcsolása
                              </div>
                            </div>
                          </button>
                        )}

                        {/* 5. Opció: Ellenpárok - CSAK "Konnektor" vagy "Saru" kategóriájú termékeknél (Citromsárga téma) */}
                        {isMatingPairRelatedCategory(product.category) && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsRelationMenuOpen(false);
                              setNewMatingPairIdInput('');
                              setShowAddMatingPairModal(true);
                            }}
                            className="w-full text-left p-2.5 sm:p-3 rounded-xl hover:bg-yellow-50 transition-colors cursor-pointer flex items-start gap-3 group border-t border-gray-50"
                          >
                            <div className="w-9 h-9 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center shrink-0 group-hover:bg-yellow-200 transition-colors">
                              <GitCompare className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-sm text-yellow-950 group-hover:text-yellow-900 leading-tight">
                                Ellenpárok
                              </div>
                              <div className="text-xs text-yellow-900/80 mt-0.5 leading-snug">
                                {(product.category || '').toLowerCase().includes('konnektor')
                                  ? 'Konnektor ↔ Konnektor ellenpár'
                                  : 'Saru ↔ Saru ellenpár'}
                              </div>
                            </div>
                          </button>
                        )}

                        {/* 6. Opció: Saru ↔ Saruzófej - CSAK "Saru" vagy "Saruzófej" kategóriájú termékeknél (Halvány narancssárga téma) */}
                        {isTerminalFejRelevant && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsRelationMenuOpen(false);
                              setNewTerminalFejIdInput('');
                              setShowAddTerminalFejModal(true);
                            }}
                            className="w-full text-left p-2.5 sm:p-3 rounded-xl hover:bg-orange-50 transition-colors cursor-pointer flex items-start gap-3 group border-t border-gray-50"
                          >
                            <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 group-hover:bg-orange-200 transition-colors">
                              <Wrench className="w-5 h-5 text-orange-700" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-sm text-orange-950 group-hover:text-orange-900 leading-tight">
                                Saru ↔ Saruzófej
                              </div>
                              <div className="text-xs text-orange-900/80 mt-0.5 leading-snug">
                                {isFejCategory(product.category)
                                  ? 'Saruzófej és saru összekapcsolása'
                                  : 'Saru és saruzófej összekapcsolása'}
                              </div>
                            </div>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Szerkesztés gomb */}
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#3A5D6B] hover:bg-[#2F223A] text-white font-bold text-base sm:text-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Edit3 className="w-5 h-5 text-[#79B6B8]" />
                  <span>Szerkesztés</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...product });
                    setIsEditing(false);
                  }}
                  className="px-4 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold text-base"
                >
                  Mégse
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || isDuplicateId || isIdEmpty}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold text-lg transition-colors cursor-pointer shadow-xs"
                  title={
                    isDuplicateId
                      ? `Nem menthető: A(z) ${formData.productId?.trim()} Termék ID már foglalt!`
                      : isIdEmpty
                      ? 'Nem menthető: A Termék ID megadása kötelező!'
                      : 'Változtatások Mentése'
                  }
                >
                  <Save className="w-5 h-5" />
                  <span>{isSaving ? 'Mentés folyamatban...' : 'Változtatások Mentése'}</span>
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-sm">
              <Eye className="w-4 h-4 text-amber-700" />
              <span>Megtekintő Mód (Csak olvasás)</span>
            </div>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              title="Termék törlése"
              className="p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-xl font-bold flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-700 font-bold hover:text-red-950 ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-[#DBD8D5]">
            <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="w-6 h-6" />
              <span>Termék törlésének megerősítése</span>
            </h3>
            <p className="text-sm text-gray-700">
              Biztosan törölni szeretné ezt a terméket? Ez a művelet nem visszavonható:
            </p>
            <div className="p-3 bg-gray-100 rounded-xl">
              <p className="font-bold text-[#211E1B]">{product.name}</p>
              <p className="font-mono text-xs text-[#3A5D6B]">{product.productId}</p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DBD8D5]">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-gray-800 text-sm transition-colors cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-white text-sm transition-colors cursor-pointer shadow-xs"
              >
                Igen, törlés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout: Two-column grid on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Images & Zoom Gallery */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-[#DBD8D5] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#DBD8D5] pb-3">
            <h3 className="font-bold text-xl text-[#3A5D6B] flex items-center gap-2">
              <span>Termék Képek</span>
              <span className="text-sm bg-[#DBD8D5] text-[#211E1B] font-mono px-2 py-0.5 rounded-full">
                {formData.images.length} db
              </span>
            </h3>
            <span className="text-xs text-gray-500 font-medium">Kattintson a nagyításhoz</span>
          </div>

          <ImageGalleryWithZoom
            images={formData.images}
            productName={formData.name || formData.productId}
            onUpdateImages={handleImagesUpdate}
            canEdit={true}
          />
        </div>

        {/* Right Side: Data Sheet (Adatlap) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-7 rounded-2xl border border-[#DBD8D5] shadow-xs space-y-3.5">
          {/* Header Banner inside Data Sheet */}
          <div className="border-b border-[#DBD8D5] pb-3.5">
            {!isEditing ? (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-1.5">
                    <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#3A5D6B] tracking-tight">
                      {formData.productId}
                    </span>
                    {formData.category && (
                      <button
                        type="button"
                        onClick={() => onFilterBy && onFilterBy('category', formData.category!)}
                        className="text-sm font-extrabold text-[#1e6075] bg-[#79B6B8]/20 hover:bg-[#1e6075] hover:text-white px-3 py-1 rounded-full transition-all duration-200 cursor-pointer shadow-2xs"
                        title={`Szűrés erre a kategóriára: ${formData.category}`}
                      >
                        <span>{formData.category}</span>
                      </button>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#211E1B] tracking-tight">
                    {formData.name}
                  </h1>
                </div>

                {/* Össz darabszám a címsor jobb oldalán */}
                <div className="shrink-0 flex flex-col items-end text-right pl-2 sm:pl-4">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                    Össz darabszám
                  </span>
                  <div
                    className={`font-mono font-black text-xl sm:text-2xl md:text-3xl px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-2xl border shadow-xs inline-flex items-center gap-1.5 ${
                      productTotalStock > 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-red-50 text-red-700 border-red-300'
                    }`}
                    title={`Összes raktári darabszám: ${productTotalStock} db`}
                  >
                    <span>{productTotalStock}</span>
                    <span className="text-xs sm:text-sm font-bold opacity-80">db</span>
                  </div>
                  {activeWarehousePositions.length === 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        onNavigateToWarehousePosition &&
                        onNavigateToWarehousePosition(activeWarehousePositions[0].positionId)
                      }
                      className="text-[11px] sm:text-xs text-slate-700 font-extrabold mt-1 inline-flex items-center gap-1 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
                      title={`Ugrás a(z) ${activeWarehousePositions[0].positionId} raktári pozícióhoz`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{activeWarehousePositions[0].positionId} pozícióban</span>
                    </button>
                  ) : activeWarehousePositions.length > 1 ? (
                    <span
                      className="text-[11px] sm:text-xs text-slate-600 font-bold mt-1 inline-flex items-center gap-1"
                      title={`Raktári pozíciók: ${activeWarehousePositions.map((p) => p.positionId).join(', ')}`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{activeWarehousePositions.length} helyen szerepel</span>
                    </span>
                  ) : (
                    <span
                      className="text-[11px] sm:text-xs text-slate-400 font-bold mt-1 inline-flex items-center gap-1"
                      title="Nincs rögzített raktári pozíció"
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span>0 pozícióban</span>
                    </span>
                  )}

                  {onNavigateToWarehouseMovement && (
                    <button
                      type="button"
                      onClick={() =>
                        onNavigateToWarehouseMovement(
                          formData.productId,
                          activeWarehousePositions[0]?.positionId
                        )
                      }
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-900 border border-blue-200 text-xs font-black transition-colors cursor-pointer shadow-2xs group"
                      title={`Készletmozgás rögzítése a(z) ${formData.productId} cikkszámhoz`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-blue-700 group-hover:text-white transition-colors" />
                      <span>+ Készletmozgás</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 mt-1">
                {/* 1. Termék ID szerkesztése és valós idejű egyediség-ellenőrzés */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-sm font-black text-[#3A5D6B] uppercase tracking-wider flex items-center gap-1.5">
                      <Barcode className="w-4 h-4 text-[#3A5D6B]" />
                      <span>Termék ID / Cikkszám</span>
                      <span className="text-red-500 font-black">*</span>
                    </label>
                    {isIdChanged && !isDuplicateId && !isIdEmpty && (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 animate-fadeIn">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Elérhető új egyedi ID</span>
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={formData.productId}
                      onChange={(e) => handleFieldChange('productId', e.target.value)}
                      className={`w-full font-mono text-xl sm:text-2xl font-black p-3 rounded-xl border-2 transition-all ${
                        isDuplicateId
                          ? 'border-red-500 bg-red-50/70 text-red-950 focus:outline-hidden focus:border-red-600'
                          : isIdEmpty
                          ? 'border-amber-400 bg-amber-50/50 text-[#211E1B] focus:outline-hidden focus:border-[#3A5D6B]'
                          : isIdChanged
                          ? 'border-emerald-500 bg-emerald-50/40 text-[#211E1B] focus:outline-hidden focus:border-emerald-600'
                          : 'border-[#3A5D6B] bg-white text-[#3A5D6B] focus:outline-hidden focus:border-[#3A5D6B]'
                      }`}
                      placeholder="pl. 40107.00.33 vagy 2182120013"
                      required
                    />
                    {isDuplicateId && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-700 bg-white px-2.5 py-1 rounded-lg shadow-xs border border-red-300 font-bold text-xs flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Már létező ID!</span>
                      </div>
                    )}
                  </div>

                  {/* Részletes figyelmeztető doboz ha már létezik a termék ID */}
                  {isDuplicateId && (
                    <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl text-red-950 text-xs sm:text-sm font-semibold flex items-start gap-2.5 animate-fadeIn">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 flex-1">
                        <p className="font-bold text-red-900">
                          A megadott Termék ID (<strong>{enteredId}</strong>) már foglalt egy másik terméknél!
                        </p>
                        <p className="text-red-800 text-xs">
                          Létező termék: <strong>{conflictingProduct?.name || 'Névtelen'}</strong>
                          {conflictingProduct?.category && ` (Kategória: ${conflictingProduct.category})`}
                        </p>
                        <p className="text-red-700 text-[11px] font-extrabold pt-0.5">
                          ⚠️ A rendszer biztonsági okokból nem engedi a mentést, amíg egyedi azonosítót nem ad meg.
                        </p>
                      </div>
                    </div>
                  )}

                  {isIdEmpty && (
                    <p className="text-xs font-bold text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>A Termék ID kötelező, nem lehet üres!</span>
                    </p>
                  )}
                </div>

                {/* 2. Termék Név szerkesztése */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-[#3A5D6B]">
                    Termék Név <span className="text-red-500 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full text-xl sm:text-2xl font-bold p-3 border-2 border-[#3A5D6B] rounded-xl text-[#211E1B] focus:outline-hidden"
                    placeholder="Termék neve"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Description Block - only shown if exists or in editing mode */}
          {(isEditing || (formData.description && formData.description.trim().length > 0)) && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#3A5D6B] block">
                Leírás / Megjegyzés
              </label>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="w-full text-base sm:text-lg p-3 border-2 border-[#DBD8D5] focus:border-[#3A5D6B] rounded-xl text-[#211E1B]"
                  placeholder="Rövid termékleírás vagy megjegyzés"
                />
              ) : (
                <div className="p-3.5 bg-[#F8F9FA] rounded-xl border border-[#DBD8D5] text-base sm:text-lg font-medium text-[#211E1B] leading-relaxed">
                  {formData.description}
                </div>
              )}
            </div>
          )}

          {/* Detailed Technical Parameters List */}
          <div className="space-y-2 pt-1">
            <h3 className="font-bold text-base uppercase tracking-wider text-[#3A5D6B] border-b border-[#DBD8D5] pb-1.5 flex items-center justify-between">
              <span>Műszaki és Raktári Paraméterek</span>
              {isEditing && (
                <span className="text-xs bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded">
                  Szerkesztési mód
                </span>
              )}
            </h3>

            {(() => {
              const isKonnektor =
                isConnectorCategory(formData.category) ||
                isConnectorCategory(product.category);

              const paramItems: Array<{
                field: keyof Product;
                label: string;
                value: any;
                placeholder?: string;
                type?: string;
                isMono?: boolean;
                isBadge?: boolean;
                isNumber?: boolean;
                isPositions?: boolean;
                min?: number;
                max?: number;
                isFilterable?: boolean;
                filterType?: 'category' | 'manufacturer' | 'feeding';
              }> = [
                { field: 'manufacturer', label: 'Gyártó', value: formData.manufacturer, placeholder: 'pl. Mecal', isFilterable: true, filterType: 'manufacturer' },
                { field: 'category', label: 'Kategória', value: formData.category, placeholder: 'pl. Saruzófej, Konnektor', isFilterable: true, filterType: 'category' }
              ];

              // CSAK akkor jelenjen meg a pozíciók száma mező, ha a termék kategóriája Konnektor!
              if (isKonnektor) {
                paramItems.push({
                  field: 'positionsCount',
                  label: 'Pozíciók száma',
                  value: formData.positionsCount,
                  placeholder: '1 - 999',
                  isNumber: true,
                  isPositions: true,
                  min: 1,
                  max: 999
                });
              }

              paramItems.push(
                { field: 'factoryCode', label: 'Gyári Kód', value: formData.factoryCode, placeholder: 'pl. MLS0185-J', isMono: true, isBadge: true },
                { field: 'feeding', label: 'Adagolás', value: formData.feeding, placeholder: 'pl. Oldal, Hátul', isFilterable: true, filterType: 'feeding' },
                { field: 'insulationType', label: 'Szigetelés Típus', value: formData.insulationType, placeholder: 'pl. Nem Gumis, Gumis' },
                { field: 'insulationGripperType', label: 'Szigm. Típus', value: formData.insulationGripperType, placeholder: 'pl. F' },
                { field: 'connectorType', label: 'Konektor Típusa', value: formData.connectorType, placeholder: 'pl. Standard 2.54' },
                { field: 'terminalType', label: 'Saru Típusa', value: formData.terminalType, placeholder: 'pl. Nyitott saru' },
                { field: 'date', label: 'Dátum', value: formData.date, type: 'date' },
                { field: 'stockQuantity', label: 'Raktári Készlet', value: formData.stockQuantity, isNumber: true, min: 0 },
                { field: 'location', label: 'Raktári Lokáció / Polc', value: formData.location, placeholder: 'pl. A-01-Polc-3' }
              );

              const visibleItems = paramItems.filter((item) => {
                if (isEditing) return true; // Show all input fields during editing so user can enter new values
                if (item.isNumber) {
                  return item.value !== undefined && item.value !== null && item.value !== '';
                }
                return item.value && String(item.value).trim().length > 0;
              });

              if (visibleItems.length === 0 && !isEditing) {
                return (
                  <div className="p-5 bg-[#F8F9FA] rounded-xl border border-[#DBD8D5] text-center text-gray-500 font-medium text-base">
                    Nincs kitöltött műszaki vagy raktári paraméter ehhez a termékhez.
                  </div>
                );
              }

              return (
                <div className="border border-[#DBD8D5] rounded-xl overflow-hidden divide-y divide-[#DBD8D5] bg-white shadow-xs">
                  {visibleItems.map((item, idx) => {
                    const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-[#F8F9FA]';

                    return (
                      <div
                        key={item.field}
                        className={`flex flex-col sm:flex-row sm:items-stretch ${rowBg} hover:bg-slate-50 transition-colors`}
                      >
                        {/* Parameter Label (Left column with vertical dividing line) */}
                        <div className="text-base font-bold text-gray-700 sm:w-5/12 p-3 sm:px-5 sm:py-3 sm:border-r border-[#DBD8D5] flex items-center justify-between">
                          <span>{item.label}:</span>
                          {item.isPositions && (
                            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                              Konnektor
                            </span>
                          )}
                        </div>

                        {/* Parameter Value / Input (Right column) */}
                        <div className="sm:w-7/12 p-3 sm:px-5 sm:py-3 flex items-center">
                          {isEditing ? (
                            item.isNumber ? (
                              <div className="w-full space-y-1">
                                <input
                                  type="number"
                                  min={item.min ?? 0}
                                  max={item.max}
                                  value={formData[item.field] !== undefined && formData[item.field] !== null ? formData[item.field] : ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === '') {
                                      handleFieldChange(item.field, undefined);
                                      return;
                                    }
                                    let parsed = parseInt(raw, 10);
                                    if (!isNaN(parsed)) {
                                      if (item.min !== undefined && parsed < item.min) parsed = item.min;
                                      if (item.max !== undefined && parsed > item.max) parsed = item.max;
                                      handleFieldChange(item.field, parsed);
                                    }
                                  }}
                                  placeholder={item.placeholder}
                                  className={`w-full font-bold text-lg p-2 border-2 border-[#DBD8D5] focus:border-[#3A5D6B] rounded-lg bg-white ${
                                    item.isPositions ? 'font-mono text-emerald-950 border-emerald-300 focus:border-emerald-600' : ''
                                  }`}
                                />
                                {item.isPositions && (
                                  <span className="text-xs text-emerald-800 font-medium block">
                                    Csak egész szám adható meg 1 és 999 között.
                                  </span>
                                )}
                              </div>
                            ) : item.type === 'date' ? (
                              <input
                                type="date"
                                value={formData.date || ''}
                                onChange={(e) => handleFieldChange('date', e.target.value)}
                                className="w-full font-bold text-lg p-2 border-2 border-[#DBD8D5] focus:border-[#3A5D6B] rounded-lg bg-white"
                              />
                            ) : (
                              <ComboboxInput
                                id={`input-${String(item.field)}`}
                                value={(formData[item.field] as string) || ''}
                                onChange={(val) => handleFieldChange(item.field, val)}
                                options={existingOptionsByField[String(item.field)] || []}
                                placeholder={item.placeholder}
                                isMono={item.isMono}
                              />
                            )
                          ) : (
                            /* Viewing display */
                            item.field === 'location' ? (
                              activeWarehousePositions.length > 0 ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  {activeWarehousePositions.map((p) => (
                                    <button
                                      key={p.positionId}
                                      type="button"
                                      onClick={() => {
                                        if (onNavigateToWarehousePosition) {
                                          onNavigateToWarehousePosition(p.positionId);
                                        }
                                      }}
                                      className="font-mono font-black text-sm sm:text-base text-blue-900 bg-blue-50 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-xl border border-blue-200 transition-colors inline-flex items-center gap-2 cursor-pointer shadow-2xs"
                                      title={`Ugrás a(z) ${p.positionId} raktári pozícióra és az eddigi tranzakciókra`}
                                    >
                                      <Box className="w-4 h-4 text-blue-600" />
                                      <span>{p.positionId}</span>
                                      {p.quantity > 0 && (
                                        <span className="text-xs opacity-75 font-bold">({p.quantity} db)</span>
                                      )}
                                      <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="font-bold text-base text-slate-400 font-mono">—</span>
                              )
                            ) : item.field === 'stockQuantity' ? (
                              <span
                                className={`font-mono font-black text-lg sm:text-xl px-3.5 py-1 rounded-xl border shadow-2xs ${
                                  productTotalStock > 0
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-red-50 text-red-800 border-red-300'
                                }`}
                              >
                                {productTotalStock} db
                              </span>
                            ) : item.isPositions ? (
                              <span className="font-mono font-extrabold text-lg sm:text-xl text-emerald-950 bg-emerald-100 px-3.5 py-1 rounded-lg border border-emerald-300 inline-flex items-center gap-2 shadow-2xs">
                                <span>{item.value} pozíció</span>
                              </span>
                            ) : item.isBadge ? (
                              <span className="font-mono font-extrabold text-lg sm:text-xl text-[#3A5D6B] bg-[#DBD8D5]/40 px-3 py-1 rounded-md border border-[#DBD8D5] inline-block">
                                {item.value}
                              </span>
                            ) : item.isNumber ? (
                              <span className="font-extrabold text-lg sm:text-xl text-[#211E1B]">
                                {item.value} db
                              </span>
                            ) : item.isFilterable && onFilterBy ? (
                              <button
                                type="button"
                                onClick={() => onFilterBy(item.filterType!, String(item.value))}
                                className="group/filter inline-flex items-center text-left cursor-pointer"
                                title={`Kattintson a szűréshez: ${item.label} = ${item.value}`}
                              >
                                <span className="font-extrabold text-lg sm:text-xl text-[#1e6075] bg-[#79B6B8]/15 hover:bg-[#3A5D6B] hover:text-white px-3 py-1 -ml-1 rounded-lg transition-all duration-200 inline-block shadow-2xs">
                                  {item.value}
                                </span>
                              </button>
                            ) : (
                              <span
                                className={`font-bold text-lg sm:text-xl text-[#211E1B] ${
                                  item.isMono ? 'font-mono text-[#3A5D6B]' : ''
                                }`}
                              >
                                {item.value}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. NOTESZ SZEKCIÓ (#FA4646 színnel, minden termékhez elérhető, legelső helyen a kapcsolatok között) */}
      {/* ========================================================================= */}
      <ProductNotesSection
        productId={product.productId}
        notes={thisProductNotes}
        canEdit={canEdit}
        onNavigateToDataImport={onNavigateToDataImport}
        onSaveNote={async (note) => {
          if (onSaveProductNote) {
            await onSaveProductNote(note);
          }
        }}
        onDeleteNote={async (noteId) => {
          if (onDeleteProductNote) {
            await onDeleteProductNote(noteId);
          }
        }}
        isModalOpen={showAddNoteModal}
        onOpenModal={() => setShowAddNoteModal(true)}
        onCloseModal={() => setShowAddNoteModal(false)}
      />

      {/* ========================================================================= */}
      {/* 1b. KARBANTARTÁS SZEKCIÓ (Barna szín, csak akkor jelenik meg ha van karbantartás) */}
      {/* ========================================================================= */}
      {(thisProductMaintenances.length > 0 || isAddMaintenanceModalOpen) && (
        <ProductMaintenanceSection
          productId={product.productId}
          productName={product.name}
          maintenances={thisProductMaintenances}
          allProducts={allProducts}
          canEdit={canEdit}
          onSelectProduct={onSelectProduct}
          onSaveMaintenance={async (record) => {
            if (onSaveMaintenance) {
              await onSaveMaintenance(record);
            }
          }}
          onDeleteMaintenance={async (recordId) => {
            if (onDeleteMaintenance) {
              await onDeleteMaintenance(recordId);
            }
          }}
          onDeleteAllForProduct={async (prodId: string) => {
            if (onDeleteAllMaintenanceForProduct) {
              await onDeleteAllMaintenanceForProduct(prodId);
            }
          }}
          isAddModalOpen={isAddMaintenanceModalOpen}
          onCloseAddModal={() => setIsAddMaintenanceModalOpen(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* RAKTÁRI POZÍCIÓK & TRANZAKCIÓK SZEKCIÓ (Kék árnyalatok)                    */}
      {/* ========================================================================= */}
      {productWarehouseTransactions.length > 0 && (
        <section className="border-2 sm:border-3 border-blue-400 bg-white rounded-2xl shadow-sm overflow-hidden transition-all">
          <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-sky-800 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-blue-500/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-xs shrink-0">
                <Box className="w-6 h-6 text-sky-200" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    Raktári Pozíciók & Készletmozgások
                  </h2>
                  <span className="bg-blue-950/40 text-blue-100 border border-blue-300/40 px-3 py-0.5 rounded-full text-xs sm:text-sm font-extrabold whitespace-nowrap">
                    {productTotalStock} db összes készlet
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-blue-100/90 mt-0.5">
                  Ehhez a termékhez ({product.productId}) tartozó raktári lokációk és tranzakciós napló
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onNavigateToWarehouseMovement && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigateToWarehouseMovement(
                      formData.productId,
                      activeWarehousePositions[0]?.positionId
                    )
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs sm:text-sm font-extrabold transition-colors cursor-pointer shadow-xs"
                  title={`Új készletmozgás rögzítése (${formData.productId})`}
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Új Készletmozgás</span>
                </button>
              )}
              {onNavigateToWarehousePosition && activeWarehousePositions.length > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigateToWarehousePosition(activeWarehousePositions[0].positionId)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-blue-900 hover:bg-blue-50 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer shadow-xs"
                >
                  <span>Ugrás a Raktárra</span>
                  <ExternalLink className="w-4 h-4 text-blue-700" />
                </button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {/* Active positions row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Tárolási helyek:
              </span>
              {activeWarehousePositions.map((pos) => (
                <button
                  key={pos.positionId}
                  type="button"
                  onClick={() => onNavigateToWarehousePosition && onNavigateToWarehousePosition(pos.positionId)}
                  className="font-mono font-bold text-xs px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-900 border border-blue-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Ugrás erre a raktári pozícióra"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>{pos.positionId}</span>
                  <span className="opacity-80 font-black">({pos.quantity} db)</span>
                </button>
              ))}
            </div>

            {/* Transactions table */}
            <div className="overflow-x-auto rounded-xl border border-blue-200">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-blue-50 text-blue-950 font-black border-b border-blue-200">
                    <th className="py-2.5 px-3">Dátum</th>
                    <th className="py-2.5 px-3">Pozíció ID</th>
                    <th className="py-2.5 px-3 text-right">Mennyiség</th>
                    <th className="py-2.5 px-3">Megjegyzés</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100 font-medium text-slate-800">
                  {productWarehouseTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => onNavigateToWarehousePosition && onNavigateToWarehousePosition(tx.positionId)}
                          className="font-mono font-black text-blue-700 hover:text-blue-950 hover:underline cursor-pointer"
                        >
                          {tx.positionId}
                        </button>
                      </td>
                      <td className="py-2 px-3 font-mono font-black text-right whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md inline-block ${
                            tx.quantity > 0
                              ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                              : 'text-red-800 bg-red-50 border border-red-200'
                          }`}
                        >
                          {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} db
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px]">
                        {tx.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Ha még nincs rögzített készletmozgás ehhez a termékhez */}
      {productWarehouseTransactions.length === 0 && (
        <section className="border border-blue-200 bg-blue-50/40 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center border border-blue-200 text-blue-700 shrink-0">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-blue-950">Raktári Készletmozgások</h3>
              <p className="text-xs text-blue-700 mt-0.5">
                Ehhez a termékhez ({product.productId}) még nincs rögzített készletmozgási tétel.
              </p>
            </div>
          </div>
          {onNavigateToWarehouseMovement && (
            <button
              type="button"
              onClick={() =>
                onNavigateToWarehouseMovement(
                  formData.productId,
                  activeWarehousePositions[0]?.positionId
                )
              }
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Készletmozgás Rögzítése</span>
            </button>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* BEÉPÜLŐ ALKATRÉSZEK SZEKCIÓ                                               */}
      {/* Csak akkor jelenik meg a kártyája, ha van csatolt beépülő alkatrész        */}
      {/* ========================================================================= */}
      {uniqueComponentIds.length > 0 && (
        <section className="border-2 sm:border-3 border-emerald-400 bg-white rounded-2xl shadow-sm overflow-hidden transition-all">
          {/* Címsor: Világoszöld és árnyalatai */}
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-emerald-500/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-xs shrink-0">
                <Puzzle className="w-6 h-6 text-emerald-200" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    Beépülő alkatrészek
                  </h2>
                  <span className="bg-emerald-950/40 text-emerald-100 border border-emerald-300/40 px-3 py-0.5 rounded-full text-xs sm:text-sm font-extrabold whitespace-nowrap">
                    {uniqueComponentIds.length} db egyedi alkatrész
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-100/90 mt-0.5">
                  Ehhez a termékhez ({product.productId}) tartozó beépülő alkatrészek és tartozékok listája
                </p>
              </div>
            </div>

            {/* Quick Actions in Header */}
            {canEdit && (
              <div className="flex items-center gap-2">
                {onNavigateToDataImport && (
                  <button
                    type="button"
                    onClick={() => onNavigateToDataImport('components')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer border border-white/20"
                    title="Beépülő alkatrész CSV feltöltése az Adatfeltöltés központban"
                  >
                    <UploadCloud className="w-4 h-4 text-emerald-200" />
                    <span className="hidden sm:inline">CSV Feltöltés</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setNewPartIdInput('');
                    setShowAddPartModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>+ Alkatrész csatolása</span>
                </button>
              </div>
            )}
          </div>

          {/* Action feedback message */}
          {partActionMessage && (
            <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-900 px-4 py-2.5 text-sm font-bold flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{partActionMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setPartActionMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search filter if there are several components */}
          {uniqueComponentIds.length > 3 && (
            <div className="p-3 sm:p-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-700 shrink-0" />
              <input
                type="text"
                value={partSearchTerm}
                onChange={(e) => setPartSearchTerm(e.target.value)}
                placeholder="Keresés a csatolt alkatrészek között (ID, név, gyári kód)..."
                className="w-full text-xs sm:text-sm bg-white border border-emerald-200 rounded-lg px-3 py-1.5 focus:outline-emerald-600 font-medium"
              />
              {partSearchTerm && (
                <button
                  type="button"
                  onClick={() => setPartSearchTerm('')}
                  className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 font-bold cursor-pointer"
                >
                  Törlés
                </button>
              )}
            </div>
          )}

          {/* Body: Component List */}
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {/* 1. Desktop Table View (Screens >= md) */}
              <div className="hidden md:block overflow-x-auto border border-emerald-200 rounded-xl shadow-2xs">
                <table className="w-full text-left border-collapse table-fixed min-w-[720px]">
                  <thead>
                    <tr className="bg-emerald-50 text-emerald-950 text-xs font-bold uppercase tracking-wider select-none border-b-2 border-emerald-200">
                      <th className="py-3 px-2 sm:px-3 w-14 sm:w-16 text-center">Kép</th>
                      <th className="py-3 px-2.5 sm:px-3 w-36 sm:w-40">Cikkszám</th>
                      <th className="py-3 px-2.5 sm:px-3 w-auto min-w-[180px]">Megnevezés</th>
                      <th className="py-3 px-2.5 sm:px-3 w-32 sm:w-36">Gyári Kód</th>
                      <th className="py-3 px-2.5 sm:px-3 w-36 sm:w-40">Kategória</th>
                      {hasAnyConnectorComponent && (
                        <th className="py-3 px-2 sm:px-3 w-20 sm:w-24 text-center">Pozíció</th>
                      )}
                      <th className="py-3 px-2 sm:px-3 w-36 sm:w-40 text-center">Beépülő db</th>
                      <th className="py-3 px-2.5 sm:px-3 w-24 sm:w-28 text-center">Készlet</th>
                      {canEdit && <th className="py-3 px-2 sm:px-2.5 w-16 sm:w-20 text-center">Művelet</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100 bg-white text-[#211E1B]">
                    {filteredResolvedComponents.map(({ id: cId, product: cp, isRegistered, quantity }) => {
                      const hasImage = cp.images && cp.images.length > 0;
                      const thumb = hasImage ? cp.images[0] : null;

                      return (
                        <tr
                          key={cId}
                          className="group hover:bg-emerald-50/70 transition-colors"
                        >
                          {/* Kép */}
                          <td
                            className="py-3 px-2 sm:px-3 text-center cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(cp)}
                          >
                            <div className="w-12 h-12 rounded-lg border border-emerald-200 bg-[#F8F9FA] overflow-hidden flex items-center justify-center mx-auto shrink-0 shadow-2xs">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={cp.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://placehold.co/80x80/3A5D6B/white?text=?';
                                  }}
                                />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </td>

                          {/* Cikkszám */}
                          <td
                            className="py-3 px-2.5 sm:px-3 font-mono font-bold text-sm text-emerald-800 break-words break-all leading-tight cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(cp)}
                          >
                            <span className="group-hover:text-emerald-950 font-black transition-colors">
                              {cp.productId}
                            </span>
                          </td>

                          {/* Megnevezés */}
                          <td
                            className="py-3 px-2.5 sm:px-3 cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(cp)}
                          >
                            <div className="font-bold text-sm text-[#211E1B] group-hover:text-emerald-950 leading-snug break-words">
                              {cp.name}
                            </div>
                            {!isRegistered && (
                              <span className="inline-block text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5">
                                Külön adatlap még nincs rögzítve
                              </span>
                            )}
                          </td>

                          {/* Gyári Kód */}
                          <td
                            className="py-3 px-2.5 sm:px-3 cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(cp)}
                          >
                            {cp.factoryCode ? (
                              <span className="font-mono font-bold text-xs text-[#211E1B] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block break-all">
                                {cp.factoryCode}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>

                          {/* Kategória */}
                          <td
                            className="py-3 px-2.5 sm:px-3 text-xs leading-tight cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(cp)}
                          >
                            <div className="font-semibold text-emerald-900 break-words">
                              {cp.category || 'Alkatrész'}
                            </div>
                            {cp.manufacturer && (
                              <div className="text-gray-500 font-medium break-words mt-0.5">
                                {cp.manufacturer}
                              </div>
                            )}
                          </td>

                          {/* Pozíció (ha van konnektor a beépülő alkatrészek között) */}
                          {hasAnyConnectorComponent && (
                            <td
                              className="py-3 px-2 sm:px-3 text-center cursor-pointer"
                              onClick={() => onSelectProduct && onSelectProduct(cp)}
                            >
                              {isConnectorCategory(cp.category) && cp.positionsCount !== undefined && cp.positionsCount !== null ? (
                                <span className="font-mono font-black text-xs px-2.5 py-1 rounded-full inline-block bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs">
                                  {cp.positionsCount}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 font-medium">—</span>
                              )}
                            </td>
                          )}

                          {/* Beépülő mennyiség (db) megjelenítése és szerkesztése */}
                          <td
                            className="py-3 px-2 sm:px-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {editingPartQuantityId === cId ? (
                              <div className="inline-flex items-center gap-1 bg-emerald-50 p-1 rounded-xl border-2 border-emerald-400 shadow-xs">
                                <input
                                  type="number"
                                  min={1}
                                  value={editPartQuantityValue}
                                  onChange={(e) => setEditPartQuantityValue(Math.max(1, parseInt(e.target.value) || 1))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdatePartQuantity(cId, editPartQuantityValue);
                                    } else if (e.key === 'Escape') {
                                      setEditingPartQuantityId(null);
                                    }
                                  }}
                                  className="w-14 text-center font-mono font-black text-xs bg-white border border-emerald-300 rounded-lg py-1 px-1 focus:outline-emerald-600"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  disabled={isUpdatingPartQuantity}
                                  onClick={() => handleUpdatePartQuantity(cId, editPartQuantityValue)}
                                  className="p-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-2xs transition-colors"
                                  title="Mentés"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPartQuantityId(null)}
                                  className="p-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 cursor-pointer transition-colors"
                                  title="Mégse"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePartQuantity(cId, Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1 || isUpdatingPartQuantity}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-900 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border border-gray-200"
                                    title="Darabszám csökkentése (-1)"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                )}

                                <span
                                  onClick={() => {
                                    if (canEdit) {
                                      setEditingPartQuantityId(cId);
                                      setEditPartQuantityValue(quantity);
                                    }
                                  }}
                                  className={`font-mono font-black text-xs px-2.5 py-1 rounded-full border transition-all ${
                                    canEdit
                                      ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-emerald-300 cursor-pointer shadow-2xs'
                                      : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                  }`}
                                  title={canEdit ? 'Kattintson a szerkesztéshez' : `Beépülő darabszám: ${quantity} db`}
                                >
                                  {quantity} db
                                </span>

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePartQuantity(cId, quantity + 1)}
                                    disabled={isUpdatingPartQuantity}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-900 transition-colors cursor-pointer border border-gray-200"
                                    title="Darabszám növelése (+1)"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                )}

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPartQuantityId(cId);
                                      setEditPartQuantityValue(quantity);
                                    }}
                                    className="p-1 rounded-lg text-gray-400 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer ml-0.5"
                                    title="Darabszám közvetlen szerkesztése"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Készlet */}
                          <td
                            className="py-3 px-2.5 sm:px-3 text-center cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(cp)}
                          >
                            {(() => {
                              const stock = getProductStock(cp, cId);
                              return (
                                <span
                                  className={`font-mono text-xs px-2.5 py-1 rounded-full inline-block border ${
                                    stock > 0
                                      ? 'font-bold bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : 'font-black bg-red-50 text-red-700 border-red-300'
                                  }`}
                                  title={`Raktárkészlet: ${stock} db`}
                                >
                                  {stock} db
                                </span>
                              );
                            })()}
                          </td>

                          {/* Törlés művelet */}
                          {canEdit && (
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePart(cId);
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                title={`Alkatrész leválasztása: ${cId}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 2. Mobile Card View (Screens < md) */}
              <div className="md:hidden divide-y divide-emerald-100 border border-emerald-200 rounded-xl overflow-hidden bg-white">
                {filteredResolvedComponents.map(({ id: cId, product: cp, quantity }) => {
                  const hasImage = cp.images && cp.images.length > 0;
                  const thumb = hasImage ? cp.images[0] : null;

                  return (
                    <div
                      key={cId}
                      className="p-3.5 hover:bg-emerald-50/70 active:bg-emerald-100/60 cursor-pointer flex flex-col gap-2.5 transition-colors"
                      onClick={() => onSelectProduct && onSelectProduct(cp)}
                      title={`${cp.name} (${cp.productId}) adatlapjának megnyitása`}
                    >
                      <div className="flex gap-3 items-start">
                        <div className="w-14 h-14 rounded-lg border border-emerald-200 bg-[#F8F9FA] overflow-hidden flex items-center justify-center shrink-0">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={cp.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://placehold.co/80x80/3A5D6B/white?text=?';
                              }}
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-mono font-bold text-sm text-emerald-800 break-all">
                              {cp.productId}
                            </span>
                            {(() => {
                              const stock = getProductStock(cp, cId);
                              return (
                                <span
                                  className={`font-mono text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                                    stock > 0
                                      ? 'font-bold bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : 'font-black bg-red-50 text-red-700 border-red-300'
                                  }`}
                                  title={`Raktárkészlet: ${stock} db`}
                                >
                                  {stock} db
                                </span>
                              );
                            })()}
                          </div>

                          <div className="font-bold text-xs sm:text-sm text-[#211E1B] leading-tight break-words mb-1">
                            {cp.name}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            {cp.factoryCode && (
                              <span className="font-mono font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-emerald-900">
                                {cp.factoryCode}
                              </span>
                            )}
                            {cp.category && (
                              <span className="text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                {cp.category}
                              </span>
                            )}
                            {isConnectorCategory(cp.category) && cp.positionsCount !== undefined && cp.positionsCount !== null && (
                              <span className="font-mono font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded" title="Pozíciók száma">
                                {cp.positionsCount}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1 self-center">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePart(cId);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Leválasztás"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <ChevronRight className="w-5 h-5 text-emerald-700" />
                        </div>
                      </div>

                      {/* Beépülő alkatrész mennyiség (db) mobilon */}
                      <div
                        className="flex items-center justify-between pt-2 border-t border-emerald-100 text-xs bg-emerald-50/50 -mx-3.5 -mb-3.5 px-3.5 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="font-bold text-emerald-950">Beépülő alkatrész darabszáma:</span>
                        {editingPartQuantityId === cId ? (
                          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-emerald-300">
                            <input
                              type="number"
                              min={1}
                              value={editPartQuantityValue}
                              onChange={(e) => setEditPartQuantityValue(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-14 text-center font-mono font-black text-xs bg-gray-50 border border-emerald-300 rounded px-1 py-0.5"
                              autoFocus
                            />
                            <button
                              type="button"
                              disabled={isUpdatingPartQuantity}
                              onClick={() => handleUpdatePartQuantity(cId, editPartQuantityValue)}
                              className="p-1 rounded bg-emerald-700 text-white cursor-pointer"
                              title="Mentés"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPartQuantityId(null)}
                              className="p-1 rounded bg-gray-200 text-gray-700 cursor-pointer"
                              title="Mégse"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleUpdatePartQuantity(cId, Math.max(1, quantity - 1))}
                                disabled={quantity <= 1 || isUpdatingPartQuantity}
                                className="w-6 h-6 rounded flex items-center justify-center bg-white border border-gray-200 text-gray-700 disabled:opacity-30 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                            )}

                            <span
                              onClick={() => {
                                if (canEdit) {
                                  setEditingPartQuantityId(cId);
                                  setEditPartQuantityValue(quantity);
                                }
                              }}
                              className={`font-mono font-black text-xs px-2.5 py-0.5 rounded-full border ${
                                canEdit ? 'bg-emerald-100 text-emerald-950 border-emerald-300 cursor-pointer' : 'bg-white text-emerald-900 border-emerald-200'
                              }`}
                            >
                              {quantity} db
                            </span>

                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleUpdatePartQuantity(cId, quantity + 1)}
                                disabled={isUpdatingPartQuantity}
                                className="w-6 h-6 rounded flex items-center justify-center bg-white border border-gray-200 text-gray-700 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            )}

                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPartQuantityId(cId);
                                  setEditPartQuantityValue(quantity);
                                }}
                                className="p-1 text-gray-500 hover:text-emerald-800 cursor-pointer ml-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 2. TERMÉK <-> MÉRŐDOBOZ KAPCSOLATOK (Narancssárga és árnyalatai)          */}
      {/* Csak akkor jelenik meg a kártyája, ha van rögzített kapcsolat              */}
      {/* ========================================================================= */}
      {uniqueMeterBoxIds.length > 0 && (
        <section className="bg-white rounded-2xl border-2 border-orange-300 shadow-sm overflow-hidden space-y-0">
          {/* Címsor: Narancssárga és árnyalatai */}
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-orange-500/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-xs shrink-0">
                <Gauge className="w-6 h-6 text-orange-200" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    Termék&lt;-&gt;Mérődoboz
                  </h2>
                  <span className="bg-orange-950/40 text-orange-100 border border-orange-300/40 px-3 py-0.5 rounded-full text-xs sm:text-sm font-extrabold whitespace-nowrap">
                    {uniqueMeterBoxIds.length} db kapcsolat
                  </span>
                  {isMeterBoxRelatedCategory(product.category) && (
                    <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      Kategória: {product.category}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-orange-100/90 mt-0.5">
                  Kapcsolatok a <strong>Gyártandó termék</strong> és <strong>Mérődoboz</strong> kategóriájú elemek között ({product.productId})
                </p>
              </div>
            </div>

            {/* Quick Actions in Header */}
            {canEdit && (
              <div className="flex items-center gap-2">
                {onNavigateToDataImport && (
                  <button
                    type="button"
                    onClick={() => onNavigateToDataImport('meterboxes')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer border border-white/25"
                    title="Termék <-> Mérődoboz CSV feltöltése az Adatfeltöltés központban"
                  >
                    <UploadCloud className="w-4 h-4 text-orange-200" />
                    <span className="hidden sm:inline">CSV Feltöltés</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setNewMeterBoxIdInput('');
                    setShowAddMeterBoxModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-orange-950 hover:bg-orange-50 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4 text-orange-700" />
                  <span>+ Kapcsolat hozzáadása</span>
                </button>
              </div>
            )}
          </div>

          {/* Action feedback message */}
          {meterBoxActionMessage && (
            <div className="bg-orange-50 border-b border-orange-200 text-orange-950 px-4 py-2.5 text-sm font-bold flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-orange-600" />
                <span>{meterBoxActionMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setMeterBoxActionMessage(null)}
                className="text-orange-700 hover:text-orange-950 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search filter if there are several connections */}
          {uniqueMeterBoxIds.length > 3 && (
            <div className="p-3 sm:p-4 bg-orange-50/50 border-b border-orange-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-orange-700 shrink-0" />
              <input
                type="text"
                value={meterBoxSearchTerm}
                onChange={(e) => setMeterBoxSearchTerm(e.target.value)}
                placeholder="Keresés a csatolt mérődobozok / termékek között (ID, név, gyári kód)..."
                className="w-full text-xs sm:text-sm bg-white border border-orange-200 rounded-lg px-3 py-1.5 focus:outline-orange-600 font-medium"
              />
              {meterBoxSearchTerm && (
                <button
                  type="button"
                  onClick={() => setMeterBoxSearchTerm('')}
                  className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 font-bold cursor-pointer"
                >
                  Törlés
                </button>
              )}
            </div>
          )}

          {/* Body: MeterBox List */}
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {/* 1. Desktop Table View (Screens >= md) */}
              <div className="hidden md:block overflow-x-auto border border-orange-200 rounded-xl shadow-2xs">
                <table className="w-full text-left border-collapse table-fixed min-w-[720px]">
                  <thead>
                    <tr className="bg-orange-50 text-orange-950 text-xs font-bold uppercase tracking-wider select-none border-b-2 border-orange-200">
                      <th className="py-3 px-2 sm:px-3 w-14 sm:w-16 text-center">Kép</th>
                      <th className="py-3 px-2.5 sm:px-3 w-36 sm:w-40">Cikkszám</th>
                      <th className="py-3 px-2.5 sm:px-3 w-auto min-w-[180px]">Megnevezés</th>
                      <th className="py-3 px-2.5 sm:px-3 w-32 sm:w-36">Gyári Kód</th>
                      <th className="py-3 px-2.5 sm:px-3 w-36 sm:w-40">Kategória</th>
                      <th className="py-3 px-2 sm:px-3 w-36 sm:w-40 text-center">Kapcsolódó db</th>
                      <th className="py-3 px-2.5 sm:px-3 w-24 sm:w-28 text-center">Készlet</th>
                      {canEdit && <th className="py-3 px-2 sm:px-2.5 w-16 sm:w-20 text-center">Művelet</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100 bg-white text-[#211E1B]">
                    {filteredResolvedMeterBoxes.map(({ id: mId, product: mp, isRegistered, quantity }) => {
                      const hasImage = mp.images && mp.images.length > 0;
                      const thumb = hasImage ? mp.images[0] : null;

                      return (
                        <tr
                          key={mId}
                          className="group hover:bg-orange-50/70 transition-colors"
                        >
                          {/* Kép */}
                          <td
                            className="py-3 px-2 sm:px-3 text-center cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(mp)}
                          >
                            <div className="w-12 h-12 rounded-lg border border-orange-200 bg-[#F8F9FA] overflow-hidden flex items-center justify-center mx-auto shrink-0 shadow-2xs">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={mp.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://placehold.co/80x80/EA580C/white?text=MD';
                                  }}
                                />
                              ) : (
                                <Gauge className="w-5 h-5 text-orange-400" />
                              )}
                            </div>
                          </td>

                          {/* Cikkszám */}
                          <td
                            className="py-3 px-2.5 sm:px-3 font-mono font-bold text-sm text-orange-800 break-words break-all leading-tight cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(mp)}
                          >
                            <span className="group-hover:text-orange-950 font-black transition-colors">
                              {mp.productId}
                            </span>
                          </td>

                          {/* Megnevezés */}
                          <td
                            className="py-3 px-2.5 sm:px-3 cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(mp)}
                          >
                            <div className="font-bold text-sm text-[#211E1B] group-hover:text-orange-950 leading-snug break-words">
                              {mp.name}
                            </div>
                            {!isRegistered && (
                              <span className="inline-block text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5">
                                Külön adatlap még nincs rögzítve
                              </span>
                            )}
                          </td>

                          {/* Gyári Kód */}
                          <td
                            className="py-3 px-2.5 sm:px-3 cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(mp)}
                          >
                            {mp.factoryCode ? (
                              <span className="font-mono font-bold text-xs text-[#211E1B] bg-orange-50 px-2 py-0.5 rounded border border-orange-200 inline-block break-all">
                                {mp.factoryCode}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>

                          {/* Kategória */}
                          <td
                            className="py-3 px-2.5 sm:px-3 text-xs leading-tight cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(mp)}
                          >
                            <div className="font-semibold text-orange-950 break-words">
                              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-200 font-bold">
                                {mp.category || 'Mérődoboz'}
                              </span>
                            </div>
                            {mp.manufacturer && (
                              <div className="text-gray-500 font-medium break-words mt-1">
                                {mp.manufacturer}
                              </div>
                            )}
                          </td>

                          {/* Kapcsolódó darabszám (db) megjelenítése és szerkesztése */}
                          <td
                            className="py-3 px-2 sm:px-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {editingMeterBoxQuantityId === mId ? (
                              <div className="inline-flex items-center gap-1 bg-orange-50 p-1 rounded-xl border-2 border-orange-400 shadow-xs">
                                <input
                                  type="number"
                                  min={1}
                                  value={editMeterBoxQuantityValue}
                                  onChange={(e) => setEditMeterBoxQuantityValue(Math.max(1, parseInt(e.target.value) || 1))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateMeterBoxQuantity(mId, editMeterBoxQuantityValue);
                                    } else if (e.key === 'Escape') {
                                      setEditingMeterBoxQuantityId(null);
                                    }
                                  }}
                                  className="w-14 text-center font-mono font-black text-xs bg-white border border-orange-300 rounded-lg py-1 px-1 focus:outline-orange-600"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  disabled={isUpdatingMeterBoxQuantity}
                                  onClick={() => handleUpdateMeterBoxQuantity(mId, editMeterBoxQuantityValue)}
                                  className="p-1 rounded-lg bg-orange-700 hover:bg-orange-800 text-white cursor-pointer shadow-2xs transition-colors"
                                  title="Mentés"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingMeterBoxQuantityId(null)}
                                  className="p-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 cursor-pointer transition-colors"
                                  title="Mégse"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateMeterBoxQuantity(mId, Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1 || isUpdatingMeterBoxQuantity}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border border-gray-200"
                                    title="Darabszám csökkentése (-1)"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                )}

                                <span
                                  onClick={() => {
                                    if (canEdit) {
                                      setEditingMeterBoxQuantityId(mId);
                                      setEditMeterBoxQuantityValue(quantity);
                                    }
                                  }}
                                  className={`font-mono font-black text-xs px-2.5 py-1 rounded-full border transition-all ${
                                    canEdit
                                      ? 'bg-orange-100 hover:bg-orange-200 text-orange-950 border-orange-300 cursor-pointer shadow-2xs'
                                      : 'bg-orange-50 text-orange-900 border-orange-200'
                                  }`}
                                  title={canEdit ? 'Kattintson a szerkesztéshez' : `Kapcsolódó darabszám: ${quantity} db`}
                                >
                                  {quantity} db
                                </span>

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateMeterBoxQuantity(mId, quantity + 1)}
                                    disabled={isUpdatingMeterBoxQuantity}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 transition-colors cursor-pointer border border-gray-200"
                                    title="Darabszám növelése (+1)"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                )}

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMeterBoxQuantityId(mId);
                                      setEditMeterBoxQuantityValue(quantity);
                                    }}
                                    className="p-1 rounded-lg text-gray-400 hover:text-orange-800 hover:bg-orange-50 transition-colors cursor-pointer ml-0.5"
                                    title="Darabszám közvetlen szerkesztése"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Készlet */}
                          <td
                            className="py-3 px-2.5 sm:px-3 text-center cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(mp)}
                          >
                            {(() => {
                              const stock = getProductStock(mp, mId);
                              return (
                                <span
                                  className={`font-mono text-xs px-2.5 py-1 rounded-full inline-block border ${
                                    stock > 0
                                      ? 'font-bold bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : 'font-black bg-red-50 text-red-700 border-red-300'
                                  }`}
                                  title={`Raktárkészlet: ${stock} db`}
                                >
                                  {stock} db
                                </span>
                              );
                            })()}
                          </td>

                          {/* Törlés művelet */}
                          {canEdit && (
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveMeterBox(mId);
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                title={`Kapcsolat eltávolítása: ${mId}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 2. Mobile Card View (Screens < md) */}
              <div className="md:hidden divide-y divide-orange-100 border border-orange-200 rounded-xl overflow-hidden bg-white">
                {filteredResolvedMeterBoxes.map(({ id: mId, product: mp, quantity }) => {
                  const hasImage = mp.images && mp.images.length > 0;
                  const thumb = hasImage ? mp.images[0] : null;

                  return (
                    <div
                      key={mId}
                      className="p-3.5 hover:bg-orange-50/70 active:bg-orange-100/60 cursor-pointer flex gap-3 items-start transition-colors"
                      onClick={() => onSelectProduct && onSelectProduct(mp)}
                      title={`${mp.name} (${mp.productId}) adatlapjának megnyitása`}
                    >
                      <div className="w-14 h-14 rounded-lg border border-orange-200 bg-[#F8F9FA] overflow-hidden flex items-center justify-center shrink-0">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={mp.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://placehold.co/80x80/EA580C/white?text=MD';
                            }}
                          />
                        ) : (
                          <Gauge className="w-5 h-5 text-orange-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-mono font-bold text-sm text-orange-800 break-all">
                            {mp.productId}
                          </span>
                          {(() => {
                            const stock = getProductStock(mp, mId);
                            return (
                              <span
                                className={`font-mono text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                                  stock > 0
                                    ? 'font-bold bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'font-black bg-red-50 text-red-700 border-red-300'
                                }`}
                                title={`Raktárkészlet: ${stock} db`}
                              >
                                {stock} db
                              </span>
                            );
                          })()}
                        </div>

                        <div className="font-bold text-xs sm:text-sm text-[#211E1B] leading-tight break-words mb-1">
                          {mp.name}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] mb-1.5">
                          {mp.category && (
                            <span className="font-bold text-orange-900 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded">
                              {mp.category}
                            </span>
                          )}
                          {mp.factoryCode && (
                            <span className="font-mono font-semibold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                              {mp.factoryCode}
                            </span>
                          )}
                        </div>

                        {/* Mobile Darabszám Stepper */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-orange-100" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[11px] font-bold text-orange-900/80">Kapcsolódó:</span>
                          {canEdit ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateMeterBoxQuantity(mId, Math.max(1, quantity - 1))}
                                disabled={quantity <= 1 || isUpdatingMeterBoxQuantity}
                                className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 disabled:opacity-30 disabled:pointer-events-none transition-colors border border-gray-200"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono font-black text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-950 border border-orange-300">
                                {quantity} db
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateMeterBoxQuantity(mId, quantity + 1)}
                                disabled={isUpdatingMeterBoxQuantity}
                                className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 transition-colors border border-gray-200"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono font-black text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-900 border border-orange-200">
                              {quantity} db
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 self-center">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMeterBox(mId);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Leválasztás"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight className="w-5 h-5 text-orange-700" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 3. KONNEKTOR <-> SARU KAPCSOLATOK (Narancssárga és árnyalatai)           */}
      {/* Csak akkor jelenik meg a kártyája, ha van rögzített kapcsolat              */}
      {/* ========================================================================= */}
      {uniqueConnectorTerminalIds.length > 0 && (
        <section className="bg-white rounded-2xl border-2 border-orange-300 shadow-sm overflow-hidden space-y-0">
          {/* Címsor: Narancssárga és árnyalatai */}
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-orange-500/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-xs shrink-0">
                <Plug className="w-6 h-6 text-orange-200" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    Konnektor&lt;-&gt;Saru
                  </h2>
                  <span className="bg-orange-950/40 text-orange-100 border border-orange-300/40 px-3 py-0.5 rounded-full text-xs sm:text-sm font-extrabold whitespace-nowrap">
                    {uniqueConnectorTerminalIds.length} db kapcsolat
                  </span>
                  {isConnectorTerminalRelatedCategory(product.category) && (
                    <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      Kategória: {product.category}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-orange-100/90 mt-0.5">
                  Kapcsolatok a <strong>Konnektor</strong> és <strong>Saru</strong> kategóriájú elemek között ({product.productId})
                </p>
              </div>
            </div>

            {/* Quick Actions in Header */}
            {canEdit && (
              <div className="flex items-center gap-2">
                {onNavigateToDataImport && (
                  <button
                    type="button"
                    onClick={() => onNavigateToDataImport('connector-terminals')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer border border-white/25"
                    title="Konnektor <-> Saru CSV feltöltése az Adatfeltöltés központban"
                  >
                    <UploadCloud className="w-4 h-4 text-orange-200" />
                    <span className="hidden sm:inline">CSV Feltöltés</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setNewConnectorTerminalIdInput('');
                    setShowAddConnectorTerminalModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-orange-950 hover:bg-orange-50 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4 text-orange-700" />
                  <span>+ Kapcsolat hozzáadása</span>
                </button>
              </div>
            )}
          </div>

          {/* Action feedback message */}
          {connectorTerminalActionMessage && (
            <div className="bg-orange-50 border-b border-orange-200 text-orange-950 px-4 py-2.5 text-sm font-bold flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-orange-600" />
                <span>{connectorTerminalActionMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setConnectorTerminalActionMessage(null)}
                className="text-orange-700 hover:text-orange-950 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search filter if there are several connections */}
          {uniqueConnectorTerminalIds.length > 3 && (
            <div className="p-3 sm:p-4 bg-orange-50/50 border-b border-orange-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-orange-700 shrink-0" />
              <input
                type="text"
                value={connectorTerminalSearchTerm}
                onChange={(e) => setConnectorTerminalSearchTerm(e.target.value)}
                placeholder="Keresés a csatolt konnektorok / saruk között (ID, név, gyári kód)..."
                className="w-full text-xs sm:text-sm bg-white border border-orange-200 rounded-lg px-3 py-1.5 focus:outline-orange-600 font-medium"
              />
              {connectorTerminalSearchTerm && (
                <button
                  type="button"
                  onClick={() => setConnectorTerminalSearchTerm('')}
                  className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 font-bold cursor-pointer"
                >
                  Törlés
                </button>
              )}
            </div>
          )}

          {/* Body: Connector-Terminal List */}
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {/* 1. Desktop Table View (Screens >= md) */}
              <div className="hidden md:block overflow-x-auto border border-orange-200 rounded-xl shadow-2xs">
                <table className="w-full text-left border-collapse table-fixed min-w-[760px]">
                  <thead>
                    <tr className="bg-orange-50 text-orange-950 text-xs font-bold uppercase tracking-wider select-none border-b-2 border-orange-200">
                      <th className="py-3 px-2 sm:px-3 w-14 sm:w-16 text-center">Kép</th>
                      <th className="py-3 px-2.5 sm:px-3 w-36 sm:w-40">Cikkszám</th>
                      <th className="py-3 px-2.5 sm:px-3 w-auto min-w-[180px]">Megnevezés</th>
                      <th className="py-3 px-2.5 sm:px-3 w-32 sm:w-36">Gyári Kód</th>
                      <th className="py-3 px-2.5 sm:px-3 w-32 sm:w-36">Kategória</th>
                      {hasAnyConnectorInConnectorTerminals && (
                        <th className="py-3 px-2 sm:px-3 w-20 sm:w-24 text-center">Pozíció</th>
                      )}
                      <th className="py-3 px-2 sm:px-3 w-36 sm:w-40 text-center">Kapcsolódó db</th>
                      <th className="py-3 px-2.5 sm:px-3 w-20 sm:w-24 text-center">Készlet</th>
                      {canEdit && <th className="py-3 px-2 sm:px-2.5 w-16 sm:w-20 text-center">Művelet</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100 bg-white text-[#211E1B]">
                    {filteredResolvedConnectorTerminals.map(({ id: ctId, product: ctp, isRegistered, quantity }) => {
                      const hasImage = ctp.images && ctp.images.length > 0;
                      const thumb = hasImage ? ctp.images[0] : null;

                      return (
                        <tr
                          key={ctId}
                          className="group hover:bg-orange-50/70 transition-colors"
                        >
                          {/* Kép */}
                          <td
                            className="py-3 px-2 sm:px-3 text-center cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(ctp)}
                          >
                            <div className="w-12 h-12 rounded-lg border border-orange-200 bg-[#F8F9FA] overflow-hidden flex items-center justify-center mx-auto shrink-0 shadow-2xs">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={ctp.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://placehold.co/80x80/EA580C/white?text=CS';
                                  }}
                                />
                              ) : (
                                <Plug className="w-5 h-5 text-orange-400" />
                              )}
                            </div>
                          </td>

                          {/* Cikkszám */}
                          <td
                            className="py-3 px-2.5 sm:px-3 font-mono font-bold text-sm text-orange-800 break-words break-all leading-tight cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(ctp)}
                          >
                            <span className="group-hover:text-orange-950 font-black transition-colors">
                              {ctp.productId}
                            </span>
                          </td>

                          {/* Megnevezés */}
                          <td
                            className="py-3 px-2.5 sm:px-3 cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(ctp)}
                          >
                            <div className="font-bold text-sm text-[#211E1B] group-hover:text-orange-950 leading-snug break-words">
                              {ctp.name}
                            </div>
                            {!isRegistered && (
                              <span className="inline-block text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5">
                                Külön adatlap még nincs rögzítve
                              </span>
                            )}
                          </td>

                          {/* Gyári Kód */}
                          <td
                            className="py-3 px-2.5 sm:px-3 cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(ctp)}
                          >
                            {ctp.factoryCode ? (
                              <span className="font-mono font-bold text-xs text-[#211E1B] bg-orange-50 px-2 py-0.5 rounded border border-orange-200 inline-block break-all">
                                {ctp.factoryCode}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>

                          {/* Kategória */}
                          <td
                            className="py-3 px-2.5 sm:px-3 text-xs leading-tight cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(ctp)}
                          >
                            <div className="font-semibold text-orange-950 break-words">
                              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-200 font-bold">
                                {ctp.category || 'Konnektor/Saru'}
                              </span>
                            </div>
                            {ctp.manufacturer && (
                              <div className="text-gray-500 font-medium break-words mt-1">
                                {ctp.manufacturer}
                              </div>
                            )}
                          </td>

                          {/* Pozíció */}
                          {hasAnyConnectorInConnectorTerminals && (
                            <td
                              className="py-3 px-2 sm:px-3 text-center cursor-pointer"
                              onClick={() => onSelectProduct && onSelectProduct(ctp)}
                            >
                              {isConnectorCategory(ctp.category) && ctp.positionsCount !== undefined && ctp.positionsCount !== null ? (
                                <span className="font-mono font-black text-xs px-2.5 py-1 rounded-full inline-block bg-amber-100 text-orange-950 border border-orange-300 shadow-2xs">
                                  {ctp.positionsCount}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 font-medium">—</span>
                              )}
                            </td>
                          )}

                          {/* Kapcsolódó darabszám (db) megjelenítése és szerkesztése */}
                          <td
                            className="py-3 px-2 sm:px-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {editingConnectorTerminalQuantityId === ctId ? (
                              <div className="inline-flex items-center gap-1 bg-orange-50 p-1 rounded-xl border-2 border-orange-400 shadow-xs">
                                <input
                                  type="number"
                                  min={1}
                                  value={editConnectorTerminalQuantityValue}
                                  onChange={(e) => setEditConnectorTerminalQuantityValue(Math.max(1, parseInt(e.target.value) || 1))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateConnectorTerminalQuantity(ctId, editConnectorTerminalQuantityValue);
                                    } else if (e.key === 'Escape') {
                                      setEditingConnectorTerminalQuantityId(null);
                                    }
                                  }}
                                  className="w-14 text-center font-mono font-black text-xs bg-white border border-orange-300 rounded-lg py-1 px-1 focus:outline-orange-600"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  disabled={isUpdatingConnectorTerminalQuantity}
                                  onClick={() => handleUpdateConnectorTerminalQuantity(ctId, editConnectorTerminalQuantityValue)}
                                  className="p-1 rounded-lg bg-orange-700 hover:bg-orange-800 text-white cursor-pointer shadow-2xs transition-colors"
                                  title="Mentés"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingConnectorTerminalQuantityId(null)}
                                  className="p-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 cursor-pointer transition-colors"
                                  title="Mégse"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateConnectorTerminalQuantity(ctId, Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1 || isUpdatingConnectorTerminalQuantity}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border border-gray-200"
                                    title="Darabszám csökkentése (-1)"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                )}

                                <span
                                  onClick={() => {
                                    if (canEdit) {
                                      setEditingConnectorTerminalQuantityId(ctId);
                                      setEditConnectorTerminalQuantityValue(quantity);
                                    }
                                  }}
                                  className={`font-mono font-black text-xs px-2.5 py-1 rounded-full border transition-all ${
                                    canEdit
                                      ? 'bg-orange-100 hover:bg-orange-200 text-orange-950 border-orange-300 cursor-pointer shadow-2xs'
                                      : 'bg-orange-50 text-orange-900 border-orange-200'
                                  }`}
                                  title={canEdit ? 'Kattintson a szerkesztéshez' : `Kapcsolódó darabszám: ${quantity} db`}
                                >
                                  {quantity} db
                                </span>

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateConnectorTerminalQuantity(ctId, quantity + 1)}
                                    disabled={isUpdatingConnectorTerminalQuantity}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 transition-colors cursor-pointer border border-gray-200"
                                    title="Darabszám növelése (+1)"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                )}

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingConnectorTerminalQuantityId(ctId);
                                      setEditConnectorTerminalQuantityValue(quantity);
                                    }}
                                    className="p-1 rounded-lg text-gray-400 hover:text-orange-800 hover:bg-orange-50 transition-colors cursor-pointer ml-0.5"
                                    title="Darabszám közvetlen szerkesztése"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Készlet */}
                          <td
                            className="py-3 px-2.5 sm:px-3 text-center cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(ctp)}
                          >
                            {(() => {
                              const stock = getProductStock(ctp, ctId);
                              return (
                                <span
                                  className={`font-mono text-xs px-2.5 py-1 rounded-full inline-block border ${
                                    stock > 0
                                      ? 'font-bold bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : 'font-black bg-red-50 text-red-700 border-red-300'
                                  }`}
                                  title={`Raktárkészlet: ${stock} db`}
                                >
                                  {stock} db
                                </span>
                              );
                            })()}
                          </td>

                          {/* Törlés művelet */}
                          {canEdit && (
                            <td className="py-3 px-2 sm:px-2.5 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveConnectorTerminal(ctId);
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                title={`Kapcsolat eltávolítása: ${ctId}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 2. Mobile Card View (Screens < md) */}
              <div className="md:hidden divide-y divide-orange-100 border border-orange-200 rounded-xl overflow-hidden bg-white">
                {filteredResolvedConnectorTerminals.map(({ id: ctId, product: ctp, quantity }) => {
                  const hasImage = ctp.images && ctp.images.length > 0;
                  const thumb = hasImage ? ctp.images[0] : null;

                  return (
                    <div
                      key={ctId}
                      className="p-3.5 hover:bg-orange-50/70 active:bg-orange-100/60 cursor-pointer flex gap-3 items-start transition-colors"
                      onClick={() => onSelectProduct && onSelectProduct(ctp)}
                      title={`${ctp.name} (${ctp.productId}) adatlapjának megnyitása`}
                    >
                      <div className="w-14 h-14 rounded-lg border border-orange-200 bg-[#F8F9FA] overflow-hidden flex items-center justify-center shrink-0">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={ctp.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://placehold.co/80x80/EA580C/white?text=CS';
                            }}
                          />
                        ) : (
                          <Plug className="w-5 h-5 text-orange-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-mono font-bold text-sm text-orange-800 break-all">
                            {ctp.productId}
                          </span>
                          {(() => {
                            const stock = getProductStock(ctp, ctId);
                            return (
                              <span
                                className={`font-mono text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                                  stock > 0
                                    ? 'font-bold bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'font-black bg-red-50 text-red-700 border-red-300'
                                }`}
                                title={`Raktárkészlet: ${stock} db`}
                              >
                                {stock} db
                              </span>
                            );
                          })()}
                        </div>

                        <div className="font-bold text-xs sm:text-sm text-[#211E1B] leading-tight break-words mb-1">
                          {ctp.name}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] mb-1.5">
                          {ctp.category && (
                            <span className="font-bold text-orange-900 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded">
                              {ctp.category}
                            </span>
                          )}
                          {isConnectorCategory(ctp.category) && ctp.positionsCount !== undefined && ctp.positionsCount !== null && (
                            <span className="font-mono font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded" title="Pozíciók száma">
                              {ctp.positionsCount}
                            </span>
                          )}
                          {ctp.factoryCode && (
                            <span className="font-mono font-semibold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                              {ctp.factoryCode}
                            </span>
                          )}
                        </div>

                        {/* Mobile Darabszám Stepper */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-orange-100" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[11px] font-bold text-orange-900/80">Kapcsolódó:</span>
                          {canEdit ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateConnectorTerminalQuantity(ctId, Math.max(1, quantity - 1))}
                                disabled={quantity <= 1 || isUpdatingConnectorTerminalQuantity}
                                className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 disabled:opacity-30 disabled:pointer-events-none transition-colors border border-gray-200"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono font-black text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-950 border border-orange-300">
                                {quantity} db
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateConnectorTerminalQuantity(ctId, quantity + 1)}
                                disabled={isUpdatingConnectorTerminalQuantity}
                                className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 transition-colors border border-gray-200"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono font-black text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-900 border border-orange-200">
                              {quantity} db
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 self-center">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveConnectorTerminal(ctId);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Leválasztás"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight className="w-5 h-5 text-orange-700" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. ELLENPÁROK SZEKCIÓ (Citromsárga és árnyalatai)                          */}
      {/* Konnektor <-> Konnektor, Saru <-> Saru ellenpárok                          */}
      {/* Csak akkor jelenik meg a kártyája, ha van rögzített ellenpár kapcsolat      */}
      {/* ========================================================================= */}
      {uniqueMatingPairIds.length > 0 && (
        <section className="bg-white rounded-2xl border-2 sm:border-3 border-yellow-400 shadow-sm overflow-hidden space-y-0">
          {/* Címsor: Citromsárga és árnyalatai */}
          <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 text-yellow-950 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-yellow-500/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-900/15 flex items-center justify-center border border-yellow-900/20 shadow-xs shrink-0">
                <GitCompare className="w-6 h-6 text-yellow-950" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    Ellenpárok
                  </h2>
                  <span className="bg-yellow-950/20 text-yellow-950 border border-yellow-900/30 px-3 py-0.5 rounded-full text-xs sm:text-sm font-extrabold whitespace-nowrap">
                    {uniqueMatingPairIds.length} db ellenpár
                  </span>
                  {isMatingPairRelatedCategory(product.category) && (
                    <span className="bg-yellow-950/15 text-yellow-950 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-yellow-900/20">
                      Kategória: {product.category}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-yellow-950/90 mt-0.5 font-medium">
                  {(product.category || '').toLowerCase().includes('konnektor')
                    ? `Konnektor ↔ Konnektor ellenpárok és ellendarabok (${product.productId})`
                    : `Saru ↔ Saru ellenpárok és csatlakozó ellendarabok (${product.productId})`}
                </p>
              </div>
            </div>

            {/* Quick Actions in Header */}
            {canEdit && (
              <div className="flex items-center gap-2">
                {onNavigateToDataImport && (
                  <button
                    type="button"
                    onClick={() => onNavigateToDataImport('mating-pairs')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-yellow-950/15 hover:bg-yellow-950/25 text-yellow-950 text-xs sm:text-sm font-bold transition-colors cursor-pointer border border-yellow-900/20"
                    title="Ellenpárok CSV feltöltése az Adatfeltöltés központban"
                  >
                    <UploadCloud className="w-4 h-4 text-yellow-900" />
                    <span className="hidden sm:inline">CSV Feltöltés</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setNewMatingPairIdInput('');
                    setShowAddMatingPairModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-yellow-950 hover:bg-yellow-50 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer shadow-xs border border-yellow-400"
                >
                  <Plus className="w-4 h-4 text-yellow-900" />
                  <span>+ Ellenpár hozzáadása</span>
                </button>
              </div>
            )}
          </div>

          {/* Action feedback message */}
          {matingPairActionMessage && (
            <div className="bg-yellow-50 border-b border-yellow-300 text-yellow-950 px-4 py-2.5 text-sm font-bold flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-yellow-700" />
                <span>{matingPairActionMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setMatingPairActionMessage(null)}
                className="text-yellow-800 hover:text-yellow-950 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search filter if there are several connections */}
          {uniqueMatingPairIds.length > 3 && (
            <div className="p-3 sm:p-4 bg-yellow-50/50 border-b border-yellow-200 flex items-center gap-2">
              <Search className="w-4 h-4 text-yellow-800 shrink-0" />
              <input
                type="text"
                value={matingPairSearchTerm}
                onChange={(e) => setMatingPairSearchTerm(e.target.value)}
                placeholder="Keresés a csatolt ellenpárok között (ID, név, gyári kód)..."
                className="w-full text-xs sm:text-sm bg-white border border-yellow-300 rounded-lg px-3 py-1.5 focus:outline-yellow-600 font-medium text-yellow-950"
              />
              {matingPairSearchTerm && (
                <button
                  type="button"
                  onClick={() => setMatingPairSearchTerm('')}
                  className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 font-bold cursor-pointer"
                >
                  Törlés
                </button>
              )}
            </div>
          )}

          {/* Body: Mating Pair List */}
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {/* 1. Desktop Table View (Screens >= md) */}
              <div className="hidden md:block overflow-x-auto border border-yellow-300 rounded-xl shadow-2xs">
                <table className="w-full text-left border-collapse table-fixed min-w-[760px]">
                  <thead>
                    <tr className="bg-yellow-100/80 text-yellow-950 text-xs font-bold uppercase tracking-wider select-none border-b-2 border-yellow-300">
                      <th className="py-3 px-2 sm:px-3 w-14 sm:w-16 text-center">Kép</th>
                      <th className="py-3 px-2.5 sm:px-3 w-36 sm:w-40">Cikkszám</th>
                      <th className="py-3 px-2.5 sm:px-3 w-auto min-w-[180px]">Megnevezés</th>
                      <th className="py-3 px-2.5 sm:px-3 w-32 sm:w-36">Gyári Kód</th>
                      <th className="py-3 px-2.5 sm:px-3 w-32 sm:w-36">Kategória</th>
                      {hasAnyConnectorInMatingPairs && (
                        <th className="py-3 px-2 sm:px-3 w-20 sm:w-24 text-center">Pozíció</th>
                      )}
                      <th className="py-3 px-2 sm:px-3 w-36 sm:w-40 text-center">Kapcsolódó db</th>
                      <th className="py-3 px-2.5 sm:px-3 w-20 sm:w-24 text-center">Készlet</th>
                      {canEdit && <th className="py-3 px-2 sm:px-2.5 w-16 sm:w-20 text-center">Művelet</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-yellow-100 bg-white text-[#211E1B]">
                    {filteredResolvedMatingPairs.map(({ id: mId, product: mp, isRegistered, quantity }) => {
                      const hasImage = mp.images && mp.images.length > 0;
                      const thumb = hasImage ? mp.images[0] : null;

                      return (
                        <tr
                          key={mId}
                          className="hover:bg-yellow-50/60 transition-colors group"
                        >
                          {/* Kép oszlop */}
                          <td className="py-3 px-2 sm:px-3 text-center align-middle">
                            <div
                              className="w-12 h-12 rounded-lg border border-yellow-200 bg-[#F8F9FA] overflow-hidden flex items-center justify-center mx-auto cursor-pointer"
                              onClick={() => onSelectProduct && onSelectProduct(mp)}
                              title={
                                isRegistered
                                  ? `${mp.name} megtekintése`
                                  : 'Nem regisztrált termék'
                              }
                            >
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={mp.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://placehold.co/80x80/CA8A04/white?text=EP';
                                  }}
                                />
                              ) : (
                                <GitCompare className="w-5 h-5 text-yellow-600" />
                              )}
                            </div>
                          </td>

                          {/* Cikkszám */}
                          <td className="py-3 px-2.5 sm:px-3 font-mono font-bold text-sm text-yellow-950">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="cursor-pointer hover:underline text-yellow-900 group-hover:text-yellow-700"
                                onClick={() => onSelectProduct && onSelectProduct(mp)}
                                title="Kattintson az ellenpár adatlapjának megnyitásához"
                              >
                                {mp.productId}
                              </span>
                              {!isRegistered && (
                                <span
                                  className="text-[10px] font-sans font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300"
                                  title="Ez az azonosító kapcsolatként szerepel, de még nincs önálló törzslapja a raktárban"
                                >
                                  Külső ID
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Megnevezés */}
                          <td
                            className="py-3 px-2.5 sm:px-3 cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(mp)}
                          >
                            <div className="font-extrabold text-sm sm:text-base text-[#211E1B] group-hover:text-yellow-900 transition-colors leading-snug break-words">
                              {mp.name}
                            </div>
                            {mp.description && (
                              <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                {mp.description}
                              </div>
                            )}
                          </td>

                          {/* Gyári Kód */}
                          <td
                            className="py-3 px-2.5 sm:px-3 font-mono text-xs sm:text-sm text-gray-700 cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(mp)}
                          >
                            {mp.factoryCode ? (
                              <span className="bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200 font-semibold text-yellow-950">
                                {mp.factoryCode}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>

                          {/* Kategória */}
                          <td
                            className="py-3 px-2.5 sm:px-3 text-xs leading-tight cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(mp)}
                          >
                            <div className="font-semibold text-yellow-950 break-words">
                              <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-900 border border-yellow-300 font-bold">
                                {mp.category || 'Ellenpár'}
                              </span>
                            </div>
                            {mp.manufacturer && (
                              <div className="text-gray-500 font-medium break-words mt-1">
                                {mp.manufacturer}
                              </div>
                            )}
                          </td>

                          {/* Pozíció */}
                          {hasAnyConnectorInMatingPairs && (
                            <td
                              className="py-3 px-2 sm:px-3 text-center cursor-pointer"
                              onClick={() => onSelectProduct && onSelectProduct(mp)}
                            >
                              {isConnectorCategory(mp.category) && mp.positionsCount !== undefined && mp.positionsCount !== null ? (
                                <span className="font-mono font-black text-xs px-2.5 py-1 rounded-full inline-block bg-yellow-100 text-yellow-950 border border-yellow-300 shadow-2xs">
                                  {mp.positionsCount}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 font-medium">—</span>
                              )}
                            </td>
                          )}

                          {/* Kapcsolódó darabszám (db) megjelenítése és szerkesztése */}
                          <td
                            className="py-3 px-2 sm:px-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {editingMatingPairQuantityId === mId ? (
                              <div className="inline-flex items-center gap-1 bg-yellow-50 p-1 rounded-xl border-2 border-yellow-400 shadow-xs">
                                <input
                                  type="number"
                                  min={1}
                                  value={editMatingPairQuantityValue}
                                  onChange={(e) => setEditMatingPairQuantityValue(Math.max(1, parseInt(e.target.value) || 1))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateMatingPairQuantity(mId, editMatingPairQuantityValue);
                                    } else if (e.key === 'Escape') {
                                      setEditingMatingPairQuantityId(null);
                                    }
                                  }}
                                  className="w-14 text-center font-mono font-black text-xs bg-white border border-yellow-400 rounded-lg py-1 px-1 focus:outline-yellow-600"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  disabled={isUpdatingMatingPairQuantity}
                                  onClick={() => handleUpdateMatingPairQuantity(mId, editMatingPairQuantityValue)}
                                  className="p-1 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white cursor-pointer shadow-2xs transition-colors"
                                  title="Mentés"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingMatingPairQuantityId(null)}
                                  className="p-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 cursor-pointer transition-colors"
                                  title="Mégse"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateMatingPairQuantity(mId, Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1 || isUpdatingMatingPairQuantity}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-yellow-100 text-gray-700 hover:text-yellow-950 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border border-gray-200"
                                    title="Darabszám csökkentése (-1)"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                )}

                                <span
                                  onClick={() => {
                                    if (canEdit) {
                                      setEditingMatingPairQuantityId(mId);
                                      setEditMatingPairQuantityValue(quantity);
                                    }
                                  }}
                                  className={`font-mono font-black text-xs px-2.5 py-1 rounded-full border transition-all ${
                                    canEdit
                                      ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-950 border-yellow-300 cursor-pointer shadow-2xs'
                                      : 'bg-yellow-50 text-yellow-950 border-yellow-200'
                                  }`}
                                  title={canEdit ? 'Kattintson a szerkesztéshez' : `Kapcsolódó darabszám: ${quantity} db`}
                                >
                                  {quantity} db
                                </span>

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateMatingPairQuantity(mId, quantity + 1)}
                                    disabled={isUpdatingMatingPairQuantity}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-yellow-100 text-gray-700 hover:text-yellow-950 transition-colors cursor-pointer border border-gray-200"
                                    title="Darabszám növelése (+1)"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                )}

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMatingPairQuantityId(mId);
                                      setEditMatingPairQuantityValue(quantity);
                                    }}
                                    className="p-1 rounded-lg text-gray-400 hover:text-yellow-800 hover:bg-yellow-50 transition-colors cursor-pointer ml-0.5"
                                    title="Darabszám közvetlen szerkesztése"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Készlet */}
                          <td
                            className="py-3 px-2.5 sm:px-3 text-center cursor-pointer"
                            onClick={() => onSelectProduct && onSelectProduct(mp)}
                          >
                            {(() => {
                              const stock = getProductStock(mp, mId);
                              return (
                                <span
                                  className={`font-mono text-xs px-2.5 py-1 rounded-full inline-block border ${
                                    stock > 0
                                      ? 'font-bold bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : 'font-black bg-red-50 text-red-700 border-red-300'
                                  }`}
                                  title={`Raktárkészlet: ${stock} db`}
                                >
                                  {stock} db
                                </span>
                              );
                            })()}
                          </td>

                          {/* Törlés művelet */}
                          {canEdit && (
                            <td className="py-3 px-2 sm:px-2.5 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveMatingPair(mId);
                                }}
                                className="p-2 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center"
                                title={`Ellenpár kapcsolat (${mId}) leválasztása`}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 2. Mobile Card View (Screens < md) */}
              <div className="md:hidden divide-y divide-yellow-100 border border-yellow-300 rounded-xl overflow-hidden bg-white">
                {filteredResolvedMatingPairs.map(({ id: mId, product: mp, quantity }) => {
                  const hasImage = mp.images && mp.images.length > 0;
                  const thumb = hasImage ? mp.images[0] : null;

                  return (
                    <div
                      key={mId}
                      className="p-3.5 hover:bg-yellow-50/70 active:bg-yellow-100/60 cursor-pointer flex gap-3 items-start transition-colors"
                      onClick={() => onSelectProduct && onSelectProduct(mp)}
                      title={`${mp.name} (${mp.productId}) adatlapjának megnyitása`}
                    >
                      <div className="w-14 h-14 rounded-lg border border-yellow-300 bg-[#F8F9FA] overflow-hidden flex items-center justify-center shrink-0">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={mp.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://placehold.co/80x80/CA8A04/white?text=EP';
                            }}
                          />
                        ) : (
                          <GitCompare className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-mono font-bold text-sm text-yellow-900 break-all">
                            {mp.productId}
                          </span>
                          {(() => {
                            const stock = getProductStock(mp, mId);
                            return (
                              <span
                                className={`font-mono text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                                  stock > 0
                                    ? 'font-bold bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'font-black bg-red-50 text-red-700 border-red-300'
                                }`}
                                title={`Raktárkészlet: ${stock} db`}
                              >
                                {stock} db
                              </span>
                            );
                          })()}
                        </div>

                        <div className="font-bold text-xs sm:text-sm text-[#211E1B] leading-tight break-words mb-1">
                          {mp.name}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 mb-1.5">
                          {mp.category && (
                            <span className="bg-yellow-50 text-yellow-900 border border-yellow-200 px-1.5 py-0.5 rounded font-bold">
                              {mp.category}
                            </span>
                          )}
                          {isConnectorCategory(mp.category) && mp.positionsCount !== undefined && mp.positionsCount !== null && (
                            <span className="font-mono font-bold text-yellow-950 bg-yellow-100 border border-yellow-300 px-1.5 py-0.5 rounded" title="Pozíciók száma">
                              {mp.positionsCount}
                            </span>
                          )}
                          {mp.factoryCode && (
                            <span className="font-mono text-gray-600">
                              Kód: {mp.factoryCode}
                            </span>
                          )}
                        </div>

                        {/* Mobile Darabszám Stepper */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-yellow-100" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[11px] font-bold text-yellow-900/80">Kapcsolódó:</span>
                          {canEdit ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateMatingPairQuantity(mId, Math.max(1, quantity - 1))}
                                disabled={quantity <= 1 || isUpdatingMatingPairQuantity}
                                className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-yellow-100 text-gray-700 hover:text-yellow-900 disabled:opacity-30 disabled:pointer-events-none transition-colors border border-gray-200"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono font-black text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-950 border border-yellow-300">
                                {quantity} db
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateMatingPairQuantity(mId, quantity + 1)}
                                disabled={isUpdatingMatingPairQuantity}
                                className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-yellow-100 text-gray-700 hover:text-yellow-900 transition-colors border border-gray-200"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono font-black text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-900 border border-yellow-200">
                              {quantity} db
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 self-center">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMatingPair(mId);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Leválasztás"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight className="w-5 h-5 text-yellow-800" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 5. SARU ↔ SARUZÓFEJ SZEKCIÓ (Halvány narancssárga színvilág)               */}
      {/* Csak Saru és Saruzófej termékeknél, oda-vissza kapcsolattal               */}
      {/* ========================================================================= */}
      {isTerminalFejRelevant && (
        <section className="bg-white rounded-2xl border-2 sm:border-3 border-orange-300 shadow-sm overflow-hidden space-y-0">
          {/* Címsor: Halvány narancssárga színvilág */}
          <div className="bg-gradient-to-r from-amber-300 via-orange-300 to-amber-300 text-stone-900 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-orange-300/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-950/15 flex items-center justify-center border border-orange-900/20 shadow-xs shrink-0">
                <Wrench className="w-6 h-6 text-stone-900" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    {isFejCategory(product.category)
                      ? 'Kapcsolódó Saruk'
                      : 'Kapcsolódó Saruzófejek'}
                  </h2>
                  <span className="bg-orange-950/15 text-stone-900 border border-orange-900/20 px-3 py-0.5 rounded-full text-xs sm:text-sm font-extrabold whitespace-nowrap">
                    {resolvedTerminalFejek.length} db kapcsolat
                  </span>
                  {product.category && (
                    <span className="bg-orange-950/10 text-stone-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-orange-900/20">
                      Kategória: {product.category}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-stone-900/90 mt-0.5 font-medium">
                  {isFejCategory(product.category)
                    ? `Ehhez a saruzófejhez (${product.name || product.productId}) tartozó saruk a sarumagasság táblázat és kapcsolatok alapján`
                    : `Ehhez a saruhoz (${product.name || product.productId}) tartozó saruzófejek a sarumagasság táblázat és kapcsolatok alapján`}
                </p>
              </div>
            </div>

            {/* Quick Actions in Header */}
            {canEdit && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewTerminalFejIdInput('');
                    setShowAddTerminalFejModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-stone-900 hover:bg-orange-50 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer shadow-xs border border-orange-300"
                >
                  <Plus className="w-4 h-4 text-stone-900" />
                  <span>
                    {isFejCategory(product.category)
                      ? '+ Saru összekapcsolása'
                      : '+ Saruzófej összekapcsolása'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Action feedback message */}
          {terminalFejActionMessage && (
            <div className="bg-orange-50 border-b border-orange-200 text-stone-900 px-4 py-2.5 text-sm font-bold flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-orange-700" />
                <span>{terminalFejActionMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setTerminalFejActionMessage(null)}
                className="text-stone-700 hover:text-stone-900 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Search Bar inside Section */}
          {resolvedTerminalFejek.length > 0 && (
            <div className="p-4 sm:p-5 bg-orange-50/30 border-b border-orange-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-700/60" />
                  <input
                    type="text"
                    value={terminalFejSearchTerm}
                    onChange={(e) => setTerminalFejSearchTerm(e.target.value)}
                    placeholder={
                      isFejCategory(product.category)
                        ? 'Keresés a kapcsolódó saruk között (cikkszám, név, kód)...'
                        : 'Keresés a kapcsolódó saruzófejek között (cikkszám, név, kód)...'
                    }
                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-orange-300 rounded-xl focus:outline-hidden focus:border-orange-500 font-medium shadow-2xs"
                  />
                  {terminalFejSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setTerminalFejSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-xs font-bold text-orange-950/80">
                  Találatok: {filteredResolvedTerminalFejek.length} / {resolvedTerminalFejek.length} db
                </div>
              </div>
            </div>
          )}

          {/* Card Body */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* Empty State when no active connected items */}
            {resolvedTerminalFejek.length === 0 && (
              <div className="p-8 text-center bg-orange-50/20 rounded-xl border border-dashed border-orange-300">
                <Wrench className="w-10 h-10 text-orange-400 mx-auto mb-2" />
                <p className="text-base font-bold text-stone-900">
                  {isFejCategory(product.category)
                    ? 'Nincs aktív kapcsolódó saru'
                    : 'Nincs aktív kapcsolódó saruzófej'}
                </p>
                <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-md mx-auto">
                  {isFejCategory(product.category)
                    ? 'Ehhez a saruzófejhez jelenleg nincs aktív kapcsolódó saru, vagy a korábbi kapcsolatok le lettek választva.'
                    : 'Ehhez a saruhoz jelenleg nincs aktív kapcsolódó saruzófej, vagy a korábbi kapcsolatok le lettek választva.'}
                </p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewTerminalFejIdInput('');
                      setShowAddTerminalFejModal(true);
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs sm:text-sm shadow-xs cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {isFejCategory(product.category)
                        ? '+ Saru összekapcsolása'
                        : '+ Saruzófej összekapcsolása'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* 1. Desktop Table View */}
            {resolvedTerminalFejek.length > 0 && (
              <div className="hidden md:block overflow-x-auto border border-orange-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-orange-50/70 text-stone-900 border-b border-orange-200 font-black">
                      <th className="py-3 px-3 w-14 text-center">Fotó</th>
                      <th className="py-3 px-3">Termék ID / Cikkszám</th>
                      <th className="py-3 px-3">Megnevezés</th>
                      <th className="py-3 px-3">Kategória</th>
                      <th className="py-3 px-3">Raktári lokáció</th>
                      <th className="py-3 px-3 w-36 text-center">Kapcsolódó db</th>
                      <th className="py-3 px-3">Készlet</th>
                      <th className="py-3 px-3">Forrás</th>
                      <th className="py-3 px-3 text-right">Művelet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100 font-medium">
                    {filteredResolvedTerminalFejek.map((item) => {
                      const prod = item.relatedProduct;
                      const hasImage = prod && prod.images && prod.images.length > 0;
                      const thumb = hasImage ? prod.images[0] : null;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-orange-50/60 transition-colors cursor-pointer group"
                          onClick={() => {
                            if (prod && onSelectProduct) {
                              onSelectProduct(prod);
                            }
                          }}
                          title={prod ? `${prod.name} (${prod.productId}) adatlapjának megnyitása` : item.relatedProductId}
                        >
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="w-10 h-10 mx-auto rounded-lg border border-orange-200 bg-white overflow-hidden flex items-center justify-center">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={prod?.name || item.relatedProductId}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://placehold.co/80x80/EA580C/white?text=SF';
                                  }}
                                />
                              ) : (
                                <Wrench className="w-4 h-4 text-orange-600" />
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-orange-950">
                            <span>{prod ? prod.productId : item.relatedProductId}</span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-[#211E1B] group-hover:text-orange-950">
                            {prod ? prod.name : item.relatedProductId}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-stone-900 border border-orange-300">
                              {prod?.category || (isFejCategory(product.category) ? 'Saru' : 'Saruzófej')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-gray-700">
                            {(() => {
                              const positions = getProductPositions(prod, item.relatedProductId);
                              return positions.length > 0 ? (
                                <span className="font-bold text-stone-900">{positions.join(', ')}</span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              );
                            })()}
                          </td>

                          {/* Kapcsolódó darabszám (db) megjelenítése és szerkesztése */}
                          <td
                            className="py-2.5 px-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {editingTerminalFejQuantityId === item.relatedProductId ? (
                              <div className="inline-flex items-center gap-1 bg-orange-50 p-1 rounded-xl border-2 border-orange-400 shadow-xs">
                                <input
                                  type="number"
                                  min={1}
                                  value={editTerminalFejQuantityValue}
                                  onChange={(e) => setEditTerminalFejQuantityValue(Math.max(1, parseInt(e.target.value) || 1))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateTerminalFejQuantity(item.relatedProductId, editTerminalFejQuantityValue);
                                    } else if (e.key === 'Escape') {
                                      setEditingTerminalFejQuantityId(null);
                                    }
                                  }}
                                  className="w-14 text-center font-mono font-black text-xs bg-white border border-orange-300 rounded-lg py-1 px-1 focus:outline-orange-600"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  disabled={isUpdatingTerminalFejQuantity}
                                  onClick={() => handleUpdateTerminalFejQuantity(item.relatedProductId, editTerminalFejQuantityValue)}
                                  className="p-1 rounded-lg bg-orange-700 hover:bg-orange-800 text-white cursor-pointer shadow-2xs transition-colors"
                                  title="Mentés"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTerminalFejQuantityId(null)}
                                  className="p-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 cursor-pointer transition-colors"
                                  title="Mégse"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateTerminalFejQuantity(item.relatedProductId, Math.max(1, (item.quantity ?? 1) - 1))}
                                    disabled={(item.quantity ?? 1) <= 1 || isUpdatingTerminalFejQuantity}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border border-gray-200"
                                    title="Darabszám csökkentése (-1)"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                )}

                                <span
                                  onClick={() => {
                                    if (canEdit) {
                                      setEditingTerminalFejQuantityId(item.relatedProductId);
                                      setEditTerminalFejQuantityValue(item.quantity ?? 1);
                                    }
                                  }}
                                  className={`font-mono font-black text-xs px-2.5 py-1 rounded-full border transition-all ${
                                    canEdit
                                      ? 'bg-orange-100 hover:bg-orange-200 text-orange-950 border-orange-300 cursor-pointer shadow-2xs'
                                      : 'bg-orange-50 text-orange-900 border-orange-200'
                                  }`}
                                  title={canEdit ? 'Kattintson a szerkesztéshez' : `Kapcsolódó darabszám: ${item.quantity ?? 1} db`}
                                >
                                  {item.quantity ?? 1} db
                                </span>

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateTerminalFejQuantity(item.relatedProductId, (item.quantity ?? 1) + 1)}
                                    disabled={isUpdatingTerminalFejQuantity}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 transition-colors cursor-pointer border border-gray-200"
                                    title="Darabszám növelése (+1)"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                )}

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTerminalFejQuantityId(item.relatedProductId);
                                      setEditTerminalFejQuantityValue(item.quantity ?? 1);
                                    }}
                                    className="p-1 rounded-lg text-gray-400 hover:text-orange-800 hover:bg-orange-50 transition-colors cursor-pointer ml-0.5"
                                    title="Darabszám szerkesztése"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {(() => {
                              const stock = getProductStock(prod, item.relatedProductId);
                              return (
                                <span
                                  className={`font-mono text-xs px-2.5 py-1 rounded-full inline-block border ${
                                    stock > 0
                                      ? 'font-bold bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : 'font-black bg-red-50 text-red-700 border-red-300'
                                  }`}
                                  title={`Raktárkészlet: ${stock} db`}
                                >
                                  {stock} db
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-2.5 px-3">
                            {item.source === 'crimp_auto' ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-orange-100 text-orange-950 border border-orange-300 inline-flex items-center gap-1">
                                <span>Sarumagasság táblázatból</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-stone-100 text-stone-700 border border-stone-300 inline-flex items-center gap-1">
                                <span>Rögzített kapcsolat</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {prod && (
                                <button
                                  type="button"
                                  onClick={() => onSelectProduct && onSelectProduct(prod)}
                                  className="p-1.5 text-orange-800 hover:text-orange-950 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer"
                                  title="Adatlap megnyitása"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTerminalFej(item.relatedProductId)}
                                  className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Kapcsolat leválasztása"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. Mobile Card View */}
            {resolvedTerminalFejek.length > 0 && (
              <div className="md:hidden divide-y divide-orange-100 border border-orange-200 rounded-xl overflow-hidden bg-white">
                {filteredResolvedTerminalFejek.map((item) => {
                  const prod = item.relatedProduct;
                  const hasImage = prod && prod.images && prod.images.length > 0;
                  const thumb = hasImage ? prod.images[0] : null;

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 hover:bg-orange-50/70 active:bg-orange-100/60 cursor-pointer flex gap-3 items-start transition-colors"
                      onClick={() => prod && onSelectProduct && onSelectProduct(prod)}
                      title={prod ? `${prod.name} (${prod.productId}) adatlapjának megnyitása` : item.relatedProductId}
                    >
                      <div className="w-14 h-14 rounded-lg border border-orange-200 bg-[#F8F9FA] overflow-hidden flex items-center justify-center shrink-0">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={prod?.name || item.relatedProductId}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://placehold.co/80x80/EA580C/white?text=SF';
                            }}
                          />
                        ) : (
                          <Wrench className="w-5 h-5 text-orange-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-mono font-bold text-sm text-orange-950 break-all">
                            {prod ? prod.productId : item.relatedProductId}
                          </span>
                          {(() => {
                            const stock = getProductStock(prod, item.relatedProductId);
                            return (
                              <span
                                className={`font-mono text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                                  stock > 0
                                    ? 'font-bold bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'font-black bg-red-50 text-red-700 border-red-300'
                                }`}
                                title={`Raktárkészlet: ${stock} db`}
                              >
                                {stock} db
                              </span>
                            );
                          })()}
                        </div>

                        <div className="font-bold text-xs sm:text-sm text-[#211E1B] leading-tight break-words mb-1">
                          {prod ? prod.name : item.relatedProductId}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 mb-1.5">
                          <span className="bg-orange-50 text-stone-900 border border-orange-200 px-1.5 py-0.5 rounded font-bold">
                            {prod?.category || (isFejCategory(product.category) ? 'Saru' : 'Saruzófej')}
                          </span>
                          {item.source === 'crimp_auto' ? (
                            <span className="bg-orange-100 text-stone-900 text-[10px] px-1.5 py-0.2 rounded font-extrabold border border-orange-300">
                              Táblázatból
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.2 rounded font-extrabold border border-gray-300">
                              Rögzített
                            </span>
                          )}
                        </div>

                        {/* Mobile Darabszám Stepper */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-orange-100" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[11px] font-bold text-orange-950/80">Kapcsolódó:</span>
                          {canEdit ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateTerminalFejQuantity(item.relatedProductId, Math.max(1, (item.quantity ?? 1) - 1))}
                                disabled={(item.quantity ?? 1) <= 1 || isUpdatingTerminalFejQuantity}
                                className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 disabled:opacity-30 disabled:pointer-events-none transition-colors border border-gray-200"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono font-black text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-950 border border-orange-300">
                                {item.quantity ?? 1} db
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateTerminalFejQuantity(item.relatedProductId, (item.quantity ?? 1) + 1)}
                                disabled={isUpdatingTerminalFejQuantity}
                                className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 transition-colors border border-gray-200"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono font-black text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-900 border border-orange-200">
                              {item.quantity ?? 1} db
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 self-center" onClick={(e) => e.stopPropagation()}>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTerminalFej(item.relatedProductId)}
                            className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Leválasztás"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight className="w-5 h-5 text-orange-700" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. Disconnected (Excluded) Relations Section */}
            {disconnectedTerminalFejek.length > 0 && (
              <div className="mt-4 pt-4 border-t border-orange-200 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-orange-900 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-orange-700" />
                      <span>
                        {isFejCategory(product.category)
                          ? `Leválasztott saruk (${disconnectedTerminalFejek.length} db)`
                          : `Leválasztott saruzófejek (${disconnectedTerminalFejek.length} db)`}
                      </span>
                    </span>
                    <span className="text-[11px] font-bold text-orange-800 bg-orange-100 border border-orange-300 px-2 py-0.5 rounded-full">
                      Kizárva a megjelenítésből
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">
                    Ezek a tételek le lettek választva és rejtettek a listában.
                  </p>
                </div>

                <div className="divide-y divide-orange-100 border border-orange-200 rounded-xl overflow-hidden bg-orange-50/20">
                  {disconnectedTerminalFejek.map((item) => {
                    const prod = item.relatedProduct;
                    return (
                      <div
                        key={item.id}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-orange-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0">
                            <Wrench className="w-4 h-4 text-orange-700" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs sm:text-sm text-stone-900">
                                {prod ? prod.productId : item.relatedProductId}
                              </span>
                              {prod && prod.name && prod.name.trim().toLowerCase() !== prod.productId.trim().toLowerCase() && (
                                <span className="font-sans text-[11px] px-1.5 py-0.2 rounded-full bg-orange-100 text-stone-900 border border-orange-300 font-extrabold">
                                  {prod.name}
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                                Leválasztva
                              </span>
                            </div>
                            <div className="text-xs text-stone-600 truncate mt-0.5">
                              {prod ? prod.name : item.relatedProductId}
                              {prod?.category ? ` (${prod.category})` : ''}
                            </div>
                          </div>
                        </div>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleReconnectTerminalFej(item.relatedProductId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-orange-50 text-stone-900 font-extrabold text-xs border border-orange-300 shadow-2xs transition-colors cursor-pointer shrink-0"
                            title="Kapcsolat visszacsatolása és újra engedélyezése"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-orange-700" />
                            <span>Visszacsatolás</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 6. SARUMAGASSÁG TÁBLÁZAT KÁRTYA (pont mint az eddigi kártyák)            */}
      {/* ========================================================================= */}
      {crimpRecords.length > 0 && (
        <CrimpHeightTableCard
          records={crimpRecords}
          productId={product.productId}
          productName={product.name}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: ALKATRÉSZ CSATOLÁSA                                               */}
      {/* ========================================================================= */}
      {showAddPartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-emerald-300 my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                  <Puzzle className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Beépülő alkatrész csatolása</h3>
                  <p className="text-xs text-emerald-100">
                    Fő termék: <span className="font-mono font-bold text-white">{product.productId}</span> ({product.name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPartModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* 1. Alkatrész kereső / beíró mező */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-800 flex items-center justify-between flex-wrap gap-1">
                  <span>Beépülő alkatrész keresése / Cikkszám:</span>
                  {exactMatchedProduct && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Létező alkatrész a raktárban
                    </span>
                  )}
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={newPartIdInput}
                    onChange={(e) => setNewPartIdInput(e.target.value)}
                    placeholder="Írja be vagy keressen (cikkszám, név, gyári kód)..."
                    className="w-full font-mono font-bold text-sm sm:text-base pl-10 pr-9 py-2.5 border-2 border-emerald-200 focus:border-emerald-600 rounded-xl bg-white focus:outline-hidden"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3.5 pointer-events-none" />
                  {newPartIdInput && (
                    <button
                      type="button"
                      onClick={() => setNewPartIdInput('')}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isSelectedPartAlreadyAttached && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Ez az alkatrész ({newPartIdInput}) már csatolva van ehhez a termékhez!</span>
                  </div>
                )}
              </div>

              {/* 2. Találati lista / Alkatrész kiválasztás */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                  <span>
                    {newPartIdInput.trim()
                      ? `Keresési találatok a raktárban (${searchPartSuggestions.length} db):`
                      : 'Válasszon a raktári alkatrészek közül:'}
                  </span>
                  {newPartIdInput.trim() && (
                    <span className="text-[11px] text-emerald-700">Kattintson a kiválasztáshoz</span>
                  )}
                </div>

                {searchPartSuggestions.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto border border-emerald-200 rounded-xl divide-y divide-emerald-100 bg-[#FCFDFD]">
                    {searchPartSuggestions.map((p) => {
                      const isAttached = uniqueComponentIds.some((id) => id.trim().toLowerCase() === p.productId.trim().toLowerCase());
                      const isSelected = newPartIdInput.trim().toLowerCase() === p.productId.trim().toLowerCase();
                      const thumb = p.images && p.images.length > 0 ? p.images[0] : null;

                      return (
                        <div
                          key={p.productId}
                          onClick={() => {
                            if (!isAttached) {
                              setNewPartIdInput(p.productId);
                            }
                          }}
                          className={`p-2.5 flex items-center justify-between gap-2.5 text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-100/90 font-bold border-l-4 border-emerald-600 shadow-2xs'
                              : isAttached
                              ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                              : 'hover:bg-emerald-50/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Kép bélyegkép */}
                            <div className="w-9 h-9 rounded-lg border border-emerald-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                              {thumb ? (
                                <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-gray-400" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-black text-emerald-900 text-xs sm:text-sm">
                                  {p.productId}
                                </span>
                                {p.factoryCode && (
                                  <span className="font-mono text-[10px] bg-white border border-emerald-200 px-1 py-0.2 rounded text-emerald-800">
                                    {p.factoryCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-700 truncate font-medium text-xs">
                                {p.name}
                              </div>
                              <div className="text-[11px] text-gray-500 flex items-center gap-2">
                                <span>{p.category || 'Alkatrész'}</span>
                                <span>•</span>
                                <span className={p.stockQuantity && p.stockQuantity > 0 ? 'text-emerald-700 font-bold' : 'text-gray-400'}>
                                  Készlet: {p.stockQuantity ?? 0} db
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isSelected ? (
                              <span className="bg-emerald-700 text-white font-extrabold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 shadow-2xs">
                                <Check className="w-3 h-3" />
                                Kiválasztva
                              </span>
                            ) : isAttached ? (
                              <span className="bg-gray-200 text-gray-600 font-bold px-2 py-0.5 rounded text-[11px]">
                                Csatolva
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewPartIdInput(p.productId);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-200 text-emerald-800 font-bold text-xs border border-emerald-300 transition-colors cursor-pointer"
                              >
                                Kiválaszt
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : newPartIdInput.trim() ? (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <Puzzle className="w-4 h-4 text-blue-600 shrink-0" />
                      Nincs ilyen regisztrált alkatrész a raktári adatbázisban.
                    </p>
                    <p className="text-gray-600 mt-1">
                      Új vagy külső beépülő alkatrészként ettől függetlenül csatolható ezzel a kóddal: <strong className="font-mono text-blue-950">{newPartIdInput.trim()}</strong>
                    </p>
                  </div>
                ) : null}
              </div>

              {/* 3. Mennyi alkatrész épül be az adott termékbe (Darabszám / Mennyiség) */}
              <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-2">
                <label className="text-xs sm:text-sm font-bold text-emerald-950 block">
                  Beépülő mennyiség / Darabszám (mennyi alkatrész épül be):
                </label>
                <p className="text-xs text-emerald-900/80">
                  Adja meg, hogy hány darab épül be ebből az alkatrészből a fő termékbe ({product.productId}):
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center border-2 border-emerald-300 rounded-xl bg-white shadow-2xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setNewPartQuantity(Math.max(1, newPartQuantity - 1))}
                      disabled={newPartQuantity <= 1}
                      className="px-3 py-2 bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-900 font-bold disabled:opacity-40 transition-colors cursor-pointer"
                      title="Csökkentés"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={newPartQuantity}
                      onChange={(e) => setNewPartQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center font-mono font-black text-base py-1.5 bg-transparent focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setNewPartQuantity(newPartQuantity + 1)}
                      className="px-3 py-2 bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-900 font-bold transition-colors cursor-pointer"
                      title="Növelés"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="font-bold text-sm text-emerald-950">db alkatrész</span>
                </div>

                {/* Gyorsválasztó gombok */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[11px] font-bold text-emerald-900/70 mr-1">Gyorsválasztás:</span>
                  {[1, 2, 3, 4, 5, 8, 10].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setNewPartQuantity(qty)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        newPartQuantity === qty
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {qty} db
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddPartModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-gray-800 text-sm transition-colors cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="button"
                  onClick={handleAddPart}
                  disabled={!newPartIdInput.trim() || isSelectedPartAlreadyAttached || isAddingPart}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 font-bold text-white text-sm transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isAddingPart
                      ? 'Csatolás...'
                      : `Alkatrész Csatolása (${newPartQuantity} db)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TERMÉK <-> MÉRŐDOBOZ KAPCSOLAT HOZZÁADÁSA (Narancssárga téma)       */}
      {/* ========================================================================= */}
      {showAddMeterBoxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-orange-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-600 to-amber-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-orange-200" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Termék &lt;-&gt; Mérődoboz kapcsolat hozzáadása</h3>
                  <p className="text-xs text-orange-100">Aktuális termék: {product.productId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMeterBoxModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 block">
                  Kapcsolódó Termék vagy Mérődoboz ID:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newMeterBoxIdInput}
                    onChange={(e) => setNewMeterBoxIdInput(e.target.value)}
                    placeholder="pl. 9099000079_00 vagy XINT000284"
                    className={`w-full font-mono font-bold text-base p-3 pr-10 border-2 rounded-xl bg-white transition-colors ${
                      isSelectedMeterBoxAlreadyAttached
                        ? 'border-amber-400 bg-amber-50/50 text-amber-950 focus:border-amber-500'
                        : exactMatchedMeterBox
                        ? 'border-orange-500 bg-orange-50/20 text-orange-950 focus:border-orange-600'
                        : 'border-orange-200 focus:border-orange-600'
                    }`}
                    autoFocus
                  />
                  {newMeterBoxIdInput && (
                    <button
                      type="button"
                      onClick={() => setNewMeterBoxIdInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                      title="Mező törlése"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Status info message */}
                {isSelectedMeterBoxAlreadyAttached ? (
                  <p className="text-xs text-amber-800 font-bold flex items-center gap-1.5 mt-1 bg-amber-100/70 p-2 rounded-lg border border-amber-300">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    Ez a mérődoboz / termék már csatolva van ehhez a termékhez!
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Gépeljen a kereséshez, vagy válasszon az alábbi listából.
                  </p>
                )}
              </div>

              {/* Dynamic Search Suggestions & Existing items */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-gray-500">
                  <span>
                    {newMeterBoxIdInput.trim()
                      ? `Keresési találatok (${searchMeterBoxSuggestions.length}):`
                      : 'Mérődoboz / Termék választása:'}
                  </span>
                  {newMeterBoxIdInput.trim() && (
                    <span className="text-[11px] text-orange-700">Kattintson a kiválasztáshoz</span>
                  )}
                </div>

                {searchMeterBoxSuggestions.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto border border-orange-200 rounded-xl divide-y divide-orange-100 bg-[#FCFDFD]">
                    {searchMeterBoxSuggestions.map((p) => {
                      const isAttached = uniqueMeterBoxIds.some((id) => id.trim().toLowerCase() === p.productId.trim().toLowerCase());
                      const isSelected = newMeterBoxIdInput.trim().toLowerCase() === p.productId.trim().toLowerCase();
                      const thumb = p.images && p.images.length > 0 ? p.images[0] : null;

                      return (
                        <div
                          key={p.productId}
                          onClick={() => {
                            if (!isAttached) {
                              setNewMeterBoxIdInput(p.productId);
                            }
                          }}
                          className={`p-2.5 flex items-center justify-between gap-2.5 text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-orange-100/90 font-bold border-l-4 border-orange-600 shadow-2xs'
                              : isAttached
                              ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                              : 'hover:bg-orange-50/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-lg border border-orange-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                              {thumb ? (
                                <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <Gauge className="w-4 h-4 text-orange-400" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-black text-orange-950 text-xs sm:text-sm">
                                  {p.productId}
                                </span>
                                {p.factoryCode && (
                                  <span className="font-mono text-[10px] bg-white border border-orange-200 px-1 py-0.2 rounded text-orange-900">
                                    {p.factoryCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-700 truncate font-medium text-xs">
                                {p.name}
                              </div>
                              <div className="text-[11px] text-gray-500 flex items-center gap-2">
                                <span>{p.category || 'Mérődoboz'}</span>
                                <span>•</span>
                                <span className={p.stockQuantity && p.stockQuantity > 0 ? 'text-emerald-700 font-bold' : 'text-gray-400'}>
                                  Készlet: {p.stockQuantity ?? 0} db
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isSelected ? (
                              <span className="bg-orange-700 text-white font-extrabold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 shadow-2xs">
                                <Check className="w-3 h-3" />
                                Kiválasztva
                              </span>
                            ) : isAttached ? (
                              <span className="bg-gray-200 text-gray-600 font-bold px-2 py-0.5 rounded text-[11px]">
                                Csatolva
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewMeterBoxIdInput(p.productId);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-200 text-orange-900 font-bold text-xs border border-orange-300 transition-colors cursor-pointer"
                              >
                                Kiválaszt
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : newMeterBoxIdInput.trim() ? (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-blue-600 shrink-0" />
                      Nincs ilyen regisztrált tétel a raktári adatbázisban.
                    </p>
                    <p className="text-gray-600 mt-1">
                      Új vagy külső azonosítóként ettől függetlenül csatolható ezzel a kóddal: <strong className="font-mono text-blue-950">{newMeterBoxIdInput.trim()}</strong>
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Mennyi épül be / Kapcsolódó darabszám */}
              <div className="p-3.5 bg-orange-50/80 rounded-xl border border-orange-200 space-y-2">
                <label className="text-xs sm:text-sm font-bold text-orange-950 block">
                  Kapcsolódó darabszám / Mennyiség:
                </label>
                <p className="text-xs text-orange-900/80">
                  Adja meg a kapcsolódó darabszámot ({product.productId} ↔ {newMeterBoxIdInput.trim() || 'Mérődoboz'}):
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center border-2 border-orange-300 rounded-xl bg-white shadow-2xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setNewMeterBoxQuantity(Math.max(1, newMeterBoxQuantity - 1))}
                      disabled={newMeterBoxQuantity <= 1}
                      className="px-3 py-2 bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 font-bold disabled:opacity-40 transition-colors cursor-pointer"
                      title="Csökkentés"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={newMeterBoxQuantity}
                      onChange={(e) => setNewMeterBoxQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center font-mono font-black text-base py-1.5 bg-transparent focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setNewMeterBoxQuantity(newMeterBoxQuantity + 1)}
                      className="px-3 py-2 bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 font-bold transition-colors cursor-pointer"
                      title="Növelés"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="font-bold text-sm text-orange-950">db</span>
                </div>

                {/* Gyorsválasztó gombok */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[11px] font-bold text-orange-900/70 mr-1">Gyorsválasztás:</span>
                  {[1, 2, 3, 4, 5, 8, 10].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setNewMeterBoxQuantity(qty)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        newMeterBoxQuantity === qty
                          ? 'bg-orange-700 text-white shadow-2xs'
                          : 'bg-white text-orange-900 border border-orange-200 hover:bg-orange-100'
                      }`}
                    >
                      {qty} db
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddMeterBoxModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-gray-800 text-sm transition-colors cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="button"
                  onClick={handleAddMeterBox}
                  disabled={!newMeterBoxIdInput.trim() || isSelectedMeterBoxAlreadyAttached || isAddingMeterBox}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 font-bold text-white text-sm transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isAddingMeterBox
                      ? 'Rögzítés...'
                      : `Kapcsolat Rögzítése (${newMeterBoxQuantity} db)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KONNEKTOR <-> SARU KAPCSOLAT HOZZÁADÁSA (Narancssárga téma)         */}
      {/* ========================================================================= */}
      {showAddConnectorTerminalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-orange-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <Plug className="w-5 h-5 text-orange-200" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Konnektor &lt;-&gt; Saru kapcsolat hozzáadása</h3>
                  <p className="text-xs text-orange-100">Aktuális termék: {product.productId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddConnectorTerminalModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 block">
                  Kapcsolódó Konnektor vagy Saru ID:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newConnectorTerminalIdInput}
                    onChange={(e) => setNewConnectorTerminalIdInput(e.target.value)}
                    placeholder="pl. 2122120061 vagy 4030610910"
                    className={`w-full font-mono font-bold text-base p-3 pr-10 border-2 rounded-xl bg-white transition-colors ${
                      isSelectedConnectorTerminalAlreadyAttached
                        ? 'border-amber-400 bg-amber-50/50 text-amber-950 focus:border-amber-500'
                        : exactMatchedConnectorTerminal
                        ? 'border-orange-500 bg-orange-50/20 text-orange-950 focus:border-orange-600'
                        : 'border-orange-200 focus:border-orange-600'
                    }`}
                    autoFocus
                  />
                  {newConnectorTerminalIdInput && (
                    <button
                      type="button"
                      onClick={() => setNewConnectorTerminalIdInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                      title="Mező törlése"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Status info message */}
                {isSelectedConnectorTerminalAlreadyAttached ? (
                  <p className="text-xs text-amber-800 font-bold flex items-center gap-1.5 mt-1 bg-amber-100/70 p-2 rounded-lg border border-amber-300">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    Ez a konnektor / saru már csatolva van ehhez a termékhez!
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Gépeljen a kereséshez, vagy válasszon az alábbi listából.
                  </p>
                )}
              </div>

              {/* Dynamic Search Suggestions & Existing items */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-gray-500">
                  <span>
                    {newConnectorTerminalIdInput.trim()
                      ? `Keresési találatok (${searchConnectorTerminalSuggestions.length}):`
                      : 'Konnektor / Saru választása:'}
                  </span>
                  {newConnectorTerminalIdInput.trim() && (
                    <span className="text-[11px] text-orange-700">Kattintson a kiválasztáshoz</span>
                  )}
                </div>

                {searchConnectorTerminalSuggestions.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto border border-orange-200 rounded-xl divide-y divide-orange-100 bg-[#FCFDFD]">
                    {searchConnectorTerminalSuggestions.map((p) => {
                      const isAttached = uniqueConnectorTerminalIds.some((id) => id.trim().toLowerCase() === p.productId.trim().toLowerCase());
                      const isSelected = newConnectorTerminalIdInput.trim().toLowerCase() === p.productId.trim().toLowerCase();
                      const thumb = p.images && p.images.length > 0 ? p.images[0] : null;

                      return (
                        <div
                          key={p.productId}
                          onClick={() => {
                            if (!isAttached) {
                              setNewConnectorTerminalIdInput(p.productId);
                            }
                          }}
                          className={`p-2.5 flex items-center justify-between gap-2.5 text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-orange-100/90 font-bold border-l-4 border-orange-600 shadow-2xs'
                              : isAttached
                              ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                              : 'hover:bg-orange-50/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-lg border border-orange-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                              {thumb ? (
                                <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <Plug className="w-4 h-4 text-orange-400" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-black text-orange-950 text-xs sm:text-sm">
                                  {p.productId}
                                </span>
                                {p.factoryCode && (
                                  <span className="font-mono text-[10px] bg-white border border-orange-200 px-1 py-0.2 rounded text-orange-900">
                                    {p.factoryCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-700 truncate font-medium text-xs">
                                {p.name}
                              </div>
                              <div className="text-[11px] text-gray-500 flex items-center gap-2">
                                <span>{p.category || 'Konnektor/Saru'}</span>
                                <span>•</span>
                                <span className={p.stockQuantity && p.stockQuantity > 0 ? 'text-emerald-700 font-bold' : 'text-gray-400'}>
                                  Készlet: {p.stockQuantity ?? 0} db
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isSelected ? (
                              <span className="bg-orange-700 text-white font-extrabold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 shadow-2xs">
                                <Check className="w-3 h-3" />
                                Kiválasztva
                              </span>
                            ) : isAttached ? (
                              <span className="bg-gray-200 text-gray-600 font-bold px-2 py-0.5 rounded text-[11px]">
                                Csatolva
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewConnectorTerminalIdInput(p.productId);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-200 text-orange-900 font-bold text-xs border border-orange-300 transition-colors cursor-pointer"
                              >
                                Kiválaszt
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : newConnectorTerminalIdInput.trim() ? (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <Plug className="w-4 h-4 text-blue-600 shrink-0" />
                      Nincs ilyen regisztrált tétel a raktári adatbázisban.
                    </p>
                    <p className="text-gray-600 mt-1">
                      Új vagy külső azonosítóként ettől függetlenül csatolható ezzel a kóddal: <strong className="font-mono text-blue-950">{newConnectorTerminalIdInput.trim()}</strong>
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Mennyi épül be / Kapcsolódó darabszám */}
              <div className="p-3.5 bg-orange-50/80 rounded-xl border border-orange-200 space-y-2">
                <label className="text-xs sm:text-sm font-bold text-orange-950 block">
                  Kapcsolódó darabszám / Mennyiség:
                </label>
                <p className="text-xs text-orange-900/80">
                  Adja meg a kapcsolódó darabszámot ({product.productId} ↔ {newConnectorTerminalIdInput.trim() || 'Konnektor/Saru'}):
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center border-2 border-orange-300 rounded-xl bg-white shadow-2xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setNewConnectorTerminalQuantity(Math.max(1, newConnectorTerminalQuantity - 1))}
                      disabled={newConnectorTerminalQuantity <= 1}
                      className="px-3 py-2 bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 font-bold disabled:opacity-40 transition-colors cursor-pointer"
                      title="Csökkentés"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={newConnectorTerminalQuantity}
                      onChange={(e) => setNewConnectorTerminalQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center font-mono font-black text-base py-1.5 bg-transparent focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setNewConnectorTerminalQuantity(newConnectorTerminalQuantity + 1)}
                      className="px-3 py-2 bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 font-bold transition-colors cursor-pointer"
                      title="Növelés"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="font-bold text-sm text-orange-950">db</span>
                </div>

                {/* Gyorsválasztó gombok */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[11px] font-bold text-orange-900/70 mr-1">Gyorsválasztás:</span>
                  {[1, 2, 3, 4, 5, 8, 10].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setNewConnectorTerminalQuantity(qty)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        newConnectorTerminalQuantity === qty
                          ? 'bg-orange-700 text-white shadow-2xs'
                          : 'bg-white text-orange-900 border border-orange-200 hover:bg-orange-100'
                      }`}
                    >
                      {qty} db
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddConnectorTerminalModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-gray-800 text-sm transition-colors cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="button"
                  onClick={handleAddConnectorTerminal}
                  disabled={!newConnectorTerminalIdInput.trim() || isSelectedConnectorTerminalAlreadyAttached || isAddingConnectorTerminal}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 font-bold text-white text-sm transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isAddingConnectorTerminal
                      ? 'Rögzítés...'
                      : `Kapcsolat Rögzítése (${newConnectorTerminalQuantity} db)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ELLENPÁR KAPCSOLAT HOZZÁADÁSA (Citromsárga téma)                    */}
      {/* ========================================================================= */}
      {showAddMatingPairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-yellow-400">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 text-yellow-950 p-5 flex items-center justify-between border-b border-yellow-500/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-950/15 flex items-center justify-center border border-yellow-950/20">
                  <GitCompare className="w-5 h-5 text-yellow-950" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Ellenpár kapcsolat hozzáadása</h3>
                  <p className="text-xs text-yellow-950/80 font-medium">
                    Aktuális termék: {product.productId} ({product.category || 'Termék'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMatingPairModal(false)}
                className="p-1.5 rounded-lg hover:bg-yellow-950/15 text-yellow-950 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 block">
                  {(product.category || '').toLowerCase().includes('konnektor')
                    ? 'Konnektor Ellenpár Termék ID:'
                    : 'Saru Ellenpár Termék ID:'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newMatingPairIdInput}
                    onChange={(e) => setNewMatingPairIdInput(e.target.value)}
                    placeholder={
                      (product.category || '').toLowerCase().includes('konnektor')
                        ? 'pl. 2122120060 (Konnektor ellenpár)'
                        : 'pl. 4030610910_DUG (Saru ellenpár)'
                    }
                    className={`w-full font-mono font-bold text-base p-3 pr-10 border-2 rounded-xl bg-white transition-colors ${
                      isSelectedMatingPairAlreadyAttached
                        ? 'border-amber-400 bg-amber-50/50 text-amber-950 focus:border-amber-500'
                        : exactMatchedMatingPair
                        ? 'border-yellow-500 bg-yellow-50/30 text-yellow-950 focus:border-yellow-600'
                        : 'border-yellow-300 focus:border-yellow-600 text-yellow-950'
                    }`}
                    autoFocus
                  />
                  {newMatingPairIdInput && (
                    <button
                      type="button"
                      onClick={() => setNewMatingPairIdInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                      title="Mező törlése"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Status info message */}
                {isSelectedMatingPairAlreadyAttached ? (
                  <p className="text-xs text-amber-800 font-bold flex items-center gap-1.5 mt-1 bg-amber-100/70 p-2 rounded-lg border border-amber-300">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    Ez az ellenpár már csatolva van ehhez a termékhez!
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Gépeljen a kereséshez, vagy válasszon az alábbi listából.
                  </p>
                )}
              </div>

              {/* Dynamic Search Suggestions & Existing items */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-gray-500">
                  <span>
                    {newMatingPairIdInput.trim()
                      ? `Keresési találatok (${searchMatingPairSuggestions.length}):`
                      : 'Ellenpár választása:'}
                  </span>
                  {newMatingPairIdInput.trim() && (
                    <span className="text-[11px] text-yellow-800">Kattintson a kiválasztáshoz</span>
                  )}
                </div>

                {searchMatingPairSuggestions.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto border border-yellow-200 rounded-xl divide-y divide-yellow-100 bg-[#FCFDFD]">
                    {searchMatingPairSuggestions.map((p) => {
                      const isAttached = uniqueMatingPairIds.some((id) => id.trim().toLowerCase() === p.productId.trim().toLowerCase());
                      const isSelected = newMatingPairIdInput.trim().toLowerCase() === p.productId.trim().toLowerCase();
                      const thumb = p.images && p.images.length > 0 ? p.images[0] : null;

                      return (
                        <div
                          key={p.productId}
                          onClick={() => {
                            if (!isAttached) {
                              setNewMatingPairIdInput(p.productId);
                            }
                          }}
                          className={`p-2.5 flex items-center justify-between gap-2.5 text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-yellow-100/90 font-bold border-l-4 border-yellow-600 shadow-2xs'
                              : isAttached
                              ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                              : 'hover:bg-yellow-50/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-lg border border-yellow-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                              {thumb ? (
                                <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <GitCompare className="w-4 h-4 text-yellow-600" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-black text-yellow-950 text-xs sm:text-sm">
                                  {p.productId}
                                </span>
                                {p.factoryCode && (
                                  <span className="font-mono text-[10px] bg-white border border-yellow-200 px-1 py-0.2 rounded text-yellow-900">
                                    {p.factoryCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-700 truncate font-medium text-xs">
                                {p.name}
                              </div>
                              <div className="text-[11px] text-gray-500 flex items-center gap-2">
                                <span>{p.category || 'Ellenpár'}</span>
                                <span>•</span>
                                <span className={p.stockQuantity && p.stockQuantity > 0 ? 'text-emerald-700 font-bold' : 'text-gray-400'}>
                                  Készlet: {p.stockQuantity ?? 0} db
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isSelected ? (
                              <span className="bg-yellow-600 text-yellow-950 font-extrabold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 shadow-2xs border border-yellow-700">
                                <Check className="w-3 h-3" />
                                Kiválasztva
                              </span>
                            ) : isAttached ? (
                              <span className="bg-gray-200 text-gray-600 font-bold px-2 py-0.5 rounded text-[11px]">
                                Csatolva
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewMatingPairIdInput(p.productId);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-yellow-50 hover:bg-yellow-200 text-yellow-950 font-bold text-xs border border-yellow-300 transition-colors cursor-pointer"
                              >
                                Kiválaszt
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : newMatingPairIdInput.trim() ? (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <GitCompare className="w-4 h-4 text-blue-600 shrink-0" />
                      Nincs ilyen regisztrált tétel a raktári adatbázisban.
                    </p>
                    <p className="text-gray-600 mt-1">
                      Új vagy külső azonosítóként ettől függetlenül csatolható ezzel a kóddal: <strong className="font-mono text-blue-950">{newMatingPairIdInput.trim()}</strong>
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Mennyi épül be / Kapcsolódó darabszám */}
              <div className="p-3.5 bg-yellow-50/80 rounded-xl border border-yellow-300 space-y-2">
                <label className="text-xs sm:text-sm font-bold text-yellow-950 block">
                  Kapcsolódó darabszám / Mennyiség:
                </label>
                <p className="text-xs text-yellow-900/80">
                  Adja meg a kapcsolódó darabszámot ({product.productId} ↔ {newMatingPairIdInput.trim() || 'Ellenpár'}):
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center border-2 border-yellow-400 rounded-xl bg-white shadow-2xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setNewMatingPairQuantity(Math.max(1, newMatingPairQuantity - 1))}
                      disabled={newMatingPairQuantity <= 1}
                      className="px-3 py-2 bg-gray-100 hover:bg-yellow-100 text-gray-700 hover:text-yellow-950 font-bold disabled:opacity-40 transition-colors cursor-pointer"
                      title="Csökkentés"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={newMatingPairQuantity}
                      onChange={(e) => setNewMatingPairQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center font-mono font-black text-base py-1.5 bg-transparent focus:outline-hidden text-yellow-950"
                    />
                    <button
                      type="button"
                      onClick={() => setNewMatingPairQuantity(newMatingPairQuantity + 1)}
                      className="px-3 py-2 bg-gray-100 hover:bg-yellow-100 text-gray-700 hover:text-yellow-950 font-bold transition-colors cursor-pointer"
                      title="Növelés"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="font-bold text-sm text-yellow-950">db</span>
                </div>

                {/* Gyorsválasztó gombok */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[11px] font-bold text-yellow-900/70 mr-1">Gyorsválasztás:</span>
                  {[1, 2, 3, 4, 5, 8, 10].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setNewMatingPairQuantity(qty)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        newMatingPairQuantity === qty
                          ? 'bg-yellow-500 text-yellow-950 border border-yellow-600 shadow-2xs font-extrabold'
                          : 'bg-white text-yellow-950 border border-yellow-300 hover:bg-yellow-100'
                      }`}
                    >
                      {qty} db
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddMatingPairModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-gray-800 text-sm transition-colors cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="button"
                  onClick={handleAddMatingPair}
                  disabled={!newMatingPairIdInput.trim() || isSelectedMatingPairAlreadyAttached || isAddingMatingPair}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 disabled:bg-gray-400 font-bold text-yellow-950 text-sm transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5 border border-yellow-600"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isAddingMatingPair
                      ? 'Rögzítés...'
                      : `+ Ellenpár Rögzítése (${newMatingPairQuantity} db)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SARU ↔ SARUZÓFEJ KAPCSOLAT HOZZÁADÁSA (Halvány narancssárga téma) */}
      {/* ========================================================================= */}
      {showAddTerminalFejModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-orange-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-400 via-orange-300 to-amber-400 text-stone-900 p-5 flex items-center justify-between border-b border-orange-300">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-950/15 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-stone-900" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {isFejCategory(product.category)
                      ? 'Saru összekapcsolása saruzófejjel'
                      : 'Saruzófej összekapcsolása saruval'}
                  </h3>
                  <p className="text-xs text-stone-800">Aktuális termék: {product.productId} ({product.name})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTerminalFejModal(false)}
                className="p-1.5 rounded-lg hover:bg-orange-950/15 text-stone-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 block">
                  {isFejCategory(product.category)
                    ? 'Kapcsolódó Saru Cikkszám vagy Név:'
                    : 'Kapcsolódó Saruzófej Cikkszám vagy Név:'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newTerminalFejIdInput}
                    onChange={(e) => setNewTerminalFejIdInput(e.target.value)}
                    placeholder={isFejCategory(product.category) ? 'pl. 282378/1 vagy 2122120025' : 'pl. N38 vagy 40107.00.38'}
                    className={`w-full font-mono font-bold text-base p-3 pr-10 border-2 rounded-xl bg-white transition-colors ${
                      isSelectedTerminalFejAlreadyAttached
                        ? 'border-amber-400 bg-amber-50/50 text-amber-950 focus:border-amber-500'
                        : exactMatchedTerminalFej
                        ? 'border-orange-500 bg-orange-50/20 text-stone-900 focus:border-orange-600'
                        : 'border-orange-200 focus:border-orange-500 text-stone-900'
                    }`}
                    autoFocus
                  />
                  {newTerminalFejIdInput && (
                    <button
                      type="button"
                      onClick={() => setNewTerminalFejIdInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                      title="Mező törlése"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Status info message */}
                {isSelectedTerminalFejAlreadyAttached ? (
                  <p className="text-xs text-amber-800 font-bold flex items-center gap-1.5 mt-1 bg-amber-100/70 p-2 rounded-lg border border-amber-300">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    Ez a kapcsolat már rögzítve van ehhez a termékhez!
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    {isFejCategory(product.category)
                      ? 'Írja be a saru azonosítóját, vagy válasszon az alábbi listából.'
                      : 'Írja be a saruzófej azonosítóját (pl. N38, N120), vagy válasszon az alábbi listából.'}
                  </p>
                )}
              </div>

              {/* Dynamic Search Suggestions & Existing items */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-gray-500">
                  <span>
                    {newTerminalFejIdInput.trim()
                      ? `Keresési találatok (${searchTerminalFejSuggestions.length}):`
                      : isFejCategory(product.category)
                      ? 'Saru választása:'
                      : 'Saruzófej választása:'}
                  </span>
                  {newTerminalFejIdInput.trim() && (
                    <span className="text-[11px] text-orange-800">Kattintson a kiválasztáshoz</span>
                  )}
                </div>

                {searchTerminalFejSuggestions.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto border border-orange-200 rounded-xl divide-y divide-orange-100 bg-[#FCFDFD]">
                    {searchTerminalFejSuggestions.map((p) => {
                      const isAttached = resolvedTerminalFejek.some((item) => item.relatedProductId.trim().toLowerCase() === p.productId.trim().toLowerCase());
                      const isSelected = newTerminalFejIdInput.trim().toLowerCase() === p.productId.trim().toLowerCase();
                      const thumb = p.images && p.images.length > 0 ? p.images[0] : null;

                      return (
                        <div
                          key={p.productId}
                          onClick={() => {
                            if (!isAttached) {
                              setNewTerminalFejIdInput(p.productId);
                            }
                          }}
                          className={`p-2.5 flex items-center justify-between gap-2.5 text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-orange-100/90 font-bold border-l-4 border-orange-500 shadow-2xs'
                              : isAttached
                              ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                              : 'hover:bg-orange-50/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-lg border border-orange-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                              {thumb ? (
                                <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <Wrench className="w-4 h-4 text-orange-500" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-black text-orange-950 text-xs sm:text-sm">
                                  {p.productId}
                                </span>
                                {p.factoryCode && (
                                  <span className="font-mono text-[10px] bg-white border border-orange-200 px-1 py-0.2 rounded text-orange-900">
                                    {p.factoryCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-700 truncate font-medium text-xs">
                                {p.name}
                              </div>
                              <div className="text-[11px] text-gray-500 flex items-center gap-2">
                                <span>{p.category || (isFejCategory(product.category) ? 'Saru' : 'Saruzófej')}</span>
                                <span>•</span>
                                <span className={p.stockQuantity && p.stockQuantity > 0 ? 'text-emerald-700 font-bold' : 'text-gray-400'}>
                                  Készlet: {p.stockQuantity ?? 0} db
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isSelected ? (
                              <span className="bg-orange-600 text-white font-extrabold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 shadow-2xs">
                                <Check className="w-3 h-3" />
                                Kiválasztva
                              </span>
                            ) : isAttached ? (
                              <span className="bg-gray-200 text-gray-600 font-bold px-2 py-0.5 rounded text-[11px]">
                                Csatolva
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewTerminalFejIdInput(p.productId);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-200 text-orange-950 font-bold text-xs border border-orange-300 transition-colors cursor-pointer"
                              >
                                Kiválaszt
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : newTerminalFejIdInput.trim() ? (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
                      Nincs ilyen regisztrált tétel a raktári adatbázisban.
                    </p>
                    <p className="text-gray-600 mt-1">
                      Új vagy külső azonosítóként ettől függetlenül csatolható ezzel a kóddal: <strong className="font-mono text-blue-950">{newTerminalFejIdInput.trim()}</strong>
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Mennyi épül be / Kapcsolódó darabszám */}
              <div className="p-3.5 bg-orange-50/80 rounded-xl border border-orange-200 space-y-2">
                <label className="text-xs sm:text-sm font-bold text-orange-950 block">
                  Kapcsolódó darabszám / Mennyiség:
                </label>
                <p className="text-xs text-orange-900/80">
                  Adja meg a kapcsolódó darabszámot ({product.productId} ↔ {newTerminalFejIdInput.trim() || 'Kapcsolat'}):
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center border-2 border-orange-300 rounded-xl bg-white shadow-2xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setNewTerminalFejQuantity(Math.max(1, newTerminalFejQuantity - 1))}
                      disabled={newTerminalFejQuantity <= 1}
                      className="px-3 py-2 bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 font-bold disabled:opacity-40 transition-colors cursor-pointer"
                      title="Csökkentés"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={newTerminalFejQuantity}
                      onChange={(e) => setNewTerminalFejQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center font-mono font-black text-base py-1.5 bg-transparent focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setNewTerminalFejQuantity(newTerminalFejQuantity + 1)}
                      className="px-3 py-2 bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 font-bold transition-colors cursor-pointer"
                      title="Növelés"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="font-bold text-sm text-orange-950">db</span>
                </div>

                {/* Gyorsválasztó gombok */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[11px] font-bold text-orange-900/70 mr-1">Gyorsválasztás:</span>
                  {[1, 2, 3, 4, 5, 8, 10].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setNewTerminalFejQuantity(qty)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        newTerminalFejQuantity === qty
                          ? 'bg-orange-600 text-white shadow-2xs'
                          : 'bg-white text-orange-900 border border-orange-200 hover:bg-orange-100'
                      }`}
                    >
                      {qty} db
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddTerminalFejModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-gray-800 text-sm transition-colors cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="button"
                  onClick={handleAddTerminalFej}
                  disabled={!newTerminalFejIdInput.trim() || isSelectedTerminalFejAlreadyAttached || isAddingTerminalFej}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 disabled:bg-gray-400 font-bold text-stone-900 text-sm transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5 border border-orange-400"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isAddingTerminalFej
                      ? 'Rögzítés...'
                      : `+ Kapcsolat Rögzítése (${newTerminalFejQuantity} db)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
