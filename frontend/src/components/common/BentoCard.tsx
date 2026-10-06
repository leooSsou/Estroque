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
      className={`bg-[#141518] border border-white/[0.07] rounded-3xl p-5 md:p-6 shadow-bento-dark transition-all duration-300 hover:border-white/[0.16] ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between gap-4 mb-5 pb-3 border-b border-white/[0.06]">
          <div>
            {title && <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-[#8A8F98] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
