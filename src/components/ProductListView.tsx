import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Package,
  Layers,
  Tag,
  Building2,
  Box,
  Image as ImageIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Check,
  Plus,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { Product, WarehouseTransaction } from '../types/product';
import { naturalCompare } from '../utils/sortHelper';
import { isConnectorCategory } from '../services/connectorTerminalService';
import { KanbanItem, KanbanStatus, KANBAN_STATUS_CONFIG } from '../types/kanban';
import { getProductKanbanStatus } from '../services/kanbanService';

export interface ActiveFilter {
  type: 'category' | 'manufacturer' | 'feeding';
  value: string;
}

const SESSION_FILTER_KEY = 'raktar_list_filters_v1';
const PAGE_SIZE = 50;

function getSavedListFilters() {
  try {
    const raw = sessionStorage.getItem(SESSION_FILTER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

interface ProductListViewProps {
  products: Product[];
  warehouseTransactions?: WarehouseTransaction[];
  kanbanItems?: KanbanItem[];
  onSelectProduct: (product: Product) => void;
  onOpenCsvImport: () => void;
  onOpenNewProduct: () => void;
  onOpenKanbanModal?: (productId: string) => void;
  onNavigateToKanban?: () => void;
  initialFilter?: ActiveFilter | null;
  onClearFilter?: () => void;
  onNavigateToWarehousePosition?: (positionId: string) => void;
}

export const ProductListView: React.FC<ProductListViewProps> = ({
  products,
  warehouseTransactions = [],
  kanbanItems = [],
  onSelectProduct,
  onOpenCsvImport,
  onOpenNewProduct,
  onOpenKanbanModal,
  onNavigateToKanban,
  initialFilter,
  onClearFilter,
  onNavigateToWarehousePosition
}) => {
  const saved = useMemo(() => getSavedListFilters(), []);

  const [searchTerm, setSearchTerm] = useState<string>(saved?.searchTerm || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(saved?.selectedCategories || []);
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>(saved?.selectedManufacturers || []);
  const [selectedFeedings, setSelectedFeedings] = useState<string[]>(saved?.selectedFeedings || []);
  const [selectedInsulationTypes, setSelectedInsulationTypes] = useState<string[]>(saved?.selectedInsulationTypes || []);
  const [selectedTerminalTypes, setSelectedTerminalTypes] = useState<string[]>(saved?.selectedTerminalTypes || []);
  const [selectedConnectorTypes, setSelectedConnectorTypes] = useState<string[]>(saved?.selectedConnectorTypes || []);
  const [selectedInsulationGripperTypes, setSelectedInsulationGripperTypes] = useState<string[]>(saved?.selectedInsulationGripperTypes || []);
  const [isDetailedOpen, setIsDetailedOpen] = useState(false);

  const [sortBy, setSortBy] = useState<'id' | 'name' | 'factoryCode' | 'date'>(saved?.sortBy || 'id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(saved?.sortOrder || 'asc');
  const [currentPage, setCurrentPage] = useState<number>(saved?.currentPage || 1);

  // Map product ID to warehouse transaction calculated stock & positions
  const productWarehouseMap = useMemo(() => {
    const map = new Map<string, { totalQuantity: number; positions: string[] }>();
    if (!warehouseTransactions || warehouseTransactions.length === 0) return map;

    warehouseTransactions.forEach((tx) => {
      const pid = tx.productId.trim().toLowerCase();
      let entry = map.get(pid);
      if (!entry) {
        entry = { totalQuantity: 0, positions: [] };
        map.set(pid, entry);
      }
      const q =
        tx.quantity !== undefined && tx.quantity !== null && !isNaN(Number(tx.quantity))
          ? Number(tx.quantity)
          : 0;
      entry.totalQuantity += q;
      const pos = (tx.positionId || '').trim();
      if (pos && !entry.positions.includes(pos)) {
        entry.positions.push(pos);
      }
    });
    return map;
  }, [warehouseTransactions]);

  // Persist filters and pagination to sessionStorage so state is preserved across reloads
  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_FILTER_KEY,
        JSON.stringify({
          searchTerm,
          selectedCategories,
          selectedManufacturers,
          selectedFeedings,
          selectedInsulationTypes,
          selectedTerminalTypes,
          selectedConnectorTypes,
          selectedInsulationGripperTypes,
          sortBy,
          sortOrder,
          currentPage
        })
      );
    } catch {}
  }, [
    searchTerm,
    selectedCategories,
    selectedManufacturers,
    selectedFeedings,
    selectedInsulationTypes,
    selectedTerminalTypes,
    selectedConnectorTypes,
    selectedInsulationGripperTypes,
    sortBy,
    sortOrder,
    currentPage
  ]);

  // React to initialFilter changes from parent
  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.type === 'category') {
        setSelectedCategories([initialFilter.value]);
        setSelectedManufacturers([]);
        setSelectedFeedings([]);
        setSelectedInsulationTypes([]);
        setSelectedTerminalTypes([]);
        setSelectedConnectorTypes([]);
        setSelectedInsulationGripperTypes([]);
      } else if (initialFilter.type === 'manufacturer') {
        setSelectedManufacturers([initialFilter.value]);
        setSelectedCategories([]);
        setSelectedFeedings([]);
        setSelectedInsulationTypes([]);
        setSelectedTerminalTypes([]);
        setSelectedConnectorTypes([]);
        setSelectedInsulationGripperTypes([]);
      } else if (initialFilter.type === 'feeding') {
        setSelectedFeedings([initialFilter.value]);
        setSelectedCategories([]);
        setSelectedManufacturers([]);
        setSelectedInsulationTypes([]);
        setSelectedTerminalTypes([]);
        setSelectedConnectorTypes([]);
        setSelectedInsulationGripperTypes([]);
      }
    }
  }, [initialFilter]);

  // Extract unique filter options
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const manufacturers = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.manufacturer && p.manufacturer.trim()) set.add(p.manufacturer.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const feedings = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.feeding && p.feeding.trim()) set.add(p.feeding.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const insulationTypes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.insulationType && p.insulationType.trim()) set.add(p.insulationType.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const terminalTypes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.terminalType && p.terminalType.trim()) set.add(p.terminalType.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const connectorTypes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.connectorType && p.connectorType.trim()) set.add(p.connectorType.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const insulationGripperTypes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.insulationGripperType && p.insulationGripperType.trim()) set.add(p.insulationGripperType.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  // Toggle helper for multi-selection
  const toggleItem = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    item: string
  ) => {
    setList((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  // Reset all filters
  const resetAllFilters = () => {
    setSelectedCategories([]);
    setSelectedManufacturers([]);
    setSelectedFeedings([]);
    setSelectedInsulationTypes([]);
    setSelectedTerminalTypes([]);
    setSelectedConnectorTypes([]);
    setSelectedInsulationGripperTypes([]);
    setSearchTerm('');
    setCurrentPage(1);
    try {
      sessionStorage.removeItem(SESSION_FILTER_KEY);
    } catch {}
    if (onClearFilter) onClearFilter();
  };

  const totalDetailedFiltersCount =
    selectedCategories.length +
    selectedManufacturers.length +
    selectedFeedings.length +
    selectedInsulationTypes.length +
    selectedTerminalTypes.length +
    selectedConnectorTypes.length +
    selectedInsulationGripperTypes.length;

  const hasActiveFilters = totalDetailedFiltersCount > 0 || Boolean(searchTerm.trim());

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Multi-category filter (OR logic within categories)
        if (selectedCategories.length > 0) {
          if (!p.category || !selectedCategories.includes(p.category.trim())) {
            return false;
          }
        }

        // Multi-manufacturer filter (OR logic)
        if (selectedManufacturers.length > 0) {
          if (!p.manufacturer || !selectedManufacturers.includes(p.manufacturer.trim())) {
            return false;
          }
        }

        // Multi-feeding filter (OR logic)
        if (selectedFeedings.length > 0) {
          if (!p.feeding || !selectedFeedings.includes(p.feeding.trim())) {
            return false;
          }
        }

        // Insulation Type filter
        if (selectedInsulationTypes.length > 0) {
          if (!p.insulationType || !selectedInsulationTypes.includes(p.insulationType.trim())) {
            return false;
          }
        }

        // Terminal Type filter
        if (selectedTerminalTypes.length > 0) {
          if (!p.terminalType || !selectedTerminalTypes.includes(p.terminalType.trim())) {
            return false;
          }
        }

        // Connector Type filter
        if (selectedConnectorTypes.length > 0) {
          if (!p.connectorType || !selectedConnectorTypes.includes(p.connectorType.trim())) {
            return false;
          }
        }

        // Insulation Gripper Type filter
        if (selectedInsulationGripperTypes.length > 0) {
          if (!p.insulationGripperType || !selectedInsulationGripperTypes.includes(p.insulationGripperType.trim())) {
            return false;
          }
        }

        // Search query filter: ID, Name, Factory Code, Description, Manufacturer, Feeding
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase().trim();
        const idMatch = p.productId?.toLowerCase().includes(q);
        const nameMatch = p.name?.toLowerCase().includes(q);
        const codeMatch = p.factoryCode?.toLowerCase().includes(q);
        const mfgMatch = p.manufacturer?.toLowerCase().includes(q);
        const feedingMatch = p.feeding?.toLowerCase().includes(q);
        const descMatch = p.description?.toLowerCase().includes(q);
        return Boolean(idMatch || nameMatch || codeMatch || mfgMatch || feedingMatch || descMatch);
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === 'id') {
          comp = naturalCompare(a.productId, b.productId);
        } else if (sortBy === 'name') {
          comp = naturalCompare(a.name, b.name);
        } else if (sortBy === 'factoryCode') {
          comp = naturalCompare(a.factoryCode, b.factoryCode);
        } else if (sortBy === 'date') {
          comp = (a.date || '').localeCompare(b.date || '');
        }
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [
    products,
    searchTerm,
    selectedCategories,
    selectedManufacturers,
    selectedFeedings,
    selectedInsulationTypes,
    selectedTerminalTypes,
    selectedConnectorTypes,
    selectedInsulationGripperTypes,
    sortBy,
    sortOrder
  ]);

  const toggleSort = (field: 'id' | 'name' | 'factoryCode') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Pagination: 50 items per page
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredProducts.length);

  // Reset to page 1 whenever any filter or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedCategories,
    selectedManufacturers,
    selectedFeedings,
    selectedInsulationTypes,
    selectedTerminalTypes,
    selectedConnectorTypes,
    selectedInsulationGripperTypes,
    sortBy,
    sortOrder
  ]);

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, startIndex, endIndex]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-16">
      {/* Search Bar & Primary Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DBD8D5] shadow-xs space-y-4">
        {/* Row 1: Category selector on the LEFT + Search input on the RIGHT */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Category Dropdown on the LEFT */}
          <div className="w-full sm:w-64 lg:w-72 shrink-0">
            <div className="relative">
              <select
                value={
                  selectedCategories.length === 0
                    ? 'all'
                    : selectedCategories.length === 1
                    ? selectedCategories[0]
                    : 'multiple'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') {
                    setSelectedCategories([]);
                  } else if (val !== 'multiple') {
                    setSelectedCategories([val]);
                  }
                }}
                className="w-full pl-4 pr-10 py-3.5 sm:py-4 text-base sm:text-lg font-bold bg-[#F8F9FA] border-2 border-[#DBD8D5] focus:border-[#3A5D6B] focus:bg-white rounded-xl text-[#211E1B] outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="all">Minden kategória</option>
                {selectedCategories.length > 1 && (
                  <option value="multiple">
                    {selectedCategories.length} kategória kijelölve
                  </option>
                )}
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#3A5D6B]">
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search input - occupying the remaining space */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-[#3A5D6B]" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Keresés Termék ID, Név, Gyári kód..."
              className="w-full pl-13 pr-12 py-3.5 sm:py-4 text-base sm:text-lg font-medium bg-[#F8F9FA] border-2 border-[#DBD8D5] rounded-xl focus:border-[#3A5D6B] focus:bg-white text-[#211E1B] placeholder-gray-500 transition-all outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Divider line with centered "Részletes keresés" button */}
        <div className="relative my-2 py-1 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t-2 border-[#DBD8D5]" />
          </div>
          <button
            type="button"
            onClick={() => setIsDetailedOpen(!isDetailedOpen)}
            className="relative z-10 px-5 py-2 rounded-full border-2 border-[#DBD8D5] bg-white hover:border-[#3A5D6B] hover:bg-[#79B6B8]/15 text-[#3A5D6B] font-extrabold text-sm sm:text-base flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#3A5D6B]" />
            <span>Részletes keresés</span>
            {totalDetailedFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#3A5D6B] text-white text-xs flex items-center justify-center font-bold">
                {totalDetailedFiltersCount}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-[#3A5D6B] transition-transform duration-200 ${
                isDetailedOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Row 3: Detailed Search Collapsible Panel (Multi-select) */}
        {isDetailedOpen && (
          <div className="p-4 sm:p-5 bg-[#F8F9FA] rounded-2xl border-2 border-[#DBD8D5] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#DBD8D5] pb-3">
              <span className="font-extrabold text-base text-[#3A5D6B] uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                <span>Részletes szűrés</span>
              </span>
              {totalDetailedFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs sm:text-sm rounded-lg border border-red-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Törlés</span>
                </button>
              )}
            </div>

            {/* Filter Group: Kategória */}
            {categories.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-black uppercase tracking-wider text-[#3A5D6B]">
                  Kategória
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {categories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleItem(selectedCategories, setSelectedCategories, cat)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#3A5D6B] text-white shadow-2xs ring-2 ring-[#3A5D6B]/30'
                            : 'bg-white hover:bg-[#79B6B8]/15 text-[#211E1B] border border-[#DBD8D5] hover:border-[#3A5D6B]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter Group: Gyártó */}
            {manufacturers.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-black uppercase tracking-wider text-[#3A5D6B]">
                  Gyártó
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {manufacturers.map((mfg) => {
                    const isSelected = selectedManufacturers.includes(mfg);
                    return (
                      <button
                        key={mfg}
                        type="button"
                        onClick={() => toggleItem(selectedManufacturers, setSelectedManufacturers, mfg)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#7098BA] text-white shadow-2xs ring-2 ring-[#7098BA]/30'
                            : 'bg-white hover:bg-[#79B6B8]/15 text-[#211E1B] border border-[#DBD8D5] hover:border-[#7098BA]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{mfg}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter Group: Adagolás */}
            {feedings.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-black uppercase tracking-wider text-[#3A5D6B]">
                  Adagolás
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {feedings.map((f) => {
                    const isSelected = selectedFeedings.includes(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => toggleItem(selectedFeedings, setSelectedFeedings, f)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#2F223A] text-white shadow-2xs ring-2 ring-[#2F223A]/30'
                            : 'bg-white hover:bg-[#79B6B8]/15 text-[#211E1B] border border-[#DBD8D5] hover:border-[#2F223A]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{f}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter Group: Szigetelés Típus */}
            {insulationTypes.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-black uppercase tracking-wider text-[#3A5D6B]">
                  Szigetelés Típus
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {insulationTypes.map((ins) => {
                    const isSelected = selectedInsulationTypes.includes(ins);
                    return (
                      <button
                        key={ins}
                        type="button"
                        onClick={() => toggleItem(selectedInsulationTypes, setSelectedInsulationTypes, ins)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#1e6075] text-white shadow-2xs ring-2 ring-[#1e6075]/30'
                            : 'bg-white hover:bg-[#79B6B8]/15 text-[#211E1B] border border-[#DBD8D5] hover:border-[#1e6075]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{ins}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter Group: Saru Típusa */}
            {terminalTypes.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-black uppercase tracking-wider text-[#3A5D6B]">
                  Saru Típusa
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {terminalTypes.map((t) => {
                    const isSelected = selectedTerminalTypes.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleItem(selectedTerminalTypes, setSelectedTerminalTypes, t)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#3A5D6B] text-white shadow-2xs ring-2 ring-[#3A5D6B]/30'
                            : 'bg-white hover:bg-[#79B6B8]/15 text-[#211E1B] border border-[#DBD8D5] hover:border-[#3A5D6B]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{t}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter Group: Konektor Típusa */}
            {connectorTypes.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-black uppercase tracking-wider text-[#3A5D6B]">
                  Konektor Típusa
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {connectorTypes.map((c) => {
                    const isSelected = selectedConnectorTypes.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleItem(selectedConnectorTypes, setSelectedConnectorTypes, c)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#3A5D6B] text-white shadow-2xs ring-2 ring-[#3A5D6B]/30'
                            : 'bg-white hover:bg-[#79B6B8]/15 text-[#211E1B] border border-[#DBD8D5] hover:border-[#3A5D6B]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter Group: Szigm. Típus */}
            {insulationGripperTypes.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-black uppercase tracking-wider text-[#3A5D6B]">
                  Szigm. Típus
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {insulationGripperTypes.map((g) => {
                    const isSelected = selectedInsulationGripperTypes.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleItem(selectedInsulationGripperTypes, setSelectedInsulationGripperTypes, g)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#3A5D6B] text-white shadow-2xs ring-2 ring-[#3A5D6B]/30'
                            : 'bg-white hover:bg-[#79B6B8]/15 text-[#211E1B] border border-[#DBD8D5] hover:border-[#3A5D6B]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{g}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Actions inside Detailed Panel */}
            <div className="flex items-center justify-between pt-2 border-t border-[#DBD8D5]">
              <span className="text-xs sm:text-sm font-bold text-gray-600">
                Találat: <strong className="text-[#211E1B] font-extrabold">{filteredProducts.length}</strong> db
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs sm:text-sm rounded-lg border border-red-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Törlés</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailedOpen(false)}
                  className="px-4 py-1.5 bg-[#3A5D6B] hover:bg-[#2F223A] text-white font-bold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer"
                >
                  Kész
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Row 4: Active Filter Chips Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-[#79B6B8]/15 border border-[#79B6B8] rounded-xl text-sm animate-fadeIn">
            <span className="font-extrabold text-[#3A5D6B] flex items-center gap-1.5 mr-1">
              <Filter className="w-4 h-4 text-[#3A5D6B]" />
              Aktív szűrés:
            </span>

            {/* Category chips */}
            {selectedCategories.map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1.5 bg-[#3A5D6B] text-white font-bold px-3 py-1 rounded-lg">
                <span>{cat}</span>
                <button
                  type="button"
                  onClick={() => toggleItem(selectedCategories, setSelectedCategories, cat)}
                  className="hover:text-amber-200 cursor-pointer"
                  title="Eltávolítás"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}

            {/* Manufacturer chips */}
            {selectedManufacturers.map((mfg) => (
              <span key={mfg} className="inline-flex items-center gap-1.5 bg-[#7098BA] text-white font-bold px-3 py-1 rounded-lg">
                <span>{mfg}</span>
                <button
                  type="button"
                  onClick={() => toggleItem(selectedManufacturers, setSelectedManufacturers, mfg)}
                  className="hover:text-amber-200 cursor-pointer"
                  title="Eltávolítás"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}

            {/* Feeding chips */}
            {selectedFeedings.map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 bg-[#2F223A] text-white font-bold px-3 py-1 rounded-lg">
                <span>{f}</span>
                <button
                  type="button"
                  onClick={() => toggleItem(selectedFeedings, setSelectedFeedings, f)}
                  className="hover:text-amber-200 cursor-pointer"
                  title="Eltávolítás"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}

            {/* Insulation type chips */}
            {selectedInsulationTypes.map((ins) => (
              <span key={ins} className="inline-flex items-center gap-1.5 bg-[#1e6075] text-white font-bold px-3 py-1 rounded-lg">
                <span>{ins}</span>
                <button
                  type="button"
                  onClick={() => toggleItem(selectedInsulationTypes, setSelectedInsulationTypes, ins)}
                  className="hover:text-amber-200 cursor-pointer"
                  title="Eltávolítás"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}

            {/* Terminal type chips */}
            {selectedTerminalTypes.map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 bg-[#3A5D6B] text-white font-bold px-3 py-1 rounded-lg">
                <span>{t}</span>
                <button
                  type="button"
                  onClick={() => toggleItem(selectedTerminalTypes, setSelectedTerminalTypes, t)}
                  className="hover:text-amber-200 cursor-pointer"
                  title="Eltávolítás"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}

            {/* Connector type chips */}
            {selectedConnectorTypes.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 bg-[#3A5D6B] text-white font-bold px-3 py-1 rounded-lg">
                <span>{c}</span>
                <button
                  type="button"
                  onClick={() => toggleItem(selectedConnectorTypes, setSelectedConnectorTypes, c)}
                  className="hover:text-amber-200 cursor-pointer"
                  title="Eltávolítás"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}

            {/* Insulation gripper chips */}
            {selectedInsulationGripperTypes.map((g) => (
              <span key={g} className="inline-flex items-center gap-1.5 bg-[#3A5D6B] text-white font-bold px-3 py-1 rounded-lg">
                <span>{g}</span>
                <button
                  type="button"
                  onClick={() => toggleItem(selectedInsulationGripperTypes, setSelectedInsulationGripperTypes, g)}
                  className="hover:text-amber-200 cursor-pointer"
                  title="Eltávolítás"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}

            {/* Search term chip */}
            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 bg-gray-700 text-white font-bold px-3 py-1 rounded-lg">
                <span>Keresés: "{searchTerm}"</span>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="hover:text-amber-200 cursor-pointer"
                  title="Keresés törlése"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={resetAllFilters}
              className="ml-auto text-sm font-bold text-red-700 hover:text-red-900 hover:bg-red-50 rounded-lg px-2.5 py-1 transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Törlés</span>
            </button>
          </div>
        )}

        {/* Results Count & Quick Sort Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-base font-bold text-[#3A5D6B] pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              Találatok:{' '}
              <span className="font-extrabold text-2xl text-[#211E1B]">
                {filteredProducts.length}
              </span>{' '}
              / {products.length} db termék
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1 bg-[#F8F9FA] border border-[#DBD8D5] px-2.5 py-1 rounded-xl text-xs sm:text-sm font-bold text-[#3A5D6B]">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validPage <= 1}
                  className="p-1 rounded-lg hover:bg-[#DBD8D5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Előző oldal (Balra)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-1 font-extrabold text-[#211E1B]">
                  {validPage} / {totalPages}. oldal
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validPage >= totalPages}
                  className="p-1 rounded-lg hover:bg-[#DBD8D5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Következő oldal (Jobbra)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Sort Options (especially useful on mobile, also convenient on desktop) */}
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
            <span className="text-gray-500 mr-1 text-xs hidden xs:inline">Rendezés:</span>
            <button
              type="button"
              onClick={() => toggleSort('id')}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                sortBy === 'id'
                  ? 'bg-[#3A5D6B] text-white border-[#3A5D6B] shadow-2xs'
                  : 'bg-[#F8F9FA] text-[#211E1B] border-[#DBD8D5] hover:bg-gray-100'
              }`}
              title="Rendezés Termék ID szerint"
            >
              <span>ID</span>
              {sortBy === 'id' ? (
                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#79B6B8]" /> : <ArrowDown className="w-3 h-3 text-[#79B6B8]" />
              ) : (
                <ArrowUpDown className="w-3 h-3 opacity-40" />
              )}
            </button>

            <button
              type="button"
              onClick={() => toggleSort('name')}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                sortBy === 'name'
                  ? 'bg-[#3A5D6B] text-white border-[#3A5D6B] shadow-2xs'
                  : 'bg-[#F8F9FA] text-[#211E1B] border-[#DBD8D5] hover:bg-gray-100'
              }`}
              title="Rendezés név szerint természetes számsorrendben (1, 2, 3... 10...)"
            >
              <span>Név</span>
              {sortBy === 'name' ? (
                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#79B6B8]" /> : <ArrowDown className="w-3 h-3 text-[#79B6B8]" />
              ) : (
                <ArrowUpDown className="w-3 h-3 opacity-40" />
              )}
            </button>

            <button
              type="button"
              onClick={() => toggleSort('factoryCode')}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                sortBy === 'factoryCode'
                  ? 'bg-[#3A5D6B] text-white border-[#3A5D6B] shadow-2xs'
                  : 'bg-[#F8F9FA] text-[#211E1B] border-[#DBD8D5] hover:bg-gray-100'
              }`}
              title="Rendezés Gyári kód szerint"
            >
              <span className="hidden sm:inline">Gyári kód</span>
              <span className="sm:hidden">Kód</span>
              {sortBy === 'factoryCode' ? (
                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#79B6B8]" /> : <ArrowDown className="w-3 h-3 text-[#79B6B8]" />
              ) : (
                <ArrowUpDown className="w-3 h-3 opacity-40" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main List Container: Responsive Mobile Card List + Desktop Table */}
      <div className="bg-white rounded-2xl border border-[#DBD8D5] shadow-xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-4">
            <Package className="w-16 h-16 mx-auto text-gray-300" />
            <h3 className="text-2xl font-bold text-[#211E1B]">Nincs találat a keresési feltételekre</h3>
            <p className="text-base text-gray-500 max-w-md mx-auto">
              Próbálja meg módosítani a szűrőket vagy törölni az aktív szűrést.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-5 py-2.5 bg-[#3A5D6B] hover:bg-[#2F223A] text-white font-bold text-base rounded-xl cursor-pointer transition-colors"
                >
                  Szűrők törlése
                </button>
              )}
              <button
                type="button"
                onClick={onOpenCsvImport}
                className="px-5 py-2.5 bg-[#DBD8D5] hover:bg-[#DBD8D5]/80 text-[#211E1B] font-bold text-base rounded-xl cursor-pointer transition-colors"
              >
                CSV Feltöltése
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Mobile List View (Screens < md): Perfectly adapted, ZERO horizontal scrollbar */}
            <div className="md:hidden divide-y divide-[#DBD8D5]">
              {paginatedProducts.map((p) => {
                const hasImage = p.images && p.images.length > 0;
                const thumb = hasImage ? p.images[0] : null;

                return (
                  <div
                    key={p.productId}
                    onClick={() => onSelectProduct(p)}
                    className="p-4 hover:bg-[#79B6B8]/10 active:bg-[#79B6B8]/20 cursor-pointer transition-all duration-150 flex gap-3.5 items-start"
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-xl border border-[#DBD8D5] bg-[#F8F9FA] overflow-hidden flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://placehold.co/80x80/3A5D6B/white?text=?';
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-7 h-7 text-gray-400" />
                      )}
                    </div>

                    {/* Product Details on Mobile */}
                    <div className="flex-1 min-w-0">
                      {/* ID and Stock Row */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono font-black text-base sm:text-lg text-[#1e6075] tracking-tight break-all">
                          {p.productId}
                        </span>
                        {(() => {
                          const whInfo = productWarehouseMap.get(p.productId.trim().toLowerCase());
                          const effectiveStock =
                            whInfo !== undefined
                              ? whInfo.totalQuantity
                              : p.stockQuantity !== undefined && p.stockQuantity !== null && !isNaN(Number(p.stockQuantity))
                              ? Number(p.stockQuantity)
                              : 0;
                          const primaryPositions = (whInfo && whInfo.positions.length > 0)
                            ? whInfo.positions
                            : (p.location ? [p.location] : []);

                          return (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {primaryPositions.length > 0 && (
                                <div className="flex items-center gap-1">
                                  {primaryPositions.map((pos) => (
                                    <button
                                      key={pos}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onNavigateToWarehousePosition) {
                                          onNavigateToWarehousePosition(pos);
                                        }
                                      }}
                                      className="font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-900 border border-blue-200 transition-colors cursor-pointer"
                                      title={`Ugrás a(z) ${pos} raktári pozícióra`}
                                    >
                                      {pos}
                                    </button>
                                  ))}
                                </div>
                              )}
                              <span
                                className={`font-mono font-black text-xs px-2.5 py-0.5 rounded-full border ${
                                  effectiveStock > 0
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-red-50 text-red-800 border-red-300'
                                }`}
                              >
                                {effectiveStock} db
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Name */}
                      <div className="font-bold text-xs sm:text-sm text-[#211E1B] leading-snug line-clamp-2 mb-1.5 break-words">
                        {p.name}
                      </div>

                      {/* Tags: Factory Code, Category, Manufacturer */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {p.factoryCode && (
                          <span className="font-mono font-bold text-xs text-[#211E1B] bg-[#DBD8D5]/60 px-2 py-0.5 rounded border border-[#DBD8D5] break-all">
                            {p.factoryCode}
                          </span>
                        )}
                        {p.category && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategories([p.category!]);
                            }}
                            className="font-bold text-xs text-[#1e6075] bg-[#79B6B8]/15 hover:bg-[#3A5D6B] hover:text-white px-2 py-0.5 rounded-md transition-colors break-words text-left"
                          >
                            {p.category}
                          </button>
                        )}
                        {p.manufacturer && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedManufacturers([p.manufacturer!]);
                            }}
                            className="font-semibold text-xs text-gray-700 bg-gray-100 hover:bg-[#7098BA] hover:text-white px-2 py-0.5 rounded-md transition-colors break-words text-left"
                          >
                            {p.manufacturer}
                          </button>
                        )}
                        {isConnectorCategory(p.category) && p.positionsCount !== undefined && p.positionsCount !== null && (
                          <span className="font-mono font-bold text-xs text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md" title="Pozíciók száma">
                            {p.positionsCount}
                          </span>
                        )}
                      </div>

                      {/* Kanban státusz & Hozzáadás gomb mobilon */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const kanbanInfo = getProductKanbanStatus(p.productId, kanbanItems);
                          const cfg = kanbanInfo.status ? KANBAN_STATUS_CONFIG[kanbanInfo.status] : null;

                          if (kanbanInfo.inKanban && cfg) {
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onOpenKanbanModal) onOpenKanbanModal(p.productId);
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border shadow-2xs cursor-pointer ${cfg.bgBadge} ${cfg.textBadge} ${cfg.borderBadge}`}
                                title={`Kanbanban: ${cfg.label}${kanbanInfo.item?.note ? ` - ${kanbanInfo.item.note}` : ''}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                                <span>Kanban: {cfg.label}</span>
                                {kanbanInfo.item?.note && (
                                  <span className="text-[10px] opacity-75 max-w-[120px] truncate">
                                    ({kanbanInfo.item.note})
                                  </span>
                                )}
                              </button>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenKanbanModal) onOpenKanbanModal(p.productId);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-[#3A5D6B] hover:text-white border border-slate-300 transition-colors cursor-pointer"
                              title="Hozzáadás a Kanbanhoz"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Kanban</span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Chevron Indicator */}
                    <div className="shrink-0 self-center pl-1 text-[#3A5D6B]">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Desktop Table View (Screens >= md): Compact, tailored column widths so overall table fits perfectly */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-[#3A5D6B] text-white text-xs font-bold uppercase tracking-wider select-none">
                    <th className="py-2.5 px-2 w-14 text-center">Kép</th>
                    <th
                      className={`py-2.5 px-2.5 cursor-pointer transition-colors w-44 lg:w-56 xl:w-60 ${
                        sortBy === 'id' ? 'bg-[#2F223A] text-[#79B6B8]' : 'hover:bg-[#2F223A]'
                      }`}
                      onClick={() => toggleSort('id')}
                      title="Rendezés Termék ID szerint"
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <span>Termék ID</span>
                        {sortBy === 'id' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#79B6B8] shrink-0" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#79B6B8] shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-75 shrink-0" />
                        )}
                      </div>
                    </th>
                    <th
                      className={`py-2.5 px-2.5 cursor-pointer transition-colors w-32 lg:w-40 xl:w-44 ${
                        sortBy === 'name' ? 'bg-[#2F223A] text-[#79B6B8]' : 'hover:bg-[#2F223A]'
                      }`}
                      onClick={() => toggleSort('name')}
                      title="Rendezés név szerint természetes sorrendben (1, 2, 3... 10...)"
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <span>Név</span>
                        {sortBy === 'name' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#79B6B8] shrink-0" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#79B6B8] shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-75 shrink-0" />
                        )}
                      </div>
                    </th>
                    <th
                      className={`py-2.5 px-2.5 cursor-pointer transition-colors w-44 lg:w-52 xl:w-56 ${
                        sortBy === 'factoryCode' ? 'bg-[#2F223A] text-[#79B6B8]' : 'hover:bg-[#2F223A]'
                      }`}
                      onClick={() => toggleSort('factoryCode')}
                      title="Rendezés gyári kód szerint"
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <span>Gyári kód</span>
                        {sortBy === 'factoryCode' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#79B6B8] shrink-0" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#79B6B8] shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-75 shrink-0" />
                        )}
                      </div>
                    </th>
                    <th className="py-2.5 px-2 hidden md:table-cell text-left w-24 lg:w-32 leading-tight">
                      Kategória
                    </th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap w-24 lg:w-28">
                      Raktár Pozíció
                    </th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap w-20">
                      Készlet
                    </th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap w-28 lg:w-32">
                      Kanban
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DBD8D5] text-[#211E1B]">
                  {paginatedProducts.map((p) => {
                    const hasImage = p.images && p.images.length > 0;
                    const thumb = hasImage ? p.images[0] : null;
                    const whInfo = productWarehouseMap.get(p.productId.trim().toLowerCase());
                    const effectiveStock =
                      whInfo !== undefined
                        ? whInfo.totalQuantity
                        : p.stockQuantity !== undefined && p.stockQuantity !== null && !isNaN(Number(p.stockQuantity))
                        ? Number(p.stockQuantity)
                        : 0;
                    const primaryPositions = (whInfo && whInfo.positions.length > 0)
                      ? whInfo.positions
                      : (p.location ? [p.location] : []);

                    return (
                      <tr
                        key={p.productId}
                        onClick={() => onSelectProduct(p)}
                        className="group hover:bg-[#79B6B8]/10 cursor-pointer transition-colors"
                      >
                        {/* Thumbnail */}
                        <td className="py-3 px-2 sm:px-3 text-center">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-[#DBD8D5] bg-[#F8F9FA] overflow-hidden flex items-center justify-center mx-auto shrink-0 shadow-xs">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://placehold.co/80x80/3A5D6B/white?text=?';
                                }}
                              />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                        </td>

                        {/* Termék ID */}
                        <td className="py-3 px-2.5 sm:px-3.5 font-mono leading-snug">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProduct(p);
                            }}
                            className="font-black text-base sm:text-lg lg:text-xl text-[#1e6075] hover:text-[#0f3f4e] hover:bg-[#79B6B8]/20 px-2 py-1 -mx-1 rounded-lg transition-all duration-200 focus:outline-none cursor-pointer text-left tracking-tight break-words break-all inline-block"
                            title="Adatlap megnyitása"
                          >
                            {p.productId}
                          </button>
                        </td>

                        {/* Név */}
                        <td className="py-3 px-2.5 sm:px-3">
                          <div className="font-bold text-xs sm:text-sm text-[#211E1B] leading-snug break-words">
                            {p.name}
                          </div>
                          {p.description && (
                            <div className="text-[11px] sm:text-xs text-gray-600 line-clamp-1 mt-0.5 font-medium break-words leading-tight">
                              {p.description}
                            </div>
                          )}
                        </td>

                        {/* Gyári Kód */}
                        <td className="py-3 px-2.5 sm:px-3">
                          <span className="font-mono font-bold text-xs sm:text-sm text-[#211E1B] bg-[#DBD8D5]/40 px-2 py-0.5 rounded-md border border-[#DBD8D5] inline-block max-w-full break-words break-all leading-tight">
                            {p.factoryCode || '—'}
                          </span>
                        </td>

                        {/* Kategória / Gyártó */}
                        <td className="py-3 px-2 sm:px-3 hidden md:table-cell">
                          <div className="flex flex-col gap-0.5 items-start max-w-full text-xs">
                            {p.category && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCategories([p.category!]);
                                }}
                                className="font-bold text-[#1e6075] hover:text-white hover:bg-[#3A5D6B] px-1.5 py-0.5 -mx-1 rounded transition-colors text-left break-words max-w-full leading-tight cursor-pointer"
                                title={`Szűrés erre a kategóriára: ${p.category}`}
                              >
                                <span>{p.category}</span>
                              </button>
                            )}
                            {p.manufacturer && (
                              <span className="text-[11px] text-gray-500 font-medium">
                                {p.manufacturer}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Raktár Pozíció */}
                        <td className="py-3 px-2 sm:px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {primaryPositions.length > 0 ? (
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {primaryPositions.map((pos) => (
                                <button
                                  key={pos}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onNavigateToWarehousePosition) {
                                      onNavigateToWarehousePosition(pos);
                                    }
                                  }}
                                  className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-900 border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                                  title={`Ugrás a(z) ${pos} raktári pozícióra`}
                                >
                                  {pos}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          )}
                        </td>

                        {/* Készlet (0 pirossal, >0 zölddel) */}
                        <td className="py-3 px-2 sm:px-3 text-center whitespace-nowrap">
                          <span
                            className={`font-mono font-black text-xs px-2.5 py-1 rounded-full border shadow-2xs inline-flex items-center justify-center min-w-[50px] ${
                              effectiveStock > 0
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-red-50 text-red-800 border-red-300'
                            }`}
                          >
                            {effectiveStock} db
                          </span>
                        </td>

                        {/* Kanban státusz & Hozzáadás gomb */}
                        <td
                          className="py-3 px-2 sm:px-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(() => {
                            const kanbanInfo = getProductKanbanStatus(p.productId, kanbanItems);
                            const cfg = kanbanInfo.status ? KANBAN_STATUS_CONFIG[kanbanInfo.status] : null;

                            if (kanbanInfo.inKanban && cfg) {
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenKanbanModal) onOpenKanbanModal(p.productId);
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border shadow-2xs cursor-pointer transition-transform hover:scale-105 ${cfg.bgBadge} ${cfg.textBadge} ${cfg.borderBadge}`}
                                  title={`Kanbanban: ${cfg.label}${kanbanInfo.item?.note ? `\nMegjegyzés: ${kanbanInfo.item.note}` : ''}\nKattints a szerkesztéshez!`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                                  <span>{cfg.label}</span>
                                </button>
                              );
                            }

                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onOpenKanbanModal) onOpenKanbanModal(p.productId);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-white bg-slate-100 hover:bg-[#3A5D6B] border border-slate-300 transition-colors cursor-pointer shadow-2xs"
                                title={`Hozzáadás a Kanbanhoz: ${p.productId}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Kanban</span>
                              </button>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (Bottom) */}
            {filteredProducts.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 bg-white border-t border-[#DBD8D5]">
                <div className="text-sm font-bold text-[#3A5D6B] text-center sm:text-left">
                  Megjelenítve:{' '}
                  <span className="text-[#211E1B] font-extrabold">
                    {filteredProducts.length === 0 ? 0 : startIndex + 1}–{endIndex}
                  </span>{' '}
                  / {filteredProducts.length} db termék
                  <span className="text-gray-500 font-normal ml-1">
                    (50 db / oldal{totalPages > 1 ? `, ${validPage}/${totalPages}. oldal` : ''})
                  </span>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    {/* Previous / Balra button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (validPage > 1) {
                          setCurrentPage(validPage - 1);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      disabled={validPage <= 1}
                      className={`px-3.5 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                        validPage <= 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                          : 'bg-white hover:bg-[#3A5D6B] text-[#3A5D6B] hover:text-white border-2 border-[#3A5D6B] shadow-2xs active:scale-95'
                      }`}
                      title="Előző 50 termék (Balra)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Előző</span>
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - validPage) <= 1)
                        .map((p, idx, arr) => {
                          const prev = arr[idx - 1];
                          const showEllipsis = prev && p - prev > 1;
                          return (
                            <React.Fragment key={p}>
                              {showEllipsis && <span className="px-1 text-gray-400 font-bold">...</span>}
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentPage(p);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`w-9 h-9 rounded-xl font-extrabold text-sm transition-all cursor-pointer ${
                                  validPage === p
                                    ? 'bg-[#3A5D6B] text-white shadow-xs'
                                    : 'bg-[#F8F9FA] text-[#211E1B] hover:bg-[#DBD8D5] border border-[#DBD8D5]'
                                }`}
                              >
                                {p}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </div>

                    {/* Next / Jobbra button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (validPage < totalPages) {
                          setCurrentPage(validPage + 1);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      disabled={validPage >= totalPages}
                      className={`px-3.5 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                        validPage >= totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                          : 'bg-white hover:bg-[#3A5D6B] text-[#3A5D6B] hover:text-white border-2 border-[#3A5D6B] shadow-2xs active:scale-95'
                      }`}
                      title="Következő 50 termék (Jobbra)"
                    >
                      <span>Következő</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

