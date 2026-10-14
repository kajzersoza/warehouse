import React, { useState, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Calendar,
  X,
  Eye,
  Upload,
  Check,
  Tag,
  UploadCloud,
  Link2
} from 'lucide-react';
import { ProductNote } from '../types/product';
import { normalizeImageUrl } from '../utils/imageHelper';

interface ProductNotesSectionProps {
  productId: string;
  notes: ProductNote[];
  canEdit?: boolean;
  onSaveNote: (note: ProductNote) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onNavigateToDataImport?: (tab: 'products' | 'components' | 'meterboxes' | 'connector-terminals' | 'mating-pairs' | 'notes') => void;
  isModalOpen?: boolean;
  onCloseModal?: () => void;
  onOpenModal?: () => void;
}

const PRESET_TAGS = [
  'Megjegyzés',
  'Pontozott Rajz',
  'Eredeti Rajz',
  'INFO',
  'Szerelési utasítás',
  'Karbantartás',
  'Alkatrész csere',
  'Kábelváltás'
];

export function isPdfUrl(url?: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  return (
    clean.endsWith('.pdf') ||
    clean.includes('/pdf') ||
    clean.includes('application/pdf') ||
    clean.includes('.pdf?') ||
    clean.startsWith('data:application/pdf')
  );
}

export function isImageUrl(url?: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  return (
    clean.startsWith('data:image/') ||
    clean.endsWith('.png') ||
    clean.endsWith('.jpg') ||
    clean.endsWith('.jpeg') ||
    clean.endsWith('.webp') ||
    clean.endsWith('.gif') ||
    clean.endsWith('.svg') ||
    clean.includes('.png?') ||
    clean.includes('.jpg?') ||
    clean.includes('.jpeg?') ||
    clean.includes('.webp?') ||
    clean.includes('images.unsplash.com') ||
    clean.includes('imgur.com')
  );
}

