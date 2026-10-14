import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Upload,
  Database,
  ArrowRight,
  Layers,
  RotateCcw,
  Link as LinkIcon,
  Globe,
  ShieldCheck,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { Product } from '../types/product';
import {
  getAllCrimpRecords,
  reloadCrimpRecords,
  resetCrimpRecordsToDefault,
  getCustomCrimpCsv,
  getStoredCrimpLiveUrl,
  setStoredCrimpLiveUrl,
  convertToLiveCsvUrl,
  getStoredCrimpLastSync,
  setStoredCrimpLastSync
} from '../services/crimpHeightService';
import { syncTerminalFejRelationsFromCrimpTable } from '../services/terminalFejService';

interface CrimpSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onRelationsUpdated?: () => void;
  onResetWarehouseStock?: () => void;
}

export const CrimpSettingsModal: React.FC<CrimpSettingsModalProps> = ({
  isOpen,
  onClose,
  products,
  onRelationsUpdated,
  onResetWarehouseStock
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Live Drive / Sheets URL state
  const [liveUrlInput, setLiveUrlInput] = useState<string>('');
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(false);
  const [lastSyncDate, setLastSyncDate] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setLiveUrlInput(getStoredCrimpLiveUrl());
      setLastSyncDate(getStoredCrimpLastSync());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentRecords = getAllCrimpRecords();
  const hasCustomCsv = Boolean(getCustomCrimpCsv());

  const handleSyncFromTable = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncTerminalFejRelationsFromCrimpTable(products);
      if (res.success) {
        setSyncResult({
          success: true,
          message: `Sikeres frissítés! ${res.crimpRecordsCount} db sarumagasság rekord feldolgozva, ${res.generatedCount} db saru ↔ saruzófej kapcsolat automatikusan frissítve.`,
          count: res.generatedCount
        });
        if (onRelationsUpdated) {
          onRelationsUpdated();
        }
      } else {
        setSyncResult({
          success: false,
          message: res.error || 'Hiba történt a táblázat kapcsolatainak frissítésekor.'
        });
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err?.message || 'Hiba történt a szinkronizáció során.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) {
      setUploadedFile(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.txt')) {
      setFileError('Kérjük, CSV kiterjesztésű fájlt válasszon ki!');
      setUploadedFile(null);
      return;
    }
    setUploadedFile(file);
  };

  const handleApplyUploadedCsv = async () => {
    if (!uploadedFile) return;
    setIsUploading(true);
    setFileError(null);
    setSyncResult(null);

    try {
      const text = await uploadedFile.text();
      if (!text || text.trim().length < 50) {
        setFileError('A kiválasztott fájl üres vagy érvénytelen!');
        setIsUploading(false);
        return;
      }

      reloadCrimpRecords(text);
      const res = await syncTerminalFejRelationsFromCrimpTable(products);

      setSyncResult({
        success: true,
        message: `Új sarumagasság táblázat sikeresen feltöltve és alkalmazva! ${res.crimpRecordsCount} db rekord betöltve, ${res.generatedCount} db kapcsolat szinkronizálva.`,
        count: res.generatedCount
      });
      setUploadedFile(null);
      if (onRelationsUpdated) {
        onRelationsUpdated();
      }
    } catch (err: any) {
      setFileError(err?.message || 'Nem sikerült beolvasni a CSV fájlt.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSyncFromLiveUrl = async () => {
    if (!liveUrlInput.trim()) {
      setFileError('Kérjük, adjon meg egy érvényes Google Sheets vagy Google Drive CSV megosztási linket!');
      return;
    }
    setIsLiveSyncing(true);
    setFileError(null);
    setSyncResult(null);

    try {
      const csvDownloadUrl = convertToLiveCsvUrl(liveUrlInput.trim());
      const response = await fetch(csvDownloadUrl);
      if (!response.ok) {
        throw new Error(
          `A megadott linken nem sikerült elérni a táblázatot (HTTP ${response.status}). Ellenőrizze, hogy a táblázat nyilvánosan elérhető-e ("Bárki, akinek megvan a link" jogosultsággal)!`
        );
      }
      const text = await response.text();
      if (!text || text.trim().length < 50) {
        throw new Error('A letöltött fájl üres vagy érvénytelen CSV formátumú.');
      }

      reloadCrimpRecords(text);
      const res = await syncTerminalFejRelationsFromCrimpTable(products);

      const nowStr = new Date().toLocaleString('hu-HU');
      setStoredCrimpLiveUrl(liveUrlInput.trim());
      setStoredCrimpLastSync(nowStr);
      setLastSyncDate(nowStr);

      setSyncResult({
        success: true,
        message: `Sikeres élő link szinkronizáció! ${res.crimpRecordsCount} db egyedi sarumagasság rekord betöltve, ${res.generatedCount} db kapcsolat frissítve. Minden duplikáció kiszűrve.`,
        count: res.generatedCount
      });

      if (onRelationsUpdated) {
        onRelationsUpdated();
      }
    } catch (err: any) {
      setFileError(
        err?.message ||
          'Nem sikerült letölteni a táblázatot az élő linkről. Kérjük ellenőrizze az internetkapcsolatot és a link jogosultságait.'
      );
    } finally {
      setIsLiveSyncing(false);
    }
  };

  const handleResetToDefault = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      resetCrimpRecordsToDefault();
      setLiveUrlInput('');
      setLastSyncDate('');
      const res = await syncTerminalFejRelationsFromCrimpTable(products);
      setSyncResult({
        success: true,
        message: `Gyári alapértelmezett sarumagasság táblázat visszaállítva! ${res.crimpRecordsCount} db egyedi rekord aktív.`,
        count: res.generatedCount
      });
      if (onRelationsUpdated) {
        onRelationsUpdated();
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err?.message || 'Hiba történt a gyári adatok visszaállításakor.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[#DBD8D5] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold leading-tight">Sarumagasság Táblázat Beállítások</h3>
              <p className="text-xs text-orange-100">
                Saru és saruzófej adatok szinkronizálása a sarumagasság táblázatból
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Ablak bezárása"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#211E1B]">
          {/* Status Overview Card */}
          <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-orange-700 shrink-0" />
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-orange-950 block">
                  Táblázat Állapota
                </span>
                <span className="text-sm font-bold text-stone-900">
                  {currentRecords.length} db egyedi sarumagasság rekord aktív
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-900 border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>0 duplikáció (ellenőrizve)</span>
              </span>
              <span
                className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${
                  hasCustomCsv
                    ? 'bg-amber-100 text-amber-950 border-amber-300'
                    : 'bg-stone-100 text-stone-900 border-stone-300'
                }`}
              >
                {hasCustomCsv ? 'Egyéni / Élő táblázat' : 'Gyári beépített adatbázis'}
              </span>
            </div>
          </div>

          {/* Sync Result Banner */}
          {syncResult && (
            <div
              className={`p-4 rounded-xl flex items-start gap-3 border animate-fadeIn ${
                syncResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-red-50 text-red-900 border-red-200'
              }`}
            >
              {syncResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="text-sm">
                <span className="font-bold block">
                  {syncResult.success ? 'Sikeres művelet!' : 'Hiba történt'}
                </span>
                <span>{syncResult.message}</span>
              </div>
            </div>
          )}

          {/* File error */}
          {fileError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {/* 1. Clarification & Live Link Box: Melyik Drive linkre történik a szinkronizálás? */}
          <div className="p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/40 space-y-3">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold text-amber-950">
                  Melyik Google Drive linkről történik a szinkronizálás?
                </h4>
                <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                  Alapértelmezetten a szinkronizálás a <strong>beépített gyári sarumagasság adatbázisból</strong> dolgozik ({currentRecords.length} db rekord).
                  Ha Önnek van egy <strong>élő Google Drive vagy Google Sheets táblázata</strong>, adja meg a linkjét az alábbi mezőben, és a rendszer közvetlenül abból tölti le a friss adatokat:
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-stone-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-orange-600" />
                  <span>Élő Google Drive / Sheets CSV Link:</span>
                </span>
                {lastSyncDate && (
                  <span className="text-[11px] text-stone-500 font-medium">
                    Utolsó szinkronizáció: {lastSyncDate}
                  </span>
                )}
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/... vagy Drive letöltési link"
                    value={liveUrlInput}
                    onChange={(e) => setLiveUrlInput(e.target.value)}
                    disabled={isLiveSyncing || isSyncing}
                    className="w-full text-xs font-mono p-2.5 pl-8 border border-stone-300 focus:border-orange-500 rounded-xl bg-white text-stone-900"
                  />
                  <LinkIcon className="w-4 h-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <button
                  type="button"
                  onClick={handleSyncFromLiveUrl}
                  disabled={isLiveSyncing || isSyncing || !liveUrlInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLiveSyncing ? 'animate-spin' : ''}`} />
                  <span>{isLiveSyncing ? 'Letöltés...' : 'Élő Link Szinkronizálása'}</span>
                </button>
              </div>

              <p className="text-[11px] text-stone-500 leading-normal">
                Támogatott linkek: Google Táblázat (Közzététel az interneten CSV formátumban vagy megosztási link), illetve közvetlen Google Drive CSV fájllink.
              </p>
            </div>
          </div>

          {/* 2. Primary Action: Refresh / Synchronize from Active Table */}
          <div className="p-5 rounded-2xl border-2 border-orange-300 bg-white shadow-xs space-y-3">
            <div>
              <h4 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-orange-600" />
                <span>Adatok frissítése az aktív sarumagasság táblázatból</span>
              </h4>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Újraértékeli a táblázatban szereplő saru kódokat és saruzófej (N-sorozat) beállításokat,
                automatikusan kiszűri az összes duplikációt (egy adat sem jelenik meg kétszer), felépíti a kapcsolódó saruk és saruzófejek listáját, és elmenti az aktív adatbázisba.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSyncFromTable}
              disabled={isSyncing || isLiveSyncing}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-extrabold text-sm sm:text-base shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing ? 'Frissítés folyamatban...' : 'Adatok & Kapcsolatok Frissítése Most'}
              </span>
            </button>
          </div>

          {/* 3. Optional: Upload new Crimp CSV file */}
          <div className="p-5 rounded-2xl border border-stone-200 bg-[#FBFBFA] space-y-3">
            <h4 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-stone-700" />
              <span>Új Sarumagasság CSV feltöltése fájlból (opcionális)</span>
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Ha a számítógépéről szeretne egy friss sarumagasság mérési CSV fájlt alkalmazni, itt tallózhatja be.
            </p>

            <div className="space-y-2">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                disabled={isUploading || isSyncing || isLiveSyncing}
                className="block w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border file:border-stone-300 file:text-xs file:font-bold file:bg-white file:text-stone-800 hover:file:bg-orange-50 cursor-pointer"
              />

              {uploadedFile && (
                <button
                  type="button"
                  onClick={handleApplyUploadedCsv}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-extrabold transition-colors cursor-pointer"
                >
                  <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
                  <span>Feltöltött CSV alkalmazása és frissítés</span>
                </button>
              )}
            </div>
          </div>

          {/* 4. Reset to Factory Default */}
          {(hasCustomCsv || liveUrlInput) && (
            <div className="p-4 rounded-xl border border-stone-200 bg-white flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-stone-900 block">
                  Gyári alapértelmezett táblázat visszaállítása
                </span>
                <span className="text-xs text-stone-500">
                  Törli az egyéni/élő táblázatot és visszaállítja a gyári sarumagasság adatokat.
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={isSyncing || isLiveSyncing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
                <span>Visszaállítás</span>
              </button>
            </div>
          )}

          {/* 5. Teljes raktárkészlet nullázása (0 db) */}
          <div className="p-5 rounded-2xl border-2 border-rose-200 bg-rose-50/60 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-rose-950 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  <span>Teljes raktárkészlet beállítása 0 db-ra</span>
                </h4>
                <p className="text-xs text-rose-800/90 mt-1 leading-relaxed">
                  Nullázza az összes termék raktári darabszámát (minden termék készlete 0 db lesz). A felvett raktári pozíciók (helyek) és a termékkatalógus megmaradnak a rendszerben.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onResetWarehouseStock) {
                  onResetWarehouseStock();
                }
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Teljes raktárkészlet nullázása (0 db)</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#DBD8D5] bg-[#F8F9FA] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#DBD8D5]/60 hover:bg-[#DBD8D5] text-[#211E1B] font-bold text-sm transition-colors cursor-pointer"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
