import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Database,
  RefreshCw,
  Eye,
  Puzzle,
  Package,
  Layers,
  Sparkles,
  Info,
  Check,
  HelpCircle,
  Gauge,
  Plug,
  GitCompare,
  BookOpen,
  Box,
  Wrench,
  Trash2
} from 'lucide-react';
import {
  parseProductCsv,
  getSampleCsvTemplate,
  parseComponentCsv,
  getSampleComponentCsvTemplate,
  exportComponentsToCsv,
  ParsedComponentRelation,
  parseMeterBoxCsv,
  getSampleMeterBoxCsvTemplate,
  exportMeterBoxesToCsv,
  ParsedMeterBoxRelation,
  parseConnectorTerminalCsv,
  getSampleConnectorTerminalCsvTemplate,
  exportConnectorTerminalsToCsv,
  ParsedConnectorTerminalRelation,
  parseMatingPairCsv,
  getSampleMatingPairCsvTemplate,
  exportMatingPairsToCsv,
  ParsedMatingPairRelation,
  parseNotesCsv,
  getSampleNotesCsvTemplate,
  exportNotesToCsv,
  getSampleWarehousePositionsCsvTemplate,
  getSampleWarehouseTransactionsCsvTemplate,
  exportWarehousePositionsToCsv,
  exportWarehouseTransactionsToCsv,
  parseMaintenanceCsv,
  getSampleMaintenanceCsvTemplate,
  exportMaintenancesToCsv,
  ParsedMaintenanceRecord
} from '../utils/csvHelper';
import { Product, ProductNote } from '../types/product';
import { batchSaveProductsToFirestore } from '../services/productService';
import { batchSaveComponentRelations } from '../services/componentService';
import { batchSaveMeterBoxRelations } from '../services/meterBoxService';
import { batchSaveConnectorTerminalRelations } from '../services/connectorTerminalService';
import { batchSaveMatingPairRelations } from '../services/matingPairService';
import { batchSaveNotes } from '../services/noteService';
import {
  batchImportWarehousePositions,
  batchImportWarehouseTransactions,
  parseWarehousePositionsCsv,
  parseWarehouseTransactionsCsv
} from '../services/warehouseService';
import { batchSaveMaintenances, deleteAllMaintenances } from '../services/maintenanceService';

export type ImportTabType =
  | 'products'
  | 'components'
  | 'meterboxes'
  | 'connector-terminals'
  | 'mating-pairs'
  | 'notes'
  | 'warehouse-positions'
  | 'warehouse-transactions'
  | 'maintenances';

interface CsvImportViewProps {
  onBack: () => void;
  onGoToList?: () => void;
  onImportComplete: () => void;
  initialTab?: ImportTabType;
  existingProducts?: Product[];
}

