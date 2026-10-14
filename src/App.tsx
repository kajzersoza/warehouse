/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Menu,
  ArrowLeft,
  Layers,
  UploadCloud,
  PlusCircle,
  Database,
  CloudCheck,
  CloudOff,
  User as UserIcon,
  LogIn,
  RotateCcw,
  Shield,
  CheckCircle,
  X,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginWithGoogle, logoutUser, testConnection } from './firebase';
import { Product, ProductComponentRelation, ProductMeterBoxRelation, ProductConnectorTerminalRelation, ProductMatingPairRelation, ProductTerminalFejRelation, ProductTerminalFejDisconnection, ProductNote, ViewMode, UserProfile, UserRole, WarehousePosition, WarehouseTransaction } from './types/product';
import {
  subscribeToProducts,
  saveProductToFirestore,
  deleteProductFromFirestore,
  seedInitialDataIfEmpty
} from './services/productService';
import {
  getLocalStoredComponents,
  subscribeToComponents,
  seedInitialComponentsIfEmpty,
  saveComponentRelation,
  deleteComponentRelation,
  buildRelationDocId
} from './services/componentService';
import {
  getLocalStoredMeterBoxes,
  subscribeToMeterBoxes,
  seedInitialMeterBoxesIfEmpty,
  saveMeterBoxRelation,
  deleteMeterBoxRelation,
  buildMeterBoxRelationDocId
} from './services/meterBoxService';
import {
  getLocalStoredConnectorTerminals,
  subscribeToConnectorTerminals,
  seedInitialConnectorTerminalsIfEmpty,
  saveConnectorTerminalRelation,
  deleteConnectorTerminalRelation,
  buildConnectorTerminalRelationDocId
} from './services/connectorTerminalService';
import {
  getLocalStoredMatingPairs,
  subscribeToMatingPairs,
  seedInitialMatingPairsIfEmpty,
  saveMatingPairRelation,
  deleteMatingPairRelation,
  buildMatingPairRelationDocId
} from './services/matingPairService';
import {
  getLocalStoredNotes,
  subscribeToNotes,
  seedInitialNotesIfEmpty,
  saveNote,
  deleteNote
} from './services/noteService';
import { MaintenanceRecord } from './types/maintenance';
import {
  getLocalStoredMaintenances,
  subscribeToMaintenances,
  seedInitialMaintenancesIfEmpty,
  saveMaintenanceRecord,
  deleteMaintenanceRecord,
  deleteAllMaintenances,
  deleteMaintenancesForProduct
} from './services/maintenanceService';
import { MaintenanceManagerModal } from './components/MaintenanceManagerModal';
import {
  getLocalStoredTerminalFejek,
  subscribeToTerminalFejek,
  seedInitialTerminalFejekIfEmpty,
  saveTerminalFejRelation,
  deleteTerminalFejRelation,
  getLocalStoredTerminalFejDisconnections,
  subscribeToTerminalFejDisconnections
} from './services/terminalFejService';
import {
  syncOrCreateUserProfile,
  getStoredCustomUserSession,
  clearCustomUserSession,
  isPrimaryAdmin,
  PRIMARY_ADMIN_EMAIL
} from './services/userService';
import {
  getLocalStoredWarehousePositions,
  subscribeToWarehousePositions,
  getLocalStoredWarehouseTransactions,
  subscribeToWarehouseTransactions,
  resetAllWarehouseStockToZero
} from './services/warehouseService';
import { exportProductsToCsv } from './utils/csvHelper';
import { ProductListView } from './components/ProductListView';
import { ProductDetail } from './components/ProductDetail';
import { CsvImportView } from './components/CsvImportView';
import { NewProductView } from './components/NewProductView';
import { WarehouseStatsView } from './components/WarehouseStatsView';
import { UserManagementView } from './components/UserManagementView';
import { NavigationDrawer } from './components/NavigationDrawer';
import { AuthModal } from './components/AuthModal';
import { CrimpSettingsModal } from './components/CrimpSettingsModal';
import { CompanyLogo } from './components/CompanyLogo';
import { KanbanItem, KanbanStatus } from './types/kanban';
import {
  getLocalStoredKanbanItems,
  subscribeToKanbanItems,
  saveKanbanItem,
  deleteKanbanItem,
  moveKanbanItemStatus
} from './services/kanbanService';
import { KanbanBoardView } from './components/KanbanBoardView';
import { KanbanItemModal } from './components/KanbanItemModal';

