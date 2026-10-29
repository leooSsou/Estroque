import React from 'react';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
}) => {
  return (
    <div
      className={`bg-[#000000] border border-white/[0.16] rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 shadow-bento-dark transition-all duration-300 hover:border-white/[0.24] ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 pb-3 border-b border-white/[0.14]">
          <div className="min-w-0">
            {title && <h3 className="text-base font-bold text-white tracking-tight truncate">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
