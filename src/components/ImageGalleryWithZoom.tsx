import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  Link2,
  Star
} from 'lucide-react';
import { normalizeImageUrl } from '../utils/imageHelper';

interface ImageGalleryWithZoomProps {
  images: string[];
  productName: string;
  onUpdateImages?: (newImages: string[]) => void;
  canEdit?: boolean;
}

export const ImageGalleryWithZoom: React.FC<ImageGalleryWithZoomProps> = ({
  images,
  productName,
  onUpdateImages,
  canEdit = true
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [newImageUrl, setNewImageUrl] = useState('');
  const [showAddUrlInput, setShowAddUrlInput] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const normalizedImages = (images || []).map(normalizeImageUrl);
  const activeImage = normalizedImages[selectedIndex] || '';

  // Reset zoom & pan on active image switch or modal close
  useEffect(() => {
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  }, [selectedIndex, isZoomOpen]);

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomScale((prev) => Math.min(prev + 0.35, 4));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomScale((prev) => Math.max(prev - 0.35, 0.7));
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomScale > 1) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomScale((s) => Math.min(s + 0.2, 4));
    } else {
      setZoomScale((s) => Math.max(s - 0.2, 0.7));
    }
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    const normalized = normalizeImageUrl(newImageUrl.trim());
    const updated = [...images, normalized];
    if (onUpdateImages) onUpdateImages(updated);
    setNewImageUrl('');
    setShowAddUrlInput(false);
    setSelectedIndex(updated.length - 1);
  };

  const handleRemoveImage = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    if (onUpdateImages) onUpdateImages(updated);
    if (selectedIndex >= updated.length) {
      setSelectedIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleSetPrimary = (indexToPromote: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (indexToPromote === 0 || !onUpdateImages) return;
    const targetImage = images[indexToPromote];
    const remaining = images.filter((_, idx) => idx !== indexToPromote);
    const updated = [targetImage, ...remaining];
    onUpdateImages(updated);
    setSelectedIndex(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    // Check size limit: max 2MB
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('A kiválasztott kép nagyobb mint 2MB! Kérjük használjon kisebb méretű képet vagy webes linket.');
      setTimeout(() => setUploadError(null), 5000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const updated = [...images, dataUrl];
        if (onUpdateImages) onUpdateImages(updated);
        setSelectedIndex(updated.length - 1);
      }
    };
    reader.onerror = () => {
      setUploadError('Nem sikerült beolvasni a képfájlt.');
      setTimeout(() => setUploadError(null), 4000);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-4">
      {uploadError && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-amber-800 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      {/* Main Image Display Box */}
      <div className="relative group bg-[#F4F5F6] border-2 border-[#DBD8D5] rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center">
        {activeImage ? (
          <div
            className="w-full h-full cursor-zoom-in relative flex items-center justify-center overflow-hidden"
            onClick={() => setIsZoomOpen(true)}
            title="Kattintson a képre a nagyításhoz és zoomhoz"
          >
            <img
              src={activeImage}
              alt={productName}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              onError={(e) => {
                // Image load fallback
                (e.target as HTMLImageElement).src =
                  'https://placehold.co/600x450/3A5D6B/white?text=K%C3%A9p+nem+el%C3%A9rhet%C5%91';
              }}
            />

            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-[#211E1B]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="bg-[#211E1B]/85 text-white font-semibold text-base px-4 py-2 rounded-lg flex items-center gap-2 shadow-md">
                <Maximize2 className="w-5 h-5 text-[#79B6B8]" />
                Kattintson a nagyításhoz (Zoom)
              </span>
            </div>

            {/* Zoom Icon Badge */}
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm border border-[#DBD8D5] rounded-lg p-2 text-[#3A5D6B] shadow-sm">
              <ZoomIn className="w-5 h-5" />
            </div>
          </div>
        ) : (
          <div className="text-center p-6 text-[#3A5D6B]">
            <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-40 text-[#3A5D6B]" />
            <p className="text-lg font-medium">Nincs feltöltött kép</p>
            <p className="text-sm text-gray-500 mt-1">
              Csatoljon kép linket alább a megjelenítéshez
            </p>
          </div>
        )}
      </div>

      {/* Main image indicator and set primary action bar */}
      {images.length > 1 && canEdit && (
        <div className="flex items-center justify-between px-1 text-xs">
          {selectedIndex === 0 ? (
            <span className="font-bold text-[#3A5D6B] bg-[#79B6B8]/20 px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-2xs">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>Ez a termék jelenlegi fő (borító) képe</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => handleSetPrimary(selectedIndex)}
              className="font-bold text-white bg-[#3A5D6B] hover:bg-[#2F223A] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Kijelölés elsődleges (fő) képnek"
            >
              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span>Beállítás Fő Képnek</span>
            </button>
          )}
          <span className="text-gray-500 font-medium">
            {selectedIndex + 1} / {images.length} kép
          </span>
        </div>
      )}

      {/* Thumbnails row */}
      <div className="flex flex-wrap items-center gap-3">
        {images.map((imgUrl, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedIndex(idx)}
            className={`relative group/thumb cursor-pointer rounded-lg overflow-hidden border-2 w-20 h-20 bg-white transition-all flex items-center justify-center ${
              selectedIndex === idx
                ? 'border-[#3A5D6B] ring-3 ring-[#79B6B8]/40 shadow-md scale-105'
                : 'border-[#DBD8D5] hover:border-[#7098BA] opacity-80 hover:opacity-100'
            }`}
          >
            <img
              src={imgUrl}
              alt={`${productName} miniatűr ${idx + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://placehold.co/100x100/3A5D6B/white?text=?';
              }}
            />

            {/* Primary Main Image Indicator / Selector */}
            {idx === 0 ? (
              <span
                className="absolute top-1 left-1 bg-[#3A5D6B] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow z-10 flex items-center gap-0.5"
                title="Ez a termék fő képe"
              >
                <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                <span>Fő</span>
              </span>
            ) : canEdit ? (
              <button
                type="button"
                onClick={(e) => handleSetPrimary(idx, e)}
                title="Kattintson, hogy ez legyen a fő kép"
                className="absolute top-1 left-1 bg-white/95 hover:bg-[#3A5D6B] text-gray-700 hover:text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow z-10 opacity-0 group-hover/thumb:opacity-100 transition-all flex items-center gap-0.5 cursor-pointer"
              >
                <Star className="w-2.5 h-2.5 text-amber-500" />
                <span>Fő kép</span>
              </button>
            ) : null}

            {canEdit && (
              <button
                type="button"
                onClick={(e) => handleRemoveImage(idx, e)}
                title="Kép törlése"
                className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full p-1 opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-red-700 shadow z-10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="absolute bottom-0 left-0 right-0 bg-[#211E1B]/70 text-white text-[10px] text-center font-mono py-0.5">
              {idx + 1}/{images.length}
            </span>
          </div>
        ))}

        {/* Add Image Controls */}
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddUrlInput(!showAddUrlInput)}
              className="h-20 px-3 border-2 border-dashed border-[#7098BA] hover:border-[#3A5D6B] bg-white hover:bg-[#79B6B8]/10 text-[#3A5D6B] font-semibold text-sm rounded-lg flex flex-col items-center justify-center gap-1 transition-colors"
              title="Kép URL hozzáadása"
            >
              <Plus className="w-5 h-5 text-[#3A5D6B]" />
              <span>Link csatolás</span>
            </button>

            <label className="h-20 px-3 border-2 border-dashed border-[#DBD8D5] hover:border-[#3A5D6B] bg-white hover:bg-slate-50 text-[#3A5D6B] font-semibold text-sm rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors" title="Kép fájl feltöltése a gépről">
              <ImageIcon className="w-5 h-5 text-[#7098BA]" />
              <span>Feltöltés</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {/* Add Image by URL Expandable Bar */}
      {showAddUrlInput && canEdit && (
        <div className="p-3.5 bg-[#DBD8D5]/30 border border-[#DBD8D5] rounded-xl flex flex-col gap-2 animate-fadeIn">
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddImage()}
              placeholder="Webes képcím vagy Google Drive megosztási link (https://...)"
              className="flex-1 w-full bg-white border border-[#DBD8D5] rounded-lg px-4 py-2.5 text-[#211E1B] text-base focus:outline-none focus:ring-2 focus:ring-[#3A5D6B]"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleAddImage}
                disabled={!newImageUrl.trim()}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#3A5D6B] hover:bg-[#2F223A] disabled:bg-gray-300 text-white font-semibold text-base rounded-lg transition-colors cursor-pointer"
              >
                Csatolás
              </button>
              <button
                type="button"
                onClick={() => setShowAddUrlInput(false)}
                className="px-3.5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium text-base rounded-lg cursor-pointer"
              >
                Mégse
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-600 flex items-center gap-1.5 px-1 font-medium">
            <span className="text-[#3A5D6B] font-bold">💡 Tipp:</span>
            <span>Közvetlen képlinkek (JPG, PNG, WebP), Google Drive (nyilvános/megosztott) linkek és Dropbox linkek is automatikusan betöltődnek.</span>
          </div>
        </div>
      )}

      {/* FULLSCREEN / INTERACTIVE ZOOM LIGHTBOX */}
      {isZoomOpen && activeImage && (
        <div
          className="fixed inset-0 z-50 bg-[#211E1B]/90 backdrop-blur-md flex flex-col justify-between"
          onClick={() => setIsZoomOpen(false)}
        >
          {/* Header Controls */}
          <div
            className="p-4 bg-[#211E1B]/80 border-b border-white/10 flex items-center justify-between z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-white font-bold text-lg tracking-wide">
                {productName}
              </span>
              <span className="text-xs bg-[#79B6B8] text-[#211E1B] font-bold px-2.5 py-1 rounded-md">
                Kép {selectedIndex + 1} / {images.length}
              </span>
            </div>

            {/* Zoom Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-1 font-semibold text-sm"
                title="Nagyítás (+)"
              >
                <ZoomIn className="w-5 h-5 text-[#79B6B8]" />
                <span className="hidden sm:inline">Nagyítás</span>
              </button>

              <button
                type="button"
                onClick={handleZoomOut}
                className="p-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-1 font-semibold text-sm"
                title="Kicsinyítés (-)"
              >
                <ZoomOut className="w-5 h-5 text-[#79B6B8]" />
                <span className="hidden sm:inline">Kicsinyítés</span>
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="p-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-1 font-semibold text-sm"
                title="Visszaállítás 100%"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="hidden sm:inline">{Math.round(zoomScale * 100)}%</span>
              </button>

              <div className="h-6 w-px bg-white/20 mx-1" />

              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1 font-semibold text-base"
                title="Bezárás"
              >
                <X className="w-6 h-6" />
                <span className="hidden sm:inline">Bezárás</span>
              </button>
            </div>
          </div>

          {/* Interactive Zoom Canvas Area */}
          <div
            ref={containerRef}
            className="flex-1 relative overflow-hidden flex items-center justify-center p-4 cursor-grab active:cursor-grabbing select-none"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
          >
            <img
              src={activeImage}
              alt={productName}
              draggable={false}
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomScale})`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out'
              }}
              className="max-h-[80vh] max-w-[90vw] object-contain shadow-2xl rounded-md pointer-events-none"
            />

            {/* Left / Right Nav in zoom */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                  }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors shadow-lg z-20"
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                  }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors shadow-lg z-20"
                >
                  <ChevronRight className="w-7 h-7" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails Strip in Zoom */}
          {images.length > 1 && (
            <div
              className="p-3 bg-[#211E1B]/80 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                    selectedIndex === i
                      ? 'border-[#79B6B8] ring-2 ring-white scale-110'
                      : 'border-white/30 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