export interface NavigationStep {
  view: ViewMode;
  product?: Product;
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [componentRelations, setComponentRelations] = useState<ProductComponentRelation[]>(
    getLocalStoredComponents()
  );
  const [meterBoxRelations, setMeterBoxRelations] = useState<ProductMeterBoxRelation[]>(
    getLocalStoredMeterBoxes()
  );
  const [connectorTerminalRelations, setConnectorTerminalRelations] = useState<ProductConnectorTerminalRelation[]>(
    getLocalStoredConnectorTerminals()
  );
  const [matingPairRelations, setMatingPairRelations] = useState<ProductMatingPairRelation[]>(
    getLocalStoredMatingPairs()
  );
  const [productNotes, setProductNotes] = useState<ProductNote[]>(
    getLocalStoredNotes()
  );
  const [terminalFejRelations, setTerminalFejRelations] = useState<ProductTerminalFejRelation[]>(
    getLocalStoredTerminalFejek()
  );
  const [terminalFejDisconnections, setTerminalFejDisconnections] = useState<ProductTerminalFejDisconnection[]>(
    getLocalStoredTerminalFejDisconnections()
  );
  const [warehousePositions, setWarehousePositions] = useState<WarehousePosition[]>(
    getLocalStoredWarehousePositions()
  );
  const [warehouseTransactions, setWarehouseTransactions] = useState<WarehouseTransaction[]>(
    getLocalStoredWarehouseTransactions()
  );
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>(
    getLocalStoredMaintenances()
  );
  const [selectedWarehousePositionId, setSelectedWarehousePositionId] = useState<string | null>(null);
  const [selectedWarehouseProductId, setSelectedWarehouseProductId] = useState<string | null>(null);
  const [activeImportTab, setActiveImportTab] = useState<'products' | 'components' | 'meterboxes' | 'connector-terminals' | 'mating-pairs' | 'notes' | 'warehouse-positions' | 'warehouse-transactions' | 'maintenances'>('products');
  const [currentView, setCurrentView] = useState<ViewMode>('list');
  const [navigationHistory, setNavigationHistory] = useState<NavigationStep[]>([
    { view: 'list' }
  ]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeListFilter, setActiveListFilter] = useState<{
    type: 'category' | 'manufacturer' | 'feeding';
    value: string;
  } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCrimpSettingsOpen, setIsCrimpSettingsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(
    getStoredCustomUserSession()
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFirebaseOnline, setIsFirebaseOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetStockModalOpen, setIsResetStockModalOpen] = useState(false);
  const [isResettingStock, setIsResettingStock] = useState(false);
  const [resetStockSuccessMessage, setResetStockSuccessMessage] = useState<string | null>(null);

  // Karbantartás kezelés & törlés állapotok
  const [isMaintenanceManagerOpen, setIsMaintenanceManagerOpen] = useState(false);
  const [isDeleteAllMaintenancesModalOpen, setIsDeleteAllMaintenancesModalOpen] = useState(false);
  const [isDeletingAllMaintenances, setIsDeletingAllMaintenances] = useState(false);
  const [maintenanceSuccessMessage, setMaintenanceSuccessMessage] = useState<string | null>(null);

  // Kanban állapotok (Új - piros, Folyamatban - kék, Befejezve - zöld)
  const [kanbanItems, setKanbanItems] = useState<KanbanItem[]>(
    getLocalStoredKanbanItems()
  );
  const [isKanbanModalOpen, setIsKanbanModalOpen] = useState(false);
  const [kanbanModalProductId, setKanbanModalProductId] = useState<string | undefined>(undefined);
  const [editingKanbanItem, setEditingKanbanItem] = useState<KanbanItem | null>(null);

  const totalWarehouseUnits = warehouseTransactions.reduce(
    (acc, tx) =>
      acc +
      (tx.quantity !== undefined && tx.quantity !== null && !isNaN(Number(tx.quantity))
        ? Number(tx.quantity)
        : 0),
    0
  );

  // RBAC Permission Gates
  const isAdmin = currentUserProfile?.role === 'admin' || isPrimaryAdmin(currentUserProfile?.email);
  const isEditor = isAdmin || currentUserProfile?.role === 'editor';
  const isViewer = !isEditor;

