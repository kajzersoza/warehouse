import React, { useEffect } from 'react';
import { X, ExternalLink, Pin, Layers } from 'lucide-react';
import { Product, ProductComponentRelation, ProductMeterBoxRelation, ProductConnectorTerminalRelation, ProductMatingPairRelation, ProductSimilarRelation, ProductTerminalFejRelation, ProductTerminalFejDisconnection, ProductNote, WarehouseTransaction } from '../types/product';
import { MaintenanceRecord } from '../types/maintenance';
import { KanbanItem } from '../types/kanban';
import { ProductDetail } from './ProductDetail';

interface ProductQuickModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenFullDetail: (product: Product) => void;
  allProducts: Product[];
  componentRelations?: ProductComponentRelation[];
  meterBoxRelations?: ProductMeterBoxRelation[];
  connectorTerminalRelations?: ProductConnectorTerminalRelation[];
  matingPairRelations?: ProductMatingPairRelation[];
  similarRelations?: ProductSimilarRelation[];
  terminalFejRelations?: ProductTerminalFejRelation[];
  terminalFejDisconnections?: ProductTerminalFejDisconnection[];
  productNotes?: ProductNote[];
  maintenances?: MaintenanceRecord[];
  kanbanItems?: KanbanItem[];
  warehouseTransactions?: WarehouseTransaction[];
  isPinned: boolean;
  onTogglePin: (productId: string) => void;
  onSaveProduct: (updated: Product, oldProductId?: string) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onAddComponentRelation?: (parentProductId: string, componentProductId: string, quantity?: number) => Promise<void>;
  onDeleteComponentRelation?: (parentProductId: string, componentProductId: string) => Promise<void>;
  onAddMeterBoxRelation?: (productId1: string, productId2: string, quantity?: number) => Promise<void>;
  onDeleteMeterBoxRelation?: (productId1: string, productId2: string) => Promise<void>;
  onAddConnectorTerminalRelation?: (productId1: string, productId2: string, quantity?: number) => Promise<void>;
  onDeleteConnectorTerminalRelation?: (productId1: string, productId2: string) => Promise<void>;
  onAddMatingPairRelation?: (productId1: string, productId2: string, quantity?: number) => Promise<void>;
  onDeleteMatingPairRelation?: (productId1: string, productId2: string) => Promise<void>;
  onAddSimilarRelation?: (productId1: string, productId2: string, note?: string) => Promise<void>;
  onDeleteSimilarRelation?: (productId1: string, productId2: string) => Promise<void>;
  onAddTerminalFejRelation?: (productId1: string, productId2: string, quantity?: number) => Promise<void>;
  onDeleteTerminalFejRelation?: (productId1: string, productId2: string) => Promise<void>;
  onSaveProductNote?: (note: ProductNote) => Promise<void>;
  onDeleteProductNote?: (noteId: string) => Promise<void>;
  onSaveMaintenance?: (record: Partial<MaintenanceRecord> & { productId: string }) => Promise<void>;
  onDeleteMaintenance?: (recordId: string) => Promise<void>;
  onDeleteAllMaintenanceForProduct?: (productId: string) => Promise<void>;
  onNavigateToWarehouseMovement?: (productId: string, positionId?: string) => void;
  onNavigateToWarehousePosition?: (positionId: string) => void;
  onDeleteWarehouseTransaction?: (txId: string) => Promise<void>;
  onOpenKanbanModal?: (productId: string) => void;
  onNavigateToKanban?: () => void;
  canEdit?: boolean;
}

