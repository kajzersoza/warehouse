import React, { useState } from 'react';
import {
  Wrench,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Puzzle,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { MaintenanceRecord, MaintenanceStatus } from '../types/maintenance';
import { Product } from '../types/product';

interface ProductMaintenanceSectionProps {
  productId: string;
  productName?: string;
  maintenances: MaintenanceRecord[];
  allProducts: Product[];
  canEdit?: boolean;
  onSelectProduct?: (product: Product) => void;
  onSaveMaintenance: (record: Partial<MaintenanceRecord> & { productId: string }) => Promise<void>;
  onDeleteMaintenance: (recordId: string) => Promise<void>;
  onDeleteAllForProduct?: (productId: string) => Promise<void>;
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
}

export const ProductMaintenanceSection: React.FC<ProductMaintenanceSectionProps> = ({
  productId,
  maintenances,
  allProducts,
  canEdit = true,
  onSelectProduct,
  onSaveMaintenance,
  onDeleteMaintenance,
  onDeleteAllForProduct,
  isAddModalOpen = false,
  onCloseAddModal
}) => {
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Form states based on exact requested fields: Termék ID, Status, Leírás, Change Item, Date
  const [status, setStatus] = useState<MaintenanceStatus>('Pass');
  const [description, setDescription] = useState('');
  const [changeItem, setChangeItem] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Change item search state
  const [changeItemSearch, setChangeItemSearch] = useState('');
  const [isSelectingChangeItem, setIsSelectingChangeItem] = useState(false);

  const showModal = isAddModalOpen || internalModalOpen;

  const handleOpenNew = () => {
    setEditingRecord(null);
    setStatus('Pass');
    setDescription('');
    setChangeItem('');
    setChangeItemSearch('');
    setDate(new Date().toISOString().split('T')[0]);
    setInternalModalOpen(true);
  };

  const handleOpenEdit = (rec: MaintenanceRecord) => {
    setEditingRecord(rec);
    setStatus(rec.status || 'Pass');
    setDescription(rec.description || '');
    setChangeItem(rec.changeItem || '');
    setChangeItemSearch(rec.changeItem || '');
    setDate(rec.date || new Date().toISOString().split('T')[0]);
    setInternalModalOpen(true);
  };

  const handleClose = () => {
    setInternalModalOpen(false);
    setEditingRecord(null);
    setIsSelectingChangeItem(false);
    if (onCloseAddModal) onCloseAddModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    setIsSubmitting(true);
    try {
      await onSaveMaintenance({
        id: editingRecord?.id,
        productId,
        status: status.trim() || 'Pass',
        description: description.trim() || undefined,
        changeItem: changeItem.trim() || undefined,
        date: date.trim() || new Date().toISOString().split('T')[0]
      });
      handleClose();
    } catch (err) {
      console.error('Failed to save maintenance:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Biztosan törölni szeretné ezt a karbantartási tételt?')) return;
    try {
      await onDeleteMaintenance(id);
    } catch (err) {
      console.error('Failed to delete maintenance:', err);
    }
  };

  const handleDeleteAllForThisProduct = async () => {
    if (!onDeleteAllForProduct) return;
    const confirmMsg = `Biztosan törölni szeretné a(z) ${productId} termékhez tartozó MINDEN (${maintenances.length} db) karbantartási tételt?`;
    if (!window.confirm(confirmMsg)) return;
    setIsDeletingAll(true);
    try {
      await onDeleteAllForProduct(productId);
    } catch (err) {
      console.error('Failed to delete product maintenances:', err);
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Fast O(1) map for changeItem lookup
  const productMap = React.useMemo(() => {
    const map = new Map<string, Product>();
    if (!Array.isArray(allProducts)) return map;
    for (const p of allProducts) {
      if (!p) continue;
      if (p.productId) map.set(p.productId.trim().toLowerCase(), p);
      if (p.factoryCode) map.set(p.factoryCode.trim().toLowerCase(), p);
      if (p.id) map.set(p.id.trim().toLowerCase(), p);
    }
    return map;
  }, [allProducts]);

  // Helper to find Product by changeItem string
  const findProductByChangeItem = (itemId?: string): Product | undefined => {
    if (!itemId) return undefined;
    return productMap.get(itemId.trim().toLowerCase());
  };

  // Filtered products for change item selector
  const filteredParts = React.useMemo(() => {
    if (!changeItemSearch.trim()) return (allProducts || []).slice(0, 15);
    const q = changeItemSearch.toLowerCase();
    return (allProducts || [])
      .filter(
        (p) =>
          (p.productId && p.productId.toLowerCase().includes(q)) ||
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.factoryCode && p.factoryCode.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [allProducts, changeItemSearch]);

  // Alapértelmezetten a dátum szerint rendezve: a legfrissebb bejegyzés legyen legfelül
  const sortedMaintenances = React.useMemo(() => {
    return [...(maintenances || [])].sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
        return timeB - timeA;
      }
      return (b.date || '').toString().localeCompare((a.date || '').toString());
    });
  }, [maintenances]);

  // Status badge styling helper
  // "ha a statusz : Pass akkor zöld legyen a pass felirat ,ha Repair akkor citromsárga legyen a felirat, ha fail akkor piros"
  const renderStatusBadge = (statusVal?: string) => {
    const s = (statusVal || 'Pass').trim();
    const lower = s.toLowerCase();

    if (lower === 'pass' || lower === 'megfelelt') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border-2 border-emerald-500 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-emerald-600 font-black">Pass</span>
        </span>
      );
    }

    if (lower === 'repair' || lower === 'javítás' || lower === 'javitas') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-stone-900 text-yellow-300 border-2 border-yellow-400 shadow-2xs">
          <Wrench className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="text-yellow-300 font-black">Repair</span>
        </span>
      );
    }

    if (lower === 'fail' || lower === 'nem felelt meg' || lower === 'hiba') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-red-50 text-red-600 border-2 border-red-500 shadow-2xs">
          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-red-600 font-black">Fail</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-stone-100 text-stone-800 border border-stone-300">
        <span>{s}</span>
      </span>
    );
  };

  return (
    <>
      {/* KARBANTARTÁS KÁRTYA - BARNA SZÍNŰ (BROWN THEME) */}
      <section className="border-2 sm:border-3 border-[#7B4B29] bg-white rounded-2xl shadow-sm overflow-hidden transition-all">
        {/* Fejléc: Barna és árnyalatai */}
        <div className="bg-gradient-to-r from-[#5C381E] via-[#7B4B29] to-[#4A2810] text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#5C381E]/60 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-950/60 border border-amber-600/40 flex items-center justify-center shrink-0 shadow-sm text-amber-200">
              <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Karbantartás
                </h2>
                <span className="bg-amber-100 text-amber-950 border border-amber-300 font-black text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                  {maintenances.length} bejegyzés
                </span>
              </div>
              <p className="text-xs sm:text-sm text-amber-100/90 mt-0.5 font-medium">
                Karbantartási státuszok és alkatrészcserék ({productId})
              </p>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2">
              {maintenances.length > 0 && onDeleteAllForProduct && (
                <button
                  type="button"
                  onClick={handleDeleteAllForThisProduct}
                  disabled={isDeletingAll}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-950/40 hover:bg-rose-900/60 text-amber-200 hover:text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer border border-amber-600/50 hover:border-rose-400"
                  title="Összes karbantartás törlése ennél a terméknél"
                >
                  <Trash2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Összes törlése ({maintenances.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenNew}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-white text-amber-950 font-black text-xs sm:text-sm transition-colors cursor-pointer shadow-xs border border-amber-300"
                title="Új karbantartási tétel rögzítése"
              >
                <Plus className="w-4 h-4 text-[#7B4B29]" />
                <span>+ Új Karbantartás</span>
              </button>
            </div>
          )}
        </div>

        {/* TÁBLÁZAT: Termék ID | Státusz | Leírás | Alkatrész csere | Dátum | Művelet */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead>
              <tr className="bg-amber-50/70 text-[#5C381E] border-b-2 border-[#DEB887] text-xs font-black uppercase tracking-wider">
                <th className="py-3 px-3.5 sm:px-4">Termék ID</th>
                <th className="py-3 px-3 sm:px-4">Státusz</th>
                <th className="py-3 px-3 sm:px-4">Leírás</th>
                <th className="py-3 px-3 sm:px-4">Alkatrész csere</th>
                <th className="py-3 px-3 sm:px-4">Dátum</th>
                {canEdit && <th className="py-3 px-2 text-center w-20">Művelet</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100/80 text-stone-800">
              {sortedMaintenances.map((rec) => {
                const resolvedPart = findProductByChangeItem(rec.changeItem);

                return (
                  <tr
                    key={rec.id}
                    className="hover:bg-amber-50/40 transition-colors group"
                  >
                    {/* 1. Termék ID */}
                    <td className="py-3 px-3.5 sm:px-4 font-mono font-black text-[#5C381E] whitespace-nowrap">
                      {rec.productId}
                    </td>

                    {/* 2. Status: Pass (zöld) / Repair (citromsárga) / Fail (piros) */}
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      {renderStatusBadge(rec.status)}
                    </td>

                    {/* 3. Leírás */}
                    <td className="py-3 px-3 sm:px-4 text-stone-700 font-medium">
                      {rec.description ? (
                        <div className="max-w-md leading-relaxed">{rec.description}</div>
                      ) : (
                        <span className="text-stone-400 italic">—</span>
                      )}
                    </td>

                    {/* 4. Change Item: Kattintható ugrás a termékre */}
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      {rec.changeItem ? (
                        resolvedPart ? (
                          <button
                            type="button"
                            onClick={() => onSelectProduct && onSelectProduct(resolvedPart)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#7B4B29] hover:bg-[#5C381E] text-white font-mono font-bold text-xs transition-colors cursor-pointer shadow-xs group/btn"
                            title={`Ugrás a(z) ${resolvedPart.name || resolvedPart.productId} termék adatlapjára`}
                          >
                            <Puzzle className="w-3.5 h-3.5 text-amber-200" />
                            <span className="underline decoration-amber-300 font-black">
                              {rec.changeItem}
                            </span>
                            {resolvedPart.name && resolvedPart.name !== rec.changeItem && (
                              <span className="text-amber-200 font-sans font-normal truncate max-w-[150px]">
                                ({resolvedPart.name})
                              </span>
                            )}
                            <ExternalLink className="w-3.5 h-3.5 text-amber-200 group-hover/btn:translate-x-0.5 transition-transform shrink-0" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const found = allProducts.find(
                                (p) =>
                                  p.productId.toLowerCase() === rec.changeItem!.trim().toLowerCase()
                              );
                              if (found && onSelectProduct) onSelectProduct(found);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-mono font-bold text-xs border border-amber-300 transition-colors cursor-pointer"
                            title={`Keresés: ${rec.changeItem}`}
                          >
                            <Puzzle className="w-3.5 h-3.5 text-amber-700" />
                            <span className="font-black">{rec.changeItem}</span>
                            <ExternalLink className="w-3 h-3 text-amber-700 shrink-0" />
                          </button>
                        )
                      ) : (
                        <span className="text-stone-400 italic">—</span>
                      )}
                    </td>

                    {/* 5. Date */}
                    <td className="py-3 px-3 sm:px-4 font-mono font-bold text-stone-700 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{rec.date}</span>
                      </span>
                    </td>

                    {/* Műveletek */}
                    {canEdit && (
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rec)}
                            className="p-1.5 text-stone-600 hover:text-[#7B4B29] hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                            title="Szerkesztés"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(rec.id)}
                            className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Törlés"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL: ÚJ / SZERKESZTETT KARBANTARTÁS RÖGZÍTÉSE */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-[#7B4B29] w-full max-w-lg overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#5C381E] via-[#7B4B29] to-[#4A2810] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-600/40 flex items-center justify-center text-amber-200">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black leading-tight">
                    {editingRecord ? 'Karbantartás Szerkesztése' : 'Új Karbantartás Rögzítése'}
                  </h3>
                  <p className="text-xs text-amber-200">
                    Termék ID: <span className="font-mono font-bold text-white">{productId}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
              {/* 1. Termék ID (rögzített) */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Termék ID
                </label>
                <input
                  type="text"
                  readOnly
                  value={productId}
                  className="w-full px-3 py-2 border-2 border-stone-200 rounded-xl bg-stone-100 font-mono font-black text-stone-700 cursor-not-allowed"
                />
              </div>

              {/* 2. Status: Pass (zöld), Repair (citromsárga), Fail (piros) */}
              <div>
                <label className="block font-bold text-stone-700 mb-1.5">
                  Status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('Pass')}
                    className={`py-2.5 px-3 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      status.toLowerCase() === 'pass'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Pass</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('Repair')}
                    className={`py-2.5 px-3 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      status.toLowerCase() === 'repair'
                        ? 'bg-yellow-400 text-yellow-950 border-yellow-500 shadow-md ring-2 ring-yellow-300'
                        : 'bg-yellow-100 text-yellow-900 border-yellow-300 hover:bg-yellow-200'
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Repair</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('Fail')}
                    className={`py-2.5 px-3 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      status.toLowerCase() === 'fail'
                        ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-300'
                        : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Fail</span>
                  </button>
                </div>
              </div>

              {/* 3. Leírás */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Leírás
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Karbantartási részletek, észrevételek, hiba oka..."
                  className="w-full px-3 py-2 border-2 border-stone-300 rounded-xl focus:border-[#7B4B29] outline-hidden text-stone-900 font-medium"
                />
              </div>

              {/* 4. Alkatrész csere (Change Item) */}
              <div className="border-2 border-amber-200 bg-amber-50/50 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-[#7B4B29] flex items-center gap-1.5">
                    <Puzzle className="w-4 h-4 text-[#7B4B29]" />
                    <span>Alkatrész csere</span>
                  </label>
                  {changeItem && (
                    <button
                      type="button"
                      onClick={() => {
                        setChangeItem('');
                        setChangeItemSearch('');
                      }}
                      className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
                    >
                      Törlés
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={changeItem}
                    onChange={(e) => {
                      setChangeItem(e.target.value);
                      setChangeItemSearch(e.target.value);
                      setIsSelectingChangeItem(true);
                    }}
                    onFocus={() => setIsSelectingChangeItem(true)}
                    placeholder="pl. XINT000284 vagy keresés a katalógusból..."
                    className="w-full px-3 py-2 border-2 border-amber-300 rounded-xl focus:border-[#7B4B29] outline-hidden font-mono font-bold text-stone-900 bg-white"
                  />

                  {isSelectingChangeItem && filteredParts.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-amber-300 rounded-xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-stone-100">
                      <div className="p-1.5 bg-amber-50 flex items-center justify-between text-[11px] font-bold text-amber-900">
                        <span>Válasszon alkatrészt a katalógusból:</span>
                        <button
                          type="button"
                          onClick={() => setIsSelectingChangeItem(false)}
                          className="hover:underline cursor-pointer"
                        >
                          Bezárás
                        </button>
                      </div>
                      {filteredParts.map((p) => (
                        <div
                          key={p.productId}
                          onClick={() => {
                            setChangeItem(p.productId);
                            setIsSelectingChangeItem(false);
                          }}
                          className="p-2 hover:bg-amber-100/60 cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-mono font-black text-[#7B4B29]">
                              {p.productId}
                            </span>
                            <span className="text-stone-700 ml-2 font-medium">
                              {p.name}
                            </span>
                          </div>
                          {p.category && (
                            <span className="text-[10px] font-bold bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                              {p.category}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Dátum */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Dátum <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-stone-300 rounded-xl focus:border-[#7B4B29] outline-hidden font-mono font-bold text-stone-900"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 font-bold text-stone-800 transition-colors cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#7B4B29] hover:bg-[#5C381E] text-white font-extrabold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Mentés...' : 'Karbantartás Mentése'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
