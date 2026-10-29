import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Impede o scroll de fundo enquanto o modal estiver aberto
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Fullscreen Backdrop - cobre 100% da viewport e desfoca a interface inteira */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card com estrutura de cabeçalho fixo e corpo rolável */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-[#000000] border border-white/[0.18] rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-10 animate-fade-in my-auto flex flex-col max-h-[88vh] sm:max-h-[90vh] overflow-hidden`}
      >
        {/* Cabeçalho fixo do Modal */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 border-b border-white/[0.14] bg-[#000000] flex-shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="text-base sm:text-xl font-bold text-white tracking-tight leading-snug">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-1 leading-normal">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all flex-shrink-0 border border-white/[0.10]"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo rolável com barra de rolagem estilizada */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 table-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

