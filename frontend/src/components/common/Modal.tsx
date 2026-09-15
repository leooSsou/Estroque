import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      {/* Modal Dialog */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-[#0D1917] border border-[rgba(142,182,155,0.22)] rounded-3xl shadow-bento-dark shadow-[0_0_50px_rgba(0,0,0,0.8)] p-6 md:p-8 z-10 animate-scale-in my-8`}
      >
        <div className="flex items-start justify-between gap-4 pb-4 mb-5 border-b border-[rgba(142,182,155,0.14)]">
          <div>
            <h3 className="text-xl font-bold text-[#F3FBF6] tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-[#94A89E] mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#94A89E] hover:text-[#F3FBF6] hover:bg-[#142522] border border-transparent hover:border-[rgba(142,182,155,0.2)] btn-press cursor-pointer transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};
