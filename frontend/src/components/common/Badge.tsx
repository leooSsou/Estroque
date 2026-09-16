import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'mint' | 'emerald' | 'sage' | 'danger' | 'warning' | 'neutral' | 'blue';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const variantStyles = {
    mint: 'bg-[#163832] text-[#DAF1DE] border-[rgba(142,182,155,0.25)]',
    emerald: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30',
    sage: 'bg-[#142522] text-[#8EB69B] border-[rgba(142,182,155,0.18)]',
    danger: 'bg-[#2A1515] text-red-400 border-red-500/30',
    warning: 'bg-[#2B2312] text-amber-400 border-amber-500/30',
    neutral: 'bg-[#142522] text-[#94A89E] border-[rgba(142,182,155,0.12)]',
    blue: 'bg-[#112433] text-sky-400 border-sky-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border font-mono tracking-tight whitespace-nowrap ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
