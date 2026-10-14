import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, X } from 'lucide-react';

interface ComboboxInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  isMono?: boolean;
  maxChips?: number;
}

export const ComboboxInput: React.FC<ComboboxInputProps> = ({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Válasszon vagy írjon be újat...',
  className = '',
  isMono = false,
  maxChips = 5
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on typed input
  const trimmedVal = (value || '').trim().toLowerCase();
  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(trimmedVal)
  );

  const isExactMatch = options.some(
    (opt) => opt.trim().toLowerCase() === trimmedVal
  );

  const datalistId = id ? `datalist-${id}` : undefined;

  // Top chips for fast 1-click selection
  const topChips = options.slice(0, maxChips);

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">
      {/* Input container with dropdown toggle */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          id={id}
          list={datalistId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (options.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full font-bold text-lg p-2.5 pr-10 border-2 border-[#DBD8D5] focus:border-[#3A5D6B] rounded-xl bg-white text-[#211E1B] transition-colors shadow-2xs ${
            isMono ? 'font-mono' : ''
          } ${className}`}
        />

        {datalistId && (
          <datalist id={datalistId}>
            {options.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        )}

        {/* Clear or Toggle button */}
        <div className="absolute right-2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Mező törlése"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-[#3A5D6B] hover:bg-[#79B6B8]/15 transition-colors cursor-pointer"
            title={isOpen ? 'Lista bezárása' : 'Választás a korábbi értékekből'}
          >
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-[#3A5D6B]' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && options.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border-2 border-[#DBD8D5] rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-[#DBD8D5] animate-fadeIn">
          <div className="p-2 bg-[#F8F9FA] text-xs font-bold text-gray-500 flex items-center justify-between">
            <span>Eddigi értékek ({options.length} db)</span>
            <span className="text-[11px] text-[#3A5D6B] font-semibold">
              Kattintson a kiválasztáshoz
            </span>
          </div>

          <div className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.trim().toLowerCase() === trimmedVal;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-base font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#3A5D6B] text-white font-bold'
                        : 'hover:bg-[#79B6B8]/15 text-[#211E1B]'
                    }`}
                  >
                    <span className={isMono ? 'font-mono' : ''}>{opt}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-300 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-sm text-gray-500 italic">
                Nincs pontos egyezés a korábbi értékek között.
              </div>
            )}

            {/* Custom value indicator if user typed a new value */}
            {value && !isExactMatch && (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full text-left px-3.5 py-2.5 text-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold flex items-center gap-2 border-t border-emerald-200 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>Új érték beírása: "{value}"</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick selection chips */}
      {topChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-xs text-gray-500 font-semibold mr-1">Választható:</span>
          {topChips.map((opt) => {
            const isSelected = opt.trim().toLowerCase() === trimmedVal;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-[#3A5D6B] text-white border-[#3A5D6B] shadow-2xs'
                    : 'bg-[#F8F9FA] hover:bg-gray-200 text-gray-800 border-[#DBD8D5]'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-emerald-300" />}
                <span className={isMono ? 'font-mono' : ''}>{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
