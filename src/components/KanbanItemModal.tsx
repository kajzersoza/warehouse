import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Search,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Package,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Product } from '../types/product';
import { KanbanItem, KanbanStatus, KANBAN_STATUS_CONFIG } from '../types/kanban';
import { generateKanbanId } from '../services/kanbanService';

interface KanbanItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProductId?: string;
  initialItem?: KanbanItem | null;
  products: Product[];
  onSave: (item: KanbanItem) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const KanbanItemModal: React.FC<KanbanItemModalProps> = ({
  isOpen,
  onClose,
  initialProductId,
  initialItem,
  products = [],
  onSave,
  onDelete
}) => {
  // Selected product IDs
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  // Status
  const [status, setStatus] = useState<KanbanStatus>('new');
  // Megjegyzés
  const [note, setNote] = useState<string>('');
  // Product Search input
  const [productSearch, setProductSearch] = useState<string>('');
  // Custom product id input
  const [customIdInput, setCustomIdInput] = useState<string>('');
  // Loading & error
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize form state
  useEffect(() => {
    if (initialItem) {
      setSelectedProductIds([...initialItem.productIds]);
      setStatus(initialItem.status || 'new');
      setNote(initialItem.note || '');
    } else {
      const initialList: string[] = [];
      if (initialProductId && initialProductId.trim()) {
        initialList.push(initialProductId.trim());
      }
      setSelectedProductIds(initialList);
      setStatus('new');
      setNote('');
    }
    setProductSearch('');
    setCustomIdInput('');
    setErrorMessage(null);
  }, [initialItem, initialProductId, isOpen]);

  // Create quick lookup map for products
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => {
      if (p.productId) map.set(p.productId.trim().toLowerCase(), p);
    });
    return map;
  }, [products]);

  // Search results for adding more products
  const searchResults = useMemo(() => {
    if (!productSearch.trim()) return [];
    const query = productSearch.trim().toLowerCase();
    const alreadySelectedSet = new Set(selectedProductIds.map((id) => id.toLowerCase()));

    return products
      .filter((p) => {
        if (alreadySelectedSet.has(p.productId.trim().toLowerCase())) return false;
        const idMatch = p.productId.toLowerCase().includes(query);
        const nameMatch = p.name ? p.name.toLowerCase().includes(query) : false;
        const factoryMatch = p.factoryCode ? p.factoryCode.toLowerCase().includes(query) : false;
        const catMatch = p.category ? p.category.toLowerCase().includes(query) : false;
        return idMatch || nameMatch || factoryMatch || catMatch;
      })
      .slice(0, 15);
  }, [productSearch, products, selectedProductIds]);

  if (!isOpen) return null;

  // Add product to list
  const handleAddProduct = (prodId: string) => {
    const trimmed = prodId.trim();
    if (!trimmed) return;
    const exists = selectedProductIds.some(
      (id) => id.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      setSelectedProductIds([...selectedProductIds, trimmed]);
      setProductSearch('');
    }
  };

  // Remove product from list
  const handleRemoveProduct = (prodId: string) => {
    setSelectedProductIds(selectedProductIds.filter((id) => id !== prodId));
  };

  // Add custom entered product ID
  const handleAddCustomId = () => {
    if (!customIdInput.trim()) return;
    handleAddProduct(customIdInput.trim());
    setCustomIdInput('');
  };

  // Save handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductIds.length === 0) {
      setErrorMessage('Kérjük, válassz ki legalább egy terméket a Kanban tételhez!');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const now = new Date().toISOString();
      const itemToSave: KanbanItem = {
        id: initialItem?.id || generateKanbanId(),
        productIds: selectedProductIds,
        status: status,
        note: note.trim(),
        createdAt: initialItem?.createdAt || now,
        updatedAt: now
      };

      await onSave(itemToSave);
      onClose();
    } catch (err: any) {
      console.error('Hiba a Kanban tétel mentésekor:', err);
      setErrorMessage(err?.message || 'Hiba történt a mentés során.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!initialItem?.id || !onDelete) return;
    if (window.confirm('Biztosan törölni szeretnéd ezt a tételt a Kanban tábláról?')) {
      setIsSaving(true);
      try {
        await onDelete(initialItem.id);
        onClose();
      } catch (err: any) {
        console.error('Hiba a Kanban tétel törlésekor:', err);
        setErrorMessage(err?.message || 'Hiba történt a törlés során.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#2F223A] to-[#3A5D6B] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Layers className="w-5 h-5 text-[#79B6B8]" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                {initialItem ? 'Kanban Tétel Szerkesztése' : 'Hozzáadás a Kanbanhoz'}
              </h2>
              <p className="text-xs text-white/80">
                Egyszerű Kanban feladatkezelés és termék-összerendelés
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Bezárás"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 font-bold">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Státusz kiválasztása (Új, Folyamatban, Befejezve) */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
              Státusz választása <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {/* Új (Piros) */}
              <button
                type="button"
                onClick={() => setStatus('new')}
                className={`py-3 px-3 rounded-2xl border-2 font-black text-sm sm:text-base flex flex-col sm:flex-row items-center justify-center gap-2 transition-all cursor-pointer ${
                  status === 'new'
                    ? 'bg-red-50 border-red-500 text-red-700 shadow-md ring-2 ring-red-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50/30'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-xs shrink-0" />
                <span>Új</span>
                <span className="text-[10px] font-bold text-red-600/70 hidden sm:inline">(Piros)</span>
              </button>

              {/* Folyamatban (Kék) */}
              <button
                type="button"
                onClick={() => setStatus('in_progress')}
                className={`py-3 px-3 rounded-2xl border-2 font-black text-sm sm:text-base flex flex-col sm:flex-row items-center justify-center gap-2 transition-all cursor-pointer ${
                  status === 'in_progress'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md ring-2 ring-blue-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/30'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-xs shrink-0" />
                <span>Folyamatban</span>
                <span className="text-[10px] font-bold text-blue-600/70 hidden sm:inline">(Kék)</span>
              </button>

              {/* Befejezve (Zöld) */}
              <button
                type="button"
                onClick={() => setStatus('completed')}
                className={`py-3 px-3 rounded-2xl border-2 font-black text-sm sm:text-base flex flex-col sm:flex-row items-center justify-center gap-2 transition-all cursor-pointer ${
                  status === 'completed'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-md ring-2 ring-emerald-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-xs shrink-0" />
                <span>Befejezve</span>
                <span className="text-[10px] font-bold text-emerald-700/70 hidden sm:inline">(Zöld)</span>
              </button>
            </div>
          </div>

          {/* 2. Kiválasztott Termékek listája */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                Hozzárendelt Termékek ({selectedProductIds.length} db) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-slate-500">
                Több termék is összekapcsolható
              </span>
            </div>

            {selectedProductIds.length === 0 ? (
              <div className="p-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 text-center text-amber-800 text-xs font-bold">
                Még nincs termék hozzáadva. Használd az alábbi keresőt más termékek hozzáadásához!
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-44 overflow-y-auto">
                {selectedProductIds.map((pId) => {
                  const prod = productMap.get(pId.toLowerCase());
                  return (
                    <div
                      key={pId}
                      className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-[#3A5D6B] px-3 py-1.5 rounded-xl shadow-2xs group"
                    >
                      <Package className="w-3.5 h-3.5 text-[#3A5D6B] shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="font-mono font-black text-xs text-[#1e6075]">
                          {pId}
                        </span>
                        {prod?.name && (
                          <span className="text-[10px] font-bold text-slate-500 truncate max-w-[130px]">
                            {prod.name}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(pId)}
                        className="ml-1 p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Eltávolítás ebből a tételből"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Kereső más termékek hozzáadásához */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
            <label className="block text-xs font-black uppercase tracking-wider text-[#3A5D6B]">
              Más termékek keresése & hozzáadása
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Kezdj el gépelni a kereséshez (ID, Név, Gyári kód)..."
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 focus:border-[#3A5D6B] rounded-xl text-sm font-medium outline-hidden"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Keresési találatok dropdown / lista */}
            {searchResults.length > 0 && (
              <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-lg max-h-52 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map((p) => (
                  <div
                    key={p.productId}
                    className="p-2.5 hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        {p.images && p.images[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono font-black text-xs text-[#1e6075] block truncate">
                          {p.productId}
                        </span>
                        <span className="text-[11px] text-slate-600 font-medium block truncate">
                          {p.name} {p.factoryCode ? `(${p.factoryCode})` : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddProduct(p.productId)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#3A5D6B] hover:bg-[#2F223A] text-white text-xs font-bold shrink-0 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Hozzáadás</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {productSearch.trim() && searchResults.length === 0 && (
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center justify-between gap-2">
                <span>Nincs találat a raktárban erre a keresésre.</span>
                <button
                  type="button"
                  onClick={() => handleAddProduct(productSearch.trim())}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer"
                >
                  + Hozzáadás mint új ID
                </button>
              </div>
            )}
          </div>

          {/* 4. Megjegyzés mező ("---- megjegyzés ---", egyszerű kevés megjegyzéssel) */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
              Megjegyzés
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Rövid megjegyzés vagy feladat leírás (pl. Kábelkorbács szerelés, tesztelés, alkatrész hiány)..."
              className="w-full p-3.5 bg-slate-50 border border-slate-300 focus:border-[#3A5D6B] focus:bg-white rounded-2xl text-sm font-medium outline-hidden transition-all"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {initialItem && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-700 hover:bg-red-100 text-xs sm:text-sm font-black transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Törlés a Kanbanból</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Mégse
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3A5D6B] hover:bg-[#2F223A] text-white text-xs sm:text-sm font-black transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSaving ? (
                <span>Mentés...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 text-[#79B6B8]" />
                  <span>Mentés a Kanbanba</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