export const CsvImportView: React.FC<CsvImportViewProps> = ({
  onBack,
  onGoToList,
  onImportComplete,
  initialTab = 'products',
  existingProducts = []
}) => {
  const [activeTab, setActiveTab] = useState<ImportTabType>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // --- 1. Products CSV State ---
  const [productCsvText, setProductCsvText] = useState('');
  const [parsedProducts, setParsedProducts] = useState<Product[]>([]);
  const [productParseErrors, setProductParseErrors] = useState<string[]>([]);
  const [productFileName, setProductFileName] = useState('');
  const [isUploadingProducts, setIsUploadingProducts] = useState(false);
  const [productUploadResult, setProductUploadResult] = useState<{
    count: number;
    error?: string;
  } | null>(null);

  // --- 2. Components CSV State ---
  const [componentCsvText, setComponentCsvText] = useState('');
  const [parsedComponents, setParsedComponents] = useState<ParsedComponentRelation[]>([]);
  const [componentParseErrors, setComponentParseErrors] = useState<string[]>([]);
  const [componentFileName, setComponentFileName] = useState('');
  const [componentStats, setComponentStats] = useState<{
    totalRows: number;
    uniqueCount: number;
    duplicateCount: number;
  }>({ totalRows: 0, uniqueCount: 0, duplicateCount: 0 });
  const [isUploadingComponents, setIsUploadingComponents] = useState(false);
  const [componentUploadResult, setComponentUploadResult] = useState<{
    count: number;
    duplicates: number;
    error?: string;
  } | null>(null);

  // --- 3. MeterBox CSV State ---
  const [meterBoxCsvText, setMeterBoxCsvText] = useState('');
  const [parsedMeterBoxes, setParsedMeterBoxes] = useState<ParsedMeterBoxRelation[]>([]);
  const [meterBoxParseErrors, setMeterBoxParseErrors] = useState<string[]>([]);
  const [meterBoxFileName, setMeterBoxFileName] = useState('');
  const [meterBoxStats, setMeterBoxStats] = useState<{
    totalRows: number;
    uniqueCount: number;
    duplicateCount: number;
  }>({ totalRows: 0, uniqueCount: 0, duplicateCount: 0 });
  const [isUploadingMeterBoxes, setIsUploadingMeterBoxes] = useState(false);
  const [meterBoxUploadResult, setMeterBoxUploadResult] = useState<{
    count: number;
    duplicates: number;
    error?: string;
  } | null>(null);

  // --- 4. Connector-Terminal CSV State ---
  const [connectorTerminalCsvText, setConnectorTerminalCsvText] = useState('');
  const [parsedConnectorTerminals, setParsedConnectorTerminals] = useState<ParsedConnectorTerminalRelation[]>([]);
  const [connectorTerminalParseErrors, setConnectorTerminalParseErrors] = useState<string[]>([]);
  const [connectorTerminalFileName, setConnectorTerminalFileName] = useState('');
  const [connectorTerminalStats, setConnectorTerminalStats] = useState<{
    totalRows: number;
    uniqueCount: number;
    duplicateCount: number;
  }>({ totalRows: 0, uniqueCount: 0, duplicateCount: 0 });
  const [isUploadingConnectorTerminals, setIsUploadingConnectorTerminals] = useState(false);
  const [connectorTerminalUploadResult, setConnectorTerminalUploadResult] = useState<{
    count: number;
    duplicates: number;
    error?: string;
  } | null>(null);

  // --- 5. Mating Pair (Ellenpárok) CSV State ---
  const [matingPairCsvText, setMatingPairCsvText] = useState('');
  const [parsedMatingPairs, setParsedMatingPairs] = useState<ParsedMatingPairRelation[]>([]);
  const [matingPairParseErrors, setMatingPairParseErrors] = useState<string[]>([]);
  const [matingPairFileName, setMatingPairFileName] = useState('');
  const [matingPairStats, setMatingPairStats] = useState<{
    totalRows: number;
    uniqueCount: number;
    duplicateCount: number;
  }>({ totalRows: 0, uniqueCount: 0, duplicateCount: 0 });
  const [isUploadingMatingPairs, setIsUploadingMatingPairs] = useState(false);
  const [matingPairUploadResult, setMatingPairUploadResult] = useState<{
    count: number;
    duplicates: number;
    error?: string;
  } | null>(null);

  // --- 6. Notesz CSV State ---
  const [notesCsvText, setNotesCsvText] = useState('');
  const [parsedNotes, setParsedNotes] = useState<ProductNote[]>([]);
  const [notesParseErrors, setNotesParseErrors] = useState<string[]>([]);
  const [notesFileName, setNotesFileName] = useState('');
  const [isUploadingNotes, setIsUploadingNotes] = useState(false);
  const [notesUploadResult, setNotesUploadResult] = useState<{
    count: number;
    error?: string;
  } | null>(null);

  // Set of existing product IDs for quick lookup in preview
  const existingProductIds = React.useMemo(() => {
    return new Set(existingProducts.map((p) => p.productId.trim().toLowerCase()));
  }, [existingProducts]);

  // ================= PRODUCTS LOGIC =================
  const handleProductFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProductFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setProductCsvText(content);
        processProductData(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const processProductData = (text: string) => {
    const { products, errors } = parseProductCsv(text);
    setParsedProducts(products);
    setProductParseErrors(errors);
    setProductUploadResult(null);
  };

  const handleLoadProductSample = () => {
    const sample = getSampleCsvTemplate();
    setProductCsvText(sample);
    setProductFileName('minta_termekek.csv');
    processProductData(sample);
  };

  const handleDownloadProductTemplate = () => {
    const sample = getSampleCsvTemplate();
    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'termekek_minta_sablon.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCommitProducts = async () => {
    if (parsedProducts.length === 0) return;
    setIsUploadingProducts(true);
    setProductUploadResult(null);

    try {
      const res = await batchSaveProductsToFirestore(parsedProducts);
      setProductUploadResult({
        count: res.successCount,
        error: res.errors.length > 0 ? res.errors.join('; ') : undefined
      });
      setTimeout(() => {
        onImportComplete();
      }, 1500);
    } catch (err: any) {
      console.error('Batch upload error:', err);
      setProductUploadResult({
        count: 0,
        error: err?.message || 'Hiba történt a felhőbe mentéskor'
      });
    } finally {
      setIsUploadingProducts(false);
    }
  };

  // ================= COMPONENTS LOGIC =================
  const handleComponentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setComponentFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setComponentCsvText(content);
        processComponentData(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const processComponentData = (text: string) => {
    const { relations, errors, totalRows, uniqueCount, duplicateCount } =
      parseComponentCsv(text);
    setParsedComponents(relations);
    setComponentParseErrors(errors);
    setComponentStats({ totalRows, uniqueCount, duplicateCount });
    setComponentUploadResult(null);
  };

  const handleLoadComponentSample = () => {
    const sample = getSampleComponentCsvTemplate();
    setComponentCsvText(sample);
    setComponentFileName('minta_beepulo_alkatreszek.csv');
    processComponentData(sample);
  };

  const handleDownloadComponentTemplate = () => {
    const sample = getSampleComponentCsvTemplate();
    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'beepulo_alkatreszek_minta_sablon.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCommitComponents = async () => {
    if (parsedComponents.length === 0) return;
    setIsUploadingComponents(true);
    setComponentUploadResult(null);

    try {
      const res = await batchSaveComponentRelations(parsedComponents, true);
      setComponentUploadResult({
        count: res.successCount,
        duplicates: res.duplicateCount,
        error: res.errors.length > 0 ? res.errors.join('; ') : undefined
      });
      setTimeout(() => {
        onImportComplete();
      }, 1500);
    } catch (err: any) {
      console.error('Batch upload components error:', err);
      setComponentUploadResult({
        count: 0,
        duplicates: 0,
        error: err?.message || 'Hiba történt az alkatrészek felhőbe mentésekor'
      });
    } finally {
      setIsUploadingComponents(false);
    }
  };

  // ================= METERBOX LOGIC =================
  const handleMeterBoxFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMeterBoxFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setMeterBoxCsvText(content);
        processMeterBoxData(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const processMeterBoxData = (content: string) => {
    if (!content.trim()) {
      setParsedMeterBoxes([]);
      setMeterBoxParseErrors([]);
      setMeterBoxStats({ totalRows: 0, uniqueCount: 0, duplicateCount: 0 });
      setMeterBoxUploadResult(null);
      return;
    }

    const { relations, errors, totalRows, uniqueCount, duplicateCount } = parseMeterBoxCsv(content);
    setParsedMeterBoxes(relations);
    setMeterBoxParseErrors(errors);
    setMeterBoxStats({ totalRows, uniqueCount, duplicateCount });
    setMeterBoxUploadResult(null);
  };

  const handleLoadMeterBoxSample = () => {
    const sample = getSampleMeterBoxCsvTemplate();
    setMeterBoxCsvText(sample);
    setMeterBoxFileName('minta_termek_merodoboz.csv');
    processMeterBoxData(sample);
  };

  const handleDownloadMeterBoxTemplate = () => {
    const sample = getSampleMeterBoxCsvTemplate();
    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'termek_merodoboz_sablon.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadMeterBoxes = async () => {
    if (parsedMeterBoxes.length === 0) return;

    setIsUploadingMeterBoxes(true);
    setMeterBoxUploadResult(null);

    try {
      const result = await batchSaveMeterBoxRelations(parsedMeterBoxes, true);
      setMeterBoxUploadResult({
        count: result.successCount,
        duplicates: result.duplicateCount,
        error: result.errors.length > 0 ? result.errors.join(', ') : undefined
      });
      setTimeout(() => {
        onImportComplete();
      }, 1500);
    } catch (err: any) {
      console.error('Batch upload meterbox error:', err);
      setMeterBoxUploadResult({
        count: 0,
        duplicates: 0,
        error: err?.message || 'Hiba történt a kapcsolatok felhőbe mentésekor'
      });
    } finally {
      setIsUploadingMeterBoxes(false);
    }
  };

  // ================= CONNECTOR-TERMINAL LOGIC =================
  const handleConnectorTerminalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConnectorTerminalFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setConnectorTerminalCsvText(content);
        processConnectorTerminalData(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const processConnectorTerminalData = (content: string) => {
    if (!content.trim()) {
      setParsedConnectorTerminals([]);
      setConnectorTerminalParseErrors([]);
      setConnectorTerminalStats({ totalRows: 0, uniqueCount: 0, duplicateCount: 0 });
      setConnectorTerminalUploadResult(null);
      return;
    }

    const { relations, errors, totalRows, uniqueCount, duplicateCount } = parseConnectorTerminalCsv(content);
    setParsedConnectorTerminals(relations);
    setConnectorTerminalParseErrors(errors);
    setConnectorTerminalStats({ totalRows, uniqueCount, duplicateCount });
    setConnectorTerminalUploadResult(null);
  };

  const handleLoadConnectorTerminalSample = () => {
    const sample = getSampleConnectorTerminalCsvTemplate();
    setConnectorTerminalCsvText(sample);
    setConnectorTerminalFileName('minta_konnektor_saru.csv');
    processConnectorTerminalData(sample);
  };

  const handleDownloadConnectorTerminalTemplate = () => {
    const sample = getSampleConnectorTerminalCsvTemplate();
    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'konnektor_saru_sablon.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadConnectorTerminals = async () => {
    if (parsedConnectorTerminals.length === 0) return;

    setIsUploadingConnectorTerminals(true);
    setConnectorTerminalUploadResult(null);

    try {
      const result = await batchSaveConnectorTerminalRelations(parsedConnectorTerminals, true);
      setConnectorTerminalUploadResult({
        count: result.successCount,
        duplicates: result.duplicateCount,
        error: result.errors.length > 0 ? result.errors.join(', ') : undefined
      });
      setTimeout(() => {
        onImportComplete();
      }, 1500);
    } catch (err: any) {
      console.error('Batch upload connector-terminal error:', err);
      setConnectorTerminalUploadResult({
        count: 0,
        duplicates: 0,
        error: err?.message || 'Hiba történt a kapcsolatok felhőbe mentésekor'
      });
    } finally {
      setIsUploadingConnectorTerminals(false);
    }
  };

  // ================= MATING PAIR (ELLENPÁROK) LOGIC =================
  const handleMatingPairFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMatingPairFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setMatingPairCsvText(content);
        processMatingPairData(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const processMatingPairData = (content: string) => {
    const { relations, errors, totalRows, uniqueCount, duplicateCount } = parseMatingPairCsv(content);
    setParsedMatingPairs(relations);
    setMatingPairParseErrors(errors);
    setMatingPairStats({ totalRows, uniqueCount, duplicateCount });
    setMatingPairUploadResult(null);
  };

  const handleLoadMatingPairSample = () => {
    const sample = getSampleMatingPairCsvTemplate();
    setMatingPairCsvText(sample);
    setMatingPairFileName('minta_ellenparok.csv');
    processMatingPairData(sample);
  };

  const handleDownloadMatingPairTemplate = () => {
    const sample = getSampleMatingPairCsvTemplate();
    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ellenparok_minta_sablon.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadMatingPairs = async () => {
    if (parsedMatingPairs.length === 0) return;
    setIsUploadingMatingPairs(true);
    setMatingPairUploadResult(null);

    try {
      const result = await batchSaveMatingPairRelations(parsedMatingPairs, true);
      setMatingPairUploadResult({
        count: result.successCount,
        duplicates: result.duplicateCount,
        error: result.errors.length > 0 ? result.errors.join(', ') : undefined
      });
      setTimeout(() => {
        onImportComplete();
      }, 1500);
    } catch (err: any) {
      console.error('Batch upload mating pairs error:', err);
      setMatingPairUploadResult({
        count: 0,
        duplicates: 0,
        error: err?.message || 'Hiba történt az ellenpárok felhőbe mentésekor'
      });
    } finally {
      setIsUploadingMatingPairs(false);
    }
  };

  // ================= NOTESZ LOGIC =================
  const handleNotesFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNotesFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setNotesCsvText(content);
        processNotesData(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const processNotesData = (content: string) => {
    if (!content.trim()) {
      setParsedNotes([]);
      setNotesParseErrors([]);
      setNotesUploadResult(null);
      return;
    }
    const { notes, errors } = parseNotesCsv(content);
    setParsedNotes(notes);
    setNotesParseErrors(errors);
    setNotesUploadResult(null);
  };

  const handleLoadNotesSample = () => {
    const sample = getSampleNotesCsvTemplate();
    setNotesCsvText(sample);
    setNotesFileName('minta_notesz_adatok.csv');
    processNotesData(sample);
  };

  const handleDownloadNotesTemplate = () => {
    const sample = getSampleNotesCsvTemplate();
    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notesz_minta_sablon.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadNotes = async () => {
    if (parsedNotes.length === 0) return;
    setIsUploadingNotes(true);
    setNotesUploadResult(null);

    try {
      const result = await batchSaveNotes(parsedNotes);
      setNotesUploadResult({
        count: result.successCount,
        error: result.errors.length > 0 ? result.errors.join(', ') : undefined
      });
      setTimeout(() => {
        onImportComplete();
      }, 1500);
    } catch (err: any) {
      console.error('Batch upload notes error:', err);
      setNotesUploadResult({
        count: 0,
        error: err?.message || 'Hiba történt a notesz bejegyzések felhőbe mentésekor'
      });
    } finally {
      setIsUploadingNotes(false);
    }
  };

  // ================= 7. WAREHOUSE POSITIONS LOGIC =================
  const [positionsCsvText, setPositionsCsvText] = useState('');
  const [parsedPositions, setParsedPositions] = useState<string[]>([]);
  const [positionsFileName, setPositionsFileName] = useState('');
  const [isUploadingPositions, setIsUploadingPositions] = useState(false);
  const [positionsUploadResult, setPositionsUploadResult] = useState<{
    count: number;
    error?: string;
  } | null>(null);

  const processPositionsData = (text: string) => {
    const list = parseWarehousePositionsCsv(text);
    setParsedPositions(list);
  };

  const handlePositionsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPositionsFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPositionsCsvText(content);
        processPositionsData(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadPositionsSample = () => {
    const sample = getSampleWarehousePositionsCsvTemplate();
    setPositionsCsvText(sample);
    processPositionsData(sample);
    setPositionsFileName('minta_raktar_poziciok.csv');
  };

  const handleDownloadPositionsTemplate = () => {
    const sample = getSampleWarehousePositionsCsvTemplate();
    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raktar_poziciok_sablon.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadPositions = async () => {
    if (parsedPositions.length === 0) return;
    setIsUploadingPositions(true);
    setPositionsUploadResult(null);
    try {
      const res = await batchImportWarehousePositions(parsedPositions);
      setPositionsUploadResult({
        count: res.addedCount,
        error: res.errors.length > 0 ? res.errors.join('; ') : undefined
      });
      setTimeout(() => {
        onImportComplete();
      }, 1500);
    } catch (err: any) {
      console.error('Batch positions upload error:', err);
      setPositionsUploadResult({
        count: 0,
        error: err?.message || 'Hiba a pozíciók mentésekor'
      });
    } finally {
      setIsUploadingPositions(false);
    }
  };

  // ================= 8. WAREHOUSE TRANSACTIONS LOGIC =================
  const [transactionsCsvText, setTransactionsCsvText] = useState('');
  const [parsedTransactions, setParsedTransactions] = useState<
    Array<{ positionId: string; productId: string; quantity: number; date: string; note?: string }>
  >([]);
  const [transactionsFileName, setTransactionsFileName] = useState('');
  const [isUploadingTransactions, setIsUploadingTransactions] = useState(false);
  const [transactionsUploadResult, setTransactionsUploadResult] = useState<{
    count: number;
    error?: string;
  } | null>(null);

  const processTransactionsData = (text: string) => {
    const list = parseWarehouseTransactionsCsv(text);
    setParsedTransactions(list);
  };

  const handleTransactionsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTransactionsFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setTransactionsCsvText(content);
        processTransactionsData(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadTransactionsSample = () => {
    const sample = getSampleWarehouseTransactionsCsvTemplate();
    setTransactionsCsvText(sample);
    processTransactionsData(sample);
    setTransactionsFileName('minta_raktar_tranzakciok.csv');
  };

  const handleDownloadTransactionsTemplate = () => {
    const sample = getSampleWarehouseTransactionsCsvTemplate();
    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raktar_tranzakciok_sablon.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadTransactions = async () => {
    if (parsedTransactions.length === 0) return;
    setIsUploadingTransactions(true);
    setTransactionsUploadResult(null);
    try {
      const res = await batchImportWarehouseTransactions(parsedTransactions);
      setTransactionsUploadResult({
        count: res.addedCount,
        error: res.errors.length > 0 ? res.errors.join('; ') : undefined
      });
      setTimeout(() => {
        onImportComplete();
      }, 1500);
    } catch (err: any) {
      console.error('Batch transactions upload error:', err);
      setTransactionsUploadResult({
        count: 0,
        error: err?.message || 'Hiba a készlet tranzakciók mentésekor'
      });
    } finally {
      setIsUploadingTransactions(false);
    }
  };

  // ================= 9. MAINTENANCES CSV LOGIC =================
  const [maintenanceCsvText, setMaintenanceCsvText] = useState('');
  const [parsedMaintenances, setParsedMaintenances] = useState<ParsedMaintenanceRecord[]>([]);
  const [maintenanceParseErrors, setMaintenanceParseErrors] = useState<string[]>([]);
  const [maintenanceFileName, setMaintenanceFileName] = useState('');
  const [isUploadingMaintenances, setIsUploadingMaintenances] = useState(false);
  const [maintenanceUploadResult, setMaintenanceUploadResult] = useState<{
    count: number;
    error?: string;
  } | null>(null);

  const processMaintenanceData = (text: string) => {
    const res = parseMaintenanceCsv(text);
    setParsedMaintenances(res.records);
    setMaintenanceParseErrors(res.errors);
  };

  const handleMaintenanceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMaintenanceFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setMaintenanceCsvText(content);
        processMaintenanceData(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadMaintenanceSample = () => {
    const sample = getSampleMaintenanceCsvTemplate();
    setMaintenanceCsvText(sample);
    processMaintenanceData(sample);
    setMaintenanceFileName('minta_termek_karbantartasok.csv');
  };

  const handleDownloadMaintenanceTemplate = () => {
    const sample = getSampleMaintenanceCsvTemplate();
    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'termek_karbantartas_sablon.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadMaintenances = async () => {
    if (parsedMaintenances.length === 0) return;
    setIsUploadingMaintenances(true);
    setMaintenanceUploadResult(null);
    try {
      const recordsToImport = parsedMaintenances.map((rec) => ({
        id: rec.id || undefined,
        productId: rec.productId,
        status: rec.status || 'Pass',
        description: rec.description,
        changeItem: rec.changeItem,
        date: rec.date
      }));
      const res = await batchSaveMaintenances(recordsToImport as any);
      setMaintenanceUploadResult({
        count: res.successCount,
        error: res.errors.length > 0 ? res.errors.join('; ') : undefined
      });
      setTimeout(() => {
        onImportComplete();
      }, 1500);
    } catch (err: any) {
      console.error('Batch maintenances upload error:', err);
      setMaintenanceUploadResult({
        count: 0,
        error: err?.message || 'Hiba a karbantartások mentésekor'
      });
    } finally {
      setIsUploadingMaintenances(false);
    }
  };

  const [isDeletingAllDbMaintenances, setIsDeletingAllDbMaintenances] = useState(false);

  const handleDeleteAllDbMaintenances = async () => {
    if (!window.confirm('Biztosan törölni szeretné az ÖSSZES karbantartási adatot az adatbázisból? Ez a művelet nem vonható vissza.')) return;
    setIsDeletingAllDbMaintenances(true);
    try {
      const res = await deleteAllMaintenances();
      setParsedMaintenances([]);
      setMaintenanceCsvText('');
      setMaintenanceFileName('');
      setMaintenanceUploadResult({
        count: res.count,
        error: undefined
      });
      alert(`Sikeres törlés! ${res.count} db karbantartási tétel törölve az adatbázisból.`);
      onImportComplete();
    } catch (err: any) {
      console.error('Delete all maintenances error:', err);
      alert('Nem sikerült törölni a karbantartásokat: ' + err?.message);
    } finally {
      setIsDeletingAllDbMaintenances(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Bar with Back Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-[#DBD8D5] shadow-xs">
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
          {activeTab === 'products' && (
            <button
              type="button"
              onClick={handleDownloadProductTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#7098BA] text-[#3A5D6B] hover:bg-[#7098BA]/10 font-bold text-sm sm:text-base transition-colors cursor-pointer"
              title="Termék CSV sablon letöltése"
            >
              <Download className="w-5 h-5 text-[#7098BA]" />
              <span>Termék sablon letöltése</span>
            </button>
          )}

          {activeTab === 'components' && (
            <button
              type="button"
              onClick={handleDownloadComponentTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-emerald-600 text-emerald-800 hover:bg-emerald-50 font-bold text-sm sm:text-base transition-colors cursor-pointer"
              title="Beépülő alkatrész CSV sablon letöltése"
            >
              <Download className="w-5 h-5 text-emerald-600" />
              <span>Alkatrész sablon letöltése</span>
            </button>
          )}

          {activeTab === 'meterboxes' && (
            <button
              type="button"
              onClick={handleDownloadMeterBoxTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-orange-500 text-orange-900 hover:bg-orange-50 font-bold text-sm sm:text-base transition-colors cursor-pointer"
              title="Termék ↔ Mérődoboz CSV sablon letöltése"
            >
              <Download className="w-5 h-5 text-orange-600" />
              <span>Mérődoboz sablon letöltése</span>
            </button>
          )}

          {activeTab === 'connector-terminals' && (
            <button
              type="button"
              onClick={handleDownloadConnectorTerminalTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-orange-500 text-orange-900 hover:bg-orange-50 font-bold text-sm sm:text-base transition-colors cursor-pointer"
              title="Konnektor ↔ Saru CSV sablon letöltése"
            >
              <Download className="w-5 h-5 text-orange-600" />
              <span>Konnektor-Saru sablon letöltése</span>
            </button>
          )}

          {activeTab === 'mating-pairs' && (
            <button
              type="button"
              onClick={handleDownloadMatingPairTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-yellow-500 text-yellow-950 hover:bg-yellow-50 font-bold text-sm sm:text-base transition-colors cursor-pointer"
              title="Ellenpárok CSV sablon letöltése"
            >
              <Download className="w-5 h-5 text-yellow-700" />
              <span>Ellenpárok sablon letöltése</span>
            </button>
          )}

          {activeTab === 'notes' && (
            <button
              type="button"
              onClick={handleDownloadNotesTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#FA4646] text-[#FA4646] hover:bg-red-50 font-bold text-sm sm:text-base transition-colors cursor-pointer"
              title="Notesz CSV sablon letöltése"
            >
              <Download className="w-5 h-5 text-[#FA4646]" />
              <span>Notesz sablon letöltése</span>
            </button>
          )}

          {activeTab === 'warehouse-positions' && (
            <button
              type="button"
              onClick={handleDownloadPositionsTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-blue-600 text-blue-900 hover:bg-blue-50 font-bold text-sm sm:text-base transition-colors cursor-pointer"
              title="Raktár Pozíciók CSV sablon letöltése"
            >
              <Download className="w-5 h-5 text-blue-600" />
              <span>Pozíciók sablon letöltése</span>
            </button>
          )}

          {activeTab === 'warehouse-transactions' && (
            <button
              type="button"
              onClick={handleDownloadTransactionsTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-sky-600 text-sky-900 hover:bg-sky-50 font-bold text-sm sm:text-base transition-colors cursor-pointer"
              title="Készlet Tranzakciók CSV sablon letöltése"
            >
              <Download className="w-5 h-5 text-sky-600" />
              <span>Készlet tranzakciók sablon letöltése</span>
            </button>
          )}

          {activeTab === 'maintenances' && (
            <button
              type="button"
              onClick={handleDownloadMaintenanceTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#7B4B29] text-[#7B4B29] hover:bg-amber-50 font-bold text-sm sm:text-base transition-colors cursor-pointer"
              title="Karbantartás CSV sablon letöltése"
            >
              <Download className="w-5 h-5 text-[#7B4B29]" />
              <span>Karbantartás sablon letöltése</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#DBD8D5] shadow-xs space-y-6">
        {/* Header Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#211E1B] flex items-center gap-3">
            <UploadCloud className="w-8 h-8 sm:w-9 sm:h-9 text-[#3A5D6B]" />
            <span>Adatfeltöltés & Tömeges Importálás</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mt-2">
            Válassza ki a feltölteni kívánt adatok típusát a fülek segítségével. A CSV fájlok adatai ellenőrzés után azonnal szinkronizálódnak a Firebase felhővel.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-2.5 p-1.5 bg-[#F8F9FA] rounded-2xl border border-[#DBD8D5]">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`flex-1 min-w-[170px] flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold text-base sm:text-lg transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-[#3A5D6B] text-white shadow-md'
                : 'text-gray-700 hover:bg-white hover:text-[#211E1B]'
            }`}
          >
            <Package className="w-5 h-5 text-[#79B6B8]" />
            <span>Termék CSV</span>
            {parsedProducts.length > 0 && (
              <span className="text-xs bg-white text-[#3A5D6B] font-extrabold px-2 py-0.5 rounded-full">
                {parsedProducts.length} db
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('components')}
            className={`flex-1 min-w-[170px] flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold text-base sm:text-lg transition-all cursor-pointer ${
              activeTab === 'components'
                ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md'
                : 'text-gray-700 hover:bg-white hover:text-emerald-800'
            }`}
          >
            <Puzzle className="w-5 h-5 text-emerald-300" />
            <span>Beépülő alkatrészek</span>
            {parsedComponents.length > 0 && (
              <span className="text-xs bg-emerald-100 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full">
                {parsedComponents.length} db
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('meterboxes')}
            className={`flex-1 min-w-[170px] flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold text-base sm:text-lg transition-all cursor-pointer ${
              activeTab === 'meterboxes'
                ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-md'
                : 'text-gray-700 hover:bg-white hover:text-orange-900'
            }`}
          >
            <Gauge className="w-5 h-5 text-amber-200" />
            <span>Termék&lt;-&gt;Mérődoboz</span>
            {parsedMeterBoxes.length > 0 && (
              <span className="text-xs bg-orange-100 text-orange-950 font-extrabold px-2 py-0.5 rounded-full">
                {parsedMeterBoxes.length} db
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('connector-terminals')}
            className={`flex-1 min-w-[170px] flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold text-base sm:text-lg transition-all cursor-pointer ${
              activeTab === 'connector-terminals'
                ? 'bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white shadow-md'
                : 'text-gray-700 hover:bg-white hover:text-orange-900'
            }`}
          >
            <Plug className="w-5 h-5 text-amber-200" />
            <span>Konnektor&lt;-&gt;Saru</span>
            {parsedConnectorTerminals.length > 0 && (
              <span className="text-xs bg-orange-100 text-orange-950 font-extrabold px-2 py-0.5 rounded-full">
                {parsedConnectorTerminals.length} db
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mating-pairs')}
            className={`flex-1 min-w-[170px] flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold text-base sm:text-lg transition-all cursor-pointer ${
              activeTab === 'mating-pairs'
                ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 text-yellow-950 shadow-md font-extrabold'
                : 'text-gray-700 hover:bg-white hover:text-yellow-950'
            }`}
          >
            <GitCompare className="w-5 h-5 text-yellow-800" />
            <span>Ellenpárok</span>
            {parsedMatingPairs.length > 0 && (
              <span className="text-xs bg-yellow-100 text-yellow-950 font-extrabold px-2 py-0.5 rounded-full border border-yellow-300">
                {parsedMatingPairs.length} db
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`flex-1 min-w-[170px] flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold text-base sm:text-lg transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-gradient-to-r from-[#FA4646] to-[#E03535] text-white shadow-md font-extrabold'
                : 'text-gray-700 hover:bg-white hover:text-[#FA4646]'
            }`}
          >
            <BookOpen className="w-5 h-5 text-red-100" />
            <span>Notesz CSV</span>
            {parsedNotes.length > 0 && (
              <span className="text-xs bg-white text-[#FA4646] font-extrabold px-2 py-0.5 rounded-full border border-red-300">
                {parsedNotes.length} db
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('warehouse-positions')}
            className={`flex-1 min-w-[170px] flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold text-base sm:text-lg transition-all cursor-pointer ${
              activeTab === 'warehouse-positions'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md font-extrabold'
                : 'text-gray-700 hover:bg-white hover:text-blue-900'
            }`}
          >
            <Box className="w-5 h-5 text-sky-300" />
            <span>Raktár Pozíciók</span>
            {parsedPositions.length > 0 && (
              <span className="text-xs bg-white text-blue-900 font-extrabold px-2 py-0.5 rounded-full border border-blue-300">
                {parsedPositions.length} db
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('warehouse-transactions')}
            className={`flex-1 min-w-[170px] flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold text-base sm:text-lg transition-all cursor-pointer ${
              activeTab === 'warehouse-transactions'
                ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-md font-extrabold'
                : 'text-gray-700 hover:bg-white hover:text-sky-900'
            }`}
          >
            <Layers className="w-5 h-5 text-sky-100" />
            <span>Készlet Tranzakciók</span>
            {parsedTransactions.length > 0 && (
              <span className="text-xs bg-white text-sky-900 font-extrabold px-2 py-0.5 rounded-full border border-sky-300">
                {parsedTransactions.length} db
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('maintenances')}
            className={`flex-1 min-w-[170px] flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold text-base sm:text-lg transition-all cursor-pointer ${
              activeTab === 'maintenances'
                ? 'bg-gradient-to-r from-[#5C381E] via-[#7B4B29] to-[#4A2810] text-white shadow-md font-extrabold'
                : 'text-gray-700 hover:bg-white hover:text-[#7B4B29]'
            }`}
          >
            <Wrench className="w-5 h-5 text-amber-200" />
            <span>Karbantartás</span>
            {parsedMaintenances.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-950 font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                {parsedMaintenances.length} db
              </span>
            )}
          </button>
        </div>

        {/* ================= TAB 1: PRODUCT CSV ================= */}
        {activeTab === 'products' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-[#3A5D6B] shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 leading-relaxed">
                <strong>Termék adatbázis feltöltése:</strong> Itt töltheti fel a teljes raktári terméklistát (Termék ID, Termék név, Gyári kód, Leírás, Kategória, Készlet, Raktári polc stb.). Ha egy Termék ID már létezik, a rendszer frissíti a megadott adatokkal.
              </div>
            </div>

            {/* Upload Zone */}
            <div className="border-3 border-dashed border-[#79B6B8] hover:border-[#3A5D6B] rounded-2xl p-6 sm:p-8 bg-[#F8F9FA] transition-colors text-center relative">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleProductFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 text-[#3A5D6B]" />
              <h3 className="text-lg sm:text-xl font-bold text-[#211E1B]">
                Húzza ide a Termék CSV fájlt, vagy kattintson a tallózáshoz
              </h3>
              <p className="text-sm sm:text-base text-gray-500 mt-1">
                Oszlopok: Termék ID, Termék név, Leírás, Kategória, Gyártó, Adagolás, Gyári Kód, Készlet...
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <span className="px-5 py-2.5 bg-[#3A5D6B] text-white font-bold text-sm sm:text-base rounded-xl shadow-xs pointer-events-none">
                  Fájl kiválasztása
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadProductSample();
                  }}
                  className="px-4 py-2.5 bg-[#DBD8D5] hover:bg-[#DBD8D5]/80 text-[#211E1B] font-bold text-sm sm:text-base rounded-xl cursor-pointer"
                >
                  Minta adatok betöltése
                </button>
              </div>

              {productFileName && (
                <div className="mt-4 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-[#79B6B8] text-sm sm:text-base font-semibold text-[#3A5D6B]">
                  <FileText className="w-5 h-5 text-[#79B6B8]" />
                  Kiválasztott fájl: {productFileName}
                </div>
              )}
            </div>

            {/* Manual Paste Textarea */}
            <div className="space-y-2">
              <label className="text-sm sm:text-base font-bold text-[#3A5D6B] flex items-center justify-between">
                <span>Vagy másolja be a CSV szöveget ide:</span>
                {parsedProducts.length > 0 && (
                  <span className="text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Felismerve: {parsedProducts.length} db termék
                  </span>
                )}
              </label>
              <textarea
                rows={5}
                value={productCsvText}
                onChange={(e) => {
                  setProductCsvText(e.target.value);
                  processProductData(e.target.value);
                }}
                placeholder="Termék ID,Termék név,Leírás,Kategória,Gyártó,Gyári Kód..."
                className="w-full font-mono text-xs sm:text-sm p-4 border-2 border-[#DBD8D5] focus:border-[#3A5D6B] rounded-xl text-[#211E1B] bg-white leading-relaxed"
              />
            </div>

            {/* Errors if any */}
            {productParseErrors.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-base">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Figyelmeztetések az értelmezés során:
                </div>
                {productParseErrors.map((err, i) => (
                  <div key={i} className="text-xs sm:text-sm text-amber-700 font-mono">
                    • {err}
                  </div>
                ))}
              </div>
            )}

            {/* Preview Table */}
            {parsedProducts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-bold text-[#211E1B] flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#3A5D6B]" />
                  Betöltött Termékek Előnézete ({parsedProducts.length} db)
                </h3>

                <div className="overflow-x-auto border border-[#DBD8D5] rounded-xl max-h-72">
                  <table className="w-full text-left text-sm sm:text-base">
                    <thead className="bg-[#3A5D6B] text-white text-xs sm:text-sm font-bold uppercase sticky top-0">
                      <tr>
                        <th className="p-3">Termék ID</th>
                        <th className="p-3">Név</th>
                        <th className="p-3">Gyári Kód</th>
                        <th className="p-3">Kategória</th>
                        <th className="p-3">Gyártó</th>
                        <th className="p-3">Készlet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DBD8D5] bg-white">
                      {parsedProducts.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-[#3A5D6B] whitespace-nowrap">
                            {p.productId}
                          </td>
                          <td className="p-3 font-bold text-[#211E1B] whitespace-nowrap">
                            {p.name}
                          </td>
                          <td className="p-3 font-mono text-gray-700 whitespace-nowrap">
                            {p.factoryCode || '—'}
                          </td>
                          <td className="p-3 text-gray-700 whitespace-nowrap">{p.category || '—'}</td>
                          <td className="p-3 text-gray-700 whitespace-nowrap">{p.manufacturer || '—'}</td>
                          <td className="p-3 font-mono text-gray-700 whitespace-nowrap">
                            {p.stockQuantity ?? 0} db
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Commit Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCommitProducts}
                    disabled={isUploadingProducts}
                    className="w-full py-4 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 text-white font-extrabold text-lg sm:text-xl flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-lg"
                  >
                    {isUploadingProducts ? (
                      <>
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span>Mentés a Firebase felhőbe...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-6 h-6" />
                        <span>{parsedProducts.length} db Termék Mentése a Firebase Adatbázisba</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Product Upload Notification */}
            {productUploadResult && (
              <div
                className={`p-5 rounded-xl border flex items-center gap-3 text-base sm:text-lg font-bold ${
                  productUploadResult.error
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {productUploadResult.error ? (
                  <>
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                    <span>Hiba: {productUploadResult.error}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                    <span>
                      Sikeres mentés! {productUploadResult.count} termék elmentve a felhő adatbázisba.
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: COMPONENT CSV ================= */}
        {activeTab === 'components' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Explanatory green banner matching the styling requested */}
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl flex items-start gap-3">
              <Puzzle className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-950 leading-relaxed">
                <strong>Beépülő alkatrész CSV (Termék ID 1 ➔ Termék ID 2):</strong> Ez a tábla rendeli hozzá egy fő termékhez (pl. saruzófejhez) a benne található beépülő alkatrészeket (pl. kések, üllők, alkatrész kódok).
                <div className="mt-1 text-xs text-emerald-800">
                  • <strong>Termék ID 1</strong>: A fő termék azonosítója (pl. <code>40107.00.33</code>)
                  <br />
                  • <strong>Termék ID 2</strong>: A beépülő alkatrész azonosítója (pl. <code>ME.911270246</code>)
                  <br />
                  • <strong>Automatikus szűrés</strong>: Ha egy alkatrész többször is szerepel a listában, a rendszer automatikusan csak <strong>egyetlen alkalommal</strong> rögzíti és jeleníti meg az adatlapon!
                </div>
              </div>
            </div>

            {/* Upload Zone for Components */}
            <div className="border-3 border-dashed border-emerald-300 hover:border-emerald-600 rounded-2xl p-6 sm:p-8 bg-emerald-50/30 transition-colors text-center relative">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleComponentFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Puzzle className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 text-emerald-700" />
              <h3 className="text-lg sm:text-xl font-bold text-[#211E1B]">
                Húzza ide a Beépülő Alkatrész CSV fájlt, vagy kattintson a tallózáshoz
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mt-1 font-mono">
                Formátum: Termék ID 1, Termék ID 2
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <span className="px-5 py-2.5 bg-emerald-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-xs pointer-events-none">
                  Fájl kiválasztása a gépről
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadComponentSample();
                  }}
                  className="px-4 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold text-sm sm:text-base rounded-xl cursor-pointer transition-colors"
                >
                  Minta adatok betöltése
                </button>
              </div>

              {componentFileName && (
                <div className="mt-4 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-emerald-300 text-sm sm:text-base font-semibold text-emerald-900 shadow-2xs">
                  <FileText className="w-5 h-5 text-emerald-700" />
                  Kiválasztott fájl: {componentFileName}
                </div>
              )}
            </div>

            {/* Manual Paste Textarea for Components */}
            <div className="space-y-2">
              <label className="text-sm sm:text-base font-bold text-emerald-900 flex items-center justify-between">
                <span>Vagy másolja be az alkatrész CSV szöveget ide:</span>
                {parsedComponents.length > 0 && (
                  <span className="text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                    {parsedComponents.length} egyedi kapcsolat ({componentStats.duplicateCount} duplikáció kiszűrve)
                  </span>
                )}
              </label>
              <textarea
                rows={5}
                value={componentCsvText}
                onChange={(e) => {
                  setComponentCsvText(e.target.value);
                  processComponentData(e.target.value);
                }}
                placeholder={`Termék ID 1,Termék ID 2\n40107.00.33,ME.911270246\nME.911270246,40107.00.33\n40107.00.33,H_ME.911270246`}
                className="w-full font-mono text-xs sm:text-sm p-4 border-2 border-emerald-200 focus:border-emerald-600 rounded-xl text-[#211E1B] bg-white leading-relaxed"
              />
            </div>

            {/* Errors if any */}
            {componentParseErrors.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-base">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Figyelmeztetések az értelmezés során:
                </div>
                {componentParseErrors.map((err, i) => (
                  <div key={i} className="text-xs sm:text-sm text-amber-700 font-mono">
                    • {err}
                  </div>
                ))}
              </div>
            )}

            {/* Preview Table for Components */}
            {parsedComponents.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg sm:text-xl font-bold text-[#211E1B] flex items-center gap-2">
                    <Eye className="w-5 h-5 text-emerald-700" />
                    <span>Beépülő Alkatrészek Előnézete</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-bold rounded-lg border border-emerald-200">
                      Összesen: {componentStats.totalRows} sor
                    </span>
                    <span className="px-2.5 py-1 bg-teal-100 text-teal-900 font-bold rounded-lg border border-teal-200">
                      Egyedi: {componentStats.uniqueCount} kapcsolat
                    </span>
                    {componentStats.duplicateCount > 0 && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-200">
                        {componentStats.duplicateCount} ismétlődés kiszűrve
                      </span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto border-2 border-emerald-200 rounded-xl max-h-72">
                  <table className="w-full text-left text-sm sm:text-base">
                    <thead className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white text-xs sm:text-sm font-bold uppercase sticky top-0">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Fő Termék (Cikkszám 1)</th>
                        <th className="p-3">Beépülő Alkatrész (Cikkszám 2)</th>
                        <th className="p-3 text-center">Beépülő db</th>
                        <th className="p-3 text-center">Fő Termék Státusz</th>
                        <th className="p-3 text-center">Alkatrész Státusz</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100 bg-white">
                      {parsedComponents.map((c, idx) => {
                        const parentExists = existingProductIds.has(c.parentProductId.toLowerCase());
                        const compExists = existingProductIds.has(c.componentProductId.toLowerCase());

                        return (
                          <tr key={idx} className="hover:bg-emerald-50/50">
                            <td className="p-3 font-mono text-xs text-gray-500">{idx + 1}.</td>
                            <td className="p-3 font-mono font-bold text-[#1e6075] whitespace-nowrap">
                              {c.parentProductId}
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                              {c.componentProductId}
                            </td>
                            <td className="p-3 text-center font-mono font-black text-emerald-900">
                              <span className="bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full text-xs">
                                {c.quantity || 1} db
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {parentExists ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  Készletben
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                                  Új azonosító
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {compExists ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  Készletben
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                                  Új azonosító
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Commit Button for Components */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCommitComponents}
                    disabled={isUploadingComponents}
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:bg-gray-400 text-white font-extrabold text-lg sm:text-xl flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-lg"
                  >
                    {isUploadingComponents ? (
                      <>
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span>Alkatrészek mentése a felhőbe...</span>
                      </>
                    ) : (
                      <>
                        <Puzzle className="w-6 h-6 text-emerald-300" />
                        <span>
                          {parsedComponents.length} db Beépülő Alkatrész Kapcsolat Mentése a Firebase-be
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Component Upload Notification */}
            {componentUploadResult && (
              <div
                className={`p-5 rounded-xl border flex items-center gap-3 text-base sm:text-lg font-bold ${
                  componentUploadResult.error
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {componentUploadResult.error ? (
                  <>
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                    <span>Hiba: {componentUploadResult.error}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <span>
                        Sikeres mentés! {componentUploadResult.count} beépülő alkatrész-kapcsolat rögzítve a felhőben.
                      </span>
                      {componentUploadResult.duplicates > 0 && (
                        <p className="text-xs text-emerald-700 font-normal mt-0.5">
                          ({componentUploadResult.duplicates} ismétlődő kapcsolat automatikusan kiszűrve)
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: TERMÉK <-> MÉRŐDOBOZ CSV (Narancssárga és árnyalatai) ================= */}
        {activeTab === 'meterboxes' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Informational Help Box (Narancssárga) */}
            <div className="p-4 sm:p-5 bg-orange-50 border-2 border-orange-200 rounded-2xl flex items-start gap-3.5 text-sm sm:text-base text-orange-950">
              <Info className="w-6 h-6 text-orange-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong>Termék ↔ Mérődoboz CSV (Gyártandó termék ↔ Mérődoboz):</strong> Ez a tábla köti össze a gyártandó termékeket és a hozzájuk rendelt tesztelő mérődobozokat. A kapcsolatok kétirányúak (mindkét érintett termék adatlapján megjelennek).
                <div className="mt-1 text-xs text-orange-900 leading-relaxed">
                  • <strong>Termék ID 1</strong>: A gyártandó termék vagy mérődoboz kódja (pl. <code>9099000079_00</code> vagy <code>XINT000284</code>)
                  <br />
                  • <strong>Termék ID 2</strong>: A csatlakoztatott pár azonosítója (pl. <code>XINT000284</code> vagy <code>9099000079_00</code>)
                  <br />
                  • <strong>Automatikus duplikáció-szűrés</strong>: A rendszer a CSV feltöltésekor a duplikált sorokat kiszűri és automatikusan tükrözi a kétirányú elérhetőséget!
                </div>
              </div>
            </div>

            {/* Upload Zone for MeterBoxes (Orange) */}
            <div className="border-3 border-dashed border-orange-300 hover:border-orange-500 rounded-2xl p-6 sm:p-8 bg-orange-50/30 transition-colors text-center relative">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleMeterBoxFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Gauge className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 text-orange-600" />
              <h3 className="text-lg sm:text-xl font-bold text-[#211E1B]">
                Húzza ide a Termék ↔ Mérődoboz CSV fájlt, vagy kattintson a tallózáshoz
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mt-1 font-mono">
                Formátum: Termék ID 1, Termék ID 2
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <span className="px-5 py-2.5 bg-orange-600 text-white font-bold text-sm sm:text-base rounded-xl shadow-xs pointer-events-none">
                  Fájl kiválasztása a gépről
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadMeterBoxSample();
                  }}
                  className="px-4 py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-950 font-bold text-sm sm:text-base rounded-xl cursor-pointer transition-colors"
                >
                  Minta adatok betöltése
                </button>
              </div>

              {meterBoxFileName && (
                <div className="mt-4 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-orange-300 text-sm sm:text-base font-semibold text-orange-900 shadow-2xs">
                  <FileText className="w-5 h-5 text-orange-600" />
                  Kiválasztott fájl: {meterBoxFileName}
                </div>
              )}
            </div>

            {/* Manual Paste Textarea for MeterBoxes */}
            <div className="space-y-2">
              <label className="text-sm sm:text-base font-bold text-orange-950 flex items-center justify-between">
                <span>Vagy másolja be a Termék ↔ Mérődoboz CSV szöveget ide:</span>
                {parsedMeterBoxes.length > 0 && (
                  <span className="text-xs sm:text-sm font-semibold text-orange-900 bg-orange-100 px-3 py-1 rounded-full border border-orange-300">
                    {parsedMeterBoxes.length} egyedi kapcsolat ({meterBoxStats.duplicateCount} duplikáció kiszűrve)
                  </span>
                )}
              </label>
              <textarea
                rows={5}
                value={meterBoxCsvText}
                onChange={(e) => {
                  setMeterBoxCsvText(e.target.value);
                  processMeterBoxData(e.target.value);
                }}
                placeholder={`Termék ID 1,Termék ID 2\n9099000079_00,XINT000284\nXINT000284,9099000079_00\n9099000079_00,XINT0000K6`}
                className="w-full font-mono text-xs sm:text-sm p-4 border-2 border-orange-200 focus:border-orange-500 rounded-xl text-[#211E1B] bg-white leading-relaxed"
              />
            </div>

            {/* Errors if any */}
            {meterBoxParseErrors.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-base">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Figyelmeztetések az értelmezés során:
                </div>
                {meterBoxParseErrors.map((err, i) => (
                  <div key={i} className="text-xs sm:text-sm text-amber-700 font-mono">
                    • {err}
                  </div>
                ))}
              </div>
            )}

            {/* Preview Table for MeterBoxes */}
            {parsedMeterBoxes.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg sm:text-xl font-bold text-[#211E1B] flex items-center gap-2">
                    <Eye className="w-5 h-5 text-orange-600" />
                    <span>Termék ↔ Mérődoboz Kapcsolatok Előnézete</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="px-2.5 py-1 bg-orange-100 text-orange-950 font-bold rounded-lg border border-orange-200">
                      Összesen: {meterBoxStats.totalRows} sor
                    </span>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-950 font-bold rounded-lg border border-amber-200">
                      Egyedi: {meterBoxStats.uniqueCount} kapcsolat
                    </span>
                    {meterBoxStats.duplicateCount > 0 && (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-900 font-bold rounded-lg border border-amber-300">
                        {meterBoxStats.duplicateCount} ismétlődés kiszűrve
                      </span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto border-2 border-orange-200 rounded-xl max-h-72">
                  <table className="w-full text-left text-sm sm:text-base">
                    <thead className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white text-xs sm:text-sm font-bold uppercase sticky top-0">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Termék 1 (Cikkszám 1)</th>
                        <th className="p-3">Termék 2 (Mérődoboz / Cikkszám 2)</th>
                        <th className="p-3 text-center">Termék 1 Státusz</th>
                        <th className="p-3 text-center">Termék 2 Státusz</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100 bg-white">
                      {parsedMeterBoxes.map((rel, idx) => {
                        const exists1 = existingProductIds.has(rel.productId1.toLowerCase());
                        const exists2 = existingProductIds.has(rel.productId2.toLowerCase());

                        return (
                          <tr key={idx} className="hover:bg-orange-50/50 transition-colors">
                            <td className="p-3 font-mono text-xs text-gray-500 font-bold">
                              {idx + 1}.
                            </td>
                            <td className="p-3 font-mono font-bold text-orange-950">
                              {rel.productId1}
                            </td>
                            <td className="p-3 font-mono font-bold text-orange-900">
                              {rel.productId2}
                            </td>
                            <td className="p-3 text-center">
                              {exists1 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                  <Check className="w-3 h-3 text-emerald-700" /> Raktárban létezik
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                                  Új azonosító
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {exists2 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                  <Check className="w-3 h-3 text-emerald-700" /> Raktárban létezik
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                                  Új azonosító
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Commit Button for MeterBoxes */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleUploadMeterBoxes}
                    disabled={isUploadingMeterBoxes}
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:bg-gray-400 text-white font-extrabold text-lg sm:text-xl flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-lg"
                  >
                    {isUploadingMeterBoxes ? (
                      <>
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span>Kapcsolatok mentése a felhőbe...</span>
                      </>
                    ) : (
                      <>
                        <Gauge className="w-6 h-6 text-amber-200" />
                        <span>
                          {parsedMeterBoxes.length} db Termék ↔ Mérődoboz Kapcsolat Mentése a Firebase-be
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* MeterBox Upload Notification */}
            {meterBoxUploadResult && (
              <div
                className={`p-5 rounded-xl border flex items-center gap-3 text-base sm:text-lg font-bold ${
                  meterBoxUploadResult.error
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-orange-50 text-orange-950 border-orange-200'
                }`}
              >
                {meterBoxUploadResult.error ? (
                  <>
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                    <span>Hiba: {meterBoxUploadResult.error}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6 text-orange-600 shrink-0" />
                    <div>
                      <span>
                        Sikeres mentés! {meterBoxUploadResult.count} db Termék ↔ Mérődoboz kapcsolat rögzítve a felhőben.
                      </span>
                      {meterBoxUploadResult.duplicates > 0 && (
                        <p className="text-xs text-orange-800 font-normal mt-0.5">
                          ({meterBoxUploadResult.duplicates} ismétlődő sor automatikusan kiszűrve)
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: CONNECTOR <-> TERMINAL CSV (Narancssárga téma) ================= */}
        {activeTab === 'connector-terminals' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-orange-700 shrink-0 mt-0.5" />
              <div className="text-sm text-orange-950 leading-relaxed">
                <strong>Konnektor ↔ Saru kapcsolatok feltöltése:</strong> Adja meg a Konnektor és Saru elemek közötti illeszkedési kapcsolatokat. A kapcsolatok kétirányúak (mindkét termék adatlapján megjelennek).
                A fejlécben az <code>Termék ID 1</code> és <code>Termék ID 2</code> oszlopok használhatók (vagy <code>Konnektor ID</code>, <code>Saru ID</code>).
              </div>
            </div>

            {/* Upload Zone */}
            <div className="border-3 border-dashed border-orange-300 hover:border-orange-500 rounded-2xl p-6 sm:p-8 bg-orange-50/20 transition-colors text-center relative">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleConnectorTerminalFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 text-orange-600" />
              <h3 className="text-lg sm:text-xl font-bold text-orange-950">
                Húzza ide a Konnektor ↔ Saru CSV fájlt, vagy kattintson a tallózáshoz
              </h3>
              <p className="text-sm sm:text-base text-gray-500 mt-1">
                Oszlopok: Termék ID 1 (Konnektor), Termék ID 2 (Saru)
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <span className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-sm sm:text-base rounded-xl shadow-xs pointer-events-none">
                  Fájl kiválasztása
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadConnectorTerminalSample();
                  }}
                  className="px-4 py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-950 font-bold text-sm sm:text-base rounded-xl cursor-pointer"
                >
                  Minta kapcsolatok betöltése
                </button>
              </div>

              {connectorTerminalFileName && (
                <div className="mt-4 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-orange-300 text-sm sm:text-base font-semibold text-orange-800">
                  <FileText className="w-5 h-5 text-orange-600" />
                  Kiválasztott fájl: {connectorTerminalFileName}
                </div>
              )}
            </div>

            {/* Manual Paste Textarea */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                Vagy illessze be ide a CSV szöveget (vágólapról):
              </label>
              <textarea
                rows={4}
                value={connectorTerminalCsvText}
                onChange={(e) => {
                  setConnectorTerminalCsvText(e.target.value);
                  processConnectorTerminalData(e.target.value);
                }}
                placeholder="Termék ID 1,Termék ID 2&#10;2122120061,4030610910&#10;2122120060,4030610910"
                className="w-full font-mono text-sm p-4 rounded-xl border border-orange-200 focus:outline-orange-600 bg-orange-50/10"
              />
            </div>

            {/* Parse Errors */}
            {connectorTerminalParseErrors.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-sm text-amber-900">
                <div className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Figyelmeztetések a CSV feldolgozása közben:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  {connectorTerminalParseErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {connectorTerminalParseErrors.length > 5 && (
                    <li>...és további {connectorTerminalParseErrors.length - 5} figyelmeztetés</li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview Table */}
            {parsedConnectorTerminals.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <h3 className="text-lg font-extrabold text-orange-950 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-orange-600" />
                    <span>Konnektor ↔ Saru Kapcsolatok Előnézete</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="px-2.5 py-1 bg-orange-100 text-orange-950 font-bold rounded-lg border border-orange-200">
                      Összesen: {connectorTerminalStats.totalRows} sor
                    </span>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-950 font-bold rounded-lg border border-amber-200">
                      Egyedi: {connectorTerminalStats.uniqueCount} kapcsolat
                    </span>
                    {connectorTerminalStats.duplicateCount > 0 && (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-900 font-bold rounded-lg border border-amber-300">
                        {connectorTerminalStats.duplicateCount} ismétlődés kiszűrve
                      </span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto border-2 border-orange-200 rounded-xl max-h-72">
                  <table className="w-full text-left text-sm sm:text-base">
                    <thead className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white text-xs sm:text-sm font-bold uppercase sticky top-0">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Termék 1 (Konnektor / Saru Cikkszám 1)</th>
                        <th className="p-3">Termék 2 (Saru / Konnektor Cikkszám 2)</th>
                        <th className="p-3 text-center">Termék 1 Státusz</th>
                        <th className="p-3 text-center">Termék 2 Státusz</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100 bg-white">
                      {parsedConnectorTerminals.map((rel, idx) => {
                        const exists1 = existingProductIds.has(rel.productId1.toLowerCase());
                        const exists2 = existingProductIds.has(rel.productId2.toLowerCase());

                        return (
                          <tr key={idx} className="hover:bg-orange-50/50 transition-colors">
                            <td className="p-3 font-mono text-xs text-gray-500 font-bold">
                              {idx + 1}.
                            </td>
                            <td className="p-3 font-mono font-bold text-orange-950">
                              {rel.productId1}
                            </td>
                            <td className="p-3 font-mono font-bold text-orange-900">
                              {rel.productId2}
                            </td>
                            <td className="p-3 text-center">
                              {exists1 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Check className="w-3.5 h-3.5" />
                                  Katalógusban van
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  Új / Külső ID
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {exists2 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Check className="w-3.5 h-3.5" />
                                  Katalógusban van
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  Új / Külső ID
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Commit Button for ConnectorTerminals */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleUploadConnectorTerminals}
                    disabled={isUploadingConnectorTerminals}
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:bg-gray-400 text-white font-extrabold text-lg sm:text-xl flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-lg"
                  >
                    {isUploadingConnectorTerminals ? (
                      <>
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span>Kapcsolatok mentése a felhőbe...</span>
                      </>
                    ) : (
                      <>
                        <Plug className="w-6 h-6 text-amber-200" />
                        <span>
                          {parsedConnectorTerminals.length} db Konnektor ↔ Saru Kapcsolat Mentése a Firebase-be
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ConnectorTerminal Upload Notification */}
            {connectorTerminalUploadResult && (
              <div
                className={`p-5 rounded-xl border flex items-center gap-3 text-base sm:text-lg font-bold ${
                  connectorTerminalUploadResult.error
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-orange-50 text-orange-950 border-orange-200'
                }`}
              >
                {connectorTerminalUploadResult.error ? (
                  <>
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                    <span>Hiba: {connectorTerminalUploadResult.error}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6 text-orange-600 shrink-0" />
                    <div>
                      <span>
                        Sikeres mentés! {connectorTerminalUploadResult.count} db Konnektor ↔ Saru kapcsolat rögzítve a felhőben.
                      </span>
                      {connectorTerminalUploadResult.duplicates > 0 && (
                        <p className="text-xs text-orange-800 font-normal mt-0.5">
                          ({connectorTerminalUploadResult.duplicates} ismétlődő sor automatikusan kiszűrve)
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: ELLENPÁROK (MATING PAIRS) CSV ================= */}
        {activeTab === 'mating-pairs' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-800 shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-950 leading-relaxed">
                <strong>Ellenpárok adatbázis feltöltése (Konnektor ↔ Konnektor, Saru ↔ Saru):</strong> Itt töltheti fel az egymással illeszkedő ellendarabokat (pl. apa-anya házak, dugó-aljzat saruk). A kapcsolat kétirányú (szimmetrikus), így a feltöltött párok mindkét termék adatlapján azonnal megjelennek a citromsárga Ellenpárok szekcióban.
              </div>
            </div>

            {/* Upload Zone */}
            <div className="border-3 border-dashed border-yellow-400 hover:border-yellow-600 rounded-2xl p-6 sm:p-8 bg-yellow-50/40 transition-colors text-center relative">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleMatingPairFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Húzza ide a CSV fájlt vagy kattintson a tallózáshoz"
              />
              <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center border-2 border-yellow-300 shadow-2xs">
                  <GitCompare className="w-8 h-8 text-yellow-700" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-extrabold text-yellow-950">
                    Húzza ide az Ellenpárok CSV fájlt, vagy <span className="text-yellow-800 underline">tallózzon a gépről</span>
                  </p>
                  <p className="text-xs sm:text-sm text-yellow-900/80 mt-1">
                    Formátum: .csv (Fejléc: <code className="bg-yellow-100 px-1 py-0.5 rounded text-yellow-950 font-bold">Termék ID 1, Termék ID 2</code>)
                  </p>
                </div>
                {matingPairFileName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-yellow-200 text-yellow-950 border border-yellow-400">
                    <FileText className="w-3.5 h-3.5 text-yellow-800" />
                    {matingPairFileName}
                  </span>
                )}
              </div>
            </div>

            {/* Sample load option & Text Paste */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleLoadMatingPairSample}
                className="text-xs sm:text-sm text-yellow-800 hover:text-yellow-950 font-extrabold flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-yellow-700" />
                <span>Minta Ellenpár CSV betöltése teszteléshez</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadMatingPairTemplate}
                className="text-xs sm:text-sm text-yellow-800 hover:text-yellow-950 font-extrabold flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <Download className="w-4 h-4 text-yellow-700" />
                <span>Üres sablon letöltése (.csv)</span>
              </button>
            </div>

            {/* Direct CSV Text Area (Alternative to file upload) */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-extrabold text-yellow-950 flex items-center justify-between">
                <span>Vagy másolja be közvetlenül a CSV tartalmát ide:</span>
                {parsedMatingPairs.length > 0 && (
                  <span className="text-xs text-yellow-900 font-bold">
                    Felismerve: {parsedMatingPairs.length} érvényes kapcsolat
                  </span>
                )}
              </label>
              <textarea
                value={matingPairCsvText}
                onChange={(e) => {
                  setMatingPairCsvText(e.target.value);
                  if (e.target.value.trim()) {
                    processMatingPairData(e.target.value);
                  } else {
                    setParsedMatingPairs([]);
                    setMatingPairParseErrors([]);
                  }
                }}
                rows={4}
                placeholder="Termék ID 1,Termék ID 2&#10;2122120061,2122120060&#10;4030610910,4030610910_DUG"
                className="w-full font-mono text-xs sm:text-sm p-3 rounded-xl border-2 border-yellow-300 focus:border-yellow-600 bg-[#FDFCFB] text-yellow-950 focus:outline-none"
              />
            </div>

            {/* Parse Errors / Warnings */}
            {matingPairParseErrors.length > 0 && (
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Figyelmeztetések a CSV feldolgozása közben:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  {matingPairParseErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {matingPairParseErrors.length > 5 && (
                    <li>...és további {matingPairParseErrors.length - 5} figyelmeztetés</li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview Table */}
            {parsedMatingPairs.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <h3 className="text-lg font-extrabold text-yellow-950 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-yellow-700" />
                    <span>Ellenpár Kapcsolatok Előnézete</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="px-2.5 py-1 bg-yellow-100 text-yellow-950 font-bold rounded-lg border border-yellow-300">
                      Összesen: {matingPairStats.totalRows} sor
                    </span>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-950 font-bold rounded-lg border border-amber-300">
                      Egyedi: {matingPairStats.uniqueCount} kapcsolat
                    </span>
                    {matingPairStats.duplicateCount > 0 && (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-900 font-bold rounded-lg border border-amber-300">
                        {matingPairStats.duplicateCount} ismétlődés kiszűrve
                      </span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto border-2 border-yellow-300 rounded-xl max-h-72">
                  <table className="w-full text-left text-sm sm:text-base">
                    <thead className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 text-yellow-950 text-xs sm:text-sm font-extrabold uppercase sticky top-0 border-b border-yellow-500">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Termék 1 (Konnektor / Saru Cikkszám 1)</th>
                        <th className="p-3">Termék 2 (Ellenpár Cikkszám 2)</th>
                        <th className="p-3 text-center">Termék 1 Státusz</th>
                        <th className="p-3 text-center">Termék 2 Státusz</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-yellow-100 bg-white">
                      {parsedMatingPairs.map((rel, idx) => {
                        const exists1 = existingProductIds.has(rel.productId1.toLowerCase());
                        const exists2 = existingProductIds.has(rel.productId2.toLowerCase());

                        return (
                          <tr key={idx} className="hover:bg-yellow-50/50 transition-colors">
                            <td className="p-3 font-mono text-xs text-gray-500 font-bold">
                              {idx + 1}.
                            </td>
                            <td className="p-3 font-mono font-bold text-yellow-950">
                              {rel.productId1}
                            </td>
                            <td className="p-3 font-mono font-bold text-yellow-900">
                              {rel.productId2}
                            </td>
                            <td className="p-3 text-center">
                              {exists1 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Check className="w-3.5 h-3.5" />
                                  Katalógusban van
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  Új / Külső ID
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {exists2 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Check className="w-3.5 h-3.5" />
                                  Katalógusban van
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  Új / Külső ID
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Commit Button for MatingPairs */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleUploadMatingPairs}
                    disabled={isUploadingMatingPairs}
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 hover:from-yellow-500 hover:to-amber-600 disabled:bg-gray-400 text-yellow-950 font-extrabold text-lg sm:text-xl flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-lg border border-yellow-600"
                  >
                    {isUploadingMatingPairs ? (
                      <>
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span>Ellenpárok mentése a felhőbe...</span>
                      </>
                    ) : (
                      <>
                        <GitCompare className="w-6 h-6 text-yellow-900" />
                        <span>
                          {parsedMatingPairs.length} db Ellenpár Kapcsolat Mentése a Firebase-be
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* MatingPair Upload Notification */}
            {matingPairUploadResult && (
              <div
                className={`p-5 rounded-xl border-2 flex items-center gap-3 text-base sm:text-lg font-bold ${
                  matingPairUploadResult.error
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-yellow-50 text-yellow-950 border-yellow-400'
                }`}
              >
                {matingPairUploadResult.error ? (
                  <>
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                    <span>Hiba: {matingPairUploadResult.error}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6 text-yellow-700 shrink-0" />
                    <div>
                      <span>
                        Sikeres mentés! {matingPairUploadResult.count} db Ellenpár kapcsolat rögzítve a felhőben.
                      </span>
                      {matingPairUploadResult.duplicates > 0 && (
                        <p className="text-xs text-yellow-800 font-normal mt-0.5">
                          ({matingPairUploadResult.duplicates} ismétlődő sor automatikusan kiszűrve)
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 6: NOTESZ CSV (#FA4646 téma) ================= */}
        {activeTab === 'notes' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Tab Info Banner */}
            <div className="p-4 sm:p-5 bg-red-50 border-2 border-[#FA4646]/40 rounded-2xl flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#FA4646] text-white flex items-center justify-center shrink-0 shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="text-xs sm:text-sm text-gray-800 space-y-1">
                <p>
                  <strong>Notesz adatbázis feltöltése (#FA4646):</strong> Itt tölthet fel műszaki megjegyzéseket, pontozott rajzokat, dokumentum linkeket (pl. PDF), címkéket és csatolt fényképeket a termékekhez.
                </p>
                <p className="text-gray-600 text-xs">
                  • Oszlopok: <code className="bg-white border border-red-200 px-1 py-0.5 rounded text-[#FA4646] font-bold">Termék ID, Név, Leírás, Dátum, URL, Név választás, Kép linkek</code><br />
                  • A feltöltött notesz bejegyzések azonnal megjelennek a termék adatlapján a piros színű Notesz szekcióban. A csatolt fényképek és dokumentum linkek automatikusan előnézettel jelennek meg.
                </p>
              </div>
            </div>

            {/* Upload Zone */}
            <div className="border-3 border-dashed border-[#FA4646]/50 hover:border-[#FA4646] rounded-2xl p-6 sm:p-8 bg-red-50/40 transition-colors text-center relative">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleNotesFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Húzza ide a Notesz CSV fájlt vagy kattintson a tallózáshoz"
              />
              <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center border-2 border-[#FA4646]/40 shadow-2xs">
                  <BookOpen className="w-8 h-8 text-[#FA4646]" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-extrabold text-gray-900">
                    Húzza ide a Notesz CSV fájlt, vagy <span className="text-[#FA4646] underline">tallózzon a gépről</span>
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Formátum: .csv (Fejléc: <code className="bg-red-100 px-1.5 py-0.5 rounded text-[#FA4646] font-bold">Termék ID, Név, Leírás, Dátum, URL, Név választás, Kép linkek</code>)
                  </p>
                </div>
                {notesFileName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-red-200 text-red-950 border border-red-300">
                    <FileText className="w-3.5 h-3.5 text-[#FA4646]" />
                    {notesFileName}
                  </span>
                )}
              </div>
            </div>

            {/* Sample load option & Template download */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleLoadNotesSample}
                className="text-xs sm:text-sm text-[#FA4646] hover:text-red-700 font-extrabold flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#FA4646]" />
                <span>Minta Notesz CSV betöltése teszteléshez</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadNotesTemplate}
                className="text-xs sm:text-sm text-[#FA4646] hover:text-red-700 font-extrabold flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#FA4646]" />
                <span>Üres Notesz sablon letöltése (.csv)</span>
              </button>
            </div>

            {/* Direct CSV Text Area */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center justify-between">
                <span>Vagy másolja be közvetlenül a Notesz CSV tartalmát ide:</span>
                {parsedNotes.length > 0 && (
                  <span className="text-xs text-[#FA4646] font-bold">
                    Felismerve: {parsedNotes.length} érvényes notesz bejegyzés
                  </span>
                )}
              </label>
              <textarea
                value={notesCsvText}
                onChange={(e) => {
                  setNotesCsvText(e.target.value);
                  processNotesData(e.target.value);
                }}
                rows={4}
                placeholder="Termék ID,Név,Leírás,Dátum,URL,Név választás,Kép linkek&#10;2122120061,Pontozott Rajz,Kábelbekötési rajz,2025-06-19,https://example.com/rajz.pdf,Pontozott Rajz,https://example.com/foto.jpg"
                className="w-full font-mono text-xs sm:text-sm p-3 rounded-xl border-2 border-red-200 focus:border-[#FA4646] bg-[#FDFCFB] text-gray-900 focus:outline-none"
              />
            </div>

            {/* Parse Errors / Warnings */}
            {notesParseErrors.length > 0 && (
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Figyelmeztetések a CSV feldolgozása közben:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  {notesParseErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {notesParseErrors.length > 5 && (
                    <li>...és további {notesParseErrors.length - 5} figyelmeztetés</li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview Table */}
            {parsedNotes.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-[#FA4646]" />
                    <span>Notesz Bejegyzések Előnézete</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="px-2.5 py-1 bg-red-100 text-red-950 font-bold rounded-lg border border-red-200">
                      Összesen: {parsedNotes.length} bejegyzés
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto border-2 border-red-200 rounded-xl max-h-80">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gradient-to-r from-[#FA4646] to-[#E03535] text-white text-xs sm:text-sm font-extrabold uppercase sticky top-0">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Termék ID</th>
                        <th className="p-3">Megnevezés / Tárgy</th>
                        <th className="p-3">Címke</th>
                        <th className="p-3">Dátum</th>
                        <th className="p-3">Leírás</th>
                        <th className="p-3">Csatolt Link</th>
                        <th className="p-3">Képek</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {parsedNotes.map((note, idx) => {
                        const exists = existingProductIds.has((note.productId || '').toLowerCase());
                        const hasImages = note.images && note.images.length > 0;

                        return (
                          <tr key={idx} className="hover:bg-red-50/40 transition-colors">
                            <td className="p-3 font-mono text-xs text-gray-500 font-bold">
                              {idx + 1}.
                            </td>
                            <td className="p-3 font-mono font-bold text-gray-900">
                              <div className="flex items-center gap-2">
                                <span>{note.productId}</span>
                                {exists ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200" title="Katalógusban létező termék">
                                    <Check className="w-3 h-3" />
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded" title="Új / Külső Termék ID">
                                    <HelpCircle className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-extrabold text-gray-900">
                              {note.title}
                            </td>
                            <td className="p-3">
                              {note.nameChoice && (
                                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-[#FA4646] border border-red-200">
                                  {note.nameChoice}
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-xs text-gray-600">
                              {note.date}
                            </td>
                            <td className="p-3 text-xs text-gray-700 max-w-xs truncate" title={note.description}>
                              {note.description || '-'}
                            </td>
                            <td className="p-3 text-xs">
                              {note.url ? (
                                <a
                                  href={note.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#FA4646] hover:underline font-mono truncate max-w-[120px] block"
                                  title={note.url}
                                >
                                  {note.url}
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-3 text-xs">
                              {hasImages ? (
                                <span className="inline-flex items-center gap-1 font-bold text-[#FA4646] bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                  {note.images!.length} kép
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Commit Button for Notes */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleUploadNotes}
                    disabled={isUploadingNotes}
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#FA4646] to-[#E03535] hover:from-[#E03535] hover:to-[#C52626] disabled:bg-gray-400 text-white font-extrabold text-lg sm:text-xl flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-lg border border-red-600"
                  >
                    {isUploadingNotes ? (
                      <>
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span>Notesz bejegyzések mentése a felhőbe...</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-6 h-6 text-red-100" />
                        <span>
                          {parsedNotes.length} db Notesz Bejegyzés Mentése a Firebase-be
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Notes Upload Notification */}
            {notesUploadResult && (
              <div
                className={`p-5 rounded-xl border-2 flex items-center gap-3 text-base sm:text-lg font-bold ${
                  notesUploadResult.error
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-emerald-50 text-emerald-950 border-emerald-400'
                }`}
              >
                {notesUploadResult.error ? (
                  <>
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                    <span>Hiba: {notesUploadResult.error}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6 text-emerald-700 shrink-0" />
                    <div>
                      <span>
                        Sikeres mentés! {notesUploadResult.count} db Notesz bejegyzés rögzítve a felhőben.
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 7: RAKTÁR POZÍCIÓK CSV ================= */}
        {activeTab === 'warehouse-positions' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Tab Info Banner */}
            <div className="p-4 sm:p-5 bg-blue-50 border-2 border-blue-300 rounded-2xl flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Box className="w-5 h-5" />
              </div>
              <div className="text-xs sm:text-sm text-gray-800 space-y-1">
                <p>
                  <strong>Raktári Pozíciók feltöltése és bővítése (Pozíció ID):</strong> Itt töltheti fel a raktári helyek és tárolók listáját (pl. A1, B3, DOBOZ 1, POLC-01, TMK Részleg).
                </p>
                <p className="text-gray-600 text-xs">
                  • Oszlop: <code className="bg-white border border-blue-200 px-1 py-0.5 rounded text-blue-900 font-bold">Pozíció ID</code><br />
                  • A feltöltött pozíciók automatikusan megjelennek a raktári nézetben, és választhatóvá válnak készletmozgások rögzítésekor.
                </p>
              </div>
            </div>

            {/* Upload Zone */}
            <div className="border-3 border-dashed border-blue-300 hover:border-blue-600 rounded-2xl p-6 sm:p-8 bg-blue-50/40 transition-colors text-center relative">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handlePositionsFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Húzza ide a Raktár Pozíciók CSV fájlt vagy kattintson a tallózáshoz"
              />
              <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-300 shadow-2xs">
                  <Box className="w-8 h-8 text-blue-700" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-extrabold text-gray-900">
                    Húzza ide a Raktár Pozíciók CSV fájlt, vagy <span className="text-blue-700 underline">tallózzon a gépről</span>
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Formátum: .csv (Fejléc: <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900 font-bold">Pozíció ID</code>)
                  </p>
                </div>
                {positionsFileName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-200 text-blue-950 border border-blue-300">
                    <FileText className="w-3.5 h-3.5 text-blue-700" />
                    {positionsFileName}
                  </span>
                )}
              </div>
            </div>

            {/* Sample load option & Template download */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleLoadPositionsSample}
                className="text-xs sm:text-sm text-blue-700 hover:text-blue-900 font-extrabold flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Minta Pozíciók CSV betöltése teszteléshez</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPositionsTemplate}
                className="text-xs sm:text-sm text-blue-700 hover:text-blue-900 font-extrabold flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Üres Pozíciók sablon letöltése (.csv)</span>
              </button>
            </div>

            {/* Direct CSV Text Area */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center justify-between">
                <span>Vagy másolja be közvetlenül a Raktár Pozíciók CSV tartalmát ide:</span>
                {parsedPositions.length > 0 && (
                  <span className="text-xs text-blue-700 font-bold">
                    Felismerve: {parsedPositions.length} érvényes raktár pozíció
                  </span>
                )}
              </label>
              <textarea
                value={positionsCsvText}
                onChange={(e) => {
                  setPositionsCsvText(e.target.value);
                  processPositionsData(e.target.value);
                }}
                rows={4}
                placeholder="Pozíció ID&#10;A1&#10;A2&#10;DOBOZ 1&#10;POLC-01"
                className="w-full font-mono text-xs sm:text-sm p-3 rounded-xl border-2 border-blue-200 focus:border-blue-600 bg-[#FDFCFB] text-gray-900 focus:outline-none"
              />
            </div>

            {/* Parsed Preview Table */}
            {parsedPositions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span>Beolvasott Raktár Pozíciók Előnézete ({parsedPositions.length} db)</span>
                  </h3>
                </div>

                <div className="max-h-64 overflow-y-auto border border-blue-200 rounded-xl bg-white">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-blue-50/80 sticky top-0 border-b border-blue-200 text-blue-950 font-black">
                      <tr>
                        <th className="p-3 w-16 text-center">#</th>
                        <th className="p-3">Pozíció ID / Név</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100 font-mono font-bold text-slate-800">
                      {parsedPositions.slice(0, 100).map((pos, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/50">
                          <td className="p-2.5 text-center text-slate-400 font-normal">{idx + 1}</td>
                          <td className="p-2.5 text-blue-950">{pos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Commit Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleUploadPositions}
                    disabled={isUploadingPositions}
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 disabled:bg-gray-400 text-white font-extrabold text-lg sm:text-xl flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-lg border border-blue-600"
                  >
                    {isUploadingPositions ? (
                      <>
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span>Pozíciók mentése a felhőbe...</span>
                      </>
                    ) : (
                      <>
                        <Box className="w-6 h-6 text-sky-200" />
                        <span>
                          {parsedPositions.length} db Raktár Pozíció Mentése a Firebase-be
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Positions Upload Result */}
            {positionsUploadResult && (
              <div
                className={`p-5 rounded-xl border-2 flex items-center gap-3 text-base sm:text-lg font-bold ${
                  positionsUploadResult.error
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-emerald-50 text-emerald-950 border-emerald-400'
                }`}
              >
                {positionsUploadResult.error ? (
                  <>
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                    <span>Hiba: {positionsUploadResult.error}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6 text-emerald-700 shrink-0" />
                    <div>
                      <span>
                        Sikeres mentés! {positionsUploadResult.count} db Raktár Pozíció rögzítve a felhőben.
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 8: KÉSZLET TRANZAKCIÓK CSV ================= */}
        {activeTab === 'warehouse-transactions' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Tab Info Banner */}
            <div className="p-4 sm:p-5 bg-sky-50 border-2 border-sky-300 rounded-2xl flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-sky-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-xs sm:text-sm text-gray-800 space-y-1">
                <p>
                  <strong>Készletmozgások / Tranzakciók feltöltése:</strong> Itt rögzíthet készletmozgásokat pozíciók és termékek (cikkszám) között.
                </p>
                <p className="text-gray-600 text-xs">
                  • Oszlopok: <code className="bg-white border border-sky-200 px-1 py-0.5 rounded text-sky-900 font-bold">Pozíció ID, Termék ID, Mennyiség, Dátum, Megjegyzés</code><br />
                  • A Mennyiség lehet pozitív (bevételezés) vagy negatív (kiadás). Ha 0, a pozíció megmarad 0 darabszámmal.<br />
                  • A termékek készlete és lokációja automatikusan összegződik a terméklistában és az adatlapokon!
                </p>
              </div>
            </div>

            {/* Upload Zone */}
            <div className="border-3 border-dashed border-sky-300 hover:border-sky-600 rounded-2xl p-6 sm:p-8 bg-sky-50/40 transition-colors text-center relative">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleTransactionsFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Húzza ide a Készlet Tranzakciók CSV fájlt vagy kattintson a tallózáshoz"
              />
              <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center border-2 border-sky-300 shadow-2xs">
                  <Layers className="w-8 h-8 text-sky-700" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-extrabold text-gray-900">
                    Húzza ide a Készlet Tranzakciók CSV fájlt, vagy <span className="text-sky-700 underline">tallózzon a gépről</span>
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Formátum: .csv (Fejléc: <code className="bg-sky-100 px-1.5 py-0.5 rounded text-sky-900 font-bold">Pozíció ID, Termék ID, Mennyiség, Dátum</code>)
                  </p>
                </div>
                {transactionsFileName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-sky-200 text-sky-950 border border-sky-300">
                    <FileText className="w-3.5 h-3.5 text-sky-700" />
                    {transactionsFileName}
                  </span>
                )}
              </div>
            </div>

            {/* Sample load option & Template download */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleLoadTransactionsSample}
                className="text-xs sm:text-sm text-sky-700 hover:text-sky-900 font-extrabold flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>Minta Készletmozgások CSV betöltése teszteléshez</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTransactionsTemplate}
                className="text-xs sm:text-sm text-sky-700 hover:text-sky-900 font-extrabold flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <Download className="w-4 h-4 text-sky-600" />
                <span>Üres Készletmozgás sablon letöltése (.csv)</span>
              </button>
            </div>

            {/* Direct CSV Text Area */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center justify-between">
                <span>Vagy másolja be közvetlenül a Készlet Tranzakciók CSV tartalmát ide:</span>
                {parsedTransactions.length > 0 && (
                  <span className="text-xs text-sky-700 font-bold">
                    Felismerve: {parsedTransactions.length} érvényes készletmozgási tétel
                  </span>
                )}
              </label>
              <textarea
                value={transactionsCsvText}
                onChange={(e) => {
                  setTransactionsCsvText(e.target.value);
                  processTransactionsData(e.target.value);
                }}
                rows={4}
                placeholder="Pozíció ID,Termék ID,Mennyiség,Dátum,Megjegyzés&#10;A1,2182120013,10,2024. 03. 15.,Bevételezés&#10;A1,2182120013,-2,2024. 03. 20.,Termelésre kiadva"
                className="w-full font-mono text-xs sm:text-sm p-3 rounded-xl border-2 border-sky-200 focus:border-sky-600 bg-[#FDFCFB] text-gray-900 focus:outline-none"
              />
            </div>

            {/* Parsed Preview Table */}
            {parsedTransactions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-sky-600" />
                    <span>Beolvasott Tranzakciók Előnézete ({parsedTransactions.length} tétel)</span>
                  </h3>
                </div>

                <div className="max-h-64 overflow-y-auto border border-sky-200 rounded-xl bg-white">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-sky-50/80 sticky top-0 border-b border-sky-200 text-sky-950 font-black">
                      <tr>
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3">Pozíció ID</th>
                        <th className="p-3">Termék ID</th>
                        <th className="p-3 text-right">Mennyiség</th>
                        <th className="p-3">Dátum</th>
                        <th className="p-3">Megjegyzés</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100 font-mono font-bold text-slate-800">
                      {parsedTransactions.slice(0, 100).map((tx, idx) => (
                        <tr key={idx} className="hover:bg-sky-50/50">
                          <td className="p-2.5 text-center text-slate-400 font-normal">{idx + 1}</td>
                          <td className="p-2.5 text-blue-900 font-black">{tx.positionId}</td>
                          <td className="p-2.5 text-slate-900">{tx.productId}</td>
                          <td className="p-2.5 text-right whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md inline-block ${
                                tx.quantity > 0
                                  ? 'text-emerald-800 bg-emerald-50 border border-emerald-300'
                                  : 'text-red-800 bg-red-50 border border-red-300'
                              }`}
                            >
                              {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} db
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600">{tx.date}</td>
                          <td className="p-2.5 text-slate-500 font-sans font-normal truncate max-w-[150px]">
                            {tx.note || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Commit Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleUploadTransactions}
                    disabled={isUploadingTransactions}
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 disabled:bg-gray-400 text-white font-extrabold text-lg sm:text-xl flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-lg border border-sky-600"
                  >
                    {isUploadingTransactions ? (
                      <>
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span>Készletmozgások mentése a felhőbe...</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-6 h-6 text-sky-100" />
                        <span>
                          {parsedTransactions.length} db Készletmozgás Mentése a Firebase-be
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Transactions Upload Result */}
            {transactionsUploadResult && (
              <div
                className={`p-5 rounded-xl border-2 flex items-center gap-3 text-base sm:text-lg font-bold ${
                  transactionsUploadResult.error
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-emerald-50 text-emerald-950 border-emerald-400'
                }`}
              >
                {transactionsUploadResult.error ? (
                  <>
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                    <span>Hiba: {transactionsUploadResult.error}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6 text-emerald-700 shrink-0" />
                    <div>
                      <span>
                        Sikeres mentés! {transactionsUploadResult.count} db Készletmozgási tétel rögzítve a felhőben.
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 9: KARBANTARTÁS CSV (Barna szín) ================= */}
        {activeTab === 'maintenances' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-[#7B4B29] shrink-0 mt-0.5" />
              <div className="text-sm text-stone-800 leading-relaxed">
                <strong>Termék Karbantartások & Alkatrész Cserék CSV Feltöltése:</strong> Itt töltheti fel a gépek és eszközök karbantartási naplóját és szervizelési adatait (Termék ID, Status, Leírás, Change Item, Date). Az adatlapon a kicserélt alkatrészre kattintva a rendszer automatikusan megnyitja annak adatlapját.
              </div>
            </div>

            {/* Upload Zone */}
            <div className="border-3 border-dashed border-amber-300 hover:border-[#7B4B29] rounded-2xl p-6 sm:p-8 bg-amber-50/20 transition-colors text-center relative">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleMaintenanceFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center pointer-events-none">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-[#7B4B29] mb-3 border border-amber-300">
                  <Wrench className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-1">
                  {maintenanceFileName || 'Húzza ide a Karbantartás CSV fájlt vagy tallózzon'}
                </h3>
                <p className="text-sm text-stone-600 mb-3">
                  Támogatott formátum: .csv (UTF-8 kódolással)
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
                  <button
                    type="button"
                    onClick={handleLoadMaintenanceSample}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs transition-colors cursor-pointer border border-amber-300"
                  >
                    Minta adatok betöltése
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadMaintenanceTemplate}
                    className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-800 font-bold text-xs transition-colors cursor-pointer border border-stone-300"
                  >
                    Üres sablon letöltése
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAllDbMaintenances}
                    disabled={isDeletingAllDbMaintenances}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs transition-colors cursor-pointer border border-rose-300 flex items-center gap-1.5 disabled:opacity-50"
                    title="Összes karbantartási adat végleges törlése az adatbázisból"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Összes karbantartás törlése</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Parse Errors */}
            {maintenanceParseErrors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Beolvasási figyelmeztetések / hibák ({maintenanceParseErrors.length})</span>
                </div>
                <ul className="text-xs text-red-700 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                  {maintenanceParseErrors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {maintenanceParseErrors.length > 10 && (
                    <li>... és további {maintenanceParseErrors.length - 10} hiba</li>
                  )}
                </ul>
              </div>
            )}

            {/* CSV Paste Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center justify-between">
                <span>Vagy másolja be a CSV szöveget:</span>
                {parsedMaintenances.length > 0 && (
                  <span className="text-xs text-[#7B4B29] font-bold">
                    Felismerve: {parsedMaintenances.length} érvényes karbantartási tétel
                  </span>
                )}
              </label>
              <textarea
                value={maintenanceCsvText}
                onChange={(e) => {
                  setMaintenanceCsvText(e.target.value);
                  processMaintenanceData(e.target.value);
                }}
                rows={4}
                placeholder="Termék ID,Status,Leírás,Change Item,Date&#10;40107.00.33,Pass,100.000 ciklus utáni esedékes felülvizsgálat. Vezetősín tisztítás és kenés rendben.,XINT000284,2026-02-18&#10;40107.00.33,Repair,Mikrorepedés észlelése az üllő peremén. Elem cserélve, magasság újra kalibrálva.,9099000079_00,2025-11-04&#10;40108.12.01,Fail,Megvezető kopás miatti szorulás, szán hiba.,XINT0000K6,2026-01-22"
                className="w-full font-mono text-xs sm:text-sm p-3 rounded-xl border-2 border-amber-300 focus:border-[#7B4B29] bg-[#FDFCFB] text-gray-900 focus:outline-none"
              />
            </div>

            {/* Parsed Preview Table */}
            {parsedMaintenances.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#7B4B29]" />
                    <span>Beolvasott Karbantartások Előnézete ({parsedMaintenances.length} tétel)</span>
                  </h3>
                </div>

                <div className="max-h-64 overflow-y-auto border border-amber-300 rounded-xl bg-white">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-amber-50/80 sticky top-0 border-b-2 border-amber-200 text-[#5C381E] font-black uppercase tracking-wider text-xs">
                      <tr>
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3">Termék ID</th>
                        <th className="p-3">Státusz</th>
                        <th className="p-3">Leírás</th>
                        <th className="p-3">Alkatrész csere</th>
                        <th className="p-3">Dátum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 text-slate-800 font-medium">
                      {parsedMaintenances.slice(0, 100).map((m, idx) => {
                        const s = (m.status || 'Pass').trim().toLowerCase();
                        return (
                          <tr key={idx} className="hover:bg-amber-50/40">
                            <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-mono font-bold text-[#5C381E] whitespace-nowrap">{m.productId}</td>
                            <td className="p-2.5 whitespace-nowrap">
                              {s === 'pass' || s === 'megfelelt' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wide bg-emerald-50 text-emerald-600 border border-emerald-500">
                                  Pass
                                </span>
                              ) : s === 'repair' || s === 'javítás' || s === 'javitas' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wide bg-stone-900 text-yellow-300 border border-yellow-400">
                                  Repair
                                </span>
                              ) : s === 'fail' || s === 'nem felelt meg' || s === 'hiba' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wide bg-red-50 text-red-600 border border-red-500">
                                  Fail
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-stone-100 text-stone-700 border border-stone-300">
                                  {m.status}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-slate-700 max-w-sm">
                              {m.description ? (
                                <span className="line-clamp-2">{m.description}</span>
                              ) : (
                                <span className="text-slate-400 italic">—</span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-amber-900 whitespace-nowrap">
                              {m.changeItem ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 border border-amber-300 inline-block font-mono font-bold text-xs">
                                  {m.changeItem}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">—</span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-slate-700 whitespace-nowrap">{m.date}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Upload Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleUploadMaintenances}
                    disabled={isUploadingMaintenances}
                    className="flex items-center gap-3 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#5C381E] via-[#7B4B29] to-[#4A2810] hover:from-[#4A2810] hover:to-[#331C0B] text-white font-extrabold text-base transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isUploadingMaintenances ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Mentés a felhőbe...</span>
                      </>
                    ) : (
                      <>
                        <Wrench className="w-6 h-6 text-amber-200" />
                        <span>
                          {parsedMaintenances.length} db Karbantartás Mentése a Firebase-be
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Maintenance Upload Result */}
            {maintenanceUploadResult && (
              <div
                className={`p-5 rounded-xl border-2 flex items-center gap-3 text-base sm:text-lg font-bold ${
                  maintenanceUploadResult.error
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-emerald-50 text-emerald-950 border-emerald-400'
                }`}
              >
                {maintenanceUploadResult.error ? (
                  <>
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                    <span>Hiba: {maintenanceUploadResult.error}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6 text-emerald-700 shrink-0" />
                    <div>
                      <span>
                        Sikeres mentés! {maintenanceUploadResult.count} db Karbantartási bejegyzés rögzítve a felhőben.
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Future Extensibility Note (Mentioned by user: "lesz még több is de a logiga hasonló lesz") */}
        <div className="pt-4 border-t border-[#DBD8D5] flex items-center justify-between text-xs sm:text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#79B6B8]" />
            <span>
              Bővíthető adatstruktúra: a jövőbeli további CSV típusok (pl. szerszámok, kábelkapcsolatok) azonos logikával fognak csatlakozni.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
