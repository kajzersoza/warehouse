import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Box,
  Tag,
  AlertTriangle,
  Layers,
  Building2,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Upload,
  Download,
  Calendar,
  RotateCcw,
  ExternalLink,
  Trash2,
  ChevronRight,
  Database,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  History,
  Grid,
  ListFilter,
  ArrowRightLeft,
  Edit3
} from 'lucide-react';
import { Product, WarehousePosition, WarehouseTransaction } from '../types/product';
import {
  saveWarehousePosition,
  deleteWarehousePosition,
  saveWarehouseTransaction,
  deleteWarehouseTransaction,
  updateProductPosition,
  deleteProductFromPosition,
  batchImportWarehousePositions,
  batchImportWarehouseTransactions,
  parseWarehousePositionsCsv,
  parseWarehouseTransactionsCsv
} from '../services/warehouseService';

interface WarehouseStatsViewProps {
  products: Product[];
  positions: WarehousePosition[];
  transactions: WarehouseTransaction[];
  initialPositionId?: string | null;
  initialProductId?: string | null;
  onBack: () => void;
  onGoToList?: () => void;
  onSelectProduct: (p: Product) => void;
  onRefreshData?: () => void;
  onResetStockToZero?: () => void;
  canEdit?: boolean;
}

export const WarehouseStatsView: React.FC<WarehouseStatsViewProps> = ({
  products,
  positions,
  transactions,
  initialPositionId,
  initialProductId,
  onBack,
  onGoToList,
  onSelectProduct,
  onRefreshData,
  onResetStockToZero,
  canEdit = true
}) => {
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(
    initialPositionId || (positions.length > 0 ? positions[0].id : null)
  );
  const [activeTab, setActiveTab] = useState<'positions' | 'transactions' | 'stats' | 'import'>('positions');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'with-stock' | 'empty'>('all');

  // New Position Modal
  const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [newPositionZone, setNewPositionZone] = useState('Egyéb Pozíciók');

  // New Transaction Modal
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [txPositionId, setTxPositionId] = useState('');
  const [txProductId, setTxProductId] = useState('');
  const [txQuantity, setTxQuantity] = useState<number | ''>(1);
  const [txDate, setTxDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}. ${m}. ${day}.`;
  });
  const [txNote, setTxNote] = useState('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // CSV Import states
  const [importType, setImportType] = useState<'positions' | 'transactions'>('transactions');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Update selected position if prop changes
  useEffect(() => {
    if (initialPositionId) {
      setSelectedPositionId(initialPositionId);
      setActiveTab('positions');
    }
  }, [initialPositionId]);

  // Map of products by productId (lowercased)
  const productLookup = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => {
      map.set(p.productId.trim().toLowerCase(), p);
      if (p.factoryCode) map.set(p.factoryCode.trim().toLowerCase(), p);
    });
    return map;
  }, [products]);

  // Aggregate stock and items per position from transactions
  const positionInventoryMap = useMemo(() => {
    const map = new Map<string, {
      totalQuantity: number;
      productMap: Map<string, number>;
      transactions: WarehouseTransaction[];
    }>();

    // Initialize all known positions
    positions.forEach((pos) => {
      map.set(pos.id, {
        totalQuantity: 0,
        productMap: new Map(),
        transactions: []
      });
    });

    transactions.forEach((tx) => {
      let entry = map.get(tx.positionId);
      if (!entry) {
        entry = {
          totalQuantity: 0,
          productMap: new Map(),
          transactions: []
        };
        map.set(tx.positionId, entry);
      }
      const q =
        tx.quantity !== undefined && tx.quantity !== null && !isNaN(Number(tx.quantity))
          ? Number(tx.quantity)
          : 0;
      entry.totalQuantity += q;
      entry.transactions.push(tx);
      const currProdQty = entry.productMap.get(tx.productId) || 0;
      entry.productMap.set(tx.productId, currProdQty + q);
    });

    return map;
  }, [positions, transactions]);

  // Filtered positions list
  const filteredPositions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return positions.filter((pos) => {
      // Zone filter
      if (selectedZone !== 'all' && pos.zone !== selectedZone) {
        return false;
      }

      const inv = positionInventoryMap.get(pos.id);
      const qty = inv ? inv.totalQuantity : 0;

      // Stock filter
      if (stockFilter === 'with-stock' && qty <= 0) return false;
      if (stockFilter === 'empty' && qty > 0) return false;

      // Search match (matches position name, or any product stored inside)
      if (q) {
        const nameMatch = pos.name.toLowerCase().includes(q) || pos.id.toLowerCase().includes(q);
        if (nameMatch) return true;

        // Check stored products
        if (inv) {
          for (const [prodId] of inv.productMap.entries()) {
            if (prodId.toLowerCase().includes(q)) return true;
            const prod = productLookup.get(prodId.toLowerCase());
            if (prod && prod.name.toLowerCase().includes(q)) return true;
          }
        }
        return false;
      }

      return true;
    });
  }, [positions, selectedZone, stockFilter, searchTerm, positionInventoryMap, productLookup]);

  // Zones list
  const zones = useMemo(() => {
    const set = new Set<string>();
    positions.forEach((p) => {
      if (p.zone) set.add(p.zone);
    });
    return Array.from(set).sort();
  }, [positions]);

  // Currently selected position data
  const selectedPositionData = useMemo(() => {
    if (!selectedPositionId) return null;
    const pos = positions.find((p) => p.id === selectedPositionId) || {
      id: selectedPositionId,
      name: selectedPositionId,
      zone: 'Pozíció'
    };
    const inv = positionInventoryMap.get(selectedPositionId) || {
      totalQuantity: 0,
      productMap: new Map(),
      transactions: []
    };

    // Filter products stored here with quantity > 0
    const storedProducts: Array<{
      productId: string;
      quantity: number;
      product: Product | null;
    }> = [];

    inv.productMap.forEach((qty, prodId) => {
      storedProducts.push({
        productId: prodId,
        quantity: qty,
        product: productLookup.get(prodId.toLowerCase()) || null
      });
    });

    // Sort stored products by quantity descending
    storedProducts.sort((a, b) => b.quantity - a.quantity);

    // Sort transactions by date or timestamp descending
    const sortedTx = [...inv.transactions].sort((a, b) => {
      const dateA = a.date || a.createdAt || '';
      const dateB = b.date || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });

    return {
      position: pos,
      totalQuantity: inv.totalQuantity,
      storedProducts,
      transactions: sortedTx
    };
  }, [selectedPositionId, positions, positionInventoryMap, productLookup]);

  // KPI calculations
  const totalPositionsCount = positions.length;
  const occupiedPositionsCount = useMemo(() => {
    let count = 0;
    positionInventoryMap.forEach((inv) => {
      if (inv.totalQuantity > 0) count++;
    });
    return count;
  }, [positionInventoryMap]);

  const totalWarehouseUnits = useMemo(() => {
    let sum = 0;
    positionInventoryMap.forEach((inv) => {
      sum += inv.totalQuantity;
    });
    return sum;
  }, [positionInventoryMap]);

  // State for editing transactions and moving product positions
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [movingProductItem, setMovingProductItem] = useState<{
    productId: string;
    productName: string;
    currentPositionId: string;
    quantity: number;
  } | null>(null);
  const [targetMovePositionId, setTargetMovePositionId] = useState<string>('');
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);

  // Auto-open add transaction modal if initialProductId is passed
  useEffect(() => {
    if (initialProductId) {
      handleOpenAddTx(initialPositionId || undefined, initialProductId);
    }
  }, [initialProductId]);

  // Handle open add transaction modal
  const handleOpenAddTx = (posId?: string, prodId?: string) => {
    let resolvedPos = posId || selectedPositionId;
    if (prodId && (!posId || posId === '')) {
      const normPId = prodId.trim().toLowerCase();
      const existing = transactions.find(
        (t) => t.productId.trim().toLowerCase() === normPId && t.positionId
      );
      if (existing) {
        resolvedPos = existing.positionId;
        setSelectedPositionId(existing.positionId);
      }
    }
    setTxPositionId(resolvedPos || (positions[0]?.id || 'A1'));
    setTxProductId(prodId || '');
    setTxQuantity(1);
    setTxNote('');
    setEditingTxId(null);
    setIsAddTxOpen(true);
  };

  const handleOpenEditTx = (tx: WarehouseTransaction) => {
    setEditingTxId(tx.id);
    setTxPositionId(tx.positionId);
    setTxProductId(tx.productId);
    setTxQuantity(tx.quantity);
    setTxDate(tx.date || new Date().toISOString().split('T')[0]);
    setTxNote(tx.note || '');
    setIsAddTxOpen(true);
  };

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txPositionId.trim() || !txProductId.trim() || txQuantity === '') return;
    setIsSubmittingTx(true);
    try {
      await saveWarehouseTransaction({
        id: editingTxId || undefined,
        positionId: txPositionId.trim(),
        productId: txProductId.trim(),
        quantity: Number(txQuantity),
        date: txDate.trim(),
        note: txNote.trim() || undefined
      });
      setIsAddTxOpen(false);
      setEditingTxId(null);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to save transaction:', err);
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const handleDeleteTx = async (id: string) => {
    if (!window.confirm('Biztosan törölni szeretné ezt a készletmozgási tételt?')) return;
    try {
      await deleteWarehouseTransaction(id);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  const handleOpenMoveProduct = (prodId: string, prodName: string, currentPos: string, qty: number) => {
    setMovingProductItem({
      productId: prodId,
      productName: prodName,
      currentPositionId: currentPos,
      quantity: qty
    });
    setTargetMovePositionId(positions.find((p) => p.id !== currentPos)?.id || 'A1');
  };

  const handleExecuteMoveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingProductItem || !targetMovePositionId.trim()) return;
    if (movingProductItem.currentPositionId.toLowerCase() === targetMovePositionId.trim().toLowerCase()) {
      alert('A célpozíció nem lehet azonos a jelenlegi pozícióval!');
      return;
    }
    setIsSubmittingMove(true);
    try {
      await updateProductPosition(
        movingProductItem.productId,
        movingProductItem.currentPositionId,
        targetMovePositionId.trim()
      );
      setMovingProductItem(null);
      setSelectedPositionId(targetMovePositionId.trim());
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to move product position:', err);
    } finally {
      setIsSubmittingMove(false);
    }
  };

  const handleDeleteProductPosition = async (prodId: string, posId: string) => {
    if (
      !window.confirm(
        `Biztosan törölni szeretné a(z) ${prodId} termék pozícióját innen (${posId})? A termék ezen a pozíción szereplő tranzakciói törlésre kerülnek.`
      )
    ) {
      return;
    }
    try {
      await deleteProductFromPosition(prodId, posId);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to delete product from position:', err);
    }
  };

  const handleSaveNewPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPositionName.trim()) return;
    try {
      await saveWarehousePosition({
        id: newPositionName.trim(),
        name: newPositionName.trim(),
        zone: newPositionZone,
        isCustom: true
      });
      setSelectedPositionId(newPositionName.trim());
      setNewPositionName('');
      setIsAddPositionOpen(false);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to save position:', err);
    }
  };

  const handleApplyCsv = async () => {
    if (!csvFile) return;
    setIsImporting(true);
    setImportStatus(null);

    try {
      const text = await csvFile.text();
      if (!text || text.trim().length === 0) {
        setImportStatus({ success: false, message: 'A feltöltött fájl üres!' });
        setIsImporting(false);
        return;
      }

      if (importType === 'positions') {
        const parsed = parseWarehousePositionsCsv(text);
        if (parsed.length === 0) {
          setImportStatus({ success: false, message: 'Nem sikerült érvényes Pozíció ID-kat beolvasni.' });
          setIsImporting(false);
          return;
        }
        const res = await batchImportWarehousePositions(parsed);
        setImportStatus({
          success: true,
          message: `Sikeres importálás! ${res.addedCount} db új raktár pozíció rögzítve.`
        });
      } else {
        const parsed = parseWarehouseTransactionsCsv(text);
        if (parsed.length === 0) {
          setImportStatus({ success: false, message: 'Nem sikerült érvényes készlet tranzakciókat beolvasni.' });
          setIsImporting(false);
          return;
        }
        const res = await batchImportWarehouseTransactions(parsed);
        setImportStatus({
          success: true,
          message: `Sikeres importálás! ${res.addedCount} db készletmozgási tétel rögzítve.`
        });
      }
      setCsvFile(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setImportStatus({ success: false, message: err?.message || 'Hiba a CSV feldolgozása közben.' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 text-slate-900">
      {/* 1. Header Bar - Professional Blue Theme */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-sky-900 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-blue-700/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/15"
            title="Vissza az előző nézetre"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide bg-sky-400/20 text-sky-200 border border-sky-400/30 uppercase">
                Raktárkezelő Rendszer
              </span>
              <span className="text-xs text-blue-200">World Wires kft.</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
              Raktári Pozíciók & Készletmozgások
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onGoToList && (
            <button
              type="button"
              onClick={onGoToList}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-extrabold transition-colors cursor-pointer border border-white/20 shadow-xs"
            >
              <Layers className="w-4 h-4 text-sky-300" />
              <span>Terméklista</span>
            </button>
          )}

          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => setIsAddPositionOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-blue-950 text-xs sm:text-sm font-black transition-colors cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Új Pozíció</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddTx()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs sm:text-sm font-black transition-colors cursor-pointer shadow-md"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>+ Készletmozgás</span>
              </button>

              {onResetStockToZero && (
                <button
                  type="button"
                  onClick={onResetStockToZero}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-md"
                  title="A teljes raktárkészlet beállítása 0 db-ra"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Készlet</span>
                  <span>0 db</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. Top KPI Cards - Cool Blue Warehouse Styling */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total positions */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-blue-50/50">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900/70 block">
              Összes Raktár Pozíció
            </span>
            <span className="text-3xl font-black text-blue-950 mt-1 block">
              {totalPositionsCount} <span className="text-base font-semibold text-blue-800">hely</span>
            </span>
            <span className="text-xs text-blue-600 font-medium mt-0.5 block">
              Alapértelmezett és egyedi helyek
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Occupied positions */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-sky-50/50">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-900/70 block">
              Foglalt Pozíciók (&gt;0 db)
            </span>
            <span className="text-3xl font-black text-sky-950 mt-1 block">
              {occupiedPositionsCount} <span className="text-base font-semibold text-sky-800">aktív</span>
            </span>
            <span className="text-xs text-sky-600 font-medium mt-0.5 block">
              {totalPositionsCount - occupiedPositionsCount} üres pozíció (0 db)
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shadow-xs">
            <Box className="w-6 h-6" />
          </div>
        </div>

        {/* Total units in warehouse */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-indigo-50/50">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900/70 block">
              Teljes Készletállomány
            </span>
            <span className="text-3xl font-black text-indigo-950 mt-1 block">
              {totalWarehouseUnits} <span className="text-base font-semibold text-indigo-800">db</span>
            </span>
            <span className="text-xs text-indigo-600 font-medium mt-0.5 block">
              {transactions.length} db rögzített készletmozgásból
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
            <History className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-blue-200 bg-white rounded-2xl p-1.5 shadow-xs gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('positions')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'positions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-blue-900 hover:bg-blue-50'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Raktári Pozíciók & Készlet</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'positions' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-900'
          }`}>
            {filteredPositions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'transactions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-blue-900 hover:bg-blue-50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Készlet Tranzakciók Naplója</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'transactions' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-900'
          }`}>
            {transactions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'import'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-blue-900 hover:bg-blue-50'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>CSV Feltöltés & Import</span>
        </button>
      </div>

      {/* 4. Tab 1: Positions Grid & Selected Position Detail View */}
      {activeTab === 'positions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Positions List (5 cols on lg) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-blue-200 p-4 sm:p-5 shadow-sm space-y-4">
            {/* Search and filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-blue-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Keresés pozíció vagy cikkszám szerint..."
                  className="w-full pl-9 pr-9 py-2 rounded-xl border border-blue-200 bg-blue-50/30 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 focus:bg-white shadow-2xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Zone Filter pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedZone('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedZone === 'all'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'bg-blue-50 text-blue-900 hover:bg-blue-100'
                  }`}
                >
                  Összes Zóna
                </button>
                {zones.map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setSelectedZone(z)}
                    className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedZone === z
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'bg-blue-50 text-blue-900 hover:bg-blue-100'
                    }`}
                  >
                    {z}
                  </button>
                ))}
              </div>

              {/* Stock status filter buttons */}
              <div className="flex items-center justify-between gap-1 bg-blue-50/70 p-1 rounded-xl text-xs font-bold text-blue-950">
                <button
                  type="button"
                  onClick={() => setStockFilter('all')}
                  className={`flex-1 py-1 px-2 rounded-lg text-center transition-colors cursor-pointer ${
                    stockFilter === 'all' ? 'bg-white shadow-xs text-blue-900' : 'hover:bg-blue-100'
                  }`}
                >
                  Minden ({positions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('with-stock')}
                  className={`flex-1 py-1 px-2 rounded-lg text-center transition-colors cursor-pointer ${
                    stockFilter === 'with-stock' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-blue-100 text-emerald-800'
                  }`}
                >
                  Készleten ({occupiedPositionsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('empty')}
                  className={`flex-1 py-1 px-2 rounded-lg text-center transition-colors cursor-pointer ${
                    stockFilter === 'empty' ? 'bg-red-600 text-white shadow-xs' : 'hover:bg-blue-100 text-red-700'
                  }`}
                >
                  Üres (0 db)
                </button>
              </div>
            </div>

            {/* Positions Scroll List */}
            <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
              {filteredPositions.length === 0 ? (
                <div className="p-8 text-center bg-blue-50/50 rounded-2xl border border-dashed border-blue-200">
                  <Box className="w-8 h-8 text-blue-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">Nem található pozíció</p>
                  <p className="text-xs text-slate-500 mt-1">Próbálja meg módosítani a keresést vagy szűrést.</p>
                </div>
              ) : (
                filteredPositions.map((pos) => {
                  const isSelected = selectedPositionId === pos.id;
                  const inv = positionInventoryMap.get(pos.id);
                  const qty = inv ? inv.totalQuantity : 0;
                  const itemsCount = inv ? inv.productMap.size : 0;

                  return (
                    <div
                      key={pos.id}
                      onClick={() => setSelectedPositionId(pos.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-700 shadow-md transform scale-[1.01]'
                          : 'bg-white hover:bg-blue-50/70 border-blue-100 text-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-black text-sm tracking-wide ${
                            isSelected ? 'text-white' : 'text-blue-950'
                          }`}>
                            {pos.name}
                          </span>
                          {pos.zone && (
                            <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                              isSelected
                                ? 'bg-white/20 text-blue-100 border border-white/20'
                                : 'bg-blue-100 text-blue-900 border border-blue-200'
                            }`}>
                              {pos.zone}
                            </span>
                          )}
                        </div>
                        <div className={`text-xs mt-0.5 truncate ${
                          isSelected ? 'text-blue-100' : 'text-slate-500'
                        }`}>
                          {itemsCount > 0 ? `${itemsCount} különböző termék itt tárolva` : 'Üres pozíció'}
                        </div>
                      </div>

                      {/* Stock Quantity Badge: Green if >0, Red if 0 */}
                      <div className="shrink-0">
                        <span
                          className={`font-mono font-black text-xs px-2.5 py-1 rounded-full border inline-flex items-center justify-center min-w-[54px] shadow-2xs ${
                            isSelected
                              ? qty > 0
                                ? 'bg-emerald-400 text-emerald-950 border-emerald-300'
                                : 'bg-red-400 text-red-950 border-red-300'
                              : qty > 0
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-red-100 text-red-900 border-red-300'
                          }`}
                        >
                          {qty} db
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Position Detail (7 cols on lg) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-blue-200 p-5 sm:p-6 shadow-sm space-y-6">
            {selectedPositionData ? (
              <>
                {/* Navigation focus banner if initialPositionId was provided */}
                {initialPositionId && initialPositionId === selectedPositionData.position.id && (
                  <div className="p-3.5 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Box className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-blue-950">
                          Kiválasztott raktári pozíció: {selectedPositionData.position.name}
                        </div>
                        <div className="text-[11px] text-blue-700">
                          Megjelenítve az adott pozícióban tárolt termékek és az eddigi tranzakciók listája.
                        </div>
                      </div>
                    </div>
                    {onBack && (
                      <button
                        type="button"
                        onClick={onBack}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center gap-1.5"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Vissza az előző nézetre</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Header of selected position */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-blue-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                        {selectedPositionData.position.zone || 'Raktár Pozíció'}
                      </span>
                      {selectedPositionData.position.isCustom && (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Egyedi pozíció
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-blue-950 mt-1">
                      {selectedPositionData.position.name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Stock badge: Red if 0, Green if >0 */}
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Jelenlegi darabszám
                      </span>
                      <span
                        className={`font-mono font-black text-2xl sm:text-3xl px-3 py-1 rounded-xl inline-block mt-0.5 border ${
                          selectedPositionData.totalQuantity > 0
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-red-50 text-red-800 border-red-300'
                        }`}
                      >
                        {selectedPositionData.totalQuantity} db
                      </span>
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddTx(selectedPositionData.position.id)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-sm transition-colors cursor-pointer"
                        title="Készletmozgás rögzítése ehhez a pozícióhoz"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Készletmozgás</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Stored Products Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-blue-950 flex items-center gap-2">
                      <Box className="w-5 h-5 text-blue-600" />
                      <span>Itt tárolt termékek ({selectedPositionData.storedProducts.length} féle)</span>
                    </h3>
                  </div>

                  {selectedPositionData.storedProducts.length === 0 ? (
                    <div className="p-6 text-center bg-blue-50/30 rounded-2xl border border-dashed border-blue-200">
                      <p className="text-sm font-bold text-slate-600">Ez a raktári pozíció jelenleg üres (0 db)</p>
                      <p className="text-xs text-slate-500 mt-1">
                        A pozíció létezik a rendszerben, de még nem került rá termék, vagy kivezetésre került.
                      </p>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenAddTx(selectedPositionData.position.id)}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Termék bevételezése ide</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedPositionData.storedProducts.map((item) => {
                        const prod = item.product;
                        const hasImg = prod && prod.images && prod.images.length > 0;
                        const thumb = hasImg ? prod.images[0] : null;

                        return (
                          <div
                            key={item.productId}
                            className="p-3.5 rounded-2xl border border-blue-100 bg-white hover:bg-blue-50/50 transition-colors flex items-center justify-between gap-3 shadow-2xs group cursor-pointer"
                            onClick={() => prod && onSelectProduct(prod)}
                            title={prod ? `${prod.name} (${prod.productId}) adatlapjának megnyitása` : item.productId}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 overflow-hidden flex items-center justify-center shrink-0">
                                {thumb ? (
                                  <img src={thumb} alt={prod?.name || item.productId} className="w-full h-full object-cover" />
                                ) : (
                                  <Box className="w-5 h-5 text-blue-600" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-sm text-blue-900 truncate">
                                    {item.productId}
                                  </span>
                                  {prod?.category && (
                                    <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.2 rounded-md">
                                      {prod.category}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-bold text-slate-800 truncate mt-0.5">
                                  {prod ? prod.name : 'Nem regisztrált termék'}
                                </div>
                                {prod?.factoryCode && (
                                  <div className="text-[11px] font-mono text-slate-500">
                                    Gyári: {prod.factoryCode}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <span
                                className={`font-mono font-black text-sm px-3 py-1 rounded-xl border ${
                                  item.quantity > 0
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-red-50 text-red-800 border-red-300'
                                }`}
                              >
                                {item.quantity} db
                              </span>

                              {canEdit && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenMoveProduct(
                                        item.productId,
                                        prod?.name || item.productId,
                                        selectedPositionData.position.id,
                                        item.quantity
                                      )
                                    }
                                    className="p-1.5 rounded-lg text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200 bg-indigo-50/60"
                                    title="Pozíció módosítása / Áthelyezés másik pozícióba"
                                  >
                                    <ArrowRightLeft className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteProductPosition(
                                        item.productId,
                                        selectedPositionData.position.id
                                      )
                                    }
                                    className="p-1.5 rounded-lg text-rose-700 hover:text-rose-900 hover:bg-rose-100 transition-colors cursor-pointer border border-rose-200 bg-rose-50/60"
                                    title="Pozíció törlése (termék eltávolítása erről a pozícióról)"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {prod && (
                                <button
                                  type="button"
                                  onClick={() => onSelectProduct(prod)}
                                  className="p-1.5 rounded-lg text-blue-600 hover:text-blue-900 hover:bg-blue-100 transition-colors cursor-pointer"
                                  title="Termék adatlapja"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Transaction History for this position */}
                <div className="space-y-3 pt-3 border-t border-blue-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-blue-950 flex items-center gap-2">
                      <History className="w-5 h-5 text-blue-600" />
                      <span>Eddigi tranzakciók ennél a pozíciónál ({selectedPositionData.transactions.length} db)</span>
                    </h3>
                  </div>

                  {selectedPositionData.transactions.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Még nem történt tranzakció ehhez a pozícióhoz.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-blue-200 bg-white">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-blue-50/80 text-blue-950 font-black border-b border-blue-200">
                            <th className="py-2.5 px-3">Dátum</th>
                            <th className="py-2.5 px-3">Termék ID</th>
                            <th className="py-2.5 px-3 text-right">Mennyiség</th>
                            <th className="py-2.5 px-3">Megjegyzés</th>
                            {canEdit && <th className="py-2.5 px-2 text-center w-12">Művelet</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100 font-medium text-slate-800">
                          {selectedPositionData.transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-blue-50/40 transition-colors">
                              <td className="py-2 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                                {tx.date}
                              </td>
                              <td className="py-2 px-3 font-mono font-black text-blue-950">
                                {tx.productId}
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
                              <td className="py-2 px-3 text-slate-600 text-[11px] truncate max-w-[200px]">
                                {tx.note || '—'}
                              </td>
                              {canEdit && (
                                <td className="py-2 px-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenMoveProduct(
                                          tx.productId,
                                          productLookup.get(tx.productId.trim().toLowerCase())?.name || tx.productId,
                                          selectedPositionData.position.id,
                                          tx.quantity
                                        )
                                      }
                                      className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                      title="Pozíció módosítása / Áthelyezés"
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteProductPosition(tx.productId, selectedPositionData.position.id)}
                                      className="p-1 text-amber-600 hover:text-amber-900 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                      title="Pozíció törlése ennél a terméknél"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTx(tx.id)}
                                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                      title="Tétel törlése"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-500">
                <Box className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-700">Válasszon ki egy raktári pozíciót a bal oldali listából</p>
                <p className="text-xs text-slate-500 mt-1">
                  Megtekintheti a pozícióban tárolt termékeket, jelenlegi darabszámot és az eddigi tranzakciókat.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Tab 2: Global Transactions Log View */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-3xl border border-blue-200 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-blue-950 flex items-center gap-2">
                <History className="w-6 h-6 text-blue-600" />
                <span>Raktári Tranzakciók & Készletmozgások Naplója</span>
              </h3>
              <p className="text-xs text-blue-700 mt-0.5">
                Minden bevételezés, kiadás és leltári korrekció időrendi sorrendben
              </p>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => handleOpenAddTx()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Új Készletmozgás</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-blue-200">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="bg-blue-50 text-blue-950 font-black border-b border-blue-200">
                  <th className="py-3 px-3 sm:px-4">Dátum</th>
                  <th className="py-3 px-3 sm:px-4">Pozíció ID</th>
                  <th className="py-3 px-3 sm:px-4">Termék ID</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Mennyiség</th>
                  <th className="py-3 px-3 sm:px-4">Megjegyzés</th>
                  {canEdit && <th className="py-3 px-2 text-center w-14">Művelet</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100 font-medium text-slate-800">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-2.5 px-3 sm:px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="py-2.5 px-3 sm:px-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPositionId(tx.positionId);
                          setActiveTab('positions');
                        }}
                        className="font-mono font-black text-blue-700 hover:text-blue-950 hover:underline cursor-pointer"
                        title="Ugrás erre a pozícióra"
                      >
                        {tx.positionId}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 sm:px-4 font-mono font-black text-slate-900">
                      {tx.productId}
                    </td>
                    <td className="py-2.5 px-3 sm:px-4 font-mono font-black text-right whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full inline-block border ${
                          tx.quantity > 0
                            ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                            : 'text-red-800 bg-red-50 border-red-300'
                        }`}
                      >
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} db
                      </span>
                    </td>
                    <td className="py-2.5 px-3 sm:px-4 text-slate-600 text-xs">
                      {tx.note || '—'}
                    </td>
                    {canEdit && (
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenMoveProduct(
                                tx.productId,
                                productLookup.get(tx.productId.trim().toLowerCase())?.name || tx.productId,
                                tx.positionId,
                                tx.quantity
                              )
                            }
                            className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Termék pozíciójának módosítása / Áthelyezés"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProductPosition(tx.productId, tx.positionId)}
                            className="p-1.5 text-amber-600 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Termék pozíciójának törlése"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTx(tx.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Készletmozgási tétel törlése"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Tab 3: CSV Import Section */}
      {activeTab === 'import' && (
        <div className="bg-white rounded-3xl border border-blue-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-blue-100 pb-4">
            <h3 className="text-xl font-black text-blue-950 flex items-center gap-2">
              <Upload className="w-6 h-6 text-blue-600" />
              <span>Raktári CSV Adatfeltöltés & Bővítés</span>
            </h3>
            <p className="text-xs text-blue-700 mt-1">
              Töltsön fel raktári pozíciókat tartalmazó CSV-t vagy a pozíciók készletmozgásait (Pozíció ID, Termék ID, Mennyiség, Dátum).
            </p>
          </div>

          {/* Import Type Selector */}
          <div className="flex gap-4">
            <label className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              importType === 'transactions'
                ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                : 'border-slate-200 hover:border-blue-300'
            }`}>
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="importType"
                  checked={importType === 'transactions'}
                  onChange={() => setImportType('transactions')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <span className="font-extrabold text-sm text-blue-950 block">
                    Készlet Tranzakciók CSV
                  </span>
                  <span className="text-xs text-slate-600">
                    Oszlopok: <code>Pozíció ID, Termék ID, Mennyiség, Dátum</code>
                  </span>
                </div>
              </div>
            </label>

            <label className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              importType === 'positions'
                ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                : 'border-slate-200 hover:border-blue-300'
            }`}>
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="importType"
                  checked={importType === 'positions'}
                  onChange={() => setImportType('positions')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <span className="font-extrabold text-sm text-blue-950 block">
                    Raktár Pozíciók CSV
                  </span>
                  <span className="text-xs text-slate-600">
                    Oszlop: <code>Pozíció ID</code>
                  </span>
                </div>
              </div>
            </label>
          </div>

          {/* Status Message */}
          {importStatus && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              importStatus.success
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-red-50 text-red-900 border-red-300'
            }`}>
              {importStatus.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span className="text-sm font-bold">{importStatus.message}</span>
            </div>
          )}

          {/* File input */}
          <div className="space-y-3">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setCsvFile(f || null);
                setImportStatus(null);
              }}
              className="block w-full text-xs text-slate-700 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border file:border-blue-300 file:text-xs file:font-black file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100 cursor-pointer"
            />

            {csvFile && (
              <button
                type="button"
                onClick={handleApplyCsv}
                disabled={isImporting}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isImporting ? 'Feldolgozás folyamatban...' : 'CSV Alkalmazása és Mentés'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 7. Modal: Add New Position */}
      {isAddPositionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-blue-200">
            <div className="bg-gradient-to-r from-blue-800 to-sky-700 text-white p-5 flex items-center justify-between">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                <span>Új Raktári Pozíció Létrehozása</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPositionOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPosition} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-blue-950 uppercase tracking-wide block mb-1">
                  Pozíció ID / Név *
                </label>
                <input
                  type="text"
                  required
                  value={newPositionName}
                  onChange={(e) => setNewPositionName(e.target.value)}
                  placeholder="pl. Raktár H17, Alkatrész Z9, DOBOZ 31..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 text-sm font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-black text-blue-950 uppercase tracking-wide block mb-1">
                  Raktár Zóna
                </label>
                <select
                  value={newPositionZone}
                  onChange={(e) => setNewPositionZone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 text-sm font-bold focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                >
                  <option value="A-F Fő rács">A-F Fő rács</option>
                  <option value="Alkatrész Zóna">Alkatrész Zóna</option>
                  <option value="Polcok">Polcok</option>
                  <option value="Dobozok">Dobozok</option>
                  <option value="Üzem & Részlegek">Üzem & Részlegek</option>
                  <option value="Raktár Terület">Raktár Terület</option>
                  <option value="Egyéb Pozíciók">Egyéb Pozíciók</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPositionOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md cursor-pointer"
                >
                  Pozíció Hozzáadása
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal: Add New Transaction / Movement */}
      {isAddTxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-blue-200">
            <div className="bg-gradient-to-r from-blue-800 to-sky-700 text-white p-5 flex items-center justify-between">
              <h3 className="text-lg font-black flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-300" />
                <span>Készletmozgás Rögzítése</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTxOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTx} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-blue-950 uppercase tracking-wide block mb-1">
                  Raktár Pozíció ID * (Válasszon a pozíciókból vagy adjon meg újat)
                </label>
                <div className="flex gap-2">
                  <select
                    value={positions.some((p) => p.id === txPositionId) ? txPositionId : ''}
                    onChange={(e) => {
                      if (e.target.value) setTxPositionId(e.target.value);
                    }}
                    className="w-1/2 px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50/50 font-mono text-xs font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Válasszon pozíciót --</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.zone ? `(${p.zone})` : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    list="positions-datalist"
                    value={txPositionId}
                    onChange={(e) => setTxPositionId(e.target.value)}
                    placeholder="vagy írja be ide..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 font-mono text-sm font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <datalist id="positions-datalist">
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.zone ? `(${p.zone})` : ''}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="text-xs font-black text-blue-950 uppercase tracking-wide block mb-1">
                  Termék ID / Cikkszám * (Válasszon a termékekből vagy írja be)
                </label>
                <input
                  type="text"
                  required
                  list="products-datalist"
                  value={txProductId}
                  onChange={(e) => setTxProductId(e.target.value)}
                  placeholder="pl. 2182120013 vagy 40107.00.33..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 font-mono text-sm font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                />
                <datalist id="products-datalist">
                  {products.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.productId} - {p.name}
                    </option>
                  ))}
                </datalist>

                {/* Termék meglévő pozícióinak megjelenítése és gyors műveletek */}
                {(() => {
                  const normP = txProductId.trim().toLowerCase();
                  if (!normP) return null;
                  const currentPositions = Array.from(
                    new Set(
                      transactions
                        .filter((t) => t.productId.trim().toLowerCase() === normP && t.positionId)
                        .map((t) => t.positionId)
                    )
                  );
                  if (currentPositions.length === 0) return null;
                  return (
                    <div className="mt-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-1">
                      <div className="font-bold text-blue-950 flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-blue-700" />
                        <span>Termék meglévő raktári pozíciói:</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {currentPositions.map((pos) => (
                          <div
                            key={pos}
                            className="inline-flex items-center gap-1 bg-white border border-blue-300 px-2.5 py-1 rounded-lg shadow-2xs"
                          >
                            <button
                              type="button"
                              onClick={() => setTxPositionId(pos)}
                              className="font-mono font-black text-blue-900 hover:text-blue-700 hover:underline cursor-pointer"
                              title="Kiválasztás ehhez a mozgáshoz"
                            >
                              {pos}
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddTxOpen(false);
                                  handleOpenMoveProduct(
                                    txProductId,
                                    productLookup.get(normP)?.name || txProductId,
                                    pos,
                                    0
                                  );
                                }}
                                className="text-indigo-600 hover:text-indigo-900 p-0.5 cursor-pointer ml-1"
                                title="Pozíció megváltoztatása / áthelyezés"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddTxOpen(false);
                                  handleDeleteProductPosition(txProductId, pos);
                                }}
                                className="text-rose-600 hover:text-rose-900 p-0.5 cursor-pointer"
                                title="Pozíció törlése"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-blue-950 uppercase tracking-wide block mb-1">
                    Mennyiség (+ vagy -) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={txQuantity}
                    onChange={(e) => setTxQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="1 vagy -1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 font-mono text-sm font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-blue-950 uppercase tracking-wide block mb-1">
                    Dátum *
                  </label>
                  <input
                    type="text"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    placeholder="2024. 01. 01."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 font-mono text-sm font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-blue-950 uppercase tracking-wide block mb-1">
                  Megjegyzés (opcionális)
                </label>
                <input
                  type="text"
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  placeholder="pl. Bevételezés, Kiadás, Leltár..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTxOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTx}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingTx ? 'Mentés...' : 'Tranzakció Rögzítése'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Modal: Move / Change Product Position */}
      {movingProductItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-blue-200">
            <div className="bg-gradient-to-r from-blue-800 to-indigo-800 text-white p-5 flex items-center justify-between">
              <h3 className="text-lg font-black flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-300" />
                <span>Termék Pozíciójának Módosítása</span>
              </h3>
              <button
                type="button"
                onClick={() => setMovingProductItem(null)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteMoveProduct} className="p-6 space-y-4">
              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Áthelyezendő termék:</span>
                <div className="font-mono font-black text-sm text-blue-950">
                  {movingProductItem.productId}
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {movingProductItem.productName}
                </div>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                  <span>Jelenlegi pozíció:</span>
                  <span className="font-mono font-black px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                    {movingProductItem.currentPositionId}
                  </span>
                  <span className="font-mono font-bold text-slate-500">
                    ({movingProductItem.quantity} db)
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-blue-950 uppercase tracking-wide block mb-1">
                  Új Raktári Pozíció ID * (Válasszon vagy írjon be egy újat)
                </label>
                <div className="flex gap-2">
                  <select
                    value={positions.some((p) => p.id === targetMovePositionId) ? targetMovePositionId : ''}
                    onChange={(e) => {
                      if (e.target.value) setTargetMovePositionId(e.target.value);
                    }}
                    className="w-1/2 px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50/50 font-mono text-xs font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Válasszon --</option>
                    {positions
                      .filter((p) => p.id.toLowerCase() !== movingProductItem.currentPositionId.toLowerCase())
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.zone ? `(${p.zone})` : ''}
                        </option>
                      ))}
                  </select>
                  <input
                    type="text"
                    required
                    list="move-positions-datalist"
                    value={targetMovePositionId}
                    onChange={(e) => setTargetMovePositionId(e.target.value)}
                    placeholder="vagy új pozíció..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 font-mono text-sm font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <datalist id="move-positions-datalist">
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.zone ? `(${p.zone})` : ''}
                    </option>
                  ))}
                </datalist>
                <p className="text-[11px] text-slate-500 mt-1">
                  A termék ezen a raktári helyen szereplő készlete és tranzakciói automatikusan átkerülnek az új pozícióra.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const prodId = movingProductItem.productId;
                    const posId = movingProductItem.currentPositionId;
                    setMovingProductItem(null);
                    handleDeleteProductPosition(prodId, posId);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                  title="Pozíció törlése ennél a terméknél"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Pozíció Törlése</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMovingProductItem(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingMove || !targetMovePositionId.trim()}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingMove ? 'Áthelyezés...' : 'Pozíció Módosítása'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
