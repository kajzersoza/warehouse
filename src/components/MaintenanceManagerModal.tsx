import React, { useState, useMemo, useEffect } from 'react';
import {
  Wrench,
  Trash2,
  Search,
  X,
  Calendar,
  Puzzle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  UploadCloud,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { MaintenanceRecord } from '../types/maintenance';
import { Product } from '../types/product';
import { exportMaintenancesToCsv } from '../utils/csvHelper';

interface MaintenanceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  maintenances: MaintenanceRecord[];
  allProducts: Product[];
  onSelectProduct?: (product: Product) => void;
  onDeleteMaintenance: (recordId: string) => Promise<void>;
  onDeleteAllMaintenances: () => Promise<void>;
  onNavigateToCsvImport?: () => void;
  canEdit?: boolean;
}

export const MaintenanceManagerModal: React.FC<MaintenanceManagerModalProps> = ({
  isOpen,
  onClose,
  maintenances = [],
  allProducts = [],
  onSelectProduct,
  onDeleteMaintenance,
  onDeleteAllMaintenances,
  onNavigateToCsvImport,
  canEdit = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pass' | 'Repair' | 'Fail'>('ALL');
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pagination states to guarantee ultra-fast, zero-freeze rendering
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset to first page whenever search query or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  // Fast O(1) product map for instant lookup of product and change items
  const productMap = useMemo(() => {
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

  const findProduct = (code?: string): Product | undefined => {
    if (!code) return undefined;
    return productMap.get(code.trim().toLowerCase());
  };

  const safeMaintenances = Array.isArray(maintenances) ? maintenances : [];

  // Status counts (fully null-safe)
  const passCount = safeMaintenances.filter((m) => {
    if (!m) return false;
    const s = (m.status || '').toString().trim().toLowerCase();
    return s === 'pass' || s === 'megfelelt';
  }).length;

  const repairCount = safeMaintenances.filter((m) => {
    if (!m) return false;
    const s = (m.status || '').toString().trim().toLowerCase();
    return s === 'repair' || s === 'javítás' || s === 'javitas';
  }).length;

  const failCount = safeMaintenances.filter((m) => {
    if (!m) return false;
    const s = (m.status || '').toString().trim().toLowerCase();
    return s === 'fail' || s === 'nem felelt meg' || s === 'hiba';
  }).length;

  // Filtered and sorted records: Dátum szerint rendezve, a legfrissebb legfelül!
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return safeMaintenances
      .filter((rec) => {
        if (!rec) return false;

        // Status filter
        if (statusFilter !== 'ALL') {
          const s = (rec.status || 'Pass').toString().trim().toLowerCase();
          if (statusFilter === 'Pass' && s !== 'pass' && s !== 'megfelelt') return false;
          if (statusFilter === 'Repair' && s !== 'repair' && s !== 'javítás' && s !== 'javitas') return false;
          if (statusFilter === 'Fail' && s !== 'fail' && s !== 'nem felelt meg' && s !== 'hiba') return false;
        }

        // Search filter
        if (!q) return true;
        const inPid = (rec.productId || '').toString().toLowerCase().includes(q);
        const inDesc = rec.description ? rec.description.toString().toLowerCase().includes(q) : false;
        const inChange = rec.changeItem ? rec.changeItem.toString().toLowerCase().includes(q) : false;
        const inDate = (rec.date || '').toString().includes(q);
        return inPid || inDesc || inChange || inDate;
      })
      .sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
          return timeB - timeA; // newest date first
        }
        return (b.date || '').toString().localeCompare((a.date || '').toString());
      });
  }, [safeMaintenances, statusFilter, searchQuery]);

  // Paginated records
  const totalItems = filteredRecords.length;
  const effectivePageSize = pageSize === -1 ? (totalItems || 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    if (pageSize === -1) return filteredRecords;
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return filteredRecords.slice(startIdx, startIdx + pageSize);
  }, [filteredRecords, safeCurrentPage, pageSize]);

  if (!isOpen) return null;

  const handleDeleteSingle = async (rec: MaintenanceRecord) => {
    const confirmMsg = `Biztosan törölni szeretné ezt a karbantartási tételt?\n\n• Termék ID: ${rec.productId}\n• Státusz: ${rec.status}\n• Dátum: ${rec.date}${rec.changeItem ? `\n• Alkatrész csere: ${rec.changeItem}` : ''}`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(rec.id);
    try {
      await onDeleteMaintenance(rec.id);
    } catch (err) {
      console.error('Failed to delete maintenance record:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExecuteDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await onDeleteAllMaintenances();
      setShowConfirmDeleteAll(false);
    } catch (err) {
      console.error('Failed to delete all maintenances:', err);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const renderStatusBadge = (statusVal?: string) => {
    const s = (statusVal || 'Pass').toString().trim().toLowerCase();

    if (s === 'pass' || s === 'megfelelt') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-500 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-emerald-600 font-black">Pass</span>
        </span>
      );
    }

    if (s === 'repair' || s === 'javítás' || s === 'javitas') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider bg-stone-900 text-yellow-300 border border-yellow-400 shadow-2xs">
          <Wrench className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          <span className="text-yellow-300 font-black">Repair</span>
        </span>
      );
    }

    if (s === 'fail' || s === 'nem felelt meg' || s === 'hiba') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-500 shadow-2xs">
          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span className="text-red-600 font-black">Fail</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-stone-100 text-stone-700 border border-stone-300">
        {statusVal || 'Pass'}
      </span>
    );
  };

  const startIdxDisplay = totalItems === 0 ? 0 : (safeCurrentPage - 1) * effectivePageSize + 1;
  const endIdxDisplay = pageSize === -1 ? totalItems : Math.min(safeCurrentPage * pageSize, totalItems);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-[#7B4B29] w-full max-w-5xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#5C381E] via-[#7B4B29] to-[#4A2810] text-white p-4 sm:p-5 flex items-center justify-between gap-4 border-b border-[#5C381E] shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-950/70 border border-amber-600/40 flex items-center justify-center text-amber-200 shrink-0 shadow-inner">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                  Karbantartások Kezelése
                </h2>
                <span className="bg-amber-100 text-amber-950 font-black text-xs px-2.5 py-0.5 rounded-full border border-amber-300">
                  {safeMaintenances.length} tétel összesen
                </span>
              </div>
              <p className="text-xs sm:text-sm text-amber-100/90 mt-0.5">
                Karbantartási napló, szűrés, dátum szerinti rendezés és tételes kezelés
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Bezárás"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="p-3 sm:p-4 bg-[#FDFCFB] border-b border-amber-200/80 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Keresés: Termék ID, Leírás, Alkatrész, Dátum..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 focus:border-[#7B4B29] bg-white text-xs sm:text-sm outline-none font-medium shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Actions (Delete All, CSV export, CSV import) */}
            <div className="flex flex-wrap items-center gap-2">
              {safeMaintenances.length > 0 && (
                <button
                  type="button"
                  onClick={() => exportMaintenancesToCsv(safeMaintenances)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs border border-stone-300 transition-colors cursor-pointer shadow-2xs"
                  title="Karbantartások exportálása CSV fájlba"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#7B4B29]" />
                  <span>Export (CSV)</span>
                </button>
              )}

              {onNavigateToCsvImport && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToCsvImport();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                  title="Új karbantartások feltöltése CSV fájlból"
                >
                  <UploadCloud className="w-4 h-4 text-[#7B4B29]" />
                  <span>CSV Feltöltés</span>
                </button>
              )}

              {canEdit && safeMaintenances.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowConfirmDeleteAll(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors cursor-pointer shadow-xs border border-rose-700"
                  title="Minden karbantartási adat törlése a rendszerből"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Összes Törlése ({safeMaintenances.length} db)</span>
                </button>
              )}
            </div>
          </div>

          {/* Status Filter Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1">
                Szűrés:
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-[#7B4B29] text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                Mind ({safeMaintenances.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Pass')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer border ${
                  statusFilter === 'Pass'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pass ({passCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Repair')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer border ${
                  statusFilter === 'Repair'
                    ? 'bg-yellow-400 text-yellow-950 border-yellow-500 shadow-2xs'
                    : 'bg-stone-900 text-yellow-300 border-yellow-400 hover:bg-stone-800'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-yellow-400" />
                <span>Repair ({repairCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Fail')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer border ${
                  statusFilter === 'Fail'
                    ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                    : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Fail ({failCount})</span>
              </button>
            </div>

            {/* Page Size Selector */}
            {totalItems > 25 && (
              <div className="flex items-center gap-2 text-xs text-stone-600">
                <span>Sor / oldal:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs font-bold text-stone-800 outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={-1}>Összes ({totalItems})</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto">
          {totalItems === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#7B4B29] flex items-center justify-center mx-auto border border-amber-200">
                <Wrench className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-stone-900">
                {safeMaintenances.length === 0
                  ? 'Nincs rögzített karbantartási adat a rendszerben'
                  : 'Nincs a szűrésnek megfelelő karbantartási tétel'}
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {safeMaintenances.length === 0
                  ? 'Karbantartásokat a termékek adatlapján vagy a Karbantartás CSV feltöltéssel rögzíthet.'
                  : 'Próbálja meg módosítani a keresési kifejezést vagy törölni a státusz szűrőt.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              {/* Fejléc a kérésnek megfelelően: Termék ID | Státusz | Leírás | Alkatrész csere | Dátum | Művelet */}
              <thead className="bg-amber-50/80 sticky top-0 border-b-2 border-amber-200 text-[#5C381E] font-black uppercase tracking-wider text-xs z-10 shadow-2xs">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3.5">Termék ID</th>
                  <th className="py-3 px-3.5">Státusz</th>
                  <th className="py-3 px-3.5">Leírás</th>
                  <th className="py-3 px-3.5">Alkatrész csere</th>
                  <th className="py-3 px-3.5">Dátum</th>
                  {canEdit && (
                    <th className="py-3 px-3 text-center w-28 text-rose-700">Művelet</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/80 text-stone-800 font-medium">
                {paginatedRecords.map((rec, rowIdx) => {
                  const resolvedProd = findProduct(rec.productId);
                  const resolvedPart = findProduct(rec.changeItem);
                  const isBeingDeleted = deletingId === rec.id;
                  const itemNumber = (safeCurrentPage - 1) * effectivePageSize + rowIdx + 1;

                  return (
                    <tr
                      key={rec.id || `row_${rowIdx}`}
                      className="hover:bg-amber-50/40 transition-colors group"
                    >
                      {/* Sorszám */}
                      <td className="py-3 px-3 text-center text-stone-400 font-mono">
                        {itemNumber}
                      </td>

                      {/* 1. Termék ID (kattintható ugrás a termékre) */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (resolvedProd && onSelectProduct) {
                              onClose();
                              onSelectProduct(resolvedProd);
                            }
                          }}
                          className={`font-mono font-black text-sm text-[#5C381E] hover:underline flex items-center gap-1.5 ${
                            resolvedProd ? 'cursor-pointer hover:text-[#7B4B29]' : ''
                          }`}
                          title={
                            resolvedProd
                              ? `Ugrás a(z) ${resolvedProd.name || rec.productId} adatlapjára`
                              : rec.productId
                          }
                        >
                          <span>{rec.productId}</span>
                          {resolvedProd && (
                            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                          )}
                        </button>
                        {resolvedProd?.name && (
                          <div className="text-[11px] text-stone-500 truncate max-w-[180px]">
                            {resolvedProd.name}
                          </div>
                        )}
                      </td>

                      {/* 2. Státusz: Pass (zöld) / Repair (citromsárga) / Fail (piros) */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {renderStatusBadge(rec.status)}
                      </td>

                      {/* 3. Leírás */}
                      <td className="py-3 px-3.5 text-stone-700 max-w-xs sm:max-w-md">
                        {rec.description ? (
                          <div className="line-clamp-2 leading-relaxed">{rec.description}</div>
                        ) : (
                          <span className="text-stone-400 italic">—</span>
                        )}
                      </td>

                      {/* 4. Alkatrész csere (Change Item - kattintható ugrás) */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {rec.changeItem ? (
                          resolvedPart ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectProduct) {
                                  onClose();
                                  onSelectProduct(resolvedPart);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#7B4B29] hover:bg-[#5C381E] text-white font-mono font-bold text-xs transition-colors cursor-pointer shadow-xs"
                              title={`Ugrás a cserélt alkatrészre: ${resolvedPart.name || rec.changeItem}`}
                            >
                              <Puzzle className="w-3.5 h-3.5 text-amber-200" />
                              <span className="underline decoration-amber-300 font-black">
                                {rec.changeItem}
                              </span>
                              <ExternalLink className="w-3 h-3 text-amber-200 shrink-0" />
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 font-mono font-bold text-xs border border-amber-300">
                              <Puzzle className="w-3.5 h-3.5 text-amber-700" />
                              <span>{rec.changeItem}</span>
                            </span>
                          )
                        ) : (
                          <span className="text-stone-400 italic">—</span>
                        )}
                      </td>

                      {/* 5. Dátum */}
                      <td className="py-3 px-3.5 font-mono font-bold text-stone-700 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{rec.date}</span>
                        </span>
                      </td>

                      {/* 6. Művelet: Törlés egyesével */}
                      {canEdit && (
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDeleteSingle(rec)}
                            disabled={isBeingDeleted}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 font-bold text-xs transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                            title="Tétel törlése (egyesével)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Törlés</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer & Pagination */}
        <div className="p-3 sm:p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600 shrink-0">
          <div>
            Megjelenítve: <strong>{startIdxDisplay} - {endIdxDisplay}</strong> / összesen <strong>{totalItems}</strong> tétel
            {totalItems !== safeMaintenances.length && (
              <span className="text-stone-400 ml-1">
                (szűrt a(z) {safeMaintenances.length}-ból)
              </span>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && pageSize !== -1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-200 disabled:opacity-30 disabled:pointer-events-none text-stone-700 transition-colors"
                title="Első oldal"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-200 disabled:opacity-30 disabled:pointer-events-none text-stone-700 transition-colors"
                title="Előző oldal"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-black text-stone-800 bg-white border border-stone-300 rounded-lg">
                {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-200 disabled:opacity-30 disabled:pointer-events-none text-stone-700 transition-colors"
                title="Következő oldal"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-200 disabled:opacity-30 disabled:pointer-events-none text-stone-700 transition-colors"
                title="Utolsó oldal"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold transition-colors cursor-pointer"
          >
            Bezárás
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Delete All */}
      {showConfirmDeleteAll && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border-2 border-rose-400 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-rose-950">
                  Összes Karbantartás Törlése
                </h3>
                <p className="text-xs text-rose-700 font-bold mt-0.5">
                  Végleges művelet ({safeMaintenances.length} db bejegyzés)
                </p>
              </div>
            </div>

            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 text-xs sm:text-sm text-stone-800 space-y-2">
              <p className="font-bold text-rose-950">
                Biztosan törölni szeretné az ÖSSZES rögzített karbantartási adatot?
              </p>
              <ul className="space-y-1.5 list-disc list-inside text-stone-700 text-xs font-medium">
                <li>
                  Minden ({safeMaintenances.length} db) karbantartási napló bejegyzés és státusz azonnal törlődik.
                </li>
                <li>A törlés a felhőbeli Firestore adatbázisból is véglegesen eltávolítja az adatokat.</li>
                <li>A termékkatalógus és a raktárkészlet változatlan marad.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmDeleteAll(false)}
                disabled={isDeletingAll}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-sm hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteAll}
                disabled={isDeletingAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-black text-sm shadow-md transition-colors cursor-pointer"
              >
                {isDeletingAll ? (
                  <>
                    <Trash2 className="w-4 h-4 animate-spin" />
                    <span>Törlés folyamatban...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Igen, Összes Törlése ({safeMaintenances.length} db)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
