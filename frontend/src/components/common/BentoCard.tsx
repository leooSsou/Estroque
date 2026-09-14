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
      className={`bg-[#0D1917] border border-[rgba(142,182,155,0.12)] rounded-3xl p-5 md:p-6 shadow-bento-dark transition-all hover:border-[rgba(142,182,155,0.22)] ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between gap-4 mb-5 pb-3 border-b border-[rgba(142,182,155,0.08)]">
          <div>
            {title && <h3 className="text-base font-semibold text-[#F3FBF6]">{title}</h3>}
            {subtitle && <p className="text-xs text-[#94A89E] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