export const ProductQuickModal: React.FC<ProductQuickModalProps> = ({
  product,
  onClose,
  onOpenFullDetail,
  allProducts,
  componentRelations,
  meterBoxRelations,
  connectorTerminalRelations,
  matingPairRelations,
  similarRelations,
  terminalFejRelations,
  terminalFejDisconnections,
  productNotes,
  maintenances,
  kanbanItems,
  warehouseTransactions,
  isPinned,
  onTogglePin,
  onSaveProduct,
  onDeleteProduct,
  onAddComponentRelation,
  onDeleteComponentRelation,
  onAddMeterBoxRelation,
  onDeleteMeterBoxRelation,
  onAddConnectorTerminalRelation,
  onDeleteConnectorTerminalRelation,
  onAddMatingPairRelation,
  onDeleteMatingPairRelation,
  onAddSimilarRelation,
  onDeleteSimilarRelation,
  onAddTerminalFejRelation,
  onDeleteTerminalFejRelation,
  onSaveProductNote,
  onDeleteProductNote,
  onSaveMaintenance,
  onDeleteMaintenance,
  onDeleteAllMaintenanceForProduct,
  onNavigateToWarehouseMovement,
  onNavigateToWarehousePosition,
  onDeleteWarehouseTransaction,
  onOpenKanbanModal,
  onNavigateToKanban,
  canEdit = true
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs animate-fadeIn">
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-6xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border-2 border-stone-300 overflow-hidden">
        {/* Sticky Modal Top Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-[#3A5D6B] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0 shadow-md">
          {/* Product basic info */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono font-black text-sm sm:text-base px-2.5 py-1 rounded-lg bg-white/15 text-white border border-white/20 shrink-0">
              {product.productId}
            </span>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate leading-tight">
                {product.name || 'Névtelen termék'}
              </h3>
              {product.category && (
                <span className="text-[11px] text-amber-200 font-bold block truncate">
                  {product.category} {product.factoryCode ? `• Gyári kód: ${product.factoryCode}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons on the right */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Pin Toggle Button */}
            <button
              type="button"
              onClick={() => onTogglePin(product.productId)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs border ${
                isPinned
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title={isPinned ? 'Kitűzve a gyorssávra (Kattintson az eltávolításhoz)' : 'Kitűzés a gyorssávra'}
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'rotate-45 fill-white' : ''}`} />
              <span className="hidden sm:inline">{isPinned ? 'Kitűzve' : 'Kitűzés'}</span>
            </button>

            {/* Open full page view */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullDetail(product);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 transition-colors cursor-pointer"
              title="Megnyitás teljes oldalon"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Teljes nézet</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-red-600 text-white transition-colors cursor-pointer ml-1"
              title="Ablak bezárása (vagy Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8F9FA]">
          <ProductDetail
            product={product}
            allProducts={allProducts}
            componentRelations={componentRelations}
            meterBoxRelations={meterBoxRelations}
            connectorTerminalRelations={connectorTerminalRelations}
            matingPairRelations={matingPairRelations}
            terminalFejRelations={terminalFejRelations}
            terminalFejDisconnections={terminalFejDisconnections}
            productNotes={productNotes}
            maintenances={maintenances}
            kanbanItems={kanbanItems}
            warehouseTransactions={warehouseTransactions}
            onBack={onClose}
            onGoToList={onClose}
            onSave={onSaveProduct}
            onDelete={async (id) => {
              await onDeleteProduct(id);
              onClose();
            }}
            onSelectProduct={(p) => {
              // Open clicked related product in modal or full view
              onOpenFullDetail(p);
            }}
            onAddComponentRelation={onAddComponentRelation}
            onDeleteComponentRelation={onDeleteComponentRelation}
            onAddMeterBoxRelation={onAddMeterBoxRelation}
            onDeleteMeterBoxRelation={onDeleteMeterBoxRelation}
            onAddConnectorTerminalRelation={onAddConnectorTerminalRelation}
            onDeleteConnectorTerminalRelation={onDeleteConnectorTerminalRelation}
            onAddMatingPairRelation={onAddMatingPairRelation}
            onDeleteMatingPairRelation={onDeleteMatingPairRelation}
            similarRelations={similarRelations}
            onAddSimilarRelation={onAddSimilarRelation}
            onDeleteSimilarRelation={onDeleteSimilarRelation}
            onAddTerminalFejRelation={onAddTerminalFejRelation}
            onDeleteTerminalFejRelation={onDeleteTerminalFejRelation}
            onSaveProductNote={onSaveProductNote}
            onDeleteProductNote={onDeleteProductNote}
            onSaveMaintenance={onSaveMaintenance}
            onDeleteMaintenance={onDeleteMaintenance}
            onDeleteAllMaintenanceForProduct={onDeleteAllMaintenanceForProduct}
            onNavigateToWarehouseMovement={onNavigateToWarehouseMovement}
            onNavigateToWarehousePosition={onNavigateToWarehousePosition}
            onDeleteWarehouseTransaction={onDeleteWarehouseTransaction}
            onOpenKanbanModal={onOpenKanbanModal}
            onNavigateToKanban={onNavigateToKanban}
            canEdit={canEdit}
            isPinned={isPinned}
            onTogglePin={onTogglePin}
          />
        </div>
      </div>
    </div>
  );
};
