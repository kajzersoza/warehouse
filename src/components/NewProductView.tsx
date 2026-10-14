import React, { useState, useMemo } from 'react';
import { ArrowLeft, Save, Plus, PackagePlus, Layers, AlertTriangle, CheckCircle2, Barcode, RotateCcw } from 'lucide-react';
import { Product } from '../types/product';
import { ImageGalleryWithZoom } from './ImageGalleryWithZoom';
import { ComboboxInput } from './ComboboxInput';
import { isConnectorCategory } from '../services/connectorTerminalService';

interface NewProductViewProps {
  onBack: () => void;
  onGoToList?: () => void;
  onSave: (product: Product) => Promise<void>;
  allProducts?: Product[];
}

type NewProductFormData = Omit<Partial<Product>, 'stockQuantity'> & { stockQuantity?: number | string };

const INITIAL_FORM_DATA: NewProductFormData = {
  productId: '',
  name: '',
  description: '',
  category: '',
  manufacturer: '',
  feeding: '',
  insulationType: '',
  factoryCode: '',
  insulationGripperType: '',
  connectorType: '',
  terminalType: '',
  date: '',
  images: [],
  stockQuantity: 0,
  location: '',
  positionsCount: undefined
};

export const NewProductView: React.FC<NewProductViewProps> = ({
  onBack,
  onGoToList,
  onSave,
  allProducts = []
}) => {
  const [formData, setFormData] = useState<NewProductFormData>({ ...INITIAL_FORM_DATA });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResetForm = () => {
    setFormData({ ...INITIAL_FORM_DATA });
    setErrorMessage(null);
  };

  // Real-time duplicate check for new product
  const enteredId = (formData.productId || '').trim();
  const conflictingProduct = useMemo(() => {
    if (!enteredId) return null;
    const lower = enteredId.toLowerCase();
    return (
      allProducts.find(
        (p) =>
          p.productId.trim().toLowerCase() === lower ||
          p.id.trim().toLowerCase() === lower
      ) || null
    );
  }, [enteredId, allProducts]);

  const isDuplicateId = conflictingProduct !== null;

  // Korábbi értékek összegyűjtése a meglévő termékekből (kategória, gyártó, adagolás, stb.)
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

  const handleChange = (field: keyof NewProductFormData, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleImagesUpdate = (newImages: string[]) => {
    setFormData((prev) => ({ ...prev, images: newImages }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!formData.productId?.trim() || !formData.name?.trim()) {
      setErrorMessage('Kérjük adja meg a Termék ID-t és a Termék nevét!');
      return;
    }

    if (isDuplicateId) {
      setErrorMessage(
        `A megadott Termék ID (${formData.productId?.trim()}) már létezik a rendszerben! Kérjük, adjon meg egyedi azonosítót.`
      );
      return;
    }

    let posCount: number | undefined = undefined;
    const isConn = isConnectorCategory(formData.category);
    if (isConn && formData.positionsCount !== undefined && formData.positionsCount !== null && String(formData.positionsCount).trim() !== '') {
      const num = Number(formData.positionsCount);
      if (isNaN(num) || num < 1 || num > 999) {
        setErrorMessage('A pozíciók száma csak 1 és 999 közötti egész szám lehet!');
        return;
      }
      posCount = Math.floor(num);
    }

    setIsSaving(true);
    try {
      const productToSave: Product = {
        id: formData.productId.trim().replace(/[^a-zA-Z0-9_\-\.]/g, '_'),
        productId: formData.productId.trim(),
        name: formData.name.trim(),
        description: formData.description || '',
        category: formData.category || '',
        manufacturer: formData.manufacturer || '',
        feeding: formData.feeding || '',
        insulationType: formData.insulationType || '',
        factoryCode: formData.factoryCode || '',
        insulationGripperType: formData.insulationGripperType || '',
        connectorType: formData.connectorType || '',
        terminalType: formData.terminalType || '',
        date: formData.date || '',
        images: formData.images || [],
        stockQuantity: typeof formData.stockQuantity === 'number'
          ? formData.stockQuantity
          : (formData.stockQuantity !== '' && !isNaN(Number(formData.stockQuantity)) ? Number(formData.stockQuantity) : 0),
        location: formData.location || '',
        positionsCount: posCount,
        updatedAt: new Date().toISOString()
      };

      await onSave(productToSave);
      onBack();
    } catch (err) {
      console.error('Save failed:', err);
      setErrorMessage('Hiba történt a mentés során!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Bar with Back Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#DBD8D5] shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#DBD8D5]/60 hover:bg-[#DBD8D5] text-[#211E1B] font-extrabold text-base transition-colors cursor-pointer border border-[#DBD8D5]"
            title="Visszalépés 1 lépést"
          >
            <ArrowLeft className="w-5 h-5 text-[#3A5D6B]" />
            <span>Vissza</span>
          </button>
          {onGoToList && (
            <button
              type="button"
              onClick={onGoToList}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-extrabold text-base transition-colors cursor-pointer border border-emerald-300"
              title="Vissza a fő terméklistához (a szűrés megmarad)"
            >
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>Vissza a listához</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetForm}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs sm:text-sm border border-amber-300 transition-colors cursor-pointer"
            title="Minden mező törlése és készlet 0 db-ra állítása"
          >
            <RotateCcw className="w-4 h-4 text-amber-700" />
            <span>Űrlap ürítése (Üres + 0 db)</span>
          </button>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#211E1B] flex items-center gap-2">
            <PackagePlus className="w-7 h-7 text-[#3A5D6B]" />
            <span>Új Termék Rögzítése</span>
          </h2>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-100 border border-red-300 text-red-800 px-5 py-3 rounded-xl font-bold flex items-center justify-between">
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

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-[#DBD8D5] shadow-xs space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Images */}
          <div className="lg:col-span-5 space-y-3">
            <label className="text-base font-bold text-[#3A5D6B] block">
              Termék Képek (URL vagy feltöltés)
            </label>
            <ImageGalleryWithZoom
              images={formData.images || []}
              productName={formData.name || 'Új termék'}
              onUpdateImages={handleImagesUpdate}
              canEdit={true}
            />
          </div>

          {/* Right: Form inputs */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1 gap-1">
                  <label className="text-sm font-bold text-[#3A5D6B] flex items-center gap-1">
                    <Barcode className="w-4 h-4 text-[#3A5D6B]" />
                    <span>Termék ID</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  {enteredId && !isDuplicateId && (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Egyedi ID</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="pl. 40107.00.33"
                    value={formData.productId}
                    onChange={(e) => handleChange('productId', e.target.value)}
                    className={`w-full font-mono font-bold text-lg p-3 border-2 rounded-xl text-[#211E1B] transition-all ${
                      isDuplicateId
                        ? 'border-red-500 bg-red-50/70 text-red-950 focus:outline-hidden focus:border-red-600'
                        : 'border-[#DBD8D5] focus:border-[#3A5D6B] focus:outline-hidden'
                    }`}
                  />
                  {isDuplicateId && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-700 bg-white px-2 py-0.5 rounded-md shadow-xs border border-red-300 font-bold text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>Már létezik!</span>
                    </div>
                  )}
                </div>
                {isDuplicateId && (
                  <p className="mt-1 text-xs font-bold text-red-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>
                      Ez az ID már foglalt! Létező termék: <strong>{conflictingProduct?.name || 'Névtelen'}</strong>
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-[#3A5D6B] mb-1">
                  Termék Név <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="pl. N1 vagy Szerszámfej"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full font-bold text-lg p-3 border-2 border-[#DBD8D5] focus:border-[#3A5D6B] rounded-xl text-[#211E1B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#3A5D6B] mb-1">
                  Gyári Kód
                </label>
                <input
                  type="text"
                  placeholder="pl. MLS0185-J"
                  value={formData.factoryCode}
                  onChange={(e) => handleChange('factoryCode', e.target.value)}
                  className="w-full font-mono text-lg p-3 border-2 border-[#DBD8D5] focus:border-[#3A5D6B] rounded-xl text-[#211E1B]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#3A5D6B] mb-1">
                  Kategória
                </label>
                <ComboboxInput
                  id="new-category"
                  value={formData.category || ''}
                  onChange={(val) => handleChange('category', val)}
                  options={existingOptionsByField['category'] || []}
                  placeholder="pl. Konnektor, Saruzófej, Présszerszám"
                />
              </div>
            </div>

            {/* Konnektor kategória esetén: Pozíciók száma (1-999) */}
            {isConnectorCategory(formData.category) && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-1.5 animate-fadeIn">
                <label className="block text-sm font-extrabold text-emerald-950 flex items-center justify-between">
                  <span>Pozíciók száma (Konnektor esetén)</span>
                  <span className="text-xs bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                    1 - 999
                  </span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  placeholder="pl. 12 (Csak szám 1 és 999 között)"
                  value={formData.positionsCount !== undefined && formData.positionsCount !== null ? formData.positionsCount : ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      handleChange('positionsCount', undefined);
                      return;
                    }
                    let parsed = parseInt(raw, 10);
                    if (!isNaN(parsed)) {
                      if (parsed < 1) parsed = 1;
                      if (parsed > 999) parsed = 999;
                      handleChange('positionsCount', parsed);
                    }
                  }}
                  className="w-full font-mono font-bold text-lg p-3 border-2 border-emerald-300 focus:border-emerald-600 rounded-xl text-emerald-950 bg-white"
                />
                <p className="text-xs text-emerald-800 font-medium">
                  Konnektor típusú termékeknél megadható a pozíciók / lábak száma (1 és 999 közötti egész szám).
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-[#3A5D6B] mb-1">
                Leírás / Megjegyzés
              </label>
              <textarea
                rows={3}
                placeholder='pl. "F , 2 MOZGÓ ÜLLŐ"'
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full text-base p-3 border-2 border-[#DBD8D5] focus:border-[#3A5D6B] rounded-xl text-[#211E1B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#3A5D6B] mb-1">
                  Gyártó
                </label>
                <ComboboxInput
                  id="new-manufacturer"
                  value={formData.manufacturer || ''}
                  onChange={(val) => handleChange('manufacturer', val)}
                  options={existingOptionsByField['manufacturer'] || []}
                  placeholder="pl. Mecal, Komax"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#3A5D6B] mb-1">
                  Adagolás
                </label>
                <ComboboxInput
                  id="new-feeding"
                  value={formData.feeding || ''}
                  onChange={(val) => handleChange('feeding', val)}
                  options={existingOptionsByField['feeding'] || []}
                  placeholder="pl. Oldal, Hátul"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#3A5D6B] mb-1">
                  Szigetelés Típus
                </label>
                <ComboboxInput
                  id="new-insulationType"
                  value={formData.insulationType || ''}
                  onChange={(val) => handleChange('insulationType', val)}
                  options={existingOptionsByField['insulationType'] || []}
                  placeholder="pl. Nem Gumis, Gumis"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#3A5D6B] mb-1">
                  Szigm. Típus
                </label>
                <ComboboxInput
                  id="new-insulationGripperType"
                  value={formData.insulationGripperType || ''}
                  onChange={(val) => handleChange('insulationGripperType', val)}
                  options={existingOptionsByField['insulationGripperType'] || []}
                  placeholder="pl. F, O, B"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#3A5D6B] mb-1">
                  Konektor Típusa
                </label>
                <ComboboxInput
                  id="new-connectorType"
                  value={formData.connectorType || ''}
                  onChange={(val) => handleChange('connectorType', val)}
                  options={existingOptionsByField['connectorType'] || []}
                  placeholder="pl. Standard 2.54"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#3A5D6B] mb-1">
                  Saru Típusa
                </label>
                <ComboboxInput
                  id="new-terminalType"
                  value={formData.terminalType || ''}
                  onChange={(val) => handleChange('terminalType', val)}
                  options={existingOptionsByField['terminalType'] || []}
                  placeholder="pl. Nyitott saru"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#3A5D6B] mb-1">
                  Készlet (db)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stockQuantity !== undefined ? formData.stockQuantity : 0}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      handleChange('stockQuantity', '');
                    } else {
                      const num = parseInt(raw, 10);
                      handleChange('stockQuantity', isNaN(num) ? 0 : Math.max(0, num));
                    }
                  }}
                  onBlur={() => {
                    if (formData.stockQuantity === '' || formData.stockQuantity === undefined) {
                      handleChange('stockQuantity', 0);
                    }
                  }}
                  className="w-full text-lg p-3 border-2 border-[#DBD8D5] focus:border-[#3A5D6B] rounded-xl text-[#211E1B]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#3A5D6B] mb-1">
                  Raktári hely / Polc
                </label>
                <ComboboxInput
                  id="new-location"
                  value={formData.location || ''}
                  onChange={(val) => handleChange('location', val)}
                  options={existingOptionsByField['location'] || []}
                  placeholder="pl. A-01-Polc-3"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#3A5D6B] mb-1">
                  Dátum
                </label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="w-full text-lg p-3 border-2 border-[#DBD8D5] focus:border-[#3A5D6B] rounded-xl text-[#211E1B]"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSaving || isDuplicateId}
                className="w-full py-4 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-extrabold text-xl flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-lg"
                title={
                  isDuplicateId
                    ? `Nem menthető: A(z) ${formData.productId?.trim()} Termék ID már foglalt!`
                    : 'Termék Létrehozása & Mentés'
                }
              >
                <Save className="w-6 h-6" />
                <span>{isSaving ? 'Mentés folyamatban...' : 'Termék Létrehozása & Mentés'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
