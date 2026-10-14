import React, { useState } from 'react';
import {
  X,
  List,
  PlusCircle,
  UploadCloud,
  Download,
  BarChart3,
  Database,
  LogIn,
  LogOut,
  RefreshCw,
  Info,
  Layers,
  ChevronRight,
  ShieldCheck,
  Shield,
  Image as ImageIcon,
  Puzzle,
  Package,
  Gauge,
  Plug,
  GitCompare,
  BookOpen,
  FileSpreadsheet,
  Box,
  RotateCcw,
  Wrench,
  Trash2
} from 'lucide-react';
import { ViewMode, UserProfile } from '../types/product';
import { CompanyLogo, LogoUploadModal, getCompanyLogoUrl } from './CompanyLogo';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onNavigateToDataImport?: (tab: 'products' | 'components' | 'meterboxes' | 'connector-terminals' | 'mating-pairs' | 'notes' | 'warehouse-positions' | 'warehouse-transactions' | 'maintenances') => void;
  onExportCsv: () => void;
  onSyncFirebase: () => void;
  onOpenCrimpSettings?: () => void;
  onOpenWarehouseImport?: () => void;
  onResetWarehouseStockToZero?: () => void;
  totalWarehouseUnits?: number;
  onOpenMaintenanceManager?: () => void;
  onOpenDeleteAllMaintenances?: () => void;
  totalMaintenancesCount?: number;
  totalKanbanItemsCount?: number;
  isSyncing: boolean;
  currentUser: { email?: string | null; displayName?: string | null } | null;
  currentUserProfile?: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  currentView,
  onNavigate,
  onNavigateToDataImport,
  onExportCsv,
  onSyncFirebase,
  onOpenCrimpSettings,
  onOpenWarehouseImport,
  onResetWarehouseStockToZero,
  totalWarehouseUnits,
  onOpenMaintenanceManager,
  onOpenDeleteAllMaintenances,
  totalMaintenancesCount,
  totalKanbanItemsCount,
  isSyncing,
  currentUser,
  currentUserProfile,
  onLogin,
  onLogout
}) => {
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleNav = (view: ViewMode) => {
    onNavigate(view);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#211E1B]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-slideRight">
        {/* Header */}
        <div className="p-5 border-b border-[#DBD8D5] flex items-center justify-between bg-[#3A5D6B] text-white">
          <div className="flex items-center gap-3">
            <CompanyLogo size="sm" />
            <div>
              <h2 className="text-xl font-bold leading-tight">World Wires kft.</h2>
              <p className="text-xs text-[#DBD8D5]">Rendszermenü & Raktárkezelő</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Menü bezárása"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Main Navigation */}
          <div className="space-y-1.5">
            <span className="text-xs uppercase font-extrabold tracking-wider text-gray-500 px-3">
              Fő Funkciók
            </span>

            <button
              type="button"
              onClick={() => handleNav('list')}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl font-bold text-lg transition-colors cursor-pointer ${
                currentView === 'list'
                  ? 'bg-[#3A5D6B] text-white shadow-xs'
                  : 'hover:bg-[#DBD8D5]/40 text-[#211E1B]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <List className="w-6 h-6" />
                <span>Terméklista</span>
              </div>
              <ChevronRight className="w-5 h-5 opacity-70" />
            </button>

            {/* Kanban Tábla menüpont */}
            <button
              type="button"
              onClick={() => handleNav('kanban')}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl font-bold text-lg transition-colors cursor-pointer ${
                currentView === 'kanban'
                  ? 'bg-[#3A5D6B] text-white shadow-xs'
                  : 'hover:bg-[#DBD8D5]/40 text-[#211E1B]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Layers className={`w-6 h-6 ${currentView === 'kanban' ? 'text-white' : 'text-[#79B6B8]'}`} />
                <div className="text-left">
                  <span>Kanban Tábla</span>
                  <span className={`block text-xs font-medium ${currentView === 'kanban' ? 'text-white/80' : 'text-slate-500'}`}>
                    Új, Folyamatban, Befejezve
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {totalKanbanItemsCount !== undefined && totalKanbanItemsCount > 0 && (
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                    currentView === 'kanban'
                      ? 'bg-white/20 text-white'
                      : 'bg-purple-100 text-purple-900 border border-purple-200'
                  }`}>
                    {totalKanbanItemsCount} db
                  </span>
                )}
                <ChevronRight className="w-5 h-5 opacity-70" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleNav('new-product')}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl font-bold text-lg transition-colors cursor-pointer ${
                currentView === 'new-product'
                  ? 'bg-[#3A5D6B] text-white shadow-xs'
                  : 'hover:bg-[#DBD8D5]/40 text-[#211E1B]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <PlusCircle className="w-6 h-6" />
                <span>Új Termék Rögzítése</span>
              </div>
              <ChevronRight className="w-5 h-5 opacity-70" />
            </button>

            {/* Adatfeltöltés Szekció (Termék CSV & Beépülő alkatrész CSV) */}
            <div className="rounded-xl border border-[#DBD8D5] bg-[#F8F9FA] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToDataImport) {
                    onNavigateToDataImport('products');
                  } else {
                    handleNav('csv-import');
                  }
                }}
                className={`w-full flex items-center justify-between p-3.5 font-bold text-lg transition-colors cursor-pointer ${
                  currentView === 'csv-import' || currentView === 'data-import'
                    ? 'bg-[#3A5D6B] text-white shadow-xs'
                    : 'hover:bg-[#DBD8D5]/50 text-[#211E1B]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <UploadCloud className="w-6 h-6 text-[#79B6B8]" />
                  <span>Adatfeltöltés</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-70" />
              </button>

              {/* Sub-items for direct navigation to specific CSV import tab */}
              <div className="px-2.5 pb-2 pt-1 space-y-1 bg-white/60 border-t border-[#DBD8D5]/60">
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToDataImport) {
                      onNavigateToDataImport('products');
                    } else {
                      handleNav('csv-import');
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold text-[#3A5D6B] hover:bg-[#79B6B8]/15 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#3A5D6B]" />
                    <span>Termék CSV</span>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500">Készlet</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToDataImport) {
                      onNavigateToDataImport('components');
                    } else {
                      handleNav('csv-import');
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold text-emerald-900 hover:bg-emerald-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <Puzzle className="w-4 h-4 text-emerald-700" />
                    <span>Beépülő alkatrész CSV</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded-full">
                    Alkatrészek
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToDataImport) {
                      onNavigateToDataImport('meterboxes');
                    } else {
                      handleNav('csv-import');
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold text-orange-950 hover:bg-orange-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-orange-600" />
                    <span>Termék&lt;-&gt;Mérődoboz CSV</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-orange-800 bg-orange-100 border border-orange-300 px-1.5 py-0.2 rounded-full">
                    Mérődoboz
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToDataImport) {
                      onNavigateToDataImport('connector-terminals');
                    } else {
                      handleNav('csv-import');
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold text-orange-950 hover:bg-orange-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <Plug className="w-4 h-4 text-orange-600" />
                    <span>Konnektor&lt;-&gt;Saru CSV</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-orange-800 bg-orange-100 border border-orange-300 px-1.5 py-0.2 rounded-full">
                    Konnektor-Saru
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToDataImport) {
                      onNavigateToDataImport('mating-pairs');
                    } else {
                      handleNav('csv-import');
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold text-yellow-950 hover:bg-yellow-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-yellow-700" />
                    <span>Ellenpárok CSV</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-yellow-900 bg-yellow-100 border border-yellow-300 px-1.5 py-0.2 rounded-full">
                    Ellenpárok
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToDataImport) {
                      onNavigateToDataImport('notes');
                    } else {
                      handleNav('csv-import');
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold text-red-950 hover:bg-red-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#FA4646]" />
                    <span>Notesz CSV</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-white bg-[#FA4646] px-1.5 py-0.2 rounded-full">
                    Notesz
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToDataImport) {
                      onNavigateToDataImport('warehouse-positions');
                    } else {
                      handleNav('csv-import');
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold text-blue-950 hover:bg-blue-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-blue-600" />
                    <span>Raktár Pozíciók CSV</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-blue-800 bg-blue-100 border border-blue-300 px-1.5 py-0.2 rounded-full">
                    Pozíciók
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToDataImport) {
                      onNavigateToDataImport('warehouse-transactions');
                    } else {
                      handleNav('csv-import');
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold text-sky-950 hover:bg-sky-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-600" />
                    <span>Készlet Tranzakciók CSV</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-sky-800 bg-sky-100 border border-sky-300 px-1.5 py-0.2 rounded-full">
                    +/- Készlet
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToDataImport) {
                      onNavigateToDataImport('maintenances');
                    } else {
                      handleNav('csv-import');
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold text-amber-950 hover:bg-amber-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#7B4B29]" />
                    <span>Karbantartás CSV</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-amber-950 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded-full">
                    Karbantartás
                  </span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onExportCsv();
                onClose();
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl font-bold text-lg hover:bg-[#DBD8D5]/40 text-[#211E1B] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <Download className="w-6 h-6 text-[#7098BA]" />
                <span>Adatok Exportálása (CSV)</span>
              </div>
              <ChevronRight className="w-5 h-5 opacity-70" />
            </button>

            <button
              type="button"
              onClick={() => handleNav('warehouse-stats')}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl font-bold text-lg transition-colors cursor-pointer ${
                currentView === 'warehouse-stats'
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'hover:bg-blue-50/70 text-[#211E1B]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Box className={`w-6 h-6 ${currentView === 'warehouse-stats' ? 'text-sky-200' : 'text-blue-600'}`} />
                <div className="text-left">
                  <span>Raktár & Készletkezelés</span>
                  <span className={`block text-xs font-medium ${currentView === 'warehouse-stats' ? 'text-blue-100' : 'text-slate-500'}`}>
                    Pozíciók, készletmozgás, napló
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {totalWarehouseUnits !== undefined && (
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                    currentView === 'warehouse-stats'
                      ? 'bg-white/20 text-white'
                      : 'bg-blue-100 text-blue-900 border border-blue-200'
                  }`}>
                    {totalWarehouseUnits} db
                  </span>
                )}
                <ChevronRight className="w-5 h-5 opacity-70" />
              </div>
            </button>

            {/* Felhasználók & Jogosultságok menüpont */}
            <button
              type="button"
              onClick={() => handleNav('users-permissions')}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl font-bold text-lg transition-colors cursor-pointer ${
                currentView === 'users-permissions'
                  ? 'bg-[#3A5D6B] text-white shadow-xs'
                  : 'hover:bg-[#DBD8D5]/40 text-[#211E1B]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Shield className="w-6 h-6 text-[#79B6B8]" />
                <div className="text-left">
                  <span>Felhasználók & Jogosultságok</span>
                  {currentUserProfile && (
                    <span className="block text-xs font-normal text-gray-500">
                      Szerepkör: {currentUserProfile.role === 'admin' ? 'Admin' : currentUserProfile.role === 'editor' ? 'Szerkesztő' : 'Megtekintő'}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 opacity-70" />
            </button>

            {/* Karbantartások Kezelése menüpont */}
            <button
              type="button"
              onClick={() => {
                if (onOpenMaintenanceManager) {
                  onOpenMaintenanceManager();
                  onClose();
                }
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl font-bold text-lg hover:bg-amber-50/70 text-[#211E1B] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <Wrench className="w-6 h-6 text-[#7B4B29]" />
                <div className="text-left">
                  <span>Karbantartások Kezelése</span>
                  <span className="block text-xs font-medium text-amber-800">
                    Napló, szűrés, egyesével & összes törlés
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {totalMaintenancesCount !== undefined && totalMaintenancesCount > 0 && (
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-[#7B4B29] border border-amber-300">
                    {totalMaintenancesCount} db
                  </span>
                )}
                <ChevronRight className="w-5 h-5 opacity-70" />
              </div>
            </button>
          </div>

          <div className="pt-4 border-t border-[#DBD8D5] space-y-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-gray-500 px-3">
              Beállítások & Adatbázis
            </span>

            {/* Sarumagasság Táblázat Frissítése */}
            <button
              type="button"
              onClick={() => {
                if (onOpenCrimpSettings) {
                  onOpenCrimpSettings();
                  onClose();
                }
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl font-bold text-base hover:bg-orange-50 text-stone-900 border border-orange-200 bg-orange-50/50 transition-colors cursor-pointer"
              title="Sarumagasság táblázat adatainak és a saru-saruzófej kapcsolatoknak a frissítése"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-orange-700 shrink-0" />
                <div className="text-left">
                  <span className="block leading-tight text-sm font-bold text-stone-900">
                    Sarumagasság Táblázat
                  </span>
                  <span className="text-xs font-normal text-stone-600">
                    Adatok & kapcsolatok frissítése
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-extrabold bg-orange-200 text-orange-950 px-2.5 py-1 rounded-full shadow-2xs">
                Frissítés
              </span>
            </button>

            {/* Raktári CSV Feltöltés & Bővítés */}
            <button
              type="button"
              onClick={() => {
                if (onOpenWarehouseImport) {
                  onOpenWarehouseImport();
                } else if (onNavigateToDataImport) {
                  onNavigateToDataImport('warehouse-transactions');
                } else {
                  handleNav('csv-import');
                }
                onClose();
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl font-bold text-base hover:bg-blue-50 text-blue-950 border border-blue-200 bg-blue-50/50 transition-colors cursor-pointer"
              title="Raktár pozíciók bővítése és készletmozgások feltöltése CSV fájlból"
            >
              <div className="flex items-center gap-3">
                <UploadCloud className="w-5 h-5 text-blue-700 shrink-0" />
                <div className="text-left">
                  <span className="block leading-tight text-sm font-bold text-blue-950">
                    Raktár & Készlet CSV Feltöltés
                  </span>
                  <span className="text-xs font-normal text-blue-700">
                    Pozíciók bővítése & Tranzakciók
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-extrabold bg-blue-200 text-blue-950 px-2.5 py-1 rounded-full shadow-2xs">
                CSV
              </span>
            </button>

            {/* Teljes Raktárkészlet Nullázása (0 db) */}
            <button
              type="button"
              onClick={() => {
                if (onResetWarehouseStockToZero) {
                  onResetWarehouseStockToZero();
                }
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl font-bold text-base hover:bg-rose-50 text-rose-950 border border-rose-200 bg-rose-50/50 transition-colors cursor-pointer group"
              title="A teljes raktárkészlet beállítása 0 db-ra (minden termék készlete 0 lesz, a raktári pozíciók megmaradnak)"
            >
              <div className="flex items-center gap-3">
                <RotateCcw className="w-5 h-5 text-rose-600 shrink-0 group-hover:-rotate-90 transition-transform duration-200" />
                <div className="text-left">
                  <span className="block leading-tight text-sm font-bold text-rose-950">
                    Raktárkészlet Nullázása
                  </span>
                  <span className="text-xs font-normal text-rose-700">
                    Teljes készlet beállítása 0 db-ra
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-black bg-rose-200 text-rose-950 px-2.5 py-1 rounded-full shadow-2xs">
                0 db
              </span>
            </button>

            {/* Karbantartási Adatok Törlése (Összes) */}
            <button
              type="button"
              onClick={() => {
                if (onOpenDeleteAllMaintenances) {
                  onOpenDeleteAllMaintenances();
                  onClose();
                }
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl font-bold text-base hover:bg-amber-50 text-[#5C381E] border border-amber-300 bg-amber-50/60 transition-colors cursor-pointer group"
              title="Az összes termék karbantartási adatának törlése a rendszerből"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-[#7B4B29] shrink-0 group-hover:scale-110 group-hover:text-rose-700 transition-all" />
                <div className="text-left">
                  <span className="block leading-tight text-sm font-bold text-[#5C381E]">
                    Karbantartások Törlése
                  </span>
                  <span className="text-xs font-normal text-amber-800">
                    Összes karbantartási adat törlése (egyben)
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-black bg-amber-200 text-amber-950 px-2.5 py-1 rounded-full shadow-2xs">
                {totalMaintenancesCount !== undefined ? `${totalMaintenancesCount} db` : 'Összes'}
              </span>
            </button>

            {/* Sync button */}
            <button
              type="button"
              onClick={() => {
                onSyncFirebase();
              }}
              disabled={isSyncing}
              className="w-full flex items-center justify-between p-3.5 rounded-xl font-bold text-base hover:bg-[#DBD8D5]/40 text-[#3A5D6B] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Adatbázis Újraszinkronizálás</span>
              </div>
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Firebase Aktív
              </span>
            </button>

            {/* Logo Settings */}
            <button
              type="button"
              onClick={() => setIsLogoModalOpen(true)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl font-bold text-base hover:bg-[#DBD8D5]/40 text-[#211E1B] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-[#3A5D6B]" />
                <span>Céglogó Kezelése</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
          </div>
        </div>

        {/* Footer: User profile or Google Sign In */}
        <div className="p-4 border-t border-[#DBD8D5] bg-[#F8F9FA]">
          {currentUser ? (
            <div className="space-y-3">
              <div
                onClick={() => handleNav('users-permissions')}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer"
                title="Profil és jogosultságok megnyitása"
              >
                <div className="w-10 h-10 rounded-full bg-[#3A5D6B] text-white font-bold flex items-center justify-center shrink-0">
                  {(currentUserProfile?.displayName || currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-base text-[#211E1B] truncate">
                      {currentUserProfile?.displayName || currentUser.displayName || 'Munkatárs'}
                    </span>
                    {currentUserProfile && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#3A5D6B] text-white">
                        {currentUserProfile.role === 'admin' ? 'Admin' : currentUserProfile.role === 'editor' ? 'Szerkesztő' : 'Megtekintő'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{currentUser.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleNav('users-permissions')}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-[#DBD8D5] text-[#3A5D6B] bg-white hover:bg-[#DBD8D5]/30 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Adatlapom</span>
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Kijelentkezés</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#3A5D6B] hover:bg-[#2F223A] text-white font-bold text-base transition-colors cursor-pointer shadow-xs"
            >
              <LogIn className="w-5 h-5 text-[#79B6B8]" />
              <span>Bejelentkezés / Adatlap</span>
            </button>
          )}
        </div>
      </div>

      {isLogoModalOpen && (
        <LogoUploadModal
          isOpen={isLogoModalOpen}
          onClose={() => setIsLogoModalOpen(false)}
          currentLogo={getCompanyLogoUrl()}
        />
      )}
    </div>
  );
};
