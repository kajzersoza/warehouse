import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, RotateCcw, X, Check, Edit3 } from 'lucide-react';

const LOGO_STORAGE_KEY = 'raktar_company_logo_data';
const DEFAULT_LOGO_URL = '/company-logo.svg';

export function getCompanyLogoUrl(): string {
  try {
    const saved = localStorage.getItem(LOGO_STORAGE_KEY);
    if (saved && saved.trim().length > 0) {
      return saved;
    }
  } catch (err) {
    console.warn('Could not read logo from localStorage', err);
  }
  return DEFAULT_LOGO_URL;
}

export function saveCompanyLogo(dataUrl: string): void {
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, dataUrl);
    window.dispatchEvent(new Event('company-logo-updated'));
  } catch (err) {
    console.warn('Could not save logo to localStorage', err);
  }
}

export function resetCompanyLogo(): void {
  try {
    localStorage.removeItem(LOGO_STORAGE_KEY);
    window.dispatchEvent(new Event('company-logo-updated'));
  } catch (err) {
    console.warn('Could not reset logo in localStorage', err);
  }
}

interface CompanyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showUploadTrigger?: boolean;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className = '',
  size = 'md',
  showUploadTrigger = true
}) => {
  const [logoUrl, setLogoUrl] = useState<string>(getCompanyLogoUrl());
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setLogoUrl(getCompanyLogoUrl());
    };
    window.addEventListener('company-logo-updated', handleUpdate);
    return () => window.removeEventListener('company-logo-updated', handleUpdate);
  }, []);

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-11 h-11 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-20 h-20 rounded-2xl'
  }[size];

  return (
    <>
      <div
        className={`relative group inline-flex items-center justify-center shrink-0 cursor-pointer ${className}`}
        onClick={(e) => {
          if (showUploadTrigger) {
            e.stopPropagation();
            setIsModalOpen(true);
          }
        }}
        title={showUploadTrigger ? "Céglogó megtekintése / feltöltése" : undefined}
      >
        <div
          className={`${sizeClasses} bg-[#3A5D6B] border border-[#79B6B8]/30 shadow-xs overflow-hidden flex items-center justify-center transition-all duration-200 group-hover:ring-2 group-hover:ring-[#79B6B8]`}
        >
          <img
            src={logoUrl}
            alt="Céglogó"
            className="w-full h-full object-contain p-0.5"
            onError={(e) => {
              // Fallback to default SVG if custom URL breaks
              (e.target as HTMLImageElement).src = DEFAULT_LOGO_URL;
            }}
          />
        </div>

        {showUploadTrigger && (
          <div className="absolute -bottom-1 -right-1 bg-[#211E1B] text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-white/50">
            <Edit3 className="w-2.5 h-2.5 text-[#79B6B8]" />
          </div>
        )}
      </div>

      {isModalOpen && (
        <LogoUploadModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentLogo={logoUrl}
        />
      )}
    </>
  );
};

interface LogoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLogo: string;
}

export const LogoUploadModal: React.FC<LogoUploadModalProps> = ({
  isOpen,
  onClose,
  currentLogo
}) => {
  const [preview, setPreview] = useState<string>(currentLogo);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Kérjük, képet válassz (PNG, JPG, SVG, WebP)!');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('A kép maximális mérete 5 MB lehet.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setPreview(result);
        saveCompanyLogo(result);
        setSuccessMsg('A céglogó sikeresen feltöltve és beállítva!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Hiba történt a fájl beolvasása közben.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    resetCompanyLogo();
    setPreview(DEFAULT_LOGO_URL);
    setSuccessMsg('Alapértelmezett logó visszaállítva.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-[#DBD8D5]">
        {/* Modal Header */}
        <div className="bg-[#3A5D6B] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-[#79B6B8]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Céglogó kezelése</h3>
              <p className="text-xs text-white/80">Logó feltöltése és beépítése az alkalmazásba</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Logo Preview */}
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
              Jelenlegi logó előnézete
            </span>
            <div className="w-28 h-28 mx-auto rounded-2xl bg-[#F8F9FA] border-2 border-dashed border-[#DBD8D5] flex items-center justify-center overflow-hidden p-2 shadow-inner">
              <img
                src={preview}
                alt="Logó előnézet"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_LOGO_URL;
                }}
              />
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-800 rounded-xl text-sm font-medium border border-red-200">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-sm font-medium border border-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Upload Drop Zone */}
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-[#3A5D6B] bg-[#79B6B8]/15'
                : 'border-[#DBD8D5] hover:border-[#3A5D6B] bg-[#F8F9FA] hover:bg-white'
            }`}
          >
            <UploadCloud className="w-10 h-10 text-[#3A5D6B] mx-auto mb-2" />
            <p className="font-bold text-sm text-[#211E1B]">
              Húzd ide a logó képfájlját, vagy kattints a tallózáshoz
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG, SVG vagy WebP formátum (max. 5 MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#DBD8D5]">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 hover:text-[#211E1B] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              title="Visszaállítás az eredeti Mecal logóra"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Alapértelmezett logó</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-[#3A5D6B] hover:bg-[#2F223A] text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Kész
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