  // Initialize and check connection
  useEffect(() => {
    // 1. Connection check
    testConnection().then((connected) => {
      setIsFirebaseOnline(connected);
    });

    // 2. Auth listener
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await syncOrCreateUserProfile(
            user.uid,
            user.email || '',
            user.displayName || undefined
          );
          setCurrentUserProfile(profile);
        } catch (err) {
          console.warn('Profile sync failed on auth change:', err);
        }
      } else {
        const stored = getStoredCustomUserSession();
        if (stored) {
          setCurrentUserProfile(stored);
        } else {
          setCurrentUserProfile(null);
        }
      }
    });

    // Set document title consistently
    document.title = 'World Wires kft.';

    // 3. Seed initial Mecal products, components, meterboxes, connector-terminals, and mating-pairs if Firestore collection is empty
    seedInitialDataIfEmpty();
    seedInitialComponentsIfEmpty();
    seedInitialMeterBoxesIfEmpty();
    seedInitialConnectorTerminalsIfEmpty();
    seedInitialMatingPairsIfEmpty();
    seedInitialNotesIfEmpty();
    seedInitialTerminalFejekIfEmpty();
    seedInitialMaintenancesIfEmpty();

    // 4. Products real-time listener
    const unsubProducts = subscribeToProducts(
      (updatedList) => {
        setProducts(updatedList);
        // Also keep selected product in sync if updated
        if (selectedProduct) {
          const match = updatedList.find(
            (p) => p.productId === selectedProduct.productId || p.id === selectedProduct.id
          );
          if (match) setSelectedProduct(match);
        }
      },
      (error) => {
        console.warn('Realtime products sync warning:', error);
      }
    );

    // 5. Component relations real-time listener
    const unsubComponents = subscribeToComponents(
      (updatedRelations) => {
        setComponentRelations(updatedRelations);
      },
      (error) => {
        console.warn('Realtime components sync warning:', error);
      }
    );

    // 6. MeterBox relations real-time listener (Termék <-> Mérődoboz)
    const unsubMeterBoxes = subscribeToMeterBoxes(
      (updatedMeterBoxes) => {
        setMeterBoxRelations(updatedMeterBoxes);
      },
      (error) => {
        console.warn('Realtime meterboxes sync warning:', error);
      }
    );

    // 7. Connector-Terminal relations real-time listener (Konnektor <-> Saru)
    const unsubConnectorTerminals = subscribeToConnectorTerminals(
      (updatedConnectorTerminals) => {
        setConnectorTerminalRelations(updatedConnectorTerminals);
      },
      (error) => {
        console.warn('Realtime connector-terminals sync warning:', error);
      }
    );

    // 8. Mating pairs real-time listener (Ellenpárok: Konnektor <-> Konnektor, Saru <-> Saru)
    const unsubMatingPairs = subscribeToMatingPairs(
      (updatedMatingPairs) => {
        setMatingPairRelations(updatedMatingPairs);
      },
      (error) => {
        console.warn('Realtime mating-pairs sync warning:', error);
      }
    );

    // 9. Notesz (Product Notes) real-time listener (#FA4646)
    const unsubNotes = subscribeToNotes(
      (updatedNotes) => {
        setProductNotes(updatedNotes);
      },
      (error) => {
        console.warn('Realtime notes sync warning:', error);
      }
    );

    // 10. Saru <-> Saruzófej relations real-time listener (Halvány narancssárga téma)
    const unsubTerminalFejek = subscribeToTerminalFejek(
      (updatedTerminalFejek) => {
        setTerminalFejRelations(updatedTerminalFejek);
      },
      (error) => {
        console.warn('Realtime terminal-fejek sync warning:', error);
      }
    );

    // 11. Saru <-> Saruzófej disconnections (exclusions) real-time listener
    const unsubTerminalFejDiscs = subscribeToTerminalFejDisconnections(
      (updatedDiscs) => {
        setTerminalFejDisconnections(updatedDiscs);
      },
      (error) => {
        console.warn('Realtime terminal-fej disconnections warning:', error);
      }
    );

    // 12. Raktári pozíciók real-time listener
    const unsubWarehousePositions = subscribeToWarehousePositions(
      (updatedPositions) => {
        setWarehousePositions(updatedPositions);
      },
      (error) => {
        console.warn('Realtime warehouse positions warning:', error);
      }
    );

    // 13. Raktári készlet tranzakciók real-time listener
    const unsubWarehouseTransactions = subscribeToWarehouseTransactions(
      (updatedTransactions) => {
        setWarehouseTransactions(updatedTransactions);
      },
      (error) => {
        console.warn('Realtime warehouse transactions warning:', error);
      }
    );

    // 14. Karbantartások real-time listener (Barna kártya & Alkatrész cserék)
    const unsubMaintenances = subscribeToMaintenances(
      (updatedMaintenances) => {
        setMaintenances(updatedMaintenances);
      },
      (error) => {
        console.warn('Realtime maintenances sync warning:', error);
      }
    );

    // 15. Kanban tételek real-time listener (Új, Folyamatban, Befejezve)
    const unsubKanban = subscribeToKanbanItems(
      (updatedKanbanItems) => {
        setKanbanItems(updatedKanbanItems);
      },
      (error) => {
        console.warn('Realtime kanban sync warning:', error);
      }
    );

    return () => {
      unsubAuth();
      unsubProducts();
      unsubComponents();
      unsubMeterBoxes();
      unsubConnectorTerminals();
      unsubMatingPairs();
      unsubNotes();
      unsubTerminalFejek();
      unsubTerminalFejDiscs();
      unsubWarehousePositions();
      unsubWarehouseTransactions();
      unsubMaintenances();
      unsubKanban();
    };
  }, []);

  // Navigation handlers
  const navigateTo = (newView: ViewMode, product?: Product) => {
    if (product) {
      setSelectedProduct(product);
    }
    setNavigationHistory((prev) => {
      const last = prev[prev.length - 1];
      if (
        last &&
        last.view === newView &&
        last.product?.productId === product?.productId
      ) {
        return prev;
      }
      return [...prev, { view: newView, product }];
    });
    setCurrentView(newView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToWarehousePosition = (positionId: string) => {
    setSelectedWarehousePositionId(positionId);
    setSelectedWarehouseProductId(null);
    navigateTo('warehouse-stats');
  };

  const handleNavigateToWarehouseMovement = (productId: string, positionId?: string) => {
    setSelectedWarehouseProductId(productId);
    if (positionId) {
      setSelectedWarehousePositionId(positionId);
    }
    navigateTo('warehouse-stats');
  };

  const handleOpenDataImport = (
    tab: 'products' | 'components' | 'meterboxes' | 'connector-terminals' | 'mating-pairs' | 'notes' | 'warehouse-positions' | 'warehouse-transactions' | 'maintenances' = 'products'
  ) => {
    setActiveImportTab(tab);
    navigateTo('csv-import');
  };

  // Vissza: Always goes exactly ONE STEP BACK in history (e.g. built-in component -> parent product -> list)
  const handleGoBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop(); // remove current step
      const prevStep = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setCurrentView(prevStep.view);
      if (prevStep.product) {
        setSelectedProduct(prevStep.product);
      }
    } else {
      setCurrentView('list');
      setNavigationHistory([{ view: 'list' }]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Vissza a listához: Directly returns to the main product list, PRESERVING all active filters and search queries!
  const handleGoToList = () => {
    setCurrentView('list');
    setNavigationHistory([{ view: 'list' }]);
    // Do NOT clear activeListFilter or search - preserve them!
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const previousStep =
    navigationHistory.length > 1
      ? navigationHistory[navigationHistory.length - 2]
      : null;

  const handleSaveProduct = async (productToSave: Product, oldProductId?: string) => {
    await saveProductToFirestore(productToSave, oldProductId);
    setSelectedProduct(productToSave);
  };

  const handleDeleteProduct = async (productId: string) => {
    await deleteProductFromFirestore(productId);
    handleGoToList();
  };

  const handleAddComponentRelation = async (
    parentProductId: string,
    componentProductId: string,
    quantity?: number
  ) => {
    const savedList = await saveComponentRelation(parentProductId, componentProductId, quantity, true);
    setComponentRelations((prev) => {
      const copy = [...prev];
      savedList.forEach((saved) => {
        const idx = copy.findIndex((r) => r.id === saved.id);
        if (idx >= 0) {
          copy[idx] = saved;
        } else {
          copy.push(saved);
        }
      });
      return copy;
    });
  };

  const handleDeleteComponentRelation = async (parentProductId: string, componentProductId: string) => {
    await deleteComponentRelation(parentProductId, componentProductId, true);
    setComponentRelations((prev) => {
      const id1 = buildRelationDocId(parentProductId, componentProductId);
      const id2 = buildRelationDocId(componentProductId, parentProductId);
      return prev.filter((r) => r.id !== id1 && r.id !== id2);
    });
  };

  const handleAddMeterBoxRelation = async (productId1: string, productId2: string, quantity?: number) => {
    const savedList = await saveMeterBoxRelation(productId1, productId2, true, quantity);
    setMeterBoxRelations((prev) => {
      const copy = [...prev];
      savedList.forEach((saved) => {
        const idx = copy.findIndex((r) => r.id === saved.id);
        if (idx >= 0) {
          copy[idx] = saved;
        } else {
          copy.push(saved);
        }
      });
      return copy;
    });
  };

  const handleDeleteMeterBoxRelation = async (productId1: string, productId2: string) => {
    await deleteMeterBoxRelation(productId1, productId2, true);
    setMeterBoxRelations((prev) => {
      const id1 = buildMeterBoxRelationDocId(productId1, productId2);
      const id2 = buildMeterBoxRelationDocId(productId2, productId1);
      return prev.filter((r) => r.id !== id1 && r.id !== id2);
    });
  };

  const handleAddConnectorTerminalRelation = async (productId1: string, productId2: string, quantity?: number) => {
    const savedList = await saveConnectorTerminalRelation(productId1, productId2, true, quantity);
    setConnectorTerminalRelations((prev) => {
      const copy = [...prev];
      savedList.forEach((saved) => {
        const idx = copy.findIndex((r) => r.id === saved.id);
        if (idx >= 0) {
          copy[idx] = saved;
        } else {
          copy.push(saved);
        }
      });
      return copy;
    });
  };

  const handleDeleteConnectorTerminalRelation = async (productId1: string, productId2: string) => {
    await deleteConnectorTerminalRelation(productId1, productId2, true);
    setConnectorTerminalRelations((prev) => {
      const id1 = buildConnectorTerminalRelationDocId(productId1, productId2);
      const id2 = buildConnectorTerminalRelationDocId(productId2, productId1);
      return prev.filter((r) => r.id !== id1 && r.id !== id2);
    });
  };

  const handleAddMatingPairRelation = async (productId1: string, productId2: string, quantity?: number) => {
    const savedList = await saveMatingPairRelation(productId1, productId2, true, quantity);
    setMatingPairRelations((prev) => {
      const copy = [...prev];
      savedList.forEach((saved) => {
        const idx = copy.findIndex((r) => r.id === saved.id);
        if (idx >= 0) {
          copy[idx] = saved;
        } else {
          copy.push(saved);
        }
      });
      return copy;
    });
  };

  const handleDeleteMatingPairRelation = async (productId1: string, productId2: string) => {
    await deleteMatingPairRelation(productId1, productId2, true);
    setMatingPairRelations((prev) => {
      const id1 = buildMatingPairRelationDocId(productId1, productId2);
      const id2 = buildMatingPairRelationDocId(productId2, productId1);
      return prev.filter((r) => r.id !== id1 && r.id !== id2);
    });
  };

  const handleSaveProductNote = async (note: ProductNote) => {
    await saveNote(note);
  };

  const handleDeleteProductNote = async (noteId: string) => {
    await deleteNote(noteId);
  };

  const handleSaveMaintenance = async (record: Partial<MaintenanceRecord> & { productId: string }) => {
    await saveMaintenanceRecord(record);
  };

  const handleDeleteMaintenance = async (recordId: string) => {
    await deleteMaintenanceRecord(recordId);
    setMaintenances((prev) => prev.filter((m) => m.id !== recordId));
  };

  const handleDeleteAllMaintenances = async () => {
    setIsDeletingAllMaintenances(true);
    try {
      const res = await deleteAllMaintenances();
      setMaintenances([]);
      setMaintenanceSuccessMessage(`Minden karbantartási adat sikeresen törölve (${res.count} db tétel)!`);
      setTimeout(() => setMaintenanceSuccessMessage(null), 4000);
      setIsDeleteAllMaintenancesModalOpen(false);
    } catch (err) {
      console.error('Failed to delete all maintenances:', err);
    } finally {
      setIsDeletingAllMaintenances(false);
    }
  };

  const handleDeleteAllMaintenanceForProduct = async (productId: string) => {
    try {
      const count = await deleteMaintenancesForProduct(productId);
      setMaintenances(getLocalStoredMaintenances());
      setMaintenanceSuccessMessage(`A(z) ${productId} termék karbantartásai törölve (${count} db tétel)!`);
      setTimeout(() => setMaintenanceSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to delete product maintenances:', err);
    }
  };

  const handleAddTerminalFejRelation = async (productId1: string, productId2: string, quantity?: number) => {
    await saveTerminalFejRelation(productId1, productId2, products, undefined, quantity);
    setTerminalFejRelations(getLocalStoredTerminalFejek());
    setTerminalFejDisconnections(getLocalStoredTerminalFejDisconnections());
  };

  const handleDeleteTerminalFejRelation = async (productId1: string, productId2: string) => {
    await deleteTerminalFejRelation(productId1, productId2, products);
    setTerminalFejRelations(getLocalStoredTerminalFejek());
    setTerminalFejDisconnections(getLocalStoredTerminalFejDisconnections());
  };

  const handleFilterFromDetail = (
    type: 'category' | 'manufacturer' | 'feeding',
    value: string
  ) => {
    setActiveListFilter({ type, value });
    navigateTo('list');
  };

  // Kanban Műveletek
  const handleSaveKanbanItem = async (item: KanbanItem) => {
    await saveKanbanItem(item);
    setKanbanItems(getLocalStoredKanbanItems());
  };

  const handleDeleteKanbanItem = async (id: string) => {
    await deleteKanbanItem(id);
    setKanbanItems(getLocalStoredKanbanItems());
  };

  const handleMoveKanbanItemStatus = async (id: string, newStatus: KanbanStatus) => {
    await moveKanbanItemStatus(id, newStatus);
    setKanbanItems(getLocalStoredKanbanItems());
  };

  const handleOpenKanbanModalForProduct = (productId: string) => {
    const existing = kanbanItems.find((k) =>
      k.productIds.some((pId) => pId.trim().toLowerCase() === productId.trim().toLowerCase())
    );
    if (existing) {
      setEditingKanbanItem(existing);
      setKanbanModalProductId(undefined);
    } else {
      setEditingKanbanItem(null);
      setKanbanModalProductId(productId);
    }
    setIsKanbanModalOpen(true);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await testConnection();
      await seedInitialDataIfEmpty();
      setIsFirebaseOnline(true);
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const handleExecuteResetStock = async () => {
    setIsResettingStock(true);
    try {
      const res = await resetAllWarehouseStockToZero();
      setWarehouseTransactions([]);
      setProducts((prev) => prev.map((p) => ({ ...p, stockQuantity: 0 })));
      setIsResetStockModalOpen(false);
      setResetStockSuccessMessage(
        `A teljes raktárkészlet sikeresen 0-ra lett állítva! (${res.deletedTransactionsCount} db korábbi tranzakció törölve, minden termék készlete 0 db).`
      );
      setTimeout(() => {
        setResetStockSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error('Készlet nullázási hiba:', err);
      alert('Hiba történt a raktárkészlet nullázásakor: ' + (err?.message || 'Ismeretlen hiba'));
    } finally {
      setIsResettingStock(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {}
    clearCustomUserSession();
    setCurrentUserProfile(null);
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#211E1B] flex flex-col font-sans">
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-[#DBD8D5] shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-20 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left section: Menu Button + Universal Back Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-[#3A5D6B] hover:bg-[#2F223A] text-white font-bold text-sm sm:text-base transition-colors cursor-pointer shadow-xs"
              title="Rendszermenü megnyitása"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-[#79B6B8]" />
              <span className="hidden sm:inline">Menü</span>
            </button>

            {/* Mobile-only compact back button when not on main list */}
            {currentView !== 'list' && (
              <button
                type="button"
                onClick={handleGoBack}
                className="flex md:hidden items-center justify-center p-2.5 rounded-xl bg-[#DBD8D5]/70 hover:bg-[#DBD8D5] text-[#211E1B] transition-colors cursor-pointer border border-[#DBD8D5]"
                title="Vissza az előző oldalra"
              >
                <ArrowLeft className="w-5 h-5 text-[#3A5D6B]" />
              </button>
            )}

            {/* App Brand Logo & Name: World Wires kft. - always visible and never cut off */}
            <div
              onClick={handleGoToList}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group ml-1 shrink-0"
              title="Vissza a terméklistához"
            >
              <CompanyLogo size="md" />
              <span className="font-extrabold text-base sm:text-2xl text-[#211E1B] tracking-tight whitespace-nowrap block leading-tight">
                World Wires kft.
              </span>
            </div>

            {/* Desktop-only secondary header navigation buttons (Vissza / Lista) */}
            {currentView !== 'list' && (
              <div className="hidden md:flex items-center gap-2 ml-2">
                {/* 1 lépést vissza */}
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#DBD8D5]/70 hover:bg-[#DBD8D5] text-[#211E1B] font-extrabold text-sm transition-colors cursor-pointer border border-[#DBD8D5] shadow-2xs"
                  title={
                    previousStep?.product
                      ? `Visszalépés 1 lépést: ${previousStep.product.name} (${previousStep.product.productId})`
                      : 'Visszalépés 1 lépést az előző oldalra'
                  }
                >
                  <ArrowLeft className="w-4 h-4 text-[#3A5D6B]" />
                  <span>Vissza</span>
                  {previousStep?.product && (
                    <span className="hidden xl:inline text-xs font-mono text-[#3A5D6B] font-bold">
                      ({previousStep.product.productId})
                    </span>
                  )}
                </button>

                {/* Vissza a listához (fő listára, szűrés megmarad) */}
                <button
                  type="button"
                  onClick={handleGoToList}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-extrabold text-sm transition-colors cursor-pointer border border-emerald-300 shadow-2xs"
                  title="Vissza a fő terméklistához (a beállított szűrők és keresések megmaradnak)"
                >
                  <Layers className="w-4 h-4 text-emerald-700" />
                  <span>Vissza a listához</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Section: Quick Actions, Firebase Status, Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Főoldali Kanban Gomb (Mindig elérhető) */}
            <button
              type="button"
              onClick={() => navigateTo('kanban')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer shadow-xs ${
                currentView === 'kanban'
                  ? 'bg-[#2F223A] text-white ring-2 ring-[#79B6B8]'
                  : 'bg-white hover:bg-purple-50 text-purple-950 border-2 border-purple-300 hover:border-purple-500'
              }`}
              title="Kanban Tábla megnyitása (Új, Folyamatban, Befejezve)"
            >
              <Layers className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Kanban</span>
              {kanbanItems.length > 0 && (
                <span className="font-mono text-[10px] sm:text-xs font-black px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                  {kanbanItems.length}
                </span>
              )}
            </button>

            {/* Quick Data Import button in header (visible to editors & admins) */}
            {isEditor && (
              <button
                type="button"
                onClick={() => handleOpenDataImport('products')}
                className="hidden lg:flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#DBD8D5] hover:border-[#3A5D6B] bg-[#F8F9FA] hover:bg-white text-[#211E1B] font-bold text-sm transition-colors cursor-pointer shadow-2xs"
                title="Adatfeltöltés (Termék CSV & Beépülő alkatrész CSV)"
              >
                <UploadCloud className="w-4 h-4 text-[#3A5D6B]" />
                <span>Adatfeltöltés</span>
              </button>
            )}

            {/* Quick New Product button in header (visible to editors & admins) */}
            {isEditor && (
              <button
                type="button"
                onClick={() => navigateTo('new-product')}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3A5D6B] hover:bg-[#2F223A] text-white font-bold text-sm transition-colors cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4 text-[#79B6B8]" />
                <span>Új Termék</span>
              </button>
            )}

            {/* Firebase Status Badge */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                isFirebaseOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title="Firebase adatbázis kapcsolat állapota"
            >
              <span className={`w-2 h-2 rounded-full ${isFirebaseOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>
                {isFirebaseOnline ? 'Firebase Felhő' : 'Helyi üzemmód'}
              </span>
            </div>

            {/* User Profile & Role / Login Button */}
            {currentUserProfile || currentUser ? (
              <div
                onClick={() => navigateTo('users-permissions')}
                className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-[#DBD8D5] hover:border-[#3A5D6B] bg-[#F8F9FA] hover:bg-white cursor-pointer shadow-2xs transition-colors"
                title="Saját Adatlap & Jogosultságok megnyitása"
              >
                <div className="w-8 h-8 rounded-lg bg-[#3A5D6B] text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {((currentUserProfile?.displayName || currentUserProfile?.email || currentUser?.email || 'U')[0]).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-[#211E1B] truncate max-w-[120px]">
                    {currentUserProfile?.displayName || currentUser?.displayName || 'Munkatárs'}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase text-[#3A5D6B]">
                    {currentUserProfile?.role === 'admin'
                      ? 'Admin'
                      : currentUserProfile?.role === 'editor'
                      ? 'Szerkesztő'
                      : 'Megtekintő'}
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl bg-[#DBD8D5]/60 hover:bg-[#DBD8D5] text-[#211E1B] font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                title="Bejelentkezés vagy Adatlap beállítása"
              >
                <LogIn className="w-4 h-4 text-[#3A5D6B]" />
                <span>Belépés</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className={currentView === 'list' ? 'block' : 'hidden'}>
          <ProductListView
            products={products}
            warehouseTransactions={warehouseTransactions}
            kanbanItems={kanbanItems}
            onSelectProduct={(p) => navigateTo('detail', p)}
            onOpenCsvImport={() => handleOpenDataImport('products')}
            onOpenNewProduct={() => navigateTo('new-product')}
            onOpenKanbanModal={handleOpenKanbanModalForProduct}
            onNavigateToKanban={() => navigateTo('kanban')}
            initialFilter={activeListFilter}
            onClearFilter={() => setActiveListFilter(null)}
            onNavigateToWarehousePosition={handleNavigateToWarehousePosition}
          />
        </div>

        {currentView === 'detail' && selectedProduct && (
          <ProductDetail
            key={selectedProduct.productId || selectedProduct.id}
            product={selectedProduct}
            allProducts={products}
            componentRelations={componentRelations}
            meterBoxRelations={meterBoxRelations}
            connectorTerminalRelations={connectorTerminalRelations}
            matingPairRelations={matingPairRelations}
            terminalFejRelations={terminalFejRelations}
            terminalFejDisconnections={terminalFejDisconnections}
            warehouseTransactions={warehouseTransactions}
            kanbanItems={kanbanItems}
            onOpenKanbanModal={handleOpenKanbanModalForProduct}
            onNavigateToKanban={() => navigateTo('kanban')}
            onNavigateToWarehousePosition={handleNavigateToWarehousePosition}
            onNavigateToWarehouseMovement={handleNavigateToWarehouseMovement}
            onBack={handleGoBack}
            onGoToList={handleGoToList}
            previousProduct={previousStep?.product || null}
            onSave={handleSaveProduct}
            onDelete={handleDeleteProduct}
            onSelectProduct={(p) => navigateTo('detail', p)}
            onFilterBy={handleFilterFromDetail}
            onNavigateToDataImport={handleOpenDataImport}
            onAddComponentRelation={handleAddComponentRelation}
            onDeleteComponentRelation={handleDeleteComponentRelation}
            onAddMeterBoxRelation={handleAddMeterBoxRelation}
            onDeleteMeterBoxRelation={handleDeleteMeterBoxRelation}
            onAddConnectorTerminalRelation={handleAddConnectorTerminalRelation}
            onDeleteConnectorTerminalRelation={handleDeleteConnectorTerminalRelation}
            onAddMatingPairRelation={handleAddMatingPairRelation}
            onDeleteMatingPairRelation={handleDeleteMatingPairRelation}
            onAddTerminalFejRelation={handleAddTerminalFejRelation}
            onDeleteTerminalFejRelation={handleDeleteTerminalFejRelation}
            productNotes={productNotes}
            onSaveProductNote={handleSaveProductNote}
            onDeleteProductNote={handleDeleteProductNote}
            maintenances={maintenances}
            onSaveMaintenance={handleSaveMaintenance}
            onDeleteMaintenance={handleDeleteMaintenance}
            onDeleteAllMaintenanceForProduct={handleDeleteAllMaintenanceForProduct}
            canEdit={isEditor}
          />
        )}

        {(currentView === 'csv-import' || currentView === 'data-import') && (
          <CsvImportView
            key={activeImportTab}
            onBack={handleGoBack}
            onGoToList={handleGoToList}
            onImportComplete={() => {
              handleGoToList();
            }}
            initialTab={activeImportTab}
            existingProducts={products}
          />
        )}

        {currentView === 'new-product' && (
          <NewProductView
            onBack={handleGoBack}
            onGoToList={handleGoToList}
            allProducts={products}
            onSave={async (p) => {
              await handleSaveProduct(p);
              handleGoToList();
            }}
          />
        )}

        {currentView === 'warehouse-stats' && (
          <WarehouseStatsView
            products={products}
            positions={warehousePositions}
            transactions={warehouseTransactions}
            initialPositionId={selectedWarehousePositionId}
            initialProductId={selectedWarehouseProductId}
            onBack={handleGoBack}
            onGoToList={handleGoToList}
            onSelectProduct={(p) => navigateTo('detail', p)}
            onRefreshData={() => {
              setWarehousePositions(getLocalStoredWarehousePositions());
              setWarehouseTransactions(getLocalStoredWarehouseTransactions());
            }}
            onResetStockToZero={() => setIsResetStockModalOpen(true)}
            canEdit={isEditor}
          />
        )}

        {currentView === 'users-permissions' && (
          <UserManagementView
            currentUserProfile={currentUserProfile}
            onBack={handleGoBack}
            onGoToList={handleGoToList}
            onProfileUpdated={(updated) => setCurrentUserProfile(updated)}
            onOpenLoginModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {currentView === 'kanban' && (
          <KanbanBoardView
            kanbanItems={kanbanItems}
            products={products}
            onSaveItem={handleSaveKanbanItem}
            onDeleteItem={handleDeleteKanbanItem}
            onMoveStatus={handleMoveKanbanItemStatus}
            onSelectProduct={(p) => navigateTo('detail', p)}
            onGoBack={handleGoBack}
          />
        )}
      </main>

      {/* Navigation Drawer */}
      <NavigationDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'list') {
            handleGoToList();
          } else {
            navigateTo(view);
          }
        }}
        onNavigateToDataImport={(tab) => {
          handleOpenDataImport(tab);
          setIsMenuOpen(false);
        }}
        onExportCsv={() => exportProductsToCsv(products)}
        onOpenCrimpSettings={() => setIsCrimpSettingsOpen(true)}
        onOpenWarehouseImport={() => {
          handleOpenDataImport('warehouse-transactions');
          setIsMenuOpen(false);
        }}
        onResetWarehouseStockToZero={() => {
          setIsMenuOpen(false);
          setIsResetStockModalOpen(true);
        }}
        totalWarehouseUnits={totalWarehouseUnits}
        onOpenMaintenanceManager={() => {
          setIsMenuOpen(false);
          setIsMaintenanceManagerOpen(true);
        }}
        onOpenDeleteAllMaintenances={() => {
          setIsMenuOpen(false);
          setIsDeleteAllMaintenancesModalOpen(true);
        }}
        totalMaintenancesCount={maintenances.length}
        totalKanbanItemsCount={kanbanItems.length}
        onSyncFirebase={handleManualSync}
        isSyncing={isSyncing}
        currentUser={currentUser}
        currentUserProfile={currentUserProfile}
        onLogin={() => {
          setIsMenuOpen(false);
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Auth & Profile Modal */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(profile) => {
            setCurrentUserProfile(profile);
          }}
        />
      )}

      {/* Crimp Settings & Sync Modal */}
      {isCrimpSettingsOpen && (
        <CrimpSettingsModal
          isOpen={isCrimpSettingsOpen}
          onClose={() => setIsCrimpSettingsOpen(false)}
          products={products}
          onRelationsUpdated={() => {
            setTerminalFejRelations(getLocalStoredTerminalFejek());
            setTerminalFejDisconnections(getLocalStoredTerminalFejDisconnections());
          }}
          onResetWarehouseStock={() => setIsResetStockModalOpen(true)}
        />
      )}

      {/* Reset Warehouse Stock Confirmation Modal */}
      {isResetStockModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-200 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-xs">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-rose-950">
                  Raktárkészlet Nullázása
                </h3>
                <p className="text-xs text-rose-700 font-bold mt-0.5">
                  Teljes raktárkészlet beállítása 0 db-ra
                </p>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-800 space-y-2">
              <p className="font-bold text-rose-950">
                Biztosan 0-ra szeretné állítani a teljes raktárkészletet?
              </p>
              <ul className="space-y-1.5 list-disc list-inside text-slate-700 text-xs font-medium">
                <li>Minden rögzített raktári készletmozgási tétel törlésre kerül.</li>
                <li>Minden termék raktári készlete <strong>0 db</strong> lesz (a listákban piros jelvénnyel).</li>
                <li>A felvett <strong>raktár pozíciók (pl. A1, B2) MEGMARADNAK</strong> a rendszerben.</li>
                <li>A termékkatalógus és kapcsolatok változatlanok maradnak.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsResetStockModalOpen(false)}
                disabled={isResettingStock}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={handleExecuteResetStock}
                disabled={isResettingStock}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-black text-sm shadow-md transition-colors cursor-pointer"
              >
                {isResettingStock ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Nullázás folyamatban...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Igen, Készlet Nullázása (0 db)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {resetStockSuccessMessage && (
        <div className="fixed top-5 right-5 z-50 max-w-md bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400">
          <CheckCircle className="w-5 h-5 text-emerald-100 shrink-0" />
          <span className="text-xs sm:text-sm font-bold flex-1">{resetStockSuccessMessage}</span>
          <button
            type="button"
            onClick={() => setResetStockSuccessMessage(null)}
            className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Maintenance Manager Modal (Karbantartások Kezelése & Törlése) */}
      {isMaintenanceManagerOpen && (
        <MaintenanceManagerModal
          isOpen={isMaintenanceManagerOpen}
          onClose={() => setIsMaintenanceManagerOpen(false)}
          maintenances={maintenances}
          allProducts={products}
          onSelectProduct={(p) => {
            setSelectedProduct(p);
            navigateTo('detail', p);
          }}
          onDeleteMaintenance={handleDeleteMaintenance}
          onDeleteAllMaintenances={handleDeleteAllMaintenances}
          onNavigateToCsvImport={() => handleOpenDataImport('maintenances')}
          canEdit={isEditor}
        />
      )}

      {/* Confirmation Modal for Delete All Maintenances (Főmenüből indítva) */}
      {isDeleteAllMaintenancesModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border-2 border-rose-300 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-rose-950">
                  Összes Karbantartás Törlése
                </h3>
                <p className="text-xs text-rose-700 font-bold mt-0.5">
                  Minden ({maintenances.length} db) karbantartási adat törlése a menüből
                </p>
              </div>
            </div>

            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 text-xs sm:text-sm text-stone-800 space-y-2">
              <p className="font-bold text-rose-950">
                Biztosan törölni szeretné az ÖSSZES karbantartási adatot?
              </p>
              <ul className="space-y-1.5 list-disc list-inside text-stone-700 text-xs font-medium">
                <li>Minden rögzített karbantartási napló bejegyzés és alkatrészcsere azonnal törlődik.</li>
                <li>A törlés a helyi tárolóból és a felhőbeli adatbázisból is véglegesen eltávolítja a tételeket.</li>
                <li>A termékkatalógus és a raktári készletadatok érintetlenek maradnak.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsDeleteAllMaintenancesModalOpen(false)}
                disabled={isDeletingAllMaintenances}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-sm hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={handleDeleteAllMaintenances}
                disabled={isDeletingAllMaintenances}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-black text-sm shadow-md transition-colors cursor-pointer"
              >
                {isDeletingAllMaintenances ? (
                  <>
                    <Trash2 className="w-4 h-4 animate-spin" />
                    <span>Törlés folyamatban...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Igen, Összes Karbantartás Törlése</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Success Toast Notification */}
      {maintenanceSuccessMessage && (
        <div className="fixed top-5 right-5 z-50 max-w-md bg-[#5C381E] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-amber-500 animate-slideDown">
          <CheckCircle className="w-5 h-5 text-amber-300 shrink-0" />
          <span className="text-xs sm:text-sm font-bold flex-1">{maintenanceSuccessMessage}</span>
          <button
            type="button"
            onClick={() => setMaintenanceSuccessMessage(null)}
            className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global Kanban Form Modal (Minden terméknél hozzáadható a kanbanhoz) */}
      {isKanbanModalOpen && (
        <KanbanItemModal
          isOpen={isKanbanModalOpen}
          onClose={() => {
            setIsKanbanModalOpen(false);
            setEditingKanbanItem(null);
            setKanbanModalProductId(undefined);
          }}
          initialProductId={kanbanModalProductId}
          initialItem={editingKanbanItem}
          products={products}
          onSave={handleSaveKanbanItem}
          onDelete={handleDeleteKanbanItem}
        />
      )}
    </div>
  );
}