export const ProductNotesSection: React.FC<ProductNotesSectionProps> = ({
  productId,
  notes,
  canEdit = true,
  onSaveNote,
  onDeleteNote,
  onNavigateToDataImport,
  isModalOpen: externalIsModalOpen,
  onCloseModal: externalOnCloseModal,
  onOpenModal: externalOnOpenModal
}) => {
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen = externalIsModalOpen !== undefined ? externalIsModalOpen : internalModalOpen;

  const [editingNote, setEditingNote] = useState<ProductNote | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [url, setUrl] = useState('');
  const [nameChoice, setNameChoice] = useState('Megjegyzés');
  const [images, setImages] = useState<string[]>([]);
  const [photoLinkInput, setPhotoLinkInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lightbox zoom preview modal state
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);

  // File input ref for photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddPhotoLink = () => {
    const raw = photoLinkInput.trim();
    if (!raw) return;
    // Allow multiple URLs separated by space, comma or newline
    const urls = raw.split(/[\s,\n]+/).filter(Boolean);
    const normalizedList = urls.map((u) => normalizeImageUrl(u.trim())).filter(Boolean);
    setImages((prev) => [...prev, ...normalizedList]);
    setPhotoLinkInput('');
  };

  const openAddModal = () => {
    setEditingNote(null);
    setTitle('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setUrl('');
    setNameChoice('Megjegyzés');
    setImages([]);
    setPhotoLinkInput('');
    setErrorMessage(null);
    if (externalOnOpenModal) {
      externalOnOpenModal();
    } else {
      setInternalModalOpen(true);
    }
  };

  const openEditModal = (note: ProductNote) => {
    setEditingNote(note);
    setTitle(note.title || '');
    setDescription(note.description || '');
    setDate(note.date || new Date().toISOString().split('T')[0]);
    setUrl(note.url || '');
    setNameChoice(note.nameChoice || 'Megjegyzés');
    setImages(Array.isArray(note.images) ? [...note.images] : []);
    setPhotoLinkInput('');
    setErrorMessage(null);
    if (externalOnOpenModal) {
      externalOnOpenModal();
    } else {
      setInternalModalOpen(true);
    }
  };

  const closeModal = () => {
    setEditingNote(null);
    if (externalOnCloseModal) {
      externalOnCloseModal();
    } else {
      setInternalModalOpen(false);
    }
  };

  // Convert uploaded image file to compressed base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!result) return;

        // Image resizing helper to prevent huge localStorage consumption
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            setImages((prev) => [...prev, compressed]);
          } else {
            setImages((prev) => [...prev, result]);
          }
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !description.trim()) {
      setErrorMessage('Kérjük, adjon meg legalább egy címet vagy leírást a megjegyzéshez!');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const noteToSave: ProductNote = {
        id: editingNote ? editingNote.id : `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId,
        title: title.trim() || 'Megjegyzés',
        description: description.trim(),
        date: date.trim(),
        url: url.trim(),
        nameChoice: nameChoice.trim(),
        images,
        createdAt: editingNote?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await onSaveNote(noteToSave);
      closeModal();
    } catch (err) {
      console.error('Failed to save note:', err);
      setErrorMessage('Hiba történt a mentés során. Kérjük próbálja újra.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (window.confirm('Biztosan törölni szeretné ezt a Notesz bejegyzést?')) {
      try {
        await onDeleteNote(noteId);
      } catch (err) {
        console.error('Failed to delete note:', err);
      }
    }
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* NOTESZ SZEKCIÓ KÁRTYA (FA4646 színnel)                                     */}
      {/* CSAK AKKOR JELENIK MEG, HA VAN LEGALÁBB EGY BEJEGYZÉS                     */}
      {/* ========================================================================= */}
      {notes.length > 0 && (
        <section className="border-2 sm:border-3 border-[#FA4646] bg-white rounded-2xl shadow-sm overflow-hidden transition-all">
          {/* Címsor: #FA4646 színvilág */}
          <div className="bg-gradient-to-r from-[#FA4646] via-[#F23B3B] to-[#D92B2B] text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#FA4646]/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-xs shrink-0">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                    Notesz
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-[#FA4646] shadow-2xs">
                    {notes.length} {notes.length === 1 ? 'bejegyzés' : 'bejegyzés'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-red-50 font-medium">
                  Műszaki feljegyzések, pontozott rajzok, külön fényképek és dokumentumok
                </p>
              </div>
            </div>

            {canEdit && (
              <div className="flex items-center gap-2">
                {onNavigateToDataImport && (
                  <button
                    type="button"
                    onClick={() => onNavigateToDataImport('notes')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer border border-white/30"
                    title="Notesz CSV feltöltése az Adatfeltöltés központban"
                  >
                    <UploadCloud className="w-4 h-4 text-red-100" />
                    <span className="hidden sm:inline">CSV Feltöltés</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={openAddModal}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#FA4646] hover:bg-red-50 text-xs sm:text-sm font-extrabold transition-all duration-150 cursor-pointer shadow-xs hover:shadow"
                >
                  <Plus className="w-4 h-4 text-[#FA4646]" />
                  <span>+ Új bejegyzés</span>
                </button>
              </div>
            )}
          </div>

          {/* Notesz tartalma: Bejegyzések listája */}
          <div className="p-4 sm:p-6 bg-slate-50/50">
            <div className="space-y-4">
              {notes.map((note) => {
                const isPdf = isPdfUrl(note.url);
                const isImage = isImageUrl(note.url);
                const hasPhotos = note.images && note.images.length > 0;
                const normalizedNoteUrl = note.url ? normalizeImageUrl(note.url) : '';

                return (
                  <div
                    key={note.id}
                    className="bg-white rounded-xl border-2 border-red-100 hover:border-red-300 transition-all p-4 sm:p-5 shadow-xs"
                  >
                    {/* Header sáv: Cím, Címke, Dátum és gombok */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3 mb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-base sm:text-lg text-gray-900">
                            {note.title}
                          </h4>
                          {note.nameChoice && (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#FA4646]/10 text-[#FA4646] border border-[#FA4646]/20">
                              {note.nameChoice}
                            </span>
                          )}
                        </div>
                        {note.date && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{note.date}</span>
                          </div>
                        )}
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(note)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#FA4646] hover:bg-red-50 transition-colors cursor-pointer"
                            title="Bejegyzés szerkesztése"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(note.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Bejegyzés törlése"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Megjegyzés szövege */}
                    {note.description && (
                      <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-line mb-4 font-medium">
                        {note.description}
                      </div>
                    )}

                    {/* Csatolt Link (PDF vagy Kép miniatűr előnézettel) */}
                    {note.url && (
                      <div className="mb-4">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Paperclip className="w-3.5 h-3.5 text-[#FA4646]" />
                          <span>Csatolt dokumentum / Hivatkozás</span>
                        </div>

                        {isPdf ? (
                          /* PDF miniatűr előnézet kártya */
                          <div className="flex items-center gap-3 p-3 rounded-xl border border-red-200 bg-red-50/50 max-w-lg hover:bg-red-50 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-[#FA4646] text-white flex items-center justify-center shrink-0 shadow-2xs">
                              <FileText className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                                {note.title || 'PDF Dokumentum'}
                              </div>
                              <div className="text-[11px] text-red-700 truncate font-mono">
                                {note.url}
                              </div>
                            </div>
                            <a
                              href={note.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-[#FA4646] hover:bg-[#E03535] text-white font-bold text-xs flex items-center gap-1 shadow-2xs shrink-0 transition-colors"
                            >
                              <span>Megnyitás</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : isImage ? (
                          /* Kép miniatűr előnézet */
                          <div className="inline-block group relative">
                            <div
                              onClick={() => setActivePreviewImage(normalizedNoteUrl)}
                              className="relative cursor-pointer overflow-hidden rounded-xl border-2 border-red-200 hover:border-[#FA4646] shadow-xs group-hover:shadow-md transition-all bg-white"
                            >
                              <img
                                src={normalizedNoteUrl}
                                alt={note.title || 'Előnézeti kép'}
                                className="w-28 h-28 sm:w-36 sm:h-36 object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                <Eye className="w-4 h-4" />
                                <span>Nagyítás</span>
                              </div>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px]">
                              <span className="text-gray-500 font-mono truncate max-w-[140px]">
                                {note.url}
                              </span>
                              <a
                                href={note.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#FA4646] hover:underline font-bold"
                              >
                                Link
                              </a>
                            </div>
                          </div>
                        ) : (
                          /* Normál webcím / link */
                          <a
                            href={note.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[#FA4646] hover:bg-red-100 text-xs font-bold transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="truncate max-w-md">{note.url}</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Külön feltöltött / linkelt fényképek miniatűr előnézettel */}
                    {hasPhotos && (
                      <div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-[#FA4646]" />
                          <span>Noteszhoz tartozó fényképek ({note.images!.length} db)</span>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {note.images!.map((photoUrl, pIdx) => {
                            const normPhoto = normalizeImageUrl(photoUrl);
                            return (
                              <div
                                key={`photo-${pIdx}`}
                                onClick={() => setActivePreviewImage(normPhoto)}
                                className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-[#FA4646] shadow-xs cursor-pointer transition-all hover:scale-105 bg-gray-50"
                              >
                                <img
                                  src={normPhoto}
                                  alt={`Notesz fénykép #${pIdx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye className="w-4 h-4" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ÚJ BEJEGYZÉS / SZERKESZTÉS                                         */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-[#FA4646] w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Fejléc */}
            <div className="bg-gradient-to-r from-[#FA4646] to-[#E03535] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold leading-tight">
                    {editingNote ? 'Notesz bejegyzés szerkesztése' : 'Új bejegyzés a Noteszhoz'}
                  </h3>
                  <p className="text-xs text-red-100 font-mono">
                    Termék: {productId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Űrlap */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm font-semibold">
                  {errorMessage}
                </div>
              )}

              {/* Cím / Tárgy */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Megnevezés / Tárgy <span className="text-[#FA4646]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="pl. Pontozott Rajz, Szerelési utasítás, INFO"
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#FA4646] focus:ring-2 focus:ring-[#FA4646]/20 font-semibold text-gray-900 text-sm outline-none transition-all"
                  required
                />
                {/* Gyors választó gombok (Presets) */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setTitle(tag);
                        setNameChoice(tag);
                      }}
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 hover:bg-red-50 hover:text-[#FA4646] text-gray-700 border border-gray-200 transition-colors cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dátum és Címke két oszlopban */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Dátum
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#FA4646] focus:ring-2 focus:ring-[#FA4646]/20 font-medium text-gray-900 text-sm outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Címke / Kategória
                  </label>
                  <input
                    type="text"
                    value={nameChoice}
                    onChange={(e) => setNameChoice(e.target.value)}
                    placeholder="pl. Pontozott Rajz, KÉP"
                    className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#FA4646] focus:ring-2 focus:ring-[#FA4646]/20 font-medium text-gray-900 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Leírás / Megjegyzés szövege */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Megjegyzés részletei
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Írja le a megjegyzést, szerelési útmutatót vagy a rajzhoz kapcsolódó észrevételeket..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#FA4646] focus:ring-2 focus:ring-[#FA4646]/20 font-normal text-gray-900 text-sm outline-none leading-relaxed"
                />
              </div>

              {/* Weboldal / PDF / Kép linkje */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Dokumentum Link / PDF / Webcím</span>
                  <span className="text-[11px] text-gray-400 font-normal lowercase">
                    (pdf vagy kép esetén miniatűr előnézet)
                  </span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://... (pl. PDF link vagy kép link)"
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#FA4646] focus:ring-2 focus:ring-[#FA4646]/20 font-mono text-xs sm:text-sm text-gray-900 outline-none"
                />

                {/* Élő előnézet a megadott linkről */}
                {url && (
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 mt-1">
                    <div className="text-[11px] font-bold text-gray-500 mb-1">
                      Link előnézet:
                    </div>
                    {isPdfUrl(url) ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-100/50 p-2 rounded-lg">
                        <FileText className="w-4 h-4 shrink-0 text-[#FA4646]" />
                        <span>Felismerve: PDF dokumentum miniatűr előnézettel</span>
                      </div>
                    ) : isImageUrl(url) ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={normalizeImageUrl(url)}
                          alt="Link preview"
                          className="w-14 h-14 object-cover rounded-lg border border-gray-300"
                        />
                        <span className="text-xs font-bold text-emerald-700">
                          Felismerve: Közvetlen kép link
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600 font-mono truncate block">
                        Weboldal link: {url}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Külön fényképek / Pontozott rajz felrakása a noteszhoz */}
              <div className="space-y-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#FA4646]" />
                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                      Fénykép vagy Pontozott Rajz csatolása
                    </label>
                  </div>
                  <span className="text-xs font-bold text-[#FA4646]">
                    {images.length} db fénykép csatolva
                  </span>
                </div>

                <p className="text-[11px] text-gray-500">
                  A fénykép lehet <strong>közvetlen internetes link (URL)</strong>, <strong>Google Drive megosztási link</strong>, vagy <strong>készülékről feltöltött fájl</strong>.
                </p>

                {/* 1. Kép link hozzáadása (URL) */}
                <div className="p-3 bg-red-50/60 rounded-xl border border-red-200 space-y-2">
                  <div className="text-xs font-bold text-gray-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-[#FA4646]" />
                      <span>Fénykép linkelése webcímről (URL):</span>
                    </span>
                    <span className="text-[10px] text-gray-500 font-normal">
                      (Google Drive & Dropbox link is támogatott)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={photoLinkInput}
                      onChange={(e) => setPhotoLinkInput(e.target.value)}
                      placeholder="https://... (közvetlen kép link vagy Google Drive megosztási link)"
                      className="flex-1 p-2.5 rounded-lg border border-gray-300 focus:border-[#FA4646] font-mono text-xs text-gray-900 outline-none bg-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPhotoLink();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddPhotoLink}
                      disabled={!photoLinkInput.trim()}
                      className="px-4 py-2.5 rounded-lg bg-[#FA4646] hover:bg-[#E03535] disabled:bg-gray-300 text-white font-bold text-xs transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1 disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Kép link</span>
                    </button>
                  </div>
                </div>

                {/* 2. Fénykép feltöltése fájlból */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#FA4646] bg-white hover:bg-red-50/30 text-gray-700 hover:text-[#FA4646] font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-[#FA4646]" />
                    <span>Fénykép feltöltése fájlból / kamera</span>
                  </button>
                  <span className="text-[11px] text-gray-400">
                    (egyszerre több fotó is kijelölhető)
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Csatolt képek miniatűr galériája a modalban */}
                {images.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-gray-600">
                      Csatolt fényképek ({images.length} db):
                    </div>
                    <div className="flex flex-wrap gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      {images.map((imgSrc, idx) => {
                        const isLink = imgSrc.startsWith('http://') || imgSrc.startsWith('https://');
                        const normSrc = normalizeImageUrl(imgSrc);

                        return (
                          <div
                            key={`img-${idx}`}
                            className="relative group w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-300 hover:border-[#FA4646] shadow-2xs bg-white"
                          >
                            <img
                              src={normSrc}
                              alt={`Fénykép ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white">
                              <button
                                type="button"
                                onClick={() => setActivePreviewImage(normSrc)}
                                className="p-1 rounded-full bg-white/30 hover:bg-white text-gray-900 transition-colors"
                                title="Előnézet nagyítása"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="p-1 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
                                title="Fénykép törlése"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className={`absolute bottom-0 inset-x-0 text-[10px] text-center font-bold text-white py-0.5 pointer-events-none ${isLink ? 'bg-[#FA4646]/85' : 'bg-gray-800/85'}`}>
                              {isLink ? 'Link' : 'Feltöltve'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Alsó Műveletek */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-gray-800 text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#FA4646] hover:bg-[#E03535] text-white font-extrabold text-xs sm:text-sm transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Mentés...' : 'Bejegyzés mentése'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIGHTBOX: FÉNYKÉP NAGYÍTÁSA MODAL                                         */}
      {/* ========================================================================= */}
      {activePreviewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-3 sm:p-6 animate-fadeIn cursor-pointer"
          onClick={() => setActivePreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActivePreviewImage(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={activePreviewImage}
              alt="Notesz fénykép nagyítás"
              className="max-h-[85vh] max-w-full object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </>
  );
};
