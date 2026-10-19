import React, { useState } from 'react';
import { Pin, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Product } from '../types/product';
import { normalizeImageUrl } from '../utils/imageHelper';

interface PinnedProductsTrayProps {
  pinnedProductIds: string[];
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onRemovePin: (productId: string) => void;
  onClearAll?: () => void;
  className?: string;
  variant?: 'inline' | 'floating' | 'header';
}

export const PinnedProductsTray: React.FC<PinnedProductsTrayProps> = ({
  pinnedProductIds,
  products,
  onSelectProduct,
  onRemovePin,
  onClearAll,
  className = '',
  variant = 'floating'
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!pinnedProductIds || pinnedProductIds.length === 0) {
    return null;
  }

  // Map pinned IDs to loaded Product objects (fallback to a placeholder Product if not in catalog)
  const productLookup = new Map<string, Product>();
  products.forEach((p) => {
    productLookup.set(p.productId.trim().toLowerCase(), p);
    productLookup.set(p.id.trim().toLowerCase(), p);
  });

  const pinnedItems: Product[] = pinnedProductIds.map((id) => {
    const found = productLookup.get(id.trim().toLowerCase());
    return (
      found || {
        id: id,
        productId: id,
        name: `Termék ${id}`,
        category: 'Ismeretlen',
        stockQuantity: 0,
        images: []
      }
    );
  });

  return (
    <div
      className={`flex items-center flex-wrap gap-2 animate-fadeIn ${
        variant === 'floating'
          ? 'bg-white/95 backdrop-blur-md p-2 rounded-2xl border-2 border-amber-400 shadow-xl ring-2 ring-amber-400/20'
          : 'bg-amber-50/70 border border-amber-200/90 p-2 sm:p-2.5 rounded-xl shadow-2xs'
      } ${className}`}
    >
      {/* Label / Pin indicator (Kattintással összecsukható/kinyitható) */}
      <button
        type="button"
        onClick={() => setIsMinimized(!isMinimized)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] sm:text-xs shadow-2xs shrink-0 cursor-pointer transition-colors select-none"
        title={isMinimized ? 'Kitűzött termékek listájának kinyitása' : 'Kitűzött sáv összecsukása'}
      >
        <Pin className="w-3.5 h-3.5 rotate-45 fill-white shrink-0" />
        <span>Kitűzött ({pinnedProductIds.length})</span>
        {isMinimized ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Pinned product chips list - rejtve, ha össze van csukva */}
      {!isMinimized && (
        <div className="flex items-center flex-wrap gap-1.5 flex-1 min-w-0 max-h-48 overflow-y-auto pr-1">
        {pinnedItems.map((prod) => {
          const imgSrc =
            prod.images && prod.images.length > 0
              ? normalizeImageUrl(prod.images[0])
              : null;

          return (
            <div
              key={prod.productId}
              className="group flex items-center bg-white hover:bg-amber-100/50 border border-amber-300/80 rounded-lg p-0.5 pr-1.5 shadow-2xs transition-all hover:shadow hover:border-amber-400"
              title={`${prod.productId} - ${prod.name || 'Névtelen'}\nKattintson a felugró ablakban való megtekintéshez`}
            >
              <button
                type="button"
                onClick={() => onSelectProduct(prod)}
                className="flex items-center gap-1.5 px-1 py-0.5 cursor-pointer text-left"
              >
                {/* Mini Thumbnail */}
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={prod.productId}
                    className="w-5 h-5 rounded object-cover border border-amber-200 shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-5 h-5 rounded bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center font-bold text-[9px] shrink-0">
                    ID
                  </div>
                )}

                {/* Product ID */}
                <span className="font-mono font-black text-xs text-stone-900 group-hover:text-amber-900">
                  {prod.productId}
                </span>

                {/* Optional short label on larger screens */}
                {prod.name && (
                  <span className="hidden md:inline text-[11px] text-stone-500 font-semibold max-w-[90px] truncate">
                    ({prod.name})
                  </span>
                )}
              </button>

              {/* Close / Unpin button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePin(prod.productId);
                }}
                className="p-1 rounded-md text-stone-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer ml-0.5"
                title={`Kitűzés megszüntetése (${prod.productId})`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
        </div>
      )}

      {/* Clear all pinned products */}
      {!isMinimized && onClearAll && pinnedProductIds.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] font-bold text-amber-900 hover:text-red-700 hover:bg-amber-100 px-2 py-1 rounded-md transition-colors cursor-pointer shrink-0 flex items-center gap-1 border border-amber-200"
          title="Minden kitűzött termék bezárása"
        >
          <Trash2 className="w-3 h-3" />
          <span className="hidden sm:inline">Összes törlése</span>
        </button>
      )}
    </div>
  );
};
