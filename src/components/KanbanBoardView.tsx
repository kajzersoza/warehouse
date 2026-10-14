import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  ListFilter,
  ExternalLink
} from 'lucide-react';
import { Product } from '../types/product';
import { KanbanItem, KanbanStatus, KANBAN_STATUS_CONFIG } from '../types/kanban';
import { KanbanItemModal } from './KanbanItemModal';

interface KanbanBoardViewProps {
  kanbanItems: KanbanItem[];
  products: Product[];
  onSaveItem: (item: KanbanItem) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onMoveStatus: (id: string, newStatus: KanbanStatus) => Promise<void>;
  onSelectProduct?: (product: Product) => void;
  onGoBack: () => void;
}

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  kanbanItems,
  products,
  onSaveItem,
  onDeleteItem,
  onMoveStatus,
  onSelectProduct,
  onGoBack
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KanbanItem | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // Products lookup map for names and pictures
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => {
      if (p.productId) map.set(p.productId.trim().toLowerCase(), p);
    });
    return map;
  }, [products]);

  // Filtered items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return kanbanItems;
    const q = searchTerm.trim().toLowerCase();
    return kanbanItems.filter((item) => {
      const matchNote = item.note ? item.note.toLowerCase().includes(q) : false;
      const matchProduct = item.productIds.some((pId) => {
        if (pId.toLowerCase().includes(q)) return true;
        const prod = productMap.get(pId.toLowerCase());
        if (prod?.name && prod.name.toLowerCase().includes(q)) return true;
        if (prod?.factoryCode && prod.factoryCode.toLowerCase().includes(q)) return true;
        return false;
      });
      return matchNote || matchProduct;
    });
  }, [kanbanItems, searchTerm, productMap]);

  // Group by status
  const columns: { status: KanbanStatus; title: string; items: KanbanItem[] }[] = [
    {
      status: 'new',
      title: 'Új',
      items: filteredItems.filter((i) => i.status === 'new')
    },
    {
      status: 'in_progress',
      title: 'Folyamatban',
      items: filteredItems.filter((i) => i.status === 'in_progress')
    },
    {
      status: 'completed',
      title: 'Befejezve',
      items: filteredItems.filter((i) => i.status === 'completed')
    }
  ];

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: KanbanStatus) => {
    e.preventDefault();
    const id = draggedItemId || e.dataTransfer.getData('text/plain');
    if (id) {
      onMoveStatus(id, targetStatus);
    }
    setDraggedItemId(null);
  };

  const handleOpenNew = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item: KanbanItem) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleProductClick = (productId: string) => {
    if (!onSelectProduct) return;
    const prod = productMap.get(productId.trim().toLowerCase());
    if (prod) {
      onSelectProduct(prod);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-[#DBD8D5] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onGoBack}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#DBD8D5]/60 hover:bg-[#DBD8D5] text-[#211E1B] font-bold text-sm transition-colors cursor-pointer border border-[#DBD8D5]"
            title="Vissza a terméklistához"
          >
            <ArrowLeft className="w-4 h-4 text-[#3A5D6B]" />
            <span>Vissza</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3A5D6B] to-[#2F223A] flex items-center justify-center text-white shadow-md">
              <Layers className="w-6 h-6 text-[#79B6B8]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#211E1B] tracking-tight">
                Kanban Tábla
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-[#3A5D6B]">
                3 állapot: Új (piros), Folyamatban (kék), Befejezve (zöld)
              </p>
            </div>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Keresés termék, megjegyzés..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 focus:border-[#3A5D6B] focus:bg-white rounded-xl text-xs sm:text-sm font-medium outline-hidden"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add New Item Button */}
          <button
            type="button"
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3A5D6B] hover:bg-[#2F223A] text-white font-black text-xs sm:text-sm transition-all shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-[#79B6B8]" />
            <span>+ Új tétel</span>
          </button>
        </div>
      </div>

      {/* 3 Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {columns.map((col) => {
          const cfg = KANBAN_STATUS_CONFIG[col.status];

          return (
            <div
              key={col.status}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`flex flex-col rounded-3xl border-2 ${cfg.columnBorder} ${cfg.columnBg} p-4 shadow-sm min-h-[550px] transition-all`}
            >
              {/* Column Header */}
              <div
                className={`flex items-center justify-between p-3.5 rounded-2xl ${cfg.headerBg} text-white shadow-sm mb-4`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
                  <h2 className="font-black text-base sm:text-lg tracking-tight">
                    {col.title}
                  </h2>
                </div>
                <span className="font-mono font-black text-xs sm:text-sm bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full">
                  {col.items.length} db
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[75vh] pr-0.5">
                {col.items.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-300/80 rounded-2xl bg-white/60 text-slate-500 space-y-2">
                    <Layers className="w-8 h-8 mx-auto opacity-30" />
                    <p className="text-xs font-bold">Nincs feladat ebben az oszlopban.</p>
                    <button
                      type="button"
                      onClick={handleOpenNew}
                      className="text-xs font-black text-[#3A5D6B] hover:underline cursor-pointer"
                    >
                      + Tétel hozzáadása
                    </button>
                  </div>
                ) : (
                  col.items.map((item) => {
                    const isDragged = draggedItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        className={`bg-white rounded-2xl border-2 ${cfg.cardBorder} ${cfg.cardHoverBg} p-4 shadow-xs hover:shadow-md transition-all space-y-3 cursor-grab active:cursor-grabbing ${
                          isDragged ? 'opacity-40 scale-98' : ''
                        }`}
                      >
                        {/* Card Top: Attached Products */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Termékek ({item.productIds.length}):
                            </span>

                            {/* Card Actions: Edit & Delete */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEdit(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#3A5D6B] hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Szerkesztés"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Biztosan törölni szeretnéd ezt a Kanban tételt?')) {
                                    onDeleteItem(item.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Törlés"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Product Chips */}
                          <div className="flex flex-wrap gap-1.5">
                            {item.productIds.map((pId) => {
                              const prod = productMap.get(pId.toLowerCase());
                              const hasProd = !!prod;

                              return (
                                <button
                                  key={pId}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleProductClick(pId);
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-black text-xs transition-colors cursor-pointer border ${
                                    hasProd
                                      ? 'bg-slate-100 hover:bg-[#3A5D6B] hover:text-white text-[#1e6075] border-slate-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                                  title={hasProd ? `Ugrás a termékre: ${prod?.name || pId}` : pId}
                                >
                                  <Package className="w-3 h-3 shrink-0" />
                                  <span>{pId}</span>
                                  {hasProd && <ExternalLink className="w-2.5 h-2.5 opacity-60" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Note Section (---- megjegyzés ---) */}
                        {item.note ? (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap font-medium">
                            {item.note}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">
                            Nincs megjegyzés.
                          </div>
                        )}

                        {/* Card Bottom: Date & Move Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleDateString('hu-HU', {
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : '—'}
                          </span>

                          {/* Quick 1-click status transition buttons */}
                          <div className="flex items-center gap-1">
                            {col.status === 'new' && (
                              <button
                                type="button"
                                onClick={() => onMoveStatus(item.id, 'in_progress')}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 text-[11px] font-black transition-colors cursor-pointer"
                                title="Áthelyezés Folyamatban oszlopba"
                              >
                                <span>→ Folyamatban</span>
                              </button>
                            )}

                            {col.status === 'in_progress' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onMoveStatus(item.id, 'new')}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 hover:bg-red-600 hover:text-white text-red-700 border border-red-200 text-[11px] font-black transition-colors cursor-pointer"
                                  title="Visszahelyezés Új oszlopba"
                                >
                                  <span>← Új</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onMoveStatus(item.id, 'completed')}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-200 text-[11px] font-black transition-colors cursor-pointer"
                                  title="Áthelyezés Befejezve oszlopba"
                                >
                                  <span>→ Befejezve</span>
                                </button>
                              </>
                            )}

                            {col.status === 'completed' && (
                              <button
                                type="button"
                                onClick={() => onMoveStatus(item.id, 'in_progress')}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 text-[11px] font-black transition-colors cursor-pointer"
                                title="Visszahelyezés Folyamatban oszlopba"
                              >
                                <span>← Folyamatban</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Kanban Form Modal */}
      <KanbanItemModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        initialItem={editingItem}
        products={products}
        onSave={onSaveItem}
        onDelete={onDeleteItem}
      />
    </div>
  );
};
