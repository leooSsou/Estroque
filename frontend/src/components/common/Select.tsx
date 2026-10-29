import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione uma opção...',
  disabled = false,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} id={id}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#000000] border transition-all text-sm flex items-center justify-between gap-2.5 text-left active:scale-[0.99] ${
          isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
            : 'border-white/[0.16] hover:border-white/[0.28]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="truncate flex-1">
          {selectedOption ? (
            <div className="truncate">
              <span className="font-medium text-white truncate block">
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                  {selectedOption.sublabel}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-400' : ''
          }`}
        />
      </button>

      {/* In-DOM Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-[#000000] border border-white/[0.20] shadow-[0_15px_40px_rgba(0,0,0,0.85)] p-1.5 max-h-60 overflow-y-auto table-scrollbar animate-fade-in">
          {options.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-500 text-center">
              Nenhuma opção disponível
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 text-left ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                      : 'text-slate-200 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <div className="truncate flex-1">
                    <span className="truncate block">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-[11px] text-slate-400 truncate block">
                        {opt.sublabel}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
